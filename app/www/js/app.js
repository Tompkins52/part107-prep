/* Part 107 Prep app: router, screens, and shared UI helpers.
   Load order: cap/*.js, bank.js, content.js, store.js, app.js (UI helpers), exam.js */
(function () {
  "use strict";
  var BANK = window.P107_BANK, CONTENT = window.P107_CONTENT;
  var APP_VERSION = "1.0.0";

  /* ---------- Capacitor plugin handles (null in a plain browser) ---------- */
  function plugin(ns, name) { return (window[ns] && window[ns][name]) || null; }
  var CapApp = plugin("capacitorApp", "App");
  var Browser = plugin("capacitorBrowser", "Browser");
  var Clipboard = plugin("capacitorClipboard", "Clipboard");
  var Share = plugin("capacitorShare", "Share");
  var StatusBar = plugin("capacitorStatusBar", "StatusBar");
  var Splash = plugin("capacitorSplashScreen", "SplashScreen");
  var Haptics = plugin("capacitorHaptics", "Haptics");
  var isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

  /* ---------- UI helpers ---------- */
  var UI = {
    el: function (tag, attrs, children) {
      var n = document.createElement(tag);
      if (attrs) Object.keys(attrs).forEach(function (k) {
        if (attrs[k] === null || attrs[k] === undefined) return;
        if (k === "class") n.className = attrs[k];
        else if (k === "text") n.textContent = attrs[k];
        else if (k === "html") n.innerHTML = attrs[k];
        else n.setAttribute(k, attrs[k]);
      });
      (children || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
      return n;
    },
    go: function (hash) { if (location.hash === hash) render(); else location.hash = hash; },
    back: function () { if (history.length > 1) history.back(); else UI.go("#/home"); },
    toast: function (msg) {
      var t = document.getElementById("toast");
      t.textContent = msg; t.classList.add("show");
      clearTimeout(UI._toastTimer);
      UI._toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2200);
    },
    confirm: function (title, body, okLabel, onOk, danger) {
      var bg = document.getElementById("modal");
      bg.innerHTML = "";
      var ok = UI.el("button", { type: "button", class: "btn " + (danger ? "btn-danger" : "btn-primary"), text: okLabel });
      var cancel = UI.el("button", { type: "button", class: "btn btn-secondary", text: "Cancel" });
      ok.addEventListener("click", function () { bg.classList.remove("open"); onOk(); });
      cancel.addEventListener("click", function () { bg.classList.remove("open"); });
      bg.appendChild(UI.el("div", { class: "modal", role: "dialog", "aria-modal": "true" }, [UI.el("h3", { text: title }), UI.el("p", { class: "muted", text: body }), UI.el("div", { class: "btn-row" }, [cancel, ok])]));
      bg.classList.add("open");
      ok.focus();
    },
    haptic: function () {
      if (!Haptics || !Store.state.settings.haptics) return;
      try { Haptics.impact({ style: "LIGHT" }).catch(function () {}); } catch (e) { /* unsupported */ }
    },
    openExternal: function (url) {
      if (Browser) { Browser.open({ url: url }).catch(function () { window.open(url, "_blank"); }); }
      else window.open(url, "_blank", "noopener");
    },
    ring: function (pct, color, markAt) {
      var ns = "http://www.w3.org/2000/svg", r = 52, c = 2 * Math.PI * r;
      var svg = document.createElementNS(ns, "svg");
      svg.setAttribute("viewBox", "0 0 128 128"); svg.setAttribute("class", "ring"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", pct + " percent");
      var bg = document.createElementNS(ns, "circle");
      bg.setAttribute("cx", "64"); bg.setAttribute("cy", "64"); bg.setAttribute("r", String(r)); bg.setAttribute("fill", "none"); bg.setAttribute("stroke", "rgba(255,255,255,0.08)"); bg.setAttribute("stroke-width", "11");
      var fg = document.createElementNS(ns, "circle");
      fg.setAttribute("cx", "64"); fg.setAttribute("cy", "64"); fg.setAttribute("r", String(r)); fg.setAttribute("fill", "none"); fg.setAttribute("stroke", color); fg.setAttribute("stroke-width", "11"); fg.setAttribute("stroke-linecap", "round");
      fg.setAttribute("stroke-dasharray", c.toFixed(1)); fg.setAttribute("stroke-dashoffset", (c * (1 - pct / 100)).toFixed(1)); fg.setAttribute("transform", "rotate(-90 64 64)");
      svg.appendChild(bg); svg.appendChild(fg);
      if (markAt) {
        var ang = (markAt / 100) * 2 * Math.PI - Math.PI / 2, m = document.createElementNS(ns, "circle");
        m.setAttribute("cx", (64 + Math.cos(ang) * r).toFixed(1)); m.setAttribute("cy", (64 + Math.sin(ang) * r).toFixed(1)); m.setAttribute("r", "3.5"); m.setAttribute("fill", "var(--cream)");
        svg.appendChild(m);
      }
      var t = document.createElementNS(ns, "text");
      t.setAttribute("x", "64"); t.setAttribute("y", "74"); t.setAttribute("text-anchor", "middle"); t.setAttribute("font-size", "30"); t.textContent = pct + "%";
      svg.appendChild(t);
      return svg;
    }
  };
  window.UI = UI;

  var ICONS = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
    path: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="5" r="2.5"/><circle cx="18" cy="12" r="2.5"/><circle cx="8" cy="19" r="2.5"/><path d="M8.3 6.2l7.4 4.6M15.9 13.6l-5.7 4.1"/></svg>',
    study: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h6a3 3 0 013 3v12a2 2 0 00-2-2H4z"/><path d="M20 5h-6a3 3 0 00-3 3v12a2 2 0 012-2h7z"/></svg>',
    exam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L19 7"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };

  var TABS = [
    { id: "home", label: "Home", route: "#/home", match: /^#\/home/ },
    { id: "path", label: "Path", route: "#/path", match: /^#\/path/ },
    { id: "study", label: "Study", route: "#/study", match: /^#\/study/ },
    { id: "exam", label: "Exam", route: "#/exam", match: /^#\/exam/ },
    { id: "more", label: "More", route: "#/more", match: /^#\/(more|ref|progress|settings|backup|about|privacy)/ }
  ];

  var screenEl, topTitle, backBtn, tabbar;

  /* ---------- Shell ---------- */
  function buildShell() {
    screenEl = document.getElementById("screen");
    topTitle = document.getElementById("top-title");
    backBtn = document.getElementById("back-btn");
    backBtn.innerHTML = ICONS.back;
    backBtn.addEventListener("click", UI.back);
    tabbar = document.getElementById("tabbar");
    TABS.forEach(function (t) {
      var b = UI.el("button", { type: "button", class: "tab", "data-tab": t.id, "aria-label": t.label, html: ICONS[t.id] + "<span>" + t.label + "</span>" });
      b.addEventListener("click", function () {
        if (t.id === "exam" && Exam.active()) { UI.go("#/exam"); return; }
        UI.go(t.route);
      });
      tabbar.appendChild(b);
    });
    /* External links and lightbox, delegated */
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a[href]");
      if (a) {
        var href = a.getAttribute("href");
        if (/^https?:/i.test(href)) { e.preventDefault(); UI.openExternal(href); return; }
        if (/^mailto:/i.test(href)) return;
        if (href.charAt(0) === "#") { e.preventDefault(); UI.go(href); return; }
      }
      var img = e.target.closest && e.target.closest("img.zoomable");
      if (img) openLightbox(img.getAttribute("src"), img.alt);
    });
    var lb = document.getElementById("lightbox");
    lb.querySelector(".lb-close").innerHTML = ICONS.close;
    lb.querySelector(".lb-close").addEventListener("click", closeLightbox);
    lb.querySelector(".lb-zoom").addEventListener("click", function () {
      var im = lb.querySelector("img");
      im.classList.toggle("z2", !im.classList.contains("z2") && !im.classList.contains("z3"));
      if (!im.classList.contains("z2") && !im.classList.contains("z3")) im.classList.add("z2");
    });
    document.getElementById("modal").addEventListener("click", function (e) { if (e.target.id === "modal") e.target.classList.remove("open"); });
  }
  function openLightbox(src, alt) {
    var lb = document.getElementById("lightbox"), im = lb.querySelector("img");
    im.src = src; im.alt = alt || ""; im.className = "z2";
    lb.classList.add("open");
  }
  function closeLightbox() { document.getElementById("lightbox").classList.remove("open"); }

  /* ---------- Router ---------- */
  function parseRoute() {
    var h = location.hash || "#/home";
    var parts = h.slice(2).split("/").filter(Boolean);
    return { hash: h, name: parts[0] || "home", a: parts[1] || "", b: parts[2] || "" };
  }
  var SCREENS = {};
  var lastRoute = "";
  function render() {
    if (!Store.loaded) return;
    var r = parseRoute();
    if (!Store.state.profile.onboarded && r.name !== "welcome" && r.name !== "privacy") { location.replace("#/welcome"); return; }
    var screen = SCREENS[r.name] || SCREENS.home;
    var out = screen(r) || {};
    var sameScreen = lastRoute.split("/").slice(0, 3).join("/") === r.hash.split("/").slice(0, 3).join("/");
    lastRoute = r.hash;
    topTitle.innerHTML = "";
    topTitle.appendChild(document.createTextNode(out.title || "Part 107 Prep"));
    if (out.subtitle) topTitle.appendChild(UI.el("small", { text: out.subtitle }));
    backBtn.hidden = !out.back;
    var tabVisible = out.tabs !== false;
    tabbar.hidden = !tabVisible;
    tabbar.querySelectorAll(".tab").forEach(function (b) {
      var t = TABS.filter(function (x) { return x.id === b.getAttribute("data-tab"); })[0];
      b.classList.toggle("active", t.match.test(r.hash));
    });
    if (out.scrollTo) {
      var target = document.getElementById(out.scrollTo);
      if (target) { target.scrollIntoView({ block: "start" }); return; }
    }
    if (!sameScreen || out.resetScroll) screenEl.scrollTop = 0;
  }
  window.addEventListener("hashchange", render);

  function page(children, cls) { var p = UI.el("div", { class: "page " + (cls || "") }, children); screenEl.innerHTML = ""; screenEl.appendChild(p); return p; }

  function greeting() {
    var h = new Date().getHours();
    return h < 5 ? "Burning the midnight oil" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  }
  function daysUntil(dateStr) {
    if (!dateStr) return null;
    var parts = dateStr.split("-").map(Number);
    var target = new Date(parts[0], parts[1] - 1, parts[2]);
    var now = new Date(); now.setHours(0, 0, 0, 0);
    return Math.round((target - now) / 86400000);
  }
  function fmtDate(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + ", " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  function catFor(moduleId) { var m = CONTENT.modules.filter(function (x) { return x.id === moduleId; })[0]; return m ? m.cat : null; }
  function moduleFor(cat) { var m = CONTENT.modules.filter(function (x) { return x.cat === cat; })[0]; return m ? m.id : "regulations"; }

  /* ---------- Welcome ---------- */
  SCREENS.welcome = function () {
    var el = UI.el, s = Store.state;
    var name = el("input", { type: "text", id: "w-name", maxlength: "40", placeholder: "First name or nickname", autocomplete: "given-name", value: s.profile.name || "" });
    var date = el("input", { type: "date", id: "w-date", value: s.profile.testDate || "" });
    var start = el("button", { type: "button", class: "btn btn-primary btn-block", text: "Start studying" });
    start.addEventListener("click", function () {
      s.profile.name = name.value.trim().slice(0, 40);
      s.profile.testDate = date.value || "";
      s.profile.onboarded = true;
      if (!s.profile.createdAt) s.profile.createdAt = new Date().toISOString();
      Store.touchDay();
      Store.flush();
      UI.go("#/home");
    });
    var privacy = el("a", { href: "#/privacy", text: "Read the privacy policy" });
    page([
      el("img", { class: "logo", src: "img/logo.svg", alt: "" }),
      el("h1", { text: "Part 107 Prep" }),
      el("p", { class: "lede", text: "Study for the FAA remote pilot test, track your progress, and know when you are ready to book." }),
      el("div", { class: "field" }, [el("label", { for: "w-name", text: "What should we call you?" }), name, el("div", { class: "hint", text: "Optional. It only appears on your home screen." })]),
      el("div", { class: "field" }, [el("label", { for: "w-date", text: "Test date, if you have one" }), date, el("div", { class: "hint", text: "Optional. You can set or change it later in Settings." })]),
      el("div", { class: "privacy-note" }, [el("span", { html: ICONS.shield }), el("p", { html: "<strong>Your progress never leaves this phone.</strong> There is no account, no sign-in, and no server. Everything you enter and every score is stored only on this device. Delete the app and it is gone." })]),
      start,
      el("p", { class: "small muted", style: "text-align:center;margin-top:14px" }, [privacy])
    ], "welcome");
    return { title: "Welcome", tabs: false };
  };

  /* ---------- Home ---------- */
  SCREENS.home = function () {
    var el = UI.el, s = Store.state;
    var ready = Store.readiness(BANK, CONTENT.modules);
    var label = ready >= 85 ? "Ready to book" : ready >= 70 ? "Almost ready" : ready >= 45 ? "Getting there" : ready > 0 ? "Keep going" : "Just getting started";
    var color = ready >= 85 ? "var(--green)" : ready >= 70 ? "var(--amber)" : ready > 0 ? "var(--blue)" : "var(--line-strong)";
    var scored = s.attempts.filter(function (a) { return a.mode === "full" || a.mode === "quick"; });
    var best = scored.length ? Math.max.apply(null, scored.map(function (a) { return a.score; })) : null;
    var last = scored[0] || null;
    var modsDone = CONTENT.modules.filter(function (m) { return (s.modules[m.id] || {}).completedAt; }).length;
    var stepsDone = CONTENT.steps.filter(function (st) { return s.steps[st.id]; }).length;
    var streak = Store.streak();
    var dU = daysUntil(s.profile.testDate);

    /* What to do next */
    var next;
    var firstUnread = CONTENT.modules.filter(function (m) { return !(s.modules[m.id] || {}).completedAt; })[0];
    var acc = Store.categoryAccuracy(BANK);
    var weakest = null;
    Object.keys(acc).forEach(function (c) { if (acc[c].seen >= 3) { var p = acc[c].correct / acc[c].seen; if (!weakest || p < weakest.p) weakest = { c: c, p: p }; } });
    if (!scored.length && modsDone === 0 && firstUnread) next = { t: "Start with module 1", d: firstUnread.title + ". About " + firstUnread.minutes + " minutes.", h: "#/study/" + firstUnread.id, b: "Open module" };
    else if (firstUnread && (!last || last.score < 70)) next = { t: "Read: " + firstUnread.title, d: "Module " + firstUnread.num + " of 5. About " + firstUnread.minutes + " minutes.", h: "#/study/" + firstUnread.id, b: "Open module" };
    else if (!scored.length) next = { t: "Take a quick check", d: "20 questions, about ten minutes, to see where you stand.", h: "#/exam/quick", b: "Start quick check" };
    else if (weakest && weakest.p < 0.8) next = { t: "Drill " + BANK.categories[weakest.c].name.toLowerCase(), d: "Your weakest area at " + Math.round(weakest.p * 100) + " percent. A 15-question weak-spots quiz targets what you missed.", h: "#/exam/weak", b: "Start weak spots" };
    else if (last && last.score < 85) next = { t: "Take a full practice exam", d: "Your last score was " + last.score + " percent. Aim for 85 or better on two full exams before booking.", h: "#/exam/full", b: "Start full exam" };
    else {
      var nextStep = CONTENT.steps.filter(function (st) { return !s.steps[st.id]; })[0];
      next = nextStep ? { t: "Next on your path: " + nextStep.title, d: "Your scores say you are ready. Keep moving through the certification steps.", h: "#/path", b: "Open the path" }
                      : { t: "Stay sharp", d: "Everything is checked off. A quick check now and then keeps the material fresh.", h: "#/exam/quick", b: "Quick check" };
    }

    var children = [
      el("p", { class: "kicker", text: greeting() + (s.profile.name ? ", " + s.profile.name : "") + (streak > 1 ? ". " + streak + " day streak." : "") }),
      el("h1", { text: "Your readiness" }),
      el("div", { class: "card" }, [
        el("div", { class: "ready" }, [UI.ring(ready, color), el("div", {}, [el("h2", { text: label }), el("p", { text: ready ? "An estimate from your recent exam scores, question accuracy by category, and the modules you have finished." : "Read a module or take a quick check and this will start moving." })])])
      ]),
      dU !== null ? el("div", { class: "card", style: "padding:14px 18px" }, [el("p", { style: "margin:0", html: dU > 1 ? "<strong>" + dU + " days</strong> until your test." : dU === 1 ? "<strong>Your test is tomorrow.</strong> Rest tonight." : dU === 0 ? "<strong>Test day.</strong> Bring your photo ID and FTN." : "Your test date has passed. <a href='#/settings'>Update it in Settings</a>." })]) : null,
      el("div", { class: "card" }, [el("p", { class: "kicker", text: "Up next" }), el("h3", { text: next.t }), el("p", { class: "muted", text: next.d }), el("a", { class: "btn btn-primary", href: next.h, text: next.b })]),
      el("div", { class: "stats four" }, [
        el("div", { class: "stat" }, [el("b", { text: best === null ? "–" : best + "%" }), el("span", { text: "best score" })]),
        el("div", { class: "stat" }, [el("b", { text: String(scored.length) }), el("span", { text: scored.length === 1 ? "exam" : "exams" })]),
        el("div", { class: "stat" }, [el("b", { text: modsDone + "/5" }), el("span", { text: "modules" })]),
        el("div", { class: "stat" }, [el("b", { text: stepsDone + "/10" }), el("span", { text: "steps" })])
      ])
    ];
    var anySeen = Object.keys(acc).some(function (c) { return acc[c].seen > 0; });
    var cats = el("ul", { class: "cats" });
    Object.keys(BANK.categories).forEach(function (c) {
      var a = acc[c], pct = a.seen ? Math.round((a.correct / a.seen) * 100) : 0, cls = !a.seen ? "" : pct >= 80 ? "green" : pct >= 60 ? "amber" : "red";
      cats.appendChild(el("li", {}, [
        el("div", {}, [el("div", { class: "name" }, [el("a", { href: "#/study/" + moduleFor(c), text: BANK.categories[c].name, style: "color:var(--text);text-decoration:none" }), el("span", { text: a.seen ? a.correct + "/" + a.seen : "no data" })]), el("div", { class: "bar" }, [el("span", { class: cls, style: "width:" + pct + "%" })])]),
        el("span", { class: "pct", text: a.seen ? pct + "%" : "–" })
      ]));
    });
    children.push(el("div", { class: "card" }, [el("h3", { text: "Accuracy by category" }), anySeen ? null : el("p", { class: "muted small", text: "Answer some questions and your accuracy in each knowledge area shows up here." }), cats, el("p", { style: "margin:14px 0 0" }, [el("a", { href: "#/progress", text: "See all attempts and trends" })])]));
    children.push(el("div", { class: "btn-row" }, [el("a", { class: "btn btn-secondary", href: "#/exam/quick", text: "Quick check" }), el("a", { class: "btn btn-blue", href: "#/exam/full", text: "Full exam" })]));
    page(children);
    return { title: "Part 107 Prep", subtitle: "Remote pilot study app" };
  };

  /* ---------- Path ---------- */
  SCREENS.path = function (r) {
    var el = UI.el, s = Store.state;
    var done = CONTENT.steps.filter(function (st) { return s.steps[st.id]; }).length;
    var children = [
      el("h1", { text: "Your path to the certificate" }),
      el("p", { class: "lede", text: "No flight test and no required course. One knowledge exam, an online application, a background check, and a card in the mail. Check off each step as you go." }),
      el("div", { class: "bar-label" }, [el("span", { html: "<b>" + done + "</b> of " + CONTENT.steps.length + " steps done" }), el("span", { text: Math.round((done / CONTENT.steps.length) * 100) + "%" })]),
      el("div", { class: "bar", style: "margin-bottom:18px" }, [el("span", { class: "green", style: "width:" + Math.round((done / CONTENT.steps.length) * 100) + "%" })])
    ];
    var firstOpen = CONTENT.steps.filter(function (st) { return !s.steps[st.id]; })[0];
    CONTENT.steps.forEach(function (st) {
      var isDone = !!s.steps[st.id];
      var wrap = el("div", { class: "step" + (isDone ? " done" : ""), id: "step-" + st.id });
      if (r.a === st.id || (!r.a && firstOpen && firstOpen.id === st.id)) wrap.setAttribute("open", "");
      var head = el("button", { type: "button", class: "step-head", "aria-expanded": wrap.hasAttribute("open") ? "true" : "false" }, [
        el("span", { class: "num", html: isDone ? ICONS.check : String(st.num) }),
        el("span", {}, [el("h3", { text: st.title }), st.meta ? el("div", { class: "meta", text: st.meta }) : null]),
        el("span", { class: "chev", html: ICONS.down })
      ]);
      head.addEventListener("click", function () { var open = wrap.toggleAttribute("open"); head.setAttribute("aria-expanded", open ? "true" : "false"); });
      var body = el("div", { class: "step-body", html: st.html });
      var toggle = el("button", { type: "button", class: "btn " + (isDone ? "btn-secondary" : "btn-primary"), text: isDone ? "Mark not done" : "Mark done" });
      toggle.addEventListener("click", function () { Store.toggleStep(st.id); UI.haptic(); SCREENS.path({ a: st.id }); });
      body.appendChild(el("div", { class: "step-actions" }, [toggle]));
      wrap.appendChild(head); wrap.appendChild(body);
      children.push(wrap);
    });
    var check = el("div", { class: "card", style: "margin-top:22px" }, [el("h3", { text: "Test day checklist" })]);
    CONTENT.checklist.forEach(function (item, i) {
      var on = !!s.checks[i];
      var row = el("button", { type: "button", class: "checkrow", role: "checkbox", "aria-checked": on ? "true" : "false" }, [el("span", { class: "box", html: ICONS.check }), el("span", { class: "t", text: item })]);
      row.addEventListener("click", function () { var v = Store.toggleCheck(i); row.setAttribute("aria-checked", v ? "true" : "false"); UI.haptic(); });
      check.appendChild(row);
    });
    children.push(check);
    children.push(el("div", { class: "card" }, [el("h3", { text: "Common questions" }), el("div", { class: "content", html: CONTENT.faq })]));
    page(children);
    return { title: "The path" };
  };

  /* ---------- Study ---------- */
  SCREENS.study = function (r) {
    if (r.a) return moduleScreen(r.a, r.b);
    var el = UI.el, s = Store.state;
    var rows = el("div", { class: "rows" });
    CONTENT.modules.forEach(function (m) {
      var ms = s.modules[m.id] || {};
      var status = ms.completedAt ? "Completed" : ms.openedAt ? "In progress" + (ms.lastSection ? ": " + (m.sections.filter(function (x) { return x.id === ms.lastSection; })[0] || {}).title : "") : "About " + m.minutes + " min";
      var row = el("a", { class: "row", href: "#/study/" + m.id }, [
        el("span", { class: "badge " + (ms.completedAt ? "done" : ms.openedAt ? "active" : ""), html: ms.completedAt ? ICONS.check : String(m.num) }),
        el("span", {}, [el("div", { class: "label", text: m.title }), el("div", { class: "sub", text: m.weight + " of the test. " + status })]),
        el("span", { class: "chev", html: ICONS.chev })
      ]);
      rows.appendChild(row);
    });
    var refs = el("div", { class: "rows" });
    [["regs", "Part 107 cheat sheet", "Every section of the rule in plain English"], ["safety", "Safety", "Go/no-go, preflight checklist, emergencies, batteries"], ["resources", "Resources", "Official FAA links and tools"]].forEach(function (p) {
      refs.appendChild(el("a", { class: "row", href: "#/ref/" + p[0] }, [el("span", { class: "badge", html: '<span style="font-size:1rem">&sect;</span>' }), el("span", {}, [el("div", { class: "label", text: p[1] }), el("div", { class: "sub", text: p[2] })]), el("span", { class: "chev", html: ICONS.chev })]));
    });
    page([
      el("h1", { text: "Study guide" }),
      el("p", { class: "lede", text: "Five modules matched to the FAA's knowledge areas. Read them in order if you are new to aviation; jump to the weak spots if you are not." }),
      rows,
      el("h2", { text: "Reference" }),
      refs
    ]);
    return { title: "Study" };
  };

  var sectionObserver = null;
  function moduleScreen(id, section) {
    var el = UI.el, m = CONTENT.modules.filter(function (x) { return x.id === id; })[0];
    if (!m) { UI.go("#/study"); return {}; }
    Store.openModule(id);
    var ms = Store.moduleState(id);
    var sel = el("select", { "aria-label": "Jump to section" }, [el("option", { value: "", text: "Jump to a section" })].concat(m.sections.map(function (sc) { return el("option", { value: sc.id, text: sc.title }); })));
    sel.addEventListener("change", function () { if (sel.value) { UI.go("#/study/" + id + "/" + sel.value); sel.value = ""; } });
    var content = el("div", { class: "content", html: m.html });
    var doneBtn = el("button", { type: "button", class: "btn " + (ms.completedAt ? "btn-secondary" : "btn-primary") + " btn-block", text: ms.completedAt ? "Mark as not complete" : "Mark module complete" });
    var note = el("p", { class: "done-note", text: ms.completedAt ? "Completed " + fmtDate(ms.completedAt) : "" });
    doneBtn.addEventListener("click", function () {
      var v = Store.toggleModuleComplete(id); UI.haptic();
      doneBtn.textContent = v ? "Mark as not complete" : "Mark module complete";
      doneBtn.className = "btn " + (v ? "btn-secondary" : "btn-primary") + " btn-block";
      note.textContent = v ? "Completed " + fmtDate(Store.moduleState(id).completedAt) : "";
      if (v) UI.toast("Module " + m.num + " complete");
    });
    var nextMod = CONTENT.modules[m.num] || null;
    page([
      el("p", { class: "kicker", text: "Module " + m.num + " of 5. " + m.weight + " of the test." }),
      el("h1", { text: m.title }),
      el("p", { class: "lede", text: m.intro }),
      el("div", { class: "select-wrap section-jump" }, [sel]),
      content,
      el("div", { class: "module-foot" }, [
        note, doneBtn,
        el("div", { class: "btn-row" }, [
          el("a", { class: "btn btn-blue", href: "#/exam/topic/" + m.cat, text: "Quiz this module" }),
          nextMod ? el("a", { class: "btn btn-secondary", href: "#/study/" + nextMod.id, text: "Next: " + nextMod.title }) : el("a", { class: "btn btn-secondary", href: "#/exam/full", text: "Full practice exam" })
        ])
      ])
    ]);
    /* Remember the section in view */
    if (sectionObserver) sectionObserver.disconnect();
    if ("IntersectionObserver" in window) {
      sectionObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) Store.setModuleSection(id, en.target.id); });
      }, { root: screenEl, rootMargin: "0px 0px -70% 0px" });
      content.querySelectorAll("h2[id]").forEach(function (h) { sectionObserver.observe(h); });
    }
    return { title: m.title, back: true, scrollTo: section || null };
  }

  /* ---------- Reference pages ---------- */
  SCREENS.ref = function (r) {
    var el = UI.el, ref = CONTENT.references.filter(function (x) { return x.id === r.a; })[0];
    if (!ref) { UI.go("#/more"); return {}; }
    Store.touchDay();
    var children = [el("h1", { text: ref.title }), el("p", { class: "lede", text: ref.intro })];
    if (ref.sections.length) {
      var sel = el("select", { "aria-label": "Jump to section" }, [el("option", { value: "", text: "Jump to a section" })].concat(ref.sections.map(function (sc) { return el("option", { value: sc.id, text: sc.title }); })));
      sel.addEventListener("change", function () { if (sel.value) { UI.go("#/ref/" + ref.id + "/" + sel.value); sel.value = ""; } });
      children.push(el("div", { class: "select-wrap section-jump" }, [sel]));
    }
    children.push(el("div", { class: "content", html: ref.html }));
    if (ref.id === "regs") children.push(el("div", { class: "btn-row" }, [el("a", { class: "btn btn-blue", href: "#/exam/topic/regulations", text: "Quiz the regulations" })]));
    if (ref.id === "safety") children.push(el("div", { class: "btn-row" }, [el("a", { class: "btn btn-blue", href: "#/exam/topic/operations", text: "Quiz operations and safety" })]));
    page(children);
    return { title: ref.short, back: true, scrollTo: r.b || null };
  };

  /* ---------- Exam ---------- */
  SCREENS.exam = function (r) {
    var el = UI.el, s = Store.state;
    /* Deep links start a session directly */
    if (r.a === "full" || r.a === "quick" || r.a === "weak" || (r.a === "topic" && BANK.categories[r.b])) {
      if (!Exam.active()) Exam.start(r.a, { cat: r.b, study: r.a === "topic" || r.a === "weak" ? true : (r.a === "quick" ? s.settings.studyMode : false) });
      location.replace("#/exam");
      return {};
    }
    if (Exam.active() || Exam.hasResult()) {
      var holder = el("div");
      page([holder]);
      Exam.onUpdate = function () { if (location.hash.indexOf("#/exam") === 0) render(); };
      Exam.render(holder);
      return { title: Exam.active() ? Exam.session.title : "Results", resetScroll: true };
    }
    var study = s.settings.studyMode;
    var studyToggle = el("button", { type: "button", class: "toggle", role: "switch", "aria-checked": study ? "true" : "false", "aria-label": "Show answers after each question" });
    studyToggle.addEventListener("click", function () { s.settings.studyMode = !s.settings.studyMode; Store.save(); studyToggle.setAttribute("aria-checked", s.settings.studyMode ? "true" : "false"); });
    var topicSel = el("select", { "aria-label": "Topic" }, Object.keys(BANK.categories).map(function (c) { return el("option", { value: c, text: BANK.categories[c].name }); }));
    function mode(title, spec, desc, onClick, extra) {
      var b = el(extra ? "div" : "button", { type: extra ? null : "button", class: "mode" }, [el("h3", { text: title }), el("span", { class: "spec", text: spec }), el("p", { text: desc })]);
      if (extra) { b.appendChild(extra); }
      else b.addEventListener("click", onClick);
      return b;
    }
    var seen = Object.keys(s.qstats).length;
    var topicBtn = el("button", { type: "button", class: "btn btn-blue btn-block", style: "margin-top:8px", text: "Start topic quiz" });
    topicBtn.addEventListener("click", function () { Exam.start("topic", { cat: topicSel.value, study: true }); render(); });
    var children = [
      el("h1", { text: "Practice exam" }),
      el("p", { class: "lede", text: "Three choices, one correct, scored at 70 percent like the real UAG test. Answer order is shuffled every time." }),
      mode("Full practice exam", "60 questions, 2 hour timer", "Weighted like the real test. Flag questions and review before you finish.", function () { Exam.start("full", { study: false }); render(); }),
      mode("Quick check", "20 questions, untimed", "Ten minutes to see where you stand, same category mix.", function () { Exam.start("quick", { study: s.settings.studyMode }); render(); }),
      mode("Weak spots", "15 questions, study mode", seen ? "Questions you have missed or never seen, weighted toward your mistakes." : "Take any quiz first; this mode learns from what you miss.", function () { Exam.start("weak", { study: true }); render(); }),
      mode("Topic quiz", "15 questions, study mode", "Drill one knowledge area.", null, el("div", {}, [el("div", { class: "select-wrap" }, [topicSel]), topicBtn])),
      el("div", { class: "card", style: "padding:6px 18px" }, [el("div", { class: "switch" }, [el("div", {}, [el("div", { class: "sw-label", text: "Study mode on quick checks" }), el("div", { class: "sw-sub", text: "Show the answer and explanation after each question" })]), studyToggle])])
    ];
    if (s.attempts.length) {
      var hist = el("div", { class: "card" }, [el("h3", { text: "Recent attempts" })]);
      s.attempts.slice(0, 5).forEach(function (a) { hist.appendChild(attemptRow(a)); });
      hist.appendChild(el("p", { style: "margin:12px 0 0" }, [el("a", { href: "#/progress", text: "All attempts and trends" })]));
      children.push(hist);
    }
    page(children);
    return { title: "Practice exam" };
  };
  function attemptRow(a) {
    var el = UI.el;
    return el("div", { class: "attempt" }, [
      el("div", {}, [el("div", { class: "a-title", text: a.title }), el("div", { class: "a-sub", text: fmtDate(a.date) + ". " + a.correct + " of " + a.total })]),
      el("div", { class: "a-score " + (a.passed ? "pass" : "fail"), text: a.score + "%" })
    ]);
  }

  /* ---------- Progress ---------- */
  SCREENS.progress = function () {
    var el = UI.el, s = Store.state;
    var scored = s.attempts.filter(function (a) { return a.mode === "full" || a.mode === "quick"; });
    var children = [el("h1", { text: "Progress" }), el("p", { class: "lede", text: "Every attempt, your trend, and the areas that need work. All of it stays on this phone." })];
    if (!s.attempts.length) {
      children.push(el("div", { class: "card" }, [el("p", { class: "muted", text: "No attempts yet. Take a quick check and your history starts here." }), el("a", { class: "btn btn-primary", href: "#/exam/quick", text: "Start a quick check" })]));
    } else {
      var trend = scored.slice(0, 12).reverse();
      if (trend.length >= 2) {
        var w = 320, h = 90, pad = 8;
        var pts = trend.map(function (a, i) { return [pad + (i / (trend.length - 1)) * (w - pad * 2), h - pad - (a.score / 100) * (h - pad * 2)]; });
        var passY = h - pad - 0.7 * (h - pad * 2);
        var svg = '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" role="img" aria-label="Score trend">' +
          '<line x1="0" y1="' + passY + '" x2="' + w + '" y2="' + passY + '" stroke="rgba(243,234,215,0.35)" stroke-dasharray="4 4"/>' +
          '<polyline fill="none" stroke="var(--blue)" stroke-width="2.5" stroke-linejoin="round" points="' + pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + '"/>' +
          pts.map(function (p, i) { return '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="4" fill="' + (trend[i].passed ? "var(--green)" : "var(--red)") + '"/>'; }).join("") + '</svg>';
        children.push(el("div", { class: "card" }, [el("h3", { text: "Score trend" }), el("div", { html: svg }), el("p", { class: "muted small", style: "margin:0", text: "Last " + trend.length + " full exams and quick checks. The dashed line is the 70 percent pass mark." })]));
      }
      var best = scored.length ? Math.max.apply(null, scored.map(function (a) { return a.score; })) : null;
      var passes = scored.filter(function (a) { return a.passed; }).length;
      var answered = Object.keys(s.qstats).length;
      children.push(el("div", { class: "stats four" }, [
        el("div", { class: "stat" }, [el("b", { text: best === null ? "–" : best + "%" }), el("span", { text: "best" })]),
        el("div", { class: "stat" }, [el("b", { text: passes + "/" + scored.length }), el("span", { text: "passed" })]),
        el("div", { class: "stat" }, [el("b", { text: answered + "/" + BANK.questions.length }), el("span", { text: "questions seen" })]),
        el("div", { class: "stat" }, [el("b", { text: String(Store.streak()) }), el("span", { text: "day streak" })])
      ]));
      /* Weakest subtopics */
      var subs = {};
      BANK.questions.forEach(function (q) {
        var st = s.qstats[q.id]; if (!st) return;
        var k = BANK.categories[q.cat].short + ": " + q.sub;
        subs[k] = subs[k] || { seen: 0, correct: 0, cat: q.cat };
        subs[k].seen += st.seen; subs[k].correct += st.correct;
      });
      var weak = Object.keys(subs).map(function (k) { return { k: k, seen: subs[k].seen, pct: subs[k].correct / subs[k].seen, cat: subs[k].cat }; })
        .filter(function (x) { return x.seen >= 2 && x.pct < 0.8; }).sort(function (a, b) { return a.pct - b.pct; }).slice(0, 6);
      if (weak.length) {
        var wl = el("ul", { class: "cats" });
        weak.forEach(function (x) {
          var pct = Math.round(x.pct * 100);
          wl.appendChild(el("li", {}, [el("div", {}, [el("div", { class: "name" }, [el("a", { href: "#/study/" + moduleFor(x.cat), text: x.k, style: "color:var(--text);text-decoration:none" }), el("span", { text: x.seen + " seen" })]), el("div", { class: "bar" }, [el("span", { class: pct >= 60 ? "amber" : "red", style: "width:" + pct + "%" })])]), el("span", { class: "pct", text: pct + "%" })]));
        });
        children.push(el("div", { class: "card" }, [el("h3", { text: "Topics to review" }), wl, el("a", { class: "btn btn-primary", style: "margin-top:14px", href: "#/exam/weak", text: "Drill weak spots" })]));
      }
      var list = el("div", { class: "card" }, [el("h3", { text: "All attempts" })]);
      s.attempts.forEach(function (a) { list.appendChild(attemptRow(a)); });
      children.push(list);
    }
    page(children);
    return { title: "Progress", back: true };
  };

  /* ---------- More ---------- */
  SCREENS.more = function () {
    var el = UI.el;
    var rows = el("div", { class: "rows" });
    [["#/progress", "Progress and history", "Scores, trends, topics to review"], ["#/ref/regs", "Part 107 cheat sheet", "The rule, section by section"], ["#/ref/safety", "Safety", "Go/no-go, preflight checklist, emergencies"], ["#/ref/resources", "Resources", "Official FAA links and tools"],
     ["#/settings", "Settings", "Name, test date, study mode"], ["#/backup", "Backup and restore", "Move your progress to a new phone"], ["#/privacy", "Privacy", "Nothing leaves this device"], ["#/about", "About", "Version, sources, disclaimer"]].forEach(function (p) {
      rows.appendChild(el("a", { class: "row", href: p[0] }, [el("span", {}, [el("div", { class: "label", text: p[1] }), el("div", { class: "sub", text: p[2] })]), el("span", { class: "chev", html: ICONS.chev })]));
    });
    rows.querySelectorAll(".row").forEach(function (rw) { rw.style.gridTemplateColumns = "minmax(0,1fr) auto"; });
    page([el("h1", { text: "More" }), rows]);
    return { title: "More" };
  };

  SCREENS.settings = function () {
    var el = UI.el, s = Store.state;
    var name = el("input", { type: "text", maxlength: "40", value: s.profile.name || "", placeholder: "First name or nickname" });
    name.addEventListener("change", function () { s.profile.name = name.value.trim().slice(0, 40); Store.save(); UI.toast("Saved"); });
    var date = el("input", { type: "date", value: s.profile.testDate || "" });
    date.addEventListener("change", function () { s.profile.testDate = date.value || ""; Store.save(); UI.toast("Saved"); });
    function sw(label, sub, key) {
      var t = el("button", { type: "button", class: "toggle", role: "switch", "aria-checked": s.settings[key] ? "true" : "false", "aria-label": label });
      t.addEventListener("click", function () { s.settings[key] = !s.settings[key]; Store.save(); t.setAttribute("aria-checked", s.settings[key] ? "true" : "false"); });
      return el("div", { class: "switch" }, [el("div", {}, [el("div", { class: "sw-label", text: label }), el("div", { class: "sw-sub", text: sub })]), t]);
    }
    var reset = el("button", { type: "button", class: "btn btn-danger btn-block", text: "Erase all progress" });
    reset.addEventListener("click", function () {
      UI.confirm("Erase everything?", "Your name, checked steps, module progress, and every exam score on this phone will be deleted. There is no copy anywhere else.", "Erase", function () { Exam.clear(); Store.reset().then(function () { location.replace("#/welcome"); UI.toast("Progress erased"); }); }, true);
    });
    page([
      el("h1", { text: "Settings" }),
      el("div", { class: "card" }, [
        el("div", { class: "field" }, [el("label", { text: "Your name" }), name, el("div", { class: "hint", text: "Only shown on your home screen." })]),
        el("div", { class: "field" }, [el("label", { text: "Test date" }), date, el("div", { class: "hint", text: "Shows a countdown on your home screen." })])
      ]),
      el("div", { class: "card", style: "padding:6px 18px" }, [sw("Study mode on quick checks", "Show the answer after each question", "studyMode"), sw("Haptic feedback", "A light tap when you answer or check something off", "haptics")]),
      el("div", { class: "card" }, [el("h3", { text: "Start over" }), el("p", { class: "muted small", text: "Erases all progress stored by this app on this phone." }), reset])
    ]);
    return { title: "Settings", back: true };
  };

  SCREENS.backup = function () {
    var el = UI.el;
    var code = el("textarea", { readonly: "readonly", "aria-label": "Backup code" });
    code.value = Store.exportCode();
    var copy = el("button", { type: "button", class: "btn btn-primary", text: "Copy code" });
    copy.addEventListener("click", function () {
      var text = Store.exportCode();
      if (Clipboard) Clipboard.write({ string: text }).then(function () { UI.toast("Copied"); }).catch(function () { fallbackCopy(text); });
      else fallbackCopy(text);
    });
    function fallbackCopy(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { UI.toast("Copied"); }, function () { code.select(); UI.toast("Select the code and copy it"); });
      else { code.select(); UI.toast("Select the code and copy it"); }
    }
    var share = el("button", { type: "button", class: "btn btn-secondary", text: "Share" });
    share.addEventListener("click", function () {
      var text = Store.exportCode();
      var p = Share ? Share.share({ title: "Part 107 Prep backup", text: text, dialogTitle: "Save your backup code" }) : (navigator.share ? navigator.share({ title: "Part 107 Prep backup", text: text }) : Promise.reject());
      p.catch(function () { fallbackCopy(text); });
    });
    var paste = el("textarea", { placeholder: "Paste a backup code here", "aria-label": "Restore code" });
    var restore = el("button", { type: "button", class: "btn btn-blue btn-block", text: "Restore from code" });
    restore.addEventListener("click", function () {
      var v = paste.value.trim(); if (!v) { UI.toast("Paste a backup code first"); return; }
      UI.confirm("Replace your progress?", "Restoring replaces everything currently saved on this phone with the backup.", "Restore", function () {
        Store.importCode(v).then(function () { Exam.clear(); UI.toast("Progress restored"); UI.go("#/home"); }).catch(function (e) { UI.toast(e.message || "That code did not work"); });
      }, true);
    });
    page([
      el("h1", { text: "Backup and restore" }),
      el("p", { class: "lede", text: "Your progress is stored only on this phone, so there is no account to sign in to on a new one. A backup code is a copy of your progress that you keep yourself: paste it into a notes app, an email to yourself, or a password manager." }),
      el("div", { class: "card" }, [el("h3", { text: "Your backup code" }), el("div", { class: "field" }, [code]), el("div", { class: "btn-row", style: "margin-bottom:0" }, [copy, share]), el("p", { class: "muted small", style: "margin:12px 0 0", text: "The code contains your name, test date, checked steps, module progress, and exam history. Nothing else." })]),
      el("div", { class: "card" }, [el("h3", { text: "Restore on this phone" }), el("div", { class: "field" }, [paste]), restore])
    ]);
    return { title: "Backup", back: true };
  };

  SCREENS.privacy = function () {
    var el = UI.el;
    page([
      el("h1", { text: "Privacy" }),
      el("div", { class: "privacy-note" }, [el("span", { html: ICONS.shield }), el("p", { html: "<strong>This app collects no data.</strong> It has no account system, no analytics, no advertising, and no server of its own." })]),
      el("div", { class: "content" }, [
        el("h2", { text: "What the app stores" }),
        el("p", { text: "The name you choose to enter, an optional test date, which steps and modules you have marked complete, your settings, and the results of practice exams you take. This information is stored only in the app's private storage on your device. It is never transmitted to the developer or to anyone else." }),
        el("h2", { text: "Your device backups" }),
        el("p", { text: "If you use your phone's own backup (for example iCloud Backup or Google's Android backup), the app's storage may be included in that backup under your own account, controlled by you and your platform provider's terms. The developer has no access to it." }),
        el("h2", { text: "Backup codes" }),
        el("p", { text: "The Backup and restore screen can generate a code containing your progress. The app shows it to you and, if you choose, hands it to your device's share sheet. Where you send it is up to you." }),
        el("h2", { text: "External links" }),
        el("p", { text: "The Resources page links to FAA and other third-party websites, which open in your device's browser and have their own privacy policies." }),
        el("h2", { text: "Deleting your data" }),
        el("p", { text: "Use Settings, then Erase all progress, or delete the app. Either removes everything." }),
        el("h2", { text: "Contact" }),
        el("p", { text: "Questions about this policy can be sent through the app's store listing. The full policy is also published on the Part 107 Prep website." })
      ])
    ]);
    return { title: "Privacy", back: true };
  };

  SCREENS.about = function () {
    var el = UI.el;
    page([
      el("h1", { text: "About" }),
      el("div", { class: "card" }, [
        el("p", { html: "<strong>Part 107 Prep</strong> version " + APP_VERSION + ". Content reviewed " + CONTENT.generated + "." }),
        el("p", { class: "muted small", text: "A free, independent study resource for the FAA remote pilot certificate. Not affiliated with or endorsed by the Federal Aviation Administration. Regulations change: before you fly, confirm every rule against the current 14 CFR Part 107 and FAA guidance." }),
        el("p", { class: "muted small", text: BANK.questions.length + " practice questions across five knowledge areas, all original and referenced to FAA sources. The practice chart is fictional and not for navigation." }),
        el("p", { style: "margin:0" }, [el("a", { href: "https://tompkins52.github.io/part107-prep/", text: "Part 107 Prep website" })])
      ]),
      el("div", { class: "card" }, [el("h3", { text: "Sources" }), el("ul", { class: "small", style: "margin:0" }, [
        el("li", { text: "14 CFR Parts 48, 89, 91, 107" }), el("li", { text: "FAA Remote Pilot Small UAS Study Guide and Airman Certification Standards" }),
        el("li", { text: "Pilot's Handbook of Aeronautical Knowledge" }), el("li", { text: "Aeronautical Chart User's Guide and Aeronautical Information Manual" }), el("li", { text: "Advisory Circular 107-2A" })
      ])])
    ]);
    return { title: "About", back: true };
  };

  /* ---------- Background: a quiet night sectional, painted once ---------- */
  function paintBackground() {
    var canvas = document.getElementById("chart-bg");
    if (!canvas || !canvas.getContext) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2), W = window.innerWidth, H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    var c = canvas.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    var g = c.createRadialGradient(W * 0.3, H * 0.1, 0, W * 0.3, H * 0.1, Math.max(W, H));
    g.addColorStop(0, "#141c3a"); g.addColorStop(0.55, "#0b1020"); g.addColorStop(1, "#070b18");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    function noise(x, y) { return Math.sin(x * 0.0071 + 1.3) * 0.5 + Math.sin(y * 0.0083 - 0.7) * 0.5 + Math.sin((x + y) * 0.0041 + 2.1) * 0.6 + Math.sin((x - y * 1.3) * 0.0032 - 1.1) * 0.7; }
    var cell = 12, cols = Math.ceil(W / cell) + 1, rows = Math.ceil(H / cell) + 1, f = new Float32Array(cols * rows);
    for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) f[j * cols + i] = noise(i * cell, j * cell);
    var SEG = { 1: [3, 2], 2: [2, 1], 3: [3, 1], 4: [0, 1], 5: [0, 3, 1, 2], 6: [0, 2], 7: [0, 3], 8: [0, 3], 9: [0, 2], 10: [0, 1, 2, 3], 11: [0, 1], 12: [3, 1], 13: [2, 1], 14: [3, 2] };
    function lerp(a, b, l) { var t = (l - a) / (b - a); return t < 0 ? 0 : t > 1 ? 1 : t; }
    c.lineWidth = 1; c.strokeStyle = "rgba(201,169,122,0.11)";
    for (var level = -2; level <= 2; level += 0.3) {
      c.beginPath();
      for (var y = 0; y < rows - 1; y++) for (var x = 0; x < cols - 1; x++) {
        var a = f[y * cols + x], b = f[y * cols + x + 1], d = f[(y + 1) * cols + x], e = f[(y + 1) * cols + x + 1];
        var idx = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (e > level ? 2 : 0) | (d > level ? 1 : 0);
        if (!idx || idx === 15) continue;
        var px = x * cell, py = y * cell;
        var P = [[px + cell * lerp(a, b, level), py], [px + cell, py + cell * lerp(b, e, level)], [px + cell * lerp(d, e, level), py + cell], [px, py + cell * lerp(a, d, level)]];
        var sg = SEG[idx];
        for (var k = 0; k < sg.length; k += 2) { c.moveTo(P[sg[k]][0], P[sg[k]][1]); c.lineTo(P[sg[k + 1]][0], P[sg[k + 1]][1]); }
      }
      c.stroke();
    }
    c.setLineDash([8, 5]); c.lineWidth = 1.5;
    c.strokeStyle = "rgba(93,150,245,0.28)"; c.beginPath(); c.arc(W * 0.78, H * 0.3, Math.min(W, H) * 0.3, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = "rgba(240,94,166,0.22)"; c.beginPath(); c.arc(W * 0.15, H * 0.78, Math.min(W, H) * 0.22, 0, Math.PI * 2); c.stroke();
    c.setLineDash([]);
    c.strokeStyle = "rgba(93,150,245,0.45)"; c.lineWidth = 2;
    c.beginPath(); c.arc(W * 0.78, H * 0.3, 9, 0, Math.PI * 2); c.stroke();
    c.save(); c.translate(W * 0.78, H * 0.3); c.rotate(-0.5); c.fillStyle = "rgba(93,150,245,0.45)"; c.fillRect(-12, -1.5, 24, 3); c.rotate(1.6); c.fillRect(-8, -1.2, 16, 2.4); c.restore();
  }

  /* ---------- Native integration ---------- */
  function initNative() {
    if (StatusBar) {
      try { StatusBar.setStyle({ style: "DARK" }).catch(function () {}); } catch (e) { /* web */ }
      try { StatusBar.setBackgroundColor({ color: "#0b1020" }).catch(function () {}); } catch (e) { /* iOS has no background color */ }
    }
    if (CapApp && CapApp.addListener) {
      CapApp.addListener("backButton", function () {
        var lb = document.getElementById("lightbox");
        if (lb.classList.contains("open")) { closeLightbox(); return; }
        var modal = document.getElementById("modal");
        if (modal.classList.contains("open")) { modal.classList.remove("open"); return; }
        var r = parseRoute();
        if (r.name === "exam" && Exam.active()) { UI.confirm("Leave this attempt?", "Your answers will not be scored or saved.", "Leave", function () { Exam.clear(); UI.go("#/exam"); }); return; }
        if (r.name === "home" || r.name === "welcome") { CapApp.exitApp(); return; }
        if (["path", "study", "exam", "more"].indexOf(r.name) >= 0 && !r.a) { UI.go("#/home"); return; }
        UI.back();
      });
      CapApp.addListener("appStateChange", function (st) { if (!st.isActive) Store.flush(); });
    }
    window.addEventListener("pagehide", function () { Store.flush(); });
  }

  /* ---------- Boot ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    buildShell();
    paintBackground();
    var rt = 0;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(paintBackground, 150); });
    initNative();
    Store.load().then(function () {
      if (!location.hash) location.replace(Store.state.profile.onboarded ? "#/home" : "#/welcome");
      render();
      if (Splash) { try { Splash.hide().catch(function () {}); } catch (e) { /* web */ } }
    });
  });
})();
