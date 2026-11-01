const db = () => window.sportsSupabase;
const el = id => document.getElementById(id);
let sports = [];
let matches = [];
let watchlistIds = new Set();
let authMode = "signin";

const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[ch]));

function setConnection(state, message) {
  const badge = el("connectionBadge");
  const notice = el("connectionNotice");
  if (badge) badge.textContent = state;
  if (notice) notice.innerHTML = message;
}

function sportIcon(name) {
  const icons = {
    football:"⚽", volleyball:"🏐", basketball:"🏀", tennis:"🎾",
    handball:"🤾", rugby:"🏉", cricket:"🏏", baseball:"⚾",
    hockey:"🏒", american_football:"🏈", table_tennis:"🏓",
    badminton:"🏸", boxing:"🥊"
  };
  const row = sports.find(s => s.name === name);
  return icons[row?.code] || "🏅";
}

function renderSports() {
  const box = el("sportsCatalogue");
  if (!sports.length) {
    box.innerHTML = '<div class="empty"><h3>No sports have been added yet</h3><p>Add sports to the Supabase sports table to display them here.</p></div>';
    return;
  }
  box.innerHTML = sports.map(s => `
    <button class="sport" data-sport-id="${escapeHtml(s.id)}" data-sport-name="${escapeHtml(s.name)}">
      <span>${sportIcon(s.name)}</span><b>${escapeHtml(s.name)}</b><small>Open sports records</small>
    </button>`).join("");
}

function formatDate(value) {
  if (!value) return "Schedule not supplied";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Schedule not supplied" :
    date.toLocaleString([], {dateStyle:"medium",timeStyle:"short"});
}

function renderMatchCard(match) {
  const home = match.home_team?.name || "Home team";
  const away = match.away_team?.name || "Away team";
  const competition = match.competition?.name || "Competition not supplied";
  const score = match.status === "completed" || match.status === "live"
    ? `${match.home_score ?? "—"} : ${match.away_score ?? "—"}` : "— : —";
  const saved = watchlistIds.has(match.id);
  return `
    <article class="match">
      <div><div class="team">${escapeHtml(home)}</div><div class="meta">${escapeHtml(competition)} · ${escapeHtml(formatDate(match.scheduled_at))}</div></div>
      <div class="score">${escapeHtml(score)}<div class="status">${escapeHtml(String(match.status || "scheduled").toUpperCase())}</div></div>
      <div class="team right">${escapeHtml(away)}</div>
      <button class="watch ${saved ? "saved" : ""}" data-watch="${escapeHtml(match.id)}">${saved ? "★ Saved" : "☆ Watch"}</button>
    </article>`;
}

function renderMatchList(id, rows) {
  const box = el(id);
  if (!box) return;
  box.innerHTML = rows.length ? rows.map(renderMatchCard).join("") :
    '<div class="empty"><h3>No verified match records</h3><p>This list is connected to your Supabase database. It will populate when verified fixture and result data is imported.</p></div>';
}

function refreshMatches() {
  const sportId = el("sportFilter")?.value || "all";
  const query = (el("search")?.value || "").trim().toLowerCase();
  const filtered = matches.filter(m => {
    const sportOk = sportId === "all" || m.sport_id === sportId;
    const text = [m.home_team?.name, m.away_team?.name, m.competition?.name].join(" ").toLowerCase();
    return sportOk && text.includes(query);
  });
  renderMatchList("overviewMatches", matches.slice(0, 3));
  renderMatchList("allMatches", filtered);
  renderMatchList("savedMatches", matches.filter(m => watchlistIds.has(m.id)));
}

async function loadCatalogue() {
  const client = db();
  if (!client) throw new Error(window.supabaseConnectionError || "Supabase client is unavailable.");
  const [sportsResult, sourcesResult, completedResult] = await Promise.all([
    client.from("sports").select("id,code,name,is_active").eq("is_active", true).order("name"),
    client.from("data_sources").select("id", {count:"exact",head:true}),
    client.from("matches").select("id", {count:"exact",head:true}).eq("status","completed")
  ]);
  if (sportsResult.error) throw sportsResult.error;
  if (sourcesResult.error) throw sourcesResult.error;
  if (completedResult.error) throw completedResult.error;
  sports = sportsResult.data || [];
  el("sportsCount").textContent = sports.length;
  el("sourcesCount").textContent = sourcesResult.count ?? 0;
  el("completedCount").textContent = completedResult.count ?? 0;
  renderSports();
  const select = el("sportFilter");
  select.innerHTML = '<option value="all">All sports</option>' +
    sports.map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join("");
}

async function loadMatches() {
  const {data,error} = await db().from("matches")
    .select("id,sport_id,scheduled_at,status,home_score,away_score,home_team:teams!matches_home_team_id_fkey(name),away_team:teams!matches_away_team_id_fkey(name),competition:competitions(name)")
    .order("scheduled_at", {ascending:true,nullsFirst:false})
    .limit(100);
  if (error) throw error;
  matches = data || [];
  refreshMatches();
}

async function loadWatchlist(user) {
  if (!user) {
    watchlistIds = new Set();
    el("savedCount").textContent = "0";
    refreshMatches();
    return;
  }
  const {data,error} = await db().from("user_watchlist").select("match_id").eq("user_id",user.id);
  if (error) throw error;
  watchlistIds = new Set((data || []).map(row => row.match_id));
  el("savedCount").textContent = watchlistIds.size;
  refreshMatches();
}

async function updateAuthUI() {
  const {data,error} = await db().auth.getSession();
  if (error) throw error;
  const user = data.session?.user || null;
  el("authStatus").textContent = user ? user.email : "Signed out";
  el("authOpen").hidden = !!user;
  el("signOut").hidden = !user;
  el("authPanel").hidden = true;
  await loadWatchlist(user);
}

async function toggleWatch(matchId) {
  const {data,error} = await db().auth.getUser();
  if (error || !data.user) {
    el("authPanel").hidden = false;
    el("authMessage").textContent = "Sign in first to save matches to your personal watchlist.";
    return;
  }
  if (watchlistIds.has(matchId)) {
    const result = await db().from("user_watchlist").delete().eq("match_id",matchId).eq("user_id",data.user.id);
    if (result.error) throw result.error;
    watchlistIds.delete(matchId);
  } else {
    const result = await db().from("user_watchlist").insert({match_id:matchId,user_id:data.user.id});
    if (result.error) throw result.error;
    watchlistIds.add(matchId);
  }
  el("savedCount").textContent = watchlistIds.size;
  refreshMatches();
}

function openView(id) {
  document.querySelectorAll(".view").forEach(x => x.classList.toggle("active",x.id===id));
  document.querySelectorAll(".nav").forEach(x => x.classList.toggle("active",x.dataset.view===id));
  const btn = document.querySelector('.nav[data-view="'+id+'"]');
  el("heading").textContent = btn ? btn.innerText.trim() : "Overview";
  el("sidebar").classList.remove("open");
}

document.addEventListener("click", async event => {
  const nav = event.target.closest("[data-view]");
  const open = event.target.closest("[data-open]");
  const watch = event.target.closest("[data-watch]");
  const sport = event.target.closest("[data-sport-id]");
  if (nav) openView(nav.dataset.view);
  if (open) openView(open.dataset.open);
  if (watch) {
    try { await toggleWatch(watch.dataset.watch); }
    catch (error) { el("authMessage").textContent = error.message; }
  }
  if (sport) {
    el("sportFilter").value = sport.dataset.sportId;
    openView("matches");
    refreshMatches();
  }
});

el("menu").addEventListener("click",() => el("sidebar").classList.toggle("open"));
el("sportFilter").addEventListener("change",refreshMatches);
el("search").addEventListener("input",refreshMatches);
el("authOpen").addEventListener("click",() => {el("authPanel").hidden=false;el("authEmail").focus();});
el("authMode").addEventListener("click",() => {
  authMode = authMode === "signin" ? "signup" : "signin";
  el("authSubmit").textContent = authMode === "signin" ? "Sign in" : "Create account";
  el("authMode").textContent = authMode === "signin" ? "Create account" : "I already have an account";
  el("authPassword").autocomplete = authMode === "signin" ? "current-password" : "new-password";
  el("authMessage").textContent = "";
});
el("signOut").addEventListener("click",async () => {
  const {error} = await db().auth.signOut();
  if (error) {el("authMessage").textContent=error.message;return;}
  await updateAuthUI();
});
el("authForm").addEventListener("submit",async event => {
  event.preventDefault();
  const email = el("authEmail").value.trim();
  const password = el("authPassword").value;
  const submit = el("authSubmit");
  submit.disabled = true;
  el("authMessage").textContent = "Please wait…";
  try {
    const result = authMode === "signin"
      ? await db().auth.signInWithPassword({email,password})
      : await db().auth.signUp({email,password});
    if (result.error) throw result.error;
    el("authMessage").textContent = authMode === "signup"
      ? "Account request submitted. Check your email if confirmation is enabled."
      : "Signed in successfully.";
    await updateAuthUI();
  } catch (error) {
    el("authMessage").textContent = error.message || "Authentication failed.";
  } finally { submit.disabled = false; }
});

async function startApp() {
  try {
    setConnection("CHECKING", "<b>Checking database:</b> Verifying the sports catalogue, match records and account session.");
    await loadCatalogue();
    await loadMatches();
    await updateAuthUI();
    setConnection("CONNECTED · DATABASE ONLY", "<b>Supabase connected:</b> Database reads succeeded. This does not mean a live sports feed is connected; fixtures appear only after a data provider imports verified records.");
    db().auth.onAuthStateChange(() => setTimeout(() => updateAuthUI().catch(err => console.error(err)),0));
  } catch (error) {
    console.error("Supabase connection error:",error);
    setConnection("CONNECTION ERROR", "<b>Supabase connection failed:</b> "+escapeHtml(error.message)+". Check the project API settings and reload.");
    renderMatchList("overviewMatches",[]);
    renderMatchList("allMatches",[]);
  }
}
startApp();