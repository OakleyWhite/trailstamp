/* Trailstamp platform layer.
   The app was first built to run inside Claude, where storage, photos, AI and downloads
   come from `claude.use(...)`. This file provides the same calls backed by Supabase and
   the phone, so the app code runs unchanged in the Android/iOS build. */
(function(){
  const CFG = window.WAYPOINT_CONFIG || {};
  const configured = CFG.supabaseUrl && CFG.supabaseAnonKey && !/YOUR-/.test(CFG.supabaseUrl + CFG.supabaseAnonKey);
  const sb = configured ? supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }) : null;
  window.WP = { sb, cfg: CFG };
  let session = null;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const native = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const plugin = n => ({ Share: window.capacitorShare && capacitorShare.Share, Filesystem: window.capacitorFilesystemPluginCapacitor && capacitorFilesystemPluginCapacitor.Filesystem, App: window.capacitorApp && capacitorApp.App }[n]) || (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins[n]) || null;
  const refresh = () => window.dispatchEvent(new Event("wp:refresh"));
  const err = (code, message) => { const e = new Error(message || code); e.code = code; return e; };

  /* ---------- path -> table mapping for the db calls the app makes ---------- */
  // data/users/<id>/state                 -> app_state
  // data/users/<id>/state/moments/<mid>   -> moments
  // board/<id>                            -> board
  // groups/<code>                         -> groups
  // groups/<code>/members/<uid>           -> group_members
  // groups/<code>/moments/<mid>           -> group_moments
  function route(path){
    const s = path.split("/");
    if (s[0]==="data" && s[1]==="users" && s[3]==="state" && s.length===4) return { t:"state" };
    if (s[0]==="data" && s[1]==="users" && s[3]==="state" && s[4]==="moments") return { t:"moments", id:s[5] };
    if (s[0]==="board") return { t:"board", id:s[1] };
    if (s[0]==="groups" && s.length<=2) return { t:"groups", id:s[1] };
    if (s[0]==="groups" && s[2]==="members") return { t:"members", g:s[1], id:s[3] };
    if (s[0]==="groups" && s[2]==="moments") return { t:"gmoments", g:s[1], id:s[3] };
    throw err("invalid_argument", "Unknown path " + path);
  }
  const snap = (id, data) => ({ id, exists: data !== undefined && data !== null, data: () => data || undefined, metadata: { fromCache:false, hasPendingWrites:false } });
  const uidNow = () => session && session.user.id;
  async function check(r){ if (r.error) { const c = /violates row-level security|permission/i.test(r.error.message) ? "invalid_argument" : "unavailable"; throw err(c, r.error.message); } return r.data; }

  async function docGet(path){
    const r = route(path);
    if (r.t==="state"){ const d = await check(await sb.from("app_state").select("data").eq("user_id", uidNow()).maybeSingle()); return snap("state", d && d.data); }
    if (r.t==="moments"){ const d = await check(await sb.from("moments").select("data").eq("id", r.id).maybeSingle()); return snap(r.id, d && d.data); }
    if (r.t==="board"){ const d = await check(await sb.from("board").select("*").eq("user_id", r.id).maybeSingle()); return snap(r.id, d && boardRow(d)); }
    if (r.t==="groups"){ const d = await check(await sb.from("groups").select("*").eq("code", r.id).maybeSingle()); return snap(r.id, d && { name:d.name, to:d.dest, start:d.start_date, end:d.end_date, owner:d.owner }); }
    throw err("invalid_argument");
  }
  async function docSet(path, data){
    const r = route(path), me = uidNow();
    if (r.t==="state") return check(await sb.from("app_state").upsert({ user_id: me, data, updated_at: new Date().toISOString() }));
    if (r.t==="moments") return check(await sb.from("moments").upsert({ id: r.id, user_id: me, at: data.at, data }));
    if (r.t==="board"){ const row = { user_id: me, pts: data.pts|0, rank: data.rank|0, challenges: data.challenges|0, parks: data.parks|0, places: data.places|0, trips: data.trips|0, badges: data.badges|0, updated_at: new Date().toISOString() }; return check(await sb.from("board").upsert(row)); }
    if (r.t==="groups") return check(await sb.from("groups").insert({ code: r.id, name: String(data.name||"").slice(0,80), dest: String(data.to||"").slice(0,80), start_date: data.start||"", end_date: data.end||"", owner: me }));
    if (r.t==="members") return check(await sb.from("group_members").upsert({ group_code: r.g, user_id: me }));
    if (r.t==="gmoments") return check(await sb.from("group_moments").upsert({ id: r.id, group_code: r.g, by: me, at: data.at, data }));
  }
  async function docDelete(path){
    const r = route(path);
    if (r.t==="moments") return check(await sb.from("moments").delete().eq("id", r.id));
    if (r.t==="gmoments") return check(await sb.from("group_moments").delete().eq("id", r.id));
    if (r.t==="members") return check(await sb.from("group_members").delete().eq("group_code", r.g).eq("user_id", uidNow()));
  }
  const boardRow = d => ({ pts:d.pts, rank:d.rank, challenges:d.challenges, parks:d.parks, places:d.places, trips:d.trips, badges:d.badges, updated: Date.parse(d.updated_at) });
  async function colGet(path, opts){
    const r = route(path + "/x");
    let rows = [];
    if (r.t==="moments"){ rows = (await check(await sb.from("moments").select("id,data").eq("user_id", uidNow()))).map(x => snap(x.id, x.data)); }
    else if (r.t==="board"){ rows = (await check(await sb.from("board").select("*").order("pts", { ascending:false }).limit(opts.limit || 50))).map(x => snap(x.user_id, boardRow(x))); }
    else if (r.t==="members"){ rows = (await check(await sb.from("group_members").select("user_id").eq("group_code", r.g))).map(x => snap(x.user_id, {})); }
    else if (r.t==="gmoments"){ rows = (await check(await sb.from("group_moments").select("id,by,at,data").eq("group_code", r.g).order("at", { ascending:false }).limit(300))).map(x => snap(x.id, Object.assign({}, x.data, { by: x.by, at: x.at }))); }
    else throw err("invalid_argument");
    return { docs: rows, size: rows.length, empty: !rows.length, docChanges: () => [], metadata: { fromCache:false, hasPendingWrites:false } };
  }
  const polls = new Set();
  function query(path, opts = {}){
    return {
      orderBy: (f, d) => query(path, Object.assign({}, opts, { orderBy: [f, d] })),
      limit: n => query(path, Object.assign({}, opts, { limit: n })),
      where: () => query(path, opts),
      get: () => colGet(path, opts),
      onSnapshot(next, onErr){
        let alive = true;
        const run = () => { if (!alive || document.visibilityState === "hidden") return; colGet(path, opts).then(next, e => onErr && onErr(e)); };
        polls.add(run); run();
        const t = setInterval(run, 25000);
        return () => { alive = false; clearInterval(t); polls.delete(run); };
      },
      doc: id => docRef(path + "/" + id)
    };
  }
  function docRef(path){ return { id: path.split("/").pop(), path, get: () => docGet(path), set: d => docSet(path, d), update: d => docSet(path, d), delete: () => docDelete(path), collection: c => query(path + "/" + c), onSnapshot(next){ docGet(path).then(next); return () => {}; } }; }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") polls.forEach(f => f()); });
  const db = { doc: docRef, collection: p => query(p) };

  /* ---------- photos ---------- */
  const urls = {}; let pendingUrls = new Set(), urlTimer = null;
  window.blobUrl = function(path){
    if (!path) return "";
    if (urls[path]) return urls[path];
    pendingUrls.add(path); clearTimeout(urlTimer); urlTimer = setTimeout(fetchUrls, 30);
    return "";
  };
  async function fetchUrls(){
    const list = [...pendingUrls]; pendingUrls = new Set(); if (!list.length || !sb) return;
    try { const { data } = await sb.storage.from("photos").createSignedUrls(list, 60*60*24*6); (data || []).forEach(x => { if (x.signedUrl) urls[x.path] = x.signedUrl; }); refresh(); } catch(e) {}
  }
  const assets = {
    async upload(blob){
      const path = uidNow() + "/" + Date.now().toString(36) + Math.random().toString(36).slice(2,8) + ".jpg";
      const r = await sb.storage.from("photos").upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (r.error) throw err("upload_failed", r.error.message);
      urls[path] = URL.createObjectURL(blob);
      return { id: path, url: urls[path], sizeBytes: blob.size, contentType: "image/jpeg" };
    },
    async delete(path){ if (String(path).startsWith(uidNow() + "/")) await sb.storage.from("photos").remove([path]); },
    async list(){ return { assets: [], usage: {} }; }
  };

  /* ---------- people ---------- */
  const names = {};
  const user = {
    id: async () => uidNow(),
    isOwner: async () => true, canEdit: async () => true, can: async () => true,
    me: async () => ({ id: uidNow(), name: names[uidNow()] || "", avatarUrl: "", color: "", email: session && session.user.email, isOwner: true, canEdit: true }),
    async profiles(ids){
      ids = [].concat(ids).filter(Boolean);
      const miss = ids.filter(i => names[i] === undefined);
      if (miss.length){ try { const d = await check(await sb.from("profiles").select("user_id,name").in("user_id", miss)); miss.forEach(i => names[i] = ""); d.forEach(x => names[x.user_id] = x.name || ""); } catch(e) {} }
      return Object.fromEntries(ids.map(i => [i, { id: i, name: names[i] || "", avatarUrl: "", color: "", email: null, isMe: i === uidNow(), guest: false }]));
    }
  };

  /* ---------- AI (through the server function, so the API key never ships in the app) ---------- */
  function pickJSON(text){
    const t = String(text || "").replace(/```(?:json)?/g, "");
    const a = t.indexOf("{"), b = t.lastIndexOf("}");
    if (a < 0 || b < a) throw err("bad_response", "The AI answer wasn't in the expected format.");
    return JSON.parse(t.slice(a, b + 1));
  }
  async function ask(input, opts = {}){
    const prompt = typeof input === "string" ? input : input.map(m => m.content).join("\n\n");
    const r = await sb.functions.invoke("ai", { body: { prompt, tier: opts.modelTier || "default" } });
    if (r.error){ let code = "unavailable"; try { const body = await r.error.context.json(); if (body && body.code) code = body.code; } catch(e) {} throw err(code, "AI request failed"); }
    return { text: r.data.text || "", truncated: !!r.data.truncated };
  }
  const sample = Object.assign((input, opts) => ask(input, opts), { json: async (input, opts) => pickJSON((await ask(input, opts)).text), limits: async () => ({ images: false }) });

  /* ---------- save / share an image ---------- */
  const downloads = {
    async save({ filename, data }){
      const blob = data instanceof Blob ? data : new Blob([data]);
      const Share = plugin("Share"), Filesystem = plugin("Filesystem");
      if (native && Share && Filesystem){
        const b64 = await new Promise(res => { const f = new FileReader(); f.onload = () => res(String(f.result).split(",")[1]); f.readAsDataURL(blob); });
        const w = await Filesystem.writeFile({ path: filename, data: b64, directory: "CACHE" });
        try { await Share.share({ title: "My Trailstamp recap", files: [w.uri] }); } catch(e) { if (!/cancel/i.test(e && e.message || "")) throw e; }
        return { status: "delivered" };
      }
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return { status: "delivered" }; }
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      return { status: "saved" };
    }
  };

  /* ---------- safety: block + report (required for shared photos) ---------- */
  let blocked = new Set();
  window.isBlocked = id => blocked.has(id);
  async function loadBlocks(){ try { const d = await check(await sb.from("blocks").select("blocked")); blocked = new Set(d.map(x => x.blocked)); } catch(e) {} }

  window.claude = { use: async n => ({ db, assets, user, sample, downloads }[n] || null) };

  /* ---------- account screen, shown inside Passport ---------- */
  window.accountHTML = function(){
    if (!session) return "";
    return `<div class="sechead"><h2>Account</h2></div><div class="panel acct">
      <div class="acct-row"><div><b>${esc(names[uidNow()] || "Traveler")}</b><span class="note">${esc(session.user.email || "")}</span></div><button class="btn ghost sm" data-acct="name">Edit name</button></div>
      <div class="acct-links">
        <button class="btn ghost sm" data-acct="feedback">Send feedback</button>
        ${CFG.privacyUrl ? `<a class="btn ghost sm" href="${esc(CFG.privacyUrl)}" target="_blank" rel="noopener">Privacy policy</a>` : ""}
        ${CFG.termsUrl ? `<a class="btn ghost sm" href="${esc(CFG.termsUrl)}" target="_blank" rel="noopener">Terms</a>` : ""}
        <button class="btn ghost sm" data-acct="signout">Sign out</button>
      </div>
      <button class="linkbtn danger" data-acct="delete">Delete my account</button>
      <p class="note" style="margin:8px 0 0">Trailstamp ${esc(CFG.version || "")}</p></div>`;
  };
  function sheet(inner){ $("#modal").innerHTML = `<div class="scrim" data-close><div class="sheet" role="dialog" aria-modal="true">${inner}</div></div>`; }
  function close(){ $("#modal").innerHTML = ""; }
  function toast(m){ document.querySelectorAll(".toast").forEach(x => x.remove()); const el = document.createElement("div"); el.className = "toast"; el.setAttribute("role","status"); el.textContent = m; document.body.appendChild(el); setTimeout(() => el.remove(), 2800); }
  document.addEventListener("click", async ev => {
    const el = ev.target.closest("[data-acct],[data-report],[data-block]"); if (!el) return;
    const a = el.dataset.acct;
    if (el.dataset.report){
      const [mid, who] = el.dataset.report.split("|");
      sheet(`<h2>Report this photo</h2><p class="note" style="margin-top:-8px">Tell us what's wrong. We review every report within 24 hours.</p>
        <div class="field"><label for="rp-why">Reason</label><select id="rp-why"><option>Inappropriate or explicit</option><option>Harassment or hate</option><option>Spam</option><option>Something else</option></select></div>
        <div class="actions"><button class="btn ghost" data-close>Cancel</button><button class="btn ember" id="rp-go">Send report</button></div>`);
      $("#rp-go").onclick = async () => { $("#rp-go").disabled = true; try { await check(await sb.from("reports").insert({ target_user: who, moment_id: mid, reason: $("#rp-why").value })); close(); toast("Report sent. Thanks for keeping Trailstamp safe."); } catch(e){ $("#rp-go").disabled = false; toast("Couldn't send the report. Try again."); } };
      return;
    }
    if (el.dataset.block){
      const who = el.dataset.block;
      sheet(`<h2>Block this person?</h2><p class="note" style="margin-top:-8px">You won't see their photos or their spot on the leaderboard. They aren't told.</p>
        <div class="actions"><button class="btn ghost" data-close>Cancel</button><button class="btn ember" id="bk-go">Block</button></div>`);
      $("#bk-go").onclick = async () => { try { await check(await sb.from("blocks").upsert({ blocked: who })); blocked.add(who); close(); refresh(); toast("Blocked"); } catch(e){ toast("Couldn't block. Try again."); } };
      return;
    }
    if (a === "signout"){ await sb.auth.signOut(); try { localStorage.removeItem("waypoint-v1"); localStorage.removeItem("waypoint-moments-v1"); } catch(e) {} location.reload(); }
    if (a === "name"){
      sheet(`<h2>Your name</h2><p class="note" style="margin-top:-8px">Friends see this on shared trips and the leaderboard.</p><div class="field"><label for="nm-in">Name</label><input id="nm-in" maxlength="40" value="${esc(names[uidNow()] || "")}"></div>
        <div class="actions"><button class="btn ghost" data-close>Cancel</button><button class="btn" id="nm-go">Save</button></div>`);
      $("#nm-go").onclick = async () => { const n = $("#nm-in").value.trim().slice(0,40); try { await check(await sb.from("profiles").upsert({ user_id: uidNow(), name: n })); names[uidNow()] = n; close(); refresh(); toast("Name saved"); } catch(e){ toast("Couldn't save. Try again."); } };
    }
    if (a === "feedback"){
      sheet(`<h2>Send feedback</h2><p class="note" style="margin-top:-8px">Bugs, ideas, anything confusing. It goes straight to the developer.</p><div class="field"><label for="fb-in">Your feedback</label><textarea id="fb-in" maxlength="4000" placeholder="What happened, and what did you expect?"></textarea></div>
        <div class="actions"><button class="btn ghost" data-close>Cancel</button><button class="btn" id="fb-go">Send</button></div>`);
      $("#fb-go").onclick = async () => { const m = $("#fb-in").value.trim(); if (!m) return; $("#fb-go").disabled = true; try { await check(await sb.from("feedback").insert({ message: m, app_version: CFG.version || "", platform: native ? (window.Capacitor.getPlatform && window.Capacitor.getPlatform()) : "web" })); close(); toast("Thanks! Feedback sent."); } catch(e){ $("#fb-go").disabled = false; toast("Couldn't send. Try again."); } };
    }
    if (a === "delete"){
      sheet(`<h2>Delete your account?</h2><p class="note" style="margin-top:-8px">This permanently deletes your trips, photos, challenges, badges and leaderboard spot. It can't be undone.</p>
        <div class="field"><label for="del-in">Type DELETE to confirm</label><input id="del-in" autocomplete="off"></div>
        <div class="actions"><button class="btn ghost" data-close>Cancel</button><button class="btn ember" id="del-go">Delete account</button></div>`);
      $("#del-go").onclick = async () => {
        if ($("#del-in").value.trim().toUpperCase() !== "DELETE"){ toast("Type DELETE to confirm."); return; }
        $("#del-go").disabled = true; $("#del-go").textContent = "Deleting…";
        try {
          const me = uidNow();
          for (let i = 0; i < 50; i++){ const { data } = await sb.storage.from("photos").list(me, { limit: 100 }); if (!data || !data.length) break; await sb.storage.from("photos").remove(data.map(f => me + "/" + f.name)); }
          await check(await sb.rpc("delete_my_account"));
          await sb.auth.signOut(); try { localStorage.clear(); } catch(e) {}
          document.body.innerHTML = `<main class="wrap"><div class="empty" style="margin-top:20vh"><h3>Your account is deleted</h3><p>All your data has been removed. Thanks for trying Trailstamp.</p></div></main>`;
        } catch(e){ $("#del-go").disabled = false; $("#del-go").textContent = "Delete account"; toast("Couldn't delete the account. Check your connection and try again."); }
      };
    }
  });

  /* ---------- sign in / sign up ---------- */
  function authScreen(mode){
    const signup = mode === "signup";
    $("#app").innerHTML = `<div class="authwrap">
      <div class="hero auth-hero"><span class="scene-auth"></span><span class="shade"></span><span class="hero-in"><span class="hero-title">Trailstamp</span><span class="hero-sub">Plan it, play it, remember it.</span></span></div>
      ${!configured ? `<div class="panel"><h3>Setup needed</h3><p class="note" style="margin:0">Add your Supabase URL and anon key to <b>www/config.js</b>, then rebuild.</p></div>` : `
      <form class="panel" id="authf" novalidate>
        <h3>${signup ? "Create your account" : "Sign in"}</h3>
        ${signup ? `<div class="field"><label for="au-name">Your name</label><input id="au-name" autocomplete="name" maxlength="40" required></div>` : ""}
        <div class="field"><label for="au-email">Email</label><input id="au-email" type="email" autocomplete="email" inputmode="email" required></div>
        <div class="field"><label for="au-pw">Password</label><input id="au-pw" type="password" autocomplete="${signup ? "new-password" : "current-password"}" minlength="8" required>${signup ? `<span class="note">At least 8 characters.</span>` : ""}</div>
        <button class="btn wide" id="au-go">${signup ? "Create account" : "Sign in"}</button>
        <div class="auth-alt">${signup ? `Already have an account? <button type="button" class="linkbtn" data-auth="signin">Sign in</button>` : `New here? <button type="button" class="linkbtn" data-auth="signup">Create an account</button><br><button type="button" class="linkbtn" data-auth="reset">Forgot password?</button>`}</div>
        ${signup && CFG.privacyUrl ? `<p class="note center" style="margin:12px 0 0">By creating an account you agree to the ${CFG.termsUrl ? `<a href="${esc(CFG.termsUrl)}" target="_blank" rel="noopener">terms</a> and ` : ""}<a href="${esc(CFG.privacyUrl)}" target="_blank" rel="noopener">privacy policy</a>.</p>` : ""}
      </form>`}</div>`;
    $("#tabs").innerHTML = "";
    const f = $("#authf"); if (!f) return;
    f.addEventListener("submit", async ev => {
      ev.preventDefault();
      const email = $("#au-email").value.trim(), pw = $("#au-pw").value, go = $("#au-go");
      if (!/^\S+@\S+\.\S+$/.test(email)) return toast("Enter a valid email address.");
      if (pw.length < 8) return toast("Passwords are at least 8 characters.");
      go.disabled = true; go.innerHTML = '<span class="spin"></span>';
      if (signup){
        const name = ($("#au-name").value || "").trim().slice(0,40);
        const r = await sb.auth.signUp({ email, password: pw, options: { data: { name } } });
        go.disabled = false; go.textContent = "Create account";
        if (r.error) return toast(r.error.message);
        if (!r.data.session) return sheetMsg("Check your email", "We sent a confirmation link to " + email + ". Tap it, then come back and sign in.");
      } else {
        const r = await sb.auth.signInWithPassword({ email, password: pw });
        go.disabled = false; go.textContent = "Sign in";
        if (r.error) return toast(/invalid/i.test(r.error.message) ? "Wrong email or password." : r.error.message);
      }
    });
  }
  function sheetMsg(t, m){ sheet(`<h2>${esc(t)}</h2><p>${esc(m)}</p><div class="actions"><button class="btn" data-close>OK</button></div>`); }
  document.addEventListener("click", async ev => {
    const el = ev.target.closest("[data-auth]"); if (!el) return;
    const m = el.dataset.auth;
    if (m === "reset"){
      const email = ($("#au-email") || {}).value || "";
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) return toast("Type your email above first.");
      await sb.auth.resetPasswordForEmail(email.trim(), CFG.resetRedirect ? { redirectTo: CFG.resetRedirect } : {});
      return sheetMsg("Check your email", "If there's an account for " + email.trim() + ", you'll get a link to set a new password.");
    }
    authScreen(m);
  });
  document.addEventListener("click", ev => { const s = ev.target.closest("[data-close]"); if (s && !window.__appLoaded && (ev.target === s || s.tagName === "BUTTON")) close(); });

  /* ---------- crash reporting: errors go to the app_errors table in Supabase ---------- */
  const sentErr = new Set(); let errCount = 0;
  function reportError(message, stack){
    try {
      if (!sb || !session || errCount >= 15) return;
      const key = String(message).slice(0, 200); if (sentErr.has(key)) return; sentErr.add(key); errCount++;
      sb.from("app_errors").insert({ message: String(message).slice(0, 1000), stack: String(stack || "").slice(0, 4000),
        app_version: CFG.version || "", platform: native ? (window.Capacitor.getPlatform && window.Capacitor.getPlatform()) : "web",
        user_agent: navigator.userAgent.slice(0, 300) }).then(() => {}, () => {});
    } catch(e) {}
  }
  window.addEventListener("error", e => reportError(e.message || "error", e.error && e.error.stack || (e.filename + ":" + e.lineno)));
  window.addEventListener("unhandledrejection", e => { const r = e.reason || {}; if (r && r.code && /declined|not_granted|rate_limited|cancel/.test(r.code)) return; reportError(r.message || String(r), r.stack); });

  /* ---------- boot ---------- */
  let booted = false;
  async function startApp(){
    if (booted) return; booted = true;
    const me = uidNow();
    try { const { data } = await sb.from("profiles").select("name").eq("user_id", me).maybeSingle(); names[me] = (data && data.name) || (session.user.user_metadata && session.user.user_metadata.name) || ""; if (!data) await sb.from("profiles").upsert({ user_id: me, name: names[me] }); } catch(e) {}
    await loadBlocks();
    // Keep each account's cached data separate on shared devices.
    try { const last = localStorage.getItem("waypoint-last-user"); if (last && last !== me){ localStorage.removeItem("waypoint-v1"); localStorage.removeItem("waypoint-moments-v1"); } localStorage.setItem("waypoint-last-user", me); } catch(e) {}
    const s = document.createElement("script"); s.src = "app.js"; s.onload = () => { window.__appLoaded = true; }; document.body.appendChild(s);
  }
  async function boot(){
    if (!sb){ authScreen("signin"); return; }
    const { data } = await sb.auth.getSession(); session = data.session;
    sb.auth.onAuthStateChange((ev, s) => { const had = !!session; session = s; if (s && !had) startApp(); if (!s && had) location.reload(); });
    const App = plugin("App");
    if (App && App.addListener) App.addListener("appStateChange", st => { if (st.isActive) polls.forEach(f => f()); });
    if (session) startApp(); else authScreen("signin");
  }
  boot();
})();
