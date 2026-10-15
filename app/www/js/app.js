/* Part 107 Prep app: router, screens, and shared UI helpers.
   Load order: cap/*.js, bank.js, cards.js, content.js, store.js, engage.js, app.js, exam.js */
(function () {
  "use strict";
  var BANK = window.P107_BANK, CONTENT = window.P107_CONTENT, CARDS = window.P107_CARDS;
  var APP_VERSION = "1.1.0";
  var COMPANY = "Tompkins Software Systems";
  var SITE = "https://tompkins52.github.io/part107-prep/";

  function plugin(ns, name) { return (window[ns] && window[ns][name]) || null; }
  var CapApp = plugin("capacitorApp", "App"), Browser = plugin("capacitorBrowser", "Browser"), Clipboard = plugin("capacitorClipboard", "Clipboard");
  var Share = plugin("capacitorShare", "Share"), StatusBar = plugin("capacitorStatusBar", "StatusBar"), Splash = plugin("capacitorSplashScreen", "SplashScreen"), Haptics = plugin("capacitorHaptics", "Haptics");
  var isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

  /* ---------- UI helpers ---------- */
  var UI = {
    el: function (tag, attrs, children) {
      var n = document.createElement(tag);
      if (attrs) Object.keys(attrs).forEach(function (k) {
        if (attrs[k] === null || attrs[k] === undefined) return;
        if (k === "class") n.className = attrs[k]; else if (k === "text") n.textContent = attrs[k]; else if (k === "html") n.innerHTML = attrs[k]; else n.setAttribute(k, attrs[k]);
      });
      (children || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
      return n;
    },
    go: function (hash) { if (location.hash === hash) render(); else location.hash = hash; },
    back: function () { if (history.length > 1) history.back(); else UI.go("#/home"); },
    toast: function (msg, ms) {
      var t = document.getElementById("toast"); t.textContent = msg; t.classList.add("show");
      clearTimeout(UI._toastTimer); UI._toastTimer = setTimeout(function () { t.classList.remove("show"); }, ms || 2400);
    },
    confirm: function (title, body, okLabel, onOk, danger) {
      var bg = document.getElementById("modal"); bg.innerHTML = "";
      var ok = UI.el("button", { type: "button", class: "btn " + (danger ? "btn-danger" : "btn-primary"), text: okLabel });
      var cancel = UI.el("button", { type: "button", class: "btn btn-secondary", text: "Cancel" });
      ok.addEventListener("click", function () { bg.classList.remove("open"); onOk(); });
      cancel.addEventListener("click", function () { bg.classList.remove("open"); });
      bg.appendChild(UI.el("div", { class: "modal", role: "dialog", "aria-modal": "true" }, [UI.el("h3", { text: title }), UI.el("p", { class: "muted", text: body }), UI.el("div", { class: "btn-row" }, [cancel, ok])]));
      bg.classList.add("open"); ok.focus();
    },
    haptic: function (style) {
      if (!Haptics || !Store.state.settings.haptics) return;
      try { Haptics.impact({ style: style || "LIGHT" }).catch(function () {}); } catch (e) { /* unsupported */ }
    },
    openExternal: function (url) { if (Browser) Browser.open({ url: url }).catch(function () { window.open(url, "_blank"); }); else window.open(url, "_blank", "noopener"); },
    share: function (text) {
      var p = Share ? Share.share({ text: text, dialogTitle: "Share" }) : (navigator.share ? navigator.share({ text: text }) : Promise.reject(new Error("no share")));
      p.catch(function () { UI.copy(text, "Copied to clipboard"); });
    },
    copy: function (text, msg) {
      var done = function () { UI.toast(msg || "Copied"); };
      if (Clipboard) Clipboard.write({ string: text }).then(done).catch(function () { if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () { UI.toast("Copy is not available here"); }); });
      else if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { UI.toast("Copy is not available here"); });
      else UI.toast("Copy is not available here");
    },
    ring: function (pct, color, markAt, size, label) {
      var ns = "http://www.w3.org/2000/svg", r = 52, c = 2 * Math.PI * r;
      var svg = document.createElementNS(ns, "svg"); svg.setAttribute("viewBox", "0 0 128 128"); svg.setAttribute("class", "ring" + (size ? " ring-" + size : "")); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", (label || pct + " percent"));
      var bg = document.createElementNS(ns, "circle"); bg.setAttribute("cx", "64"); bg.setAttribute("cy", "64"); bg.setAttribute("r", String(r)); bg.setAttribute("fill", "none"); bg.setAttribute("stroke", "rgba(255,255,255,0.08)"); bg.setAttribute("stroke-width", "11");
      var fg = document.createElementNS(ns, "circle"); fg.setAttribute("cx", "64"); fg.setAttribute("cy", "64"); fg.setAttribute("r", String(r)); fg.setAttribute("fill", "none"); fg.setAttribute("stroke", color); fg.setAttribute("stroke-width", "11"); fg.setAttribute("stroke-linecap", "round");
      fg.setAttribute("stroke-dasharray", c.toFixed(1)); fg.setAttribute("stroke-dashoffset", (c * (1 - Math.min(100, pct) / 100)).toFixed(1)); fg.setAttribute("transform", "rotate(-90 64 64)");
      svg.appendChild(bg); svg.appendChild(fg);
      if (markAt) { var ang = (markAt / 100) * 2 * Math.PI - Math.PI / 2, m = document.createElementNS(ns, "circle"); m.setAttribute("cx", (64 + Math.cos(ang) * r).toFixed(1)); m.setAttribute("cy", (64 + Math.sin(ang) * r).toFixed(1)); m.setAttribute("r", "3.5"); m.setAttribute("fill", "var(--cream)"); svg.appendChild(m); }
      var t = document.createElementNS(ns, "text"); t.setAttribute("x", "64"); t.setAttribute("y", "74"); t.setAttribute("text-anchor", "middle"); t.setAttribute("font-size", label && label.length > 4 ? "24" : "30"); t.textContent = label || (pct + "%");
      svg.appendChild(t); return svg;
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
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    flame: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 4 5 6 5 11a5 5 0 01-10 0c0-2 1-3 1-3s0 3 2 3c0-4 2-6 2-11z"/></svg>',
    ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9"/><path d="M19 13v6a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1h6"/></svg>'
  };

  var TABS = [
    { id: "home", label: "Home", route: "#/home", match: /^#\/home/ },
    { id: "path", label: "Path", route: "#/path", match: /^#\/path/ },
    { id: "study", label: "Study", route: "#/study", match: /^#\/(study|ref|cards)/ },
    { id: "exam", label: "Exam", route: "#/exam", match: /^#\/exam/ },
    { id: "more", label: "More", route: "#/more", match: /^#\/(more|progress|settings|backup|about|privacy|achievements)/ }
  ];

  var screenEl, topTitle, backBtn, tabbar;

  function buildShell() {
    screenEl = document.getElementById("screen"); topTitle = document.getElementById("top-title"); backBtn = document.getElementById("back-btn");
    backBtn.innerHTML = ICONS.back; backBtn.addEventListener("click", UI.back);
    tabbar = document.getElementById("tabbar");
    TABS.forEach(function (t) {
      var b = UI.el("button", { type: "button", class: "tab", "data-tab": t.id, "aria-label": t.label, html: ICONS[t.id] + "<span>" + t.label + "</span>" });
      b.addEventListener("click", function () { UI.go(t.route); });
      tabbar.appendChild(b);
    });
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
    lb.querySelector(".lb-close").innerHTML = ICONS.close; lb.querySelector(".lb-close").addEventListener("click", closeLightbox);
    lb.querySelector(".lb-zoom").addEventListener("click", function () { var im = lb.querySelector("img"); if (im.classList.contains("z2")) { im.classList.remove("z2"); im.classList.add("z3"); } else if (im.classList.contains("z3")) { im.classList.remove("z3"); } else im.classList.add("z2"); });
    document.getElementById("modal").addEventListener("click", function (e) { if (e.target.id === "modal") e.target.classList.remove("open"); });
  }
  function openLightbox(src, alt) { var lb = document.getElementById("lightbox"), im = lb.querySelector("img"); im.src = src; im.alt = alt || ""; im.className = "z2"; lb.classList.add("open"); }
  function closeLightbox() { document.getElementById("lightbox").classList.remove("open"); }

  /* ---------- Router ---------- */
  function parseRoute() { var h = location.hash || "#/home", parts = h.slice(2).split("/").filter(Boolean); return { hash: h, name: parts[0] || "home", a: parts[1] || "", b: parts[2] || "" }; }
  var SCREENS = {}, lastRoute = "";
  function render() {
    if (!Store.loaded) return;
    var r = parseRoute();
    if (!Store.state.profile.onboarded && r.name !== "welcome" && r.name !== "privacy") { location.replace("#/welcome"); return; }
    if (Store.state.profile.onboarded && r.name === "welcome") { location.replace("#/home"); return; }
    var screen = SCREENS[r.name] || SCREENS.home;
    var out = screen(r) || {};
    var same = lastRoute.split("/").slice(0, 3).join("/") === r.hash.split("/").slice(0, 3).join("/");
    lastRoute = r.hash;
    topTitle.innerHTML = ""; topTitle.appendChild(document.createTextNode(out.title || "Part 107 Prep"));
    if (out.subtitle) topTitle.appendChild(UI.el("small", { text: out.subtitle }));
    backBtn.hidden = !out.back;
    tabbar.hidden = out.tabs === false;
    tabbar.querySelectorAll(".tab").forEach(function (b) { var t = TABS.filter(function (x) { return x.id === b.getAttribute("data-tab"); })[0]; b.classList.toggle("active", t.match.test(r.hash)); });
    if (out.scrollTo) { var target = document.getElementById(out.scrollTo); if (target) { target.scrollIntoView({ block: "start" }); return; } }
    if (!same || out.resetScroll) screenEl.scrollTop = 0;
  }
  window.addEventListener("hashchange", render);
  function rerender() { var y = screenEl.scrollTop; render(); screenEl.scrollTop = y; }
  function page(children, cls) { var p = UI.el("div", { class: "page " + (cls || "") }, children); screenEl.innerHTML = ""; screenEl.appendChild(p); return p; }

  function greeting() { var h = new Date().getHours(); return h < 5 ? "Late night session" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; }
  function daysUntil(dateStr) { if (!dateStr) return null; var p = dateStr.split("-").map(Number), t = new Date(p[0], p[1] - 1, p[2]), now = new Date(); now.setHours(0, 0, 0, 0); return Math.round((t - now) / 86400000); }
  function fmtDate(iso) { var d = new Date(iso); return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + ", " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }); }
  function moduleFor(cat) { var m = CONTENT.modules.filter(function (x) { return x.cat === cat; })[0]; return m ? m.id : "regulations"; }
  function goalChips(current, onPick) {
    var wrap = UI.el("div", { class: "chips", role: "radiogroup", "aria-label": "Daily goal" });
    [[5, "5 a day", "Light"], [10, "10 a day", "Steady"], [20, "20 a day", "Serious"], [30, "30 a day", "Test is soon"]].forEach(function (g) {
      var b = UI.el("button", { type: "button", class: "chipbtn", role: "radio", "aria-checked": current === g[0] ? "true" : "false" }, [UI.el("b", { text: g[1] }), UI.el("span", { text: g[2] })]);
      b.addEventListener("click", function () { wrap.querySelectorAll(".chipbtn").forEach(function (x) { x.setAttribute("aria-checked", "false"); }); b.setAttribute("aria-checked", "true"); onPick(g[0]); });
      wrap.appendChild(b);
    });
    return wrap;
  }

  /* After anything that could unlock an achievement */
  window.afterEvent = function () {
    var fresh = Achievements.evaluate();
    fresh.forEach(function (a, i) { setTimeout(function () { UI.toast(a.icon + "  " + a.name + " unlocked", 2800); Sound.unlock(); UI.haptic("MEDIUM"); }, 700 + i * 2200); });
  };
  Store.on(function (evt, data) {
    if (evt === "goal-met") {
      setTimeout(function () { UI.toast("Daily goal reached. " + (data.streak > 1 ? data.streak + " day streak." : "Day one of your streak."), 2800); Sound.goal(); Celebrate.confetti(1400); window.afterEvent(); }, 350);
      /* Ask about reminders once, right after the app has proven useful */
      if (Reminders.available() && !Store.state.settings.askedReminder && !Store.state.settings.reminder) {
        Store.state.settings.askedReminder = true; Store.save();
        setTimeout(function () {
          UI.confirm("Keep the streak going?", "A short reminder each evening is the single best predictor of finishing. You can change the time or turn it off in Settings.", "Remind me at 7 PM", function () {
            Store.state.settings.reminder = true; Store.state.settings.reminderHour = 19; Store.state.settings.reminderMinute = 0; Store.save();
            Reminders.enable(19, 0).then(function () { UI.toast("Reminder set for 7:00 PM"); }).catch(function (e) { Store.state.settings.reminder = false; Store.save(); UI.toast(e.message || "Could not set the reminder", 3200); });
          });
        }, 3600);
      }
    }
  });

  /* ---------- Welcome ---------- */
  SCREENS.welcome = function () {
    var el = UI.el, s = Store.state, goal = s.goal || 10;
    var name = el("input", { type: "text", id: "w-name", maxlength: "40", placeholder: "First name or call sign", autocomplete: "given-name", value: s.profile.name || "" });
    var date = el("input", { type: "date", id: "w-date", value: s.profile.testDate || "" });
    var start = el("button", { type: "button", class: "btn btn-primary btn-block btn-lg", text: "Commit to my goal" });
    start.addEventListener("click", function () {
      s.profile.name = name.value.trim().slice(0, 40); s.profile.testDate = date.value || ""; s.goal = goal; s.profile.onboarded = true;
      if (!s.profile.createdAt) s.profile.createdAt = new Date().toISOString();
      Store.flush(); UI.haptic("MEDIUM"); UI.go("#/home");
    });
    page([
      el("img", { class: "logo", src: "img/logo.svg", alt: "" }),
      el("h1", { text: "Part 107 Prep" }),
      el("p", { class: "lede", text: "Everything you need to pass the FAA remote pilot test and get your commercial drone certificate, in one place, with your progress saved as you go." }),
      el("div", { class: "field" }, [el("label", { for: "w-name", text: "What should we call you?" }), name, el("div", { class: "hint", text: "Optional. It shows on your home screen and in reminders." })]),
      el("div", { class: "field" }, [el("label", { for: "w-date", text: "Test date, if you have one" }), date, el("div", { class: "hint", text: "Optional. You get a countdown and a plan that tightens as the day gets close." })]),
      el("div", { class: "field" }, [el("label", { text: "Daily goal" }), goalChips(goal, function (g) { goal = g; }), el("div", { class: "hint", text: "Questions or flashcards per day. Small and steady beats cramming; people who hit a goal seven days running almost always finish." })]),
      el("div", { class: "privacy-note" }, [el("span", { html: ICONS.shield }), el("p", { html: "<strong>No account needed.</strong> Your progress is saved privately on this phone, so there is nothing to sign up for and nothing to remember. Just open the app and pick up where you left off." })]),
      start,
      el("p", { class: "small muted", style: "text-align:center;margin-top:14px" }, [el("a", { href: "#/privacy", text: "How your data is handled" })]),
      el("p", { class: "company", text: "Made by " + COMPANY })
    ], "welcome");
    return { title: "Welcome", tabs: false };
  };

  /* ---------- Home ---------- */
  SCREENS.home = function () {
    var el = UI.el, s = Store.state;
    var act = Store.todayActivity(), goal = s.goal, streak = Store.streakDays(), dots = Store.weekDots();
    var children = [];
    children.push(el("p", { class: "kicker", text: greeting() + (s.profile.name ? ", " + s.profile.name : "") }));

    /* Daily goal and streak */
    var pct = Math.min(100, Math.round((act.pts / goal) * 100));
    var dotRow = el("div", { class: "dots" }, dots.map(function (d) {
      var letter = ["S", "M", "T", "W", "T", "F", "S"][new Date(d.day + "T00:00:00").getDay()];
      return el("span", { class: "dot " + d.state, title: d.day }, [el("i", { html: d.state === "met" ? ICONS.check : d.state === "frozen" ? "❄" : "" }), el("b", { text: letter })]);
    }));
    children.push(el("div", { class: "card goalcard" }, [
      el("div", { class: "goalrow" }, [
        UI.ring(pct, act.met ? "var(--green)" : "var(--amber)", 0, "sm", act.pts + "/" + goal),
        el("div", {}, [
          el("h2", { text: act.met ? "Goal reached today" : (act.pts ? (goal - act.pts) + " to go today" : "Today's goal: " + goal) }),
          el("p", { class: "muted small", text: act.met ? "Come back tomorrow to keep the streak alive." : "Questions and flashcards both count. A module finish counts in full." }),
          el("div", { class: "streakline" }, [el("span", { class: "flame " + (streak ? "lit" : ""), html: ICONS.flame }), el("b", { text: streak + " day" + (streak === 1 ? "" : "s") }), el("span", { class: "muted small", text: streak ? "streak" : "Start your streak today" }), s.streak.freezes ? el("span", { class: "chip chip-blue", text: s.streak.freezes + " freeze" + (s.streak.freezes === 1 ? "" : "s") }) : null])
        ])
      ]),
      dotRow
    ]));

    var dU = daysUntil(s.profile.testDate);
    if (dU !== null) children.push(el("div", { class: "card countdown" }, [el("p", { style: "margin:0", html: dU > 1 ? "<b>" + dU + " days</b> until your test." + (dU <= 7 ? " Full exams every other day from here." : "") : dU === 1 ? "<b>Your test is tomorrow.</b> Light review tonight, then rest." : dU === 0 ? "<b>Test day.</b> Photo ID, your FTN, and a steady pace. You have done the work." : "Your test date has passed. <a href='#/settings'>Update it</a> or clear it in Settings." })]));

    var saved = Exam.savedSummary();
    if (saved && !Exam.active()) children.push(el("div", { class: "card resume" }, [el("p", { class: "kicker", text: "Pick up where you left off" }), el("h3", { text: saved.title }), el("p", { class: "muted small", text: saved.answered + " of " + saved.total + " answered. Your place was saved." }), el("a", { class: "btn btn-primary", href: "#/exam", text: "Resume" })]));

    /* Today's plan */
    var plan = buildPlan(BANK, CONTENT, CARDS);
    var planList = el("div", { class: "plan" });
    var totalMin = 0;
    plan.forEach(function (p) {
      totalMin += p.done ? 0 : p.minutes;
      planList.appendChild(el("a", { class: "planitem " + (p.done ? "done" : ""), href: p.href }, [el("span", { class: "pbox", html: ICONS.check }), el("span", {}, [el("div", { class: "ptitle", text: p.title }), el("div", { class: "psub", text: p.sub })]), el("span", { class: "pmin", text: p.done ? "done" : p.minutes + " min" })]));
    });
    children.push(el("div", { class: "card" }, [el("div", { class: "cardhead" }, [el("h3", { text: "Today's plan" }), el("span", { class: "chip", text: totalMin ? "about " + totalMin + " min left" : "all done" })]), planList]));

    /* Question of the day */
    var qotd = Store.qotdQuestion(BANK), qs = Store.qotdState();
    var qcard = el("div", { class: "card qotd" }, [el("div", { class: "cardhead" }, [el("h3", { text: "Question of the day" }), el("span", { class: "chip chip-magenta", text: BANK.categories[qotd.cat].short })]), el("p", { class: "qtext", text: qotd.q })]);
    if (qotd.fig && BANK.figures[qotd.fig]) qcard.appendChild(el("figure", { class: "qfig" }, [el("img", { src: BANK.figures[qotd.fig].src, alt: "Practice chart", class: "zoomable" })]));
    var order = [0, 1, 2], ul = el("ul", { class: "choices" });
    order.forEach(function (idx, pos) {
      var cls = "choice"; if (qs.answered) { if (idx === qotd.c) cls += " correct"; else if (qs.picked === idx) cls += " wrong"; }
      var b = el("button", { type: "button", class: cls }, [el("span", { class: "letter", text: String.fromCharCode(65 + pos) }), el("span", { text: qotd.a[idx] })]);
      if (qs.answered) b.disabled = true;
      b.addEventListener("click", function () { var ok = idx === qotd.c; qs.picked = idx; Store.answerQotd(ok, qotd.id); UI.haptic(); if (ok) Sound.correct(); else Sound.wrong(); window.afterEvent(); rerender(); });
      ul.appendChild(el("li", {}, [b]));
    });
    qcard.appendChild(ul);
    if (qs.answered) qcard.appendChild(el("div", { class: "explain" }, [el("div", { class: "verdict " + (qs.correct ? "ok" : "bad"), text: qs.correct ? "Correct" : "Not quite. Correct answer: " + String.fromCharCode(65 + qotd.c) }), el("p", { text: qotd.x }), el("span", { class: "ref", text: "Reference: " + qotd.ref }), el("p", { style: "margin:10px 0 0" }, [el("a", { href: "#/exam/topic/" + qotd.cat, text: "More like this" })])]));
    children.push(qcard);

    /* Readiness */
    var ready = Store.readiness(BANK, CONTENT.modules);
    var label = ready >= 85 ? "Ready to book" : ready >= 70 ? "Almost ready" : ready >= 45 ? "Getting there" : ready > 0 ? "Keep going" : "Just getting started";
    var color = ready >= 85 ? "var(--green)" : ready >= 70 ? "var(--amber)" : ready > 0 ? "var(--blue)" : "var(--line-strong)";
    var scored = s.attempts.filter(function (a) { return a.mode === "full" || a.mode === "quick"; });
    var best = scored.length ? Math.max.apply(null, scored.map(function (a) { return a.score; })) : null;
    var modsDone = CONTENT.modules.filter(function (m) { return (s.modules[m.id] || {}).completedAt; }).length;
    var stepsDone = CONTENT.steps.filter(function (st) { return s.steps[st.id]; }).length;
    children.push(el("div", { class: "card" }, [
      el("div", { class: "ready" }, [UI.ring(ready, color), el("div", {}, [el("p", { class: "kicker", style: "margin-bottom:2px", text: "Exam readiness" }), el("h2", { text: label }), el("p", { text: ready ? "From your recent scores, accuracy by category, and finished modules. Aim for 85 before you book." : "Read a module or take a quick check and this starts moving." })])]),
      el("div", { class: "stats four", style: "margin:16px 0 0" }, [
        el("div", { class: "stat" }, [el("b", { text: best === null ? "–" : best + "%" }), el("span", { text: "best score" })]),
        el("div", { class: "stat" }, [el("b", { text: String(scored.length) }), el("span", { text: scored.length === 1 ? "exam" : "exams" })]),
        el("div", { class: "stat" }, [el("b", { text: modsDone + "/5" }), el("span", { text: "modules" })]),
        el("div", { class: "stat" }, [el("b", { text: stepsDone + "/10" }), el("span", { text: "steps" })])
      ])
    ]));

    /* Accuracy by category */
    var acc = Store.categoryAccuracy(BANK), anySeen = Object.keys(acc).some(function (c) { return acc[c].seen > 0; });
    var cats = el("ul", { class: "cats" });
    Object.keys(BANK.categories).forEach(function (c) {
      var a = acc[c], p = a.seen ? Math.round((a.correct / a.seen) * 100) : 0, cls = !a.seen ? "" : p >= 80 ? "green" : p >= 60 ? "amber" : "red";
      cats.appendChild(el("li", {}, [el("div", {}, [el("div", { class: "name" }, [el("a", { href: "#/exam/topic/" + c, text: BANK.categories[c].name, style: "color:var(--text);text-decoration:none" }), el("span", { text: a.seen ? a.correct + "/" + a.seen : "no data" })]), el("div", { class: "bar" }, [el("span", { class: cls, style: "width:" + p + "%" })])]), el("span", { class: "pct", text: a.seen ? p + "%" : "–" })]));
    });
    children.push(el("div", { class: "card" }, [el("div", { class: "cardhead" }, [el("h3", { text: "Accuracy by category" }), el("a", { href: "#/progress", class: "small", text: "Trends" })]), anySeen ? null : el("p", { class: "muted small", text: "Answer some questions and your accuracy in each knowledge area shows up here. Tap a category to drill it." }), cats]));

    /* Achievements strip */
    var unlocked = Achievements.list.filter(function (a) { return s.achievements[a.id]; });
    var strip = el("div", { class: "badges" }, Achievements.list.slice(0, 16).map(function (a) { return el("span", { class: "badge-ic " + (s.achievements[a.id] ? "on" : ""), title: a.name, text: a.icon }); }));
    children.push(el("a", { class: "card tap", href: "#/achievements" }, [el("div", { class: "cardhead" }, [el("h3", { text: "Achievements" }), el("span", { class: "chip", text: unlocked.length + " of " + Achievements.list.length })]), strip]));

    children.push(el("div", { class: "btn-row" }, [el("a", { class: "btn btn-secondary", href: "#/cards", text: "Flashcards" }), el("a", { class: "btn btn-blue", href: "#/exam/quick", text: "Quick check" })]));
    page(children);
    return { title: "Part 107 Prep", subtitle: "Remote pilot study app" };
  };

  /* ---------- Path ---------- */
  var STEP_ACTIONS = {
    eligibility: [["FAA: become a remote pilot", "https://www.faa.gov/uas/commercial_operators/become_a_drone_pilot"]],
    ftn: [["Open IACRA", "https://iacra.faa.gov"]],
    study: [["Open the study guide", "#/study"], ["Practice exams", "#/exam"]],
    schedule: [["Schedule with PSI", "https://faa.psiexams.com"]],
    test: [["Test day checklist", "#/path/checklist"]],
    iacra: [["Open IACRA", "https://iacra.faa.gov"]],
    tsa: [],
    card: [["Update your address in IACRA", "https://iacra.faa.gov"]],
    register: [["Register at FAADroneZone", "https://faadronezone-access.faa.gov"], ["Remote ID rules", "https://www.faa.gov/uas/getting_started/remote_id"]],
    recurrent: [["Open FAASafety.gov", "https://www.faasafety.gov"]]
  };
  var COSTS = [
    ["Knowledge test (PSI)", "$175", "Required. Paid when you schedule. A retake costs the same."],
    ["Aircraft registration", "$5", "Required to fly. Per aircraft, valid 3 years, at FAADroneZone."],
    ["FTN, IACRA application, TSA check, certificate", "$0", "Required. All free from the FAA."],
    ["Recurrent training every 24 months", "$0", "Required. Free online at FAASafety.gov."],
    ["Study materials", "$0", "This app and the FAA's own study guide and sample questions are free. Paid courses run $100 to $300 and are optional."],
    ["Remote ID broadcast module", "$30 to $150", "Only if your drone lacks built-in Remote ID."]
  ];
  SCREENS.path = function (r) {
    var el = UI.el, s = Store.state;
    var done = CONTENT.steps.filter(function (st) { return s.steps[st.id]; }).length;
    var nextStep = CONTENT.steps.filter(function (st) { return !s.steps[st.id]; })[0];
    var children = [
      el("h1", { text: "Your path to the certificate" }),
      el("p", { class: "lede", text: "No flight test and no required course. One knowledge exam, an online application, a background check, and a card in the mail. Check off each step as you go; the app keeps your place." }),
      el("div", { class: "card" }, [
        el("div", { class: "bar-label" }, [el("span", { html: "<b>" + done + "</b> of " + CONTENT.steps.length + " steps done" }), el("span", { text: Math.round((done / CONTENT.steps.length) * 100) + "%" })]),
        el("div", { class: "bar" }, [el("span", { class: "green", style: "width:" + Math.round((done / CONTENT.steps.length) * 100) + "%" })]),
        el("p", { class: "muted small", style: "margin:10px 0 0", text: nextStep ? "Next up, step " + nextStep.num + ": " + nextStep.title + "." : "Every step is done. Fly safe, remote pilot." })
      ])
    ];
    var firstOpen = nextStep;
    CONTENT.steps.forEach(function (st) {
      var isDone = !!s.steps[st.id];
      var wrap = el("div", { class: "step" + (isDone ? " done" : ""), id: "step-" + st.id });
      if (r.a === st.id || (!r.a && firstOpen && firstOpen.id === st.id)) wrap.setAttribute("open", "");
      var head = el("button", { type: "button", class: "step-head", "aria-expanded": wrap.hasAttribute("open") ? "true" : "false" }, [el("span", { class: "num", html: isDone ? ICONS.check : String(st.num) }), el("span", {}, [el("h3", { text: st.title }), st.meta ? el("div", { class: "meta", text: st.meta }) : null]), el("span", { class: "chev", html: ICONS.down })]);
      head.addEventListener("click", function () { var open = wrap.toggleAttribute("open"); head.setAttribute("aria-expanded", open ? "true" : "false"); });
      var body = el("div", { class: "step-body", html: st.html });
      var actions = el("div", { class: "step-actions" });
      (STEP_ACTIONS[st.id] || []).forEach(function (a) {
        var ext = /^https?:/.test(a[1]);
        actions.appendChild(el("a", { class: "btn btn-sm " + (ext ? "btn-blue" : "btn-secondary"), href: a[1], html: a[0] + (ext ? " " + ICONS.ext : "") }));
      });
      var toggle = el("button", { type: "button", class: "btn btn-sm " + (isDone ? "btn-secondary" : "btn-primary"), text: isDone ? "Mark not done" : "Mark done" });
      toggle.addEventListener("click", function () { var v = Store.toggleStep(st.id); UI.haptic("MEDIUM"); if (v) { Sound.correct(); UI.toast("Step " + st.num + " done" + (st.num === 10 ? ". That is the whole path." : ".")); } window.afterEvent(); var y = screenEl.scrollTop; SCREENS.path({ a: v ? (CONTENT.steps[st.num] ? CONTENT.steps[st.num].id : st.id) : st.id }); screenEl.scrollTop = y; });
      actions.appendChild(toggle);
      body.appendChild(actions);
      wrap.appendChild(head); wrap.appendChild(body);
      children.push(wrap);
    });

    var costRows = el("div", { class: "costs" }, COSTS.map(function (c) { return el("div", { class: "cost" }, [el("div", {}, [el("div", { class: "cname", text: c[0] }), el("div", { class: "csub", text: c[2] })]), el("div", { class: "camt", text: c[1] })]); }));
    children.push(el("div", { class: "card", id: "costs", style: "margin-top:22px" }, [el("h3", { text: "What it costs" }), costRows, el("div", { class: "costtotal" }, [el("span", { text: "Minimum to get certified and fly" }), el("b", { text: "$180" })]), el("p", { class: "muted small", style: "margin:10px 0 0", text: "Anyone charging to renew or register your certificate is selling something the FAA provides free." })]));
    children.push(el("div", { class: "card" }, [el("h3", { text: "How long it takes" }), el("ul", { class: "timeline" }, [
      el("li", {}, [el("b", { text: "Study" }), el("span", { text: "2 to 4 weeks at about an hour a day. Book the test when you pass two full practice exams at 85 percent or better." })]),
      el("li", {}, [el("b", { text: "Test appointment" }), el("span", { text: "Most PSI centers have openings within a week or two." })]),
      el("li", {}, [el("b", { text: "Application" }), el("span", { text: "Same day in IACRA once your score is in the system, usually within 48 hours of the test." })]),
      el("li", {}, [el("b", { text: "TSA vetting" }), el("span", { text: "A few days to a few weeks. Your temporary certificate arrives by email when it clears, and you can fly on it." })]),
      el("li", {}, [el("b", { text: "Plastic card" }), el("span", { text: "Several weeks after the temporary certificate, by mail." })])
    ]), el("p", { class: "muted small", style: "margin:8px 0 0", text: "Most people are flying commercially four to eight weeks after they start studying." })]));

    var check = el("div", { class: "card", id: "checklist" }, [el("h3", { text: "Test day checklist" })]);
    CONTENT.checklist.forEach(function (item, i) {
      var on = !!s.checks[i];
      var row = el("button", { type: "button", class: "checkrow", role: "checkbox", "aria-checked": on ? "true" : "false" }, [el("span", { class: "box", html: ICONS.check }), el("span", { class: "t", text: item })]);
      row.addEventListener("click", function () { var v = Store.toggleCheck(i); row.setAttribute("aria-checked", v ? "true" : "false"); UI.haptic(); if (v) Sound.tick(); });
      check.appendChild(row);
    });
    children.push(check);
    children.push(el("div", { class: "card" }, [el("h3", { text: "Common questions" }), el("div", { class: "content", html: CONTENT.faq })]));
    page(children);
    return { title: "The path", scrollTo: r.a === "checklist" ? "checklist" : r.a === "costs" ? "costs" : null };
  };

  /* ---------- Study ---------- */
  SCREENS.study = function (r) {
    if (r.a) return moduleScreen(r.a, r.b);
    var el = UI.el, s = Store.state;
    var rows = el("div", { class: "rows" });
    CONTENT.modules.forEach(function (m) {
      var ms = s.modules[m.id] || {};
      var status = ms.completedAt ? "Completed" : ms.openedAt ? "In progress" + (ms.lastSection ? ": " + ((m.sections.filter(function (x) { return x.id === ms.lastSection; })[0] || {}).title || "") : "") : "About " + m.minutes + " min";
      rows.appendChild(el("a", { class: "row", href: "#/study/" + m.id }, [el("span", { class: "badge " + (ms.completedAt ? "done" : ms.openedAt ? "active" : ""), html: ms.completedAt ? ICONS.check : String(m.num) }), el("span", {}, [el("div", { class: "label", text: m.title }), el("div", { class: "sub", text: m.weight + " of the test. " + status })]), el("span", { class: "chev", html: ICONS.chev })]));
    });
    var dueCards = Store.dueCards(CARDS).length, learned = CARDS.filter(function (c) { return Store.cardState(c.id).box >= 2; }).length;
    var tools = el("div", { class: "rows" }, [
      el("a", { class: "row", href: "#/cards" }, [el("span", { class: "badge", text: "🃏" }), el("span", {}, [el("div", { class: "label", text: "Flashcards" }), el("div", { class: "sub", text: (dueCards ? dueCards + " due today. " : "") + learned + " of " + CARDS.length + " learned." })]), el("span", { class: "chev", html: ICONS.chev })]),
      el("a", { class: "row", href: "#/exam/review" }, [el("span", { class: "badge", text: "↻" }), el("span", {}, [el("div", { class: "label", text: "Spaced review" }), el("div", { class: "sub", text: (function () { var n = Store.dueReviews(BANK).length; return n ? n + " missed question" + (n === 1 ? "" : "s") + " due today." : "Nothing due. Missed questions come back on a schedule."; })() })]), el("span", { class: "chev", html: ICONS.chev })])
    ]);
    var refs = el("div", { class: "rows" });
    [["regs", "Part 107 cheat sheet", "Every section of the rule in plain English"], ["safety", "Safety", "Go/no-go, preflight checklist, emergencies, batteries"], ["resources", "Resources", "Official FAA links and tools"]].forEach(function (p) {
      refs.appendChild(el("a", { class: "row", href: "#/ref/" + p[0] }, [el("span", { class: "badge", html: '<span style="font-size:1rem">&sect;</span>' }), el("span", {}, [el("div", { class: "label", text: p[1] }), el("div", { class: "sub", text: p[2] })]), el("span", { class: "chev", html: ICONS.chev })]));
    });
    page([el("h1", { text: "Study guide" }), el("p", { class: "lede", text: "Five modules matched to the FAA's knowledge areas, then drill what you read. Reading alone does not stick; testing yourself does." }), rows, el("h2", { text: "Drills" }), tools, el("h2", { text: "Reference" }), refs]);
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
      var v = Store.toggleModuleComplete(id); UI.haptic("MEDIUM");
      doneBtn.textContent = v ? "Mark as not complete" : "Mark module complete"; doneBtn.className = "btn " + (v ? "btn-secondary" : "btn-primary") + " btn-block";
      note.textContent = v ? "Completed " + fmtDate(Store.moduleState(id).completedAt) : "";
      if (v) { UI.toast("Module " + m.num + " complete. Quiz it while it is fresh."); Sound.correct(); window.afterEvent(); }
    });
    var nextMod = CONTENT.modules[m.num] || null;
    page([
      el("p", { class: "kicker", text: "Module " + m.num + " of 5. " + m.weight + " of the test." }), el("h1", { text: m.title }), el("p", { class: "lede", text: m.intro }),
      el("div", { class: "select-wrap section-jump" }, [sel]), content,
      el("div", { class: "module-foot" }, [note, doneBtn, el("div", { class: "btn-row" }, [el("a", { class: "btn btn-blue", href: "#/exam/topic/" + m.cat, text: "Quiz this module" }), el("a", { class: "btn btn-secondary", href: "#/cards/" + m.cat, text: "Flashcards" })]), nextMod ? el("a", { class: "btn btn-ghost btn-block", href: "#/study/" + nextMod.id, text: "Next: " + nextMod.title }) : el("a", { class: "btn btn-ghost btn-block", href: "#/exam/full", text: "Take a full practice exam" })])
    ]);
    if (sectionObserver) sectionObserver.disconnect();
    if ("IntersectionObserver" in window) {
      sectionObserver = new IntersectionObserver(function (entries) { entries.forEach(function (en) { if (en.isIntersecting) Store.setModuleSection(id, en.target.id); }); }, { root: screenEl, rootMargin: "0px 0px -70% 0px" });
      content.querySelectorAll("h2[id]").forEach(function (h) { sectionObserver.observe(h); });
    }
    return { title: m.title, back: true, scrollTo: section || null };
  }

  SCREENS.ref = function (r) {
    var el = UI.el, ref = CONTENT.references.filter(function (x) { return x.id === r.a; })[0];
    if (!ref) { UI.go("#/study"); return {}; }
    var children = [el("h1", { text: ref.title }), el("p", { class: "lede", text: ref.intro })];
    if (ref.sections.length) {
      var sel = el("select", { "aria-label": "Jump to section" }, [el("option", { value: "", text: "Jump to a section" })].concat(ref.sections.map(function (sc) { return el("option", { value: sc.id, text: sc.title }); })));
      sel.addEventListener("change", function () { if (sel.value) { UI.go("#/ref/" + ref.id + "/" + sel.value); sel.value = ""; } });
      children.push(el("div", { class: "select-wrap section-jump" }, [sel]));
    }
    children.push(el("div", { class: "content", html: ref.html }));
    if (ref.id === "regs") children.push(el("div", { class: "btn-row" }, [el("a", { class: "btn btn-blue", href: "#/exam/topic/regulations", text: "Quiz the regulations" }), el("a", { class: "btn btn-secondary", href: "#/cards/regulations", text: "Flashcards" })]));
    if (ref.id === "safety") children.push(el("div", { class: "btn-row" }, [el("a", { class: "btn btn-blue", href: "#/exam/topic/operations", text: "Quiz operations and safety" })]));
    page(children);
    return { title: ref.short, back: true, scrollTo: r.b || null };
  };

  /* ---------- Flashcards ---------- */
  var cardSession = null;
  SCREENS.cards = function (r) {
    var el = UI.el, cat = r.a && BANK.categories[r.a] ? r.a : "";
    if (!cardSession || cardSession.cat !== cat || cardSession.finished) {
      var pool = cat ? CARDS.filter(function (c) { return c.cat === cat; }) : CARDS;
      var due = Store.dueCards(pool), fresh = Store.newCards(pool);
      var learning = pool.filter(function (c) { var st = Store.cardState(c.id); return st.seen && st.box < 2 && !(st.due && st.due <= Store.today()); });
      var deck = due.slice(0, 15);
      if (deck.length < 15) deck = deck.concat(fresh.slice(0, 15 - deck.length));
      if (deck.length < 10) deck = deck.concat(learning.slice(0, 10 - deck.length));
      if (deck.length < 8) deck = deck.concat(pool.filter(function (c) { return deck.indexOf(c) < 0; }).sort(function () { return Math.random() - 0.5; }).slice(0, 8 - deck.length));
      cardSession = { cat: cat, deck: deck, i: 0, flipped: false, knew: 0, again: [], finished: false, dueCount: due.length };
    }
    var cs = cardSession;
    var filter = el("div", { class: "review-filter" });
    [["", "All"], ["regulations", "Regs"], ["airspace", "Airspace"], ["weather", "Weather"], ["loading", "Loading"], ["operations", "Ops"]].forEach(function (p) {
      var b = el("a", { class: "btn btn-sm btn-secondary", href: "#/cards" + (p[0] ? "/" + p[0] : ""), "aria-pressed": cat === p[0] ? "true" : "false", text: p[1] }); filter.appendChild(b);
    });
    var learned = CARDS.filter(function (c) { return Store.cardState(c.id).box >= 2; }).length;
    var children = [el("h1", { text: "Flashcards" }), el("p", { class: "lede", text: "The numbers, codes, and definitions the test wants from memory. Tap to flip, then be honest: cards you miss come back sooner." }), filter];
    if (!cs.deck.length) { children.push(el("div", { class: "card" }, [el("p", { class: "muted", text: "No cards in this set yet." })])); page(children); return { title: "Flashcards", back: true }; }
    if (cs.i >= cs.deck.length) {
      cs.finished = true;
      var againN = cs.again.length;
      var another = el("button", { type: "button", class: "btn btn-primary", text: "Another round" });
      another.addEventListener("click", function () { cardSession = null; render(); });
      children.push(el("div", { class: "card", style: "text-align:center" }, [el("h2", { text: cs.knew === cs.deck.length ? "Clean sweep" : "Round complete" }), el("p", { class: "muted", text: "You knew " + cs.knew + " of " + cs.deck.length + ". " + (againN ? againN + " will come back tomorrow." : "Known cards come back on a spaced schedule: 1, 3, 7, 14, then 30 days.") }), el("div", { class: "stats", style: "margin:14px 0" }, [el("div", { class: "stat" }, [el("b", { text: learned + "/" + CARDS.length }), el("span", { text: "cards learned" })]), el("div", { class: "stat" }, [el("b", { text: String(Store.cardsReviewedTotal()) }), el("span", { text: "total reviews" })])]), el("div", { class: "btn-row", style: "margin-bottom:0" }, [another, el("a", { class: "btn btn-secondary", href: "#/study", text: "Back to study" })])]));
      page(children);
      window.afterEvent();
      return { title: "Flashcards", back: true };
    }
    var card = cs.deck[cs.i], st = Store.cardState(card.id);
    var flip = el("button", { type: "button", class: "flash " + (cs.flipped ? "flipped" : ""), "aria-label": cs.flipped ? "Card back" : "Card front, tap to flip" }, [
      el("div", { class: "flash-inner" }, [
        el("div", { class: "flash-face front" }, [el("span", { class: "chip chip-magenta", text: BANK.categories[card.cat].short + (st.seen ? "" : " · new") }), el("p", { text: card.front }), el("span", { class: "muted small", text: "Tap to flip" })]),
        el("div", { class: "flash-face back" }, [el("span", { class: "chip chip-blue", text: "Answer" }), el("p", { text: card.back })])
      ])
    ]);
    flip.addEventListener("click", function () { cs.flipped = !cs.flipped; flip.classList.toggle("flipped", cs.flipped); flip.setAttribute("aria-label", cs.flipped ? "Card back" : "Card front, tap to flip"); UI.haptic(); Sound.tick(); });
    var again = el("button", { type: "button", class: "btn btn-secondary", text: "Not yet" }), knew = el("button", { type: "button", class: "btn btn-primary", text: "Knew it" });
    function grade(ok) { Store.gradeCard(card.id, ok); if (ok) { cs.knew++; Sound.correct(); } else { cs.again.push(card.id); Sound.wrong(); } UI.haptic(); cs.i++; cs.flipped = false; rerender(); }
    again.addEventListener("click", function () { grade(false); }); knew.addEventListener("click", function () { grade(true); });
    children.push(el("div", { class: "bar-label" }, [el("span", { html: "<b>" + (cs.i + 1) + "</b> of " + cs.deck.length }), el("span", { text: cs.dueCount ? cs.dueCount + " due today" : learned + " learned" })]));
    children.push(el("div", { class: "bar", style: "margin-bottom:16px" }, [el("span", { class: "magenta", style: "width:" + Math.round((cs.i / cs.deck.length) * 100) + "%" })]));
    children.push(flip);
    children.push(el("div", { class: "exam-nav", style: "margin-top:14px" }, [again, knew]));
    children.push(el("p", { class: "muted small", style: "text-align:center;margin-top:10px", text: "Flip first, then grade yourself. Both buttons work before flipping if you already know." }));
    page(children);
    return { title: "Flashcards", back: true };
  };

  /* ---------- Exam ---------- */
  SCREENS.exam = function (r) {
    var el = UI.el, s = Store.state;
    if (r.a === "full" || r.a === "quick" || r.a === "weak" || r.a === "review" || (r.a === "topic" && BANK.categories[r.b])) {
      if (!Exam.active()) {
        var ok = Exam.start(r.a, { cat: r.b, study: r.a === "topic" || r.a === "weak" || r.a === "review" ? true : (r.a === "quick" ? s.settings.studyMode : false) });
        if (!ok) { UI.toast(r.a === "review" ? "Nothing is due for review right now." : "No questions available."); location.replace("#/exam"); return {}; }
      }
      location.replace("#/exam"); return {};
    }
    if (!Exam.active() && !Exam.hasResult() && Exam.savedSummary()) Exam.restore();
    if (Exam.active() || Exam.hasResult()) {
      var holder = el("div"); page([holder]);
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
      if (extra) b.appendChild(extra); else b.addEventListener("click", onClick);
      return b;
    }
    var seen = Object.keys(s.qstats).length, due = Store.dueReviews(BANK).length;
    var topicBtn = el("button", { type: "button", class: "btn btn-blue btn-block", style: "margin-top:8px", text: "Start topic quiz" });
    topicBtn.addEventListener("click", function () { Exam.start("topic", { cat: topicSel.value, study: true }); render(); });
    var children = [
      el("h1", { text: "Practice exam" }), el("p", { class: "lede", text: "Three choices, one correct, scored at 70 percent like the real UAG test. Answer order is shuffled every time, and your place is saved if you have to stop." }),
      due ? mode("Spaced review", due + " due today, study mode", "Questions you missed, back on the day memory research says to see them again.", function () { Exam.start("review", { study: true }); render(); }) : null,
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
    return el("div", { class: "attempt" }, [el("div", {}, [el("div", { class: "a-title", text: a.title }), el("div", { class: "a-sub", text: fmtDate(a.date) + ". " + a.correct + " of " + a.total })]), el("div", { class: "a-score " + (a.passed ? "pass" : "fail"), text: a.score + "%" })]);
  }

  /* ---------- Progress ---------- */
  SCREENS.progress = function () {
    var el = UI.el, s = Store.state;
    var scored = s.attempts.filter(function (a) { return a.mode === "full" || a.mode === "quick"; });
    var children = [el("h1", { text: "Progress" }), el("p", { class: "lede", text: "Every attempt, your trend, your streak, and the topics that need work. All of it stays on this phone." })];
    /* Streak calendar: last 5 weeks */
    var cal = el("div", { class: "cal" }), today = Store.today(), startOffset = 34 + new Date(today + "T00:00:00").getDay();
    ["S", "M", "T", "W", "T", "F", "S"].forEach(function (d) { cal.appendChild(el("span", { class: "cal-h", text: d })); });
    for (var i = startOffset; i >= 0; i--) {
      var d = Store.addDays(today, -i), a = s.activity[d];
      var cls = a && a.met ? "met" : s.streak.frozen[d] ? "frozen" : (a && a.pts) ? "some" : "";
      cal.appendChild(el("span", { class: "cal-d " + cls + (d === today ? " today" : ""), title: d + (a ? ": " + a.pts + " points" : "") }));
    }
    children.push(el("div", { class: "card" }, [el("div", { class: "cardhead" }, [el("h3", { text: "Streak" }), el("span", { class: "chip chip-amber", text: s.streak.current + " now, best " + s.streak.best })]), cal, el("p", { class: "muted small", style: "margin:10px 0 0", text: "Green: goal met. Blue: a freeze covered a missed day. You hold " + s.streak.freezes + " freeze" + (s.streak.freezes === 1 ? "" : "s") + "; one is earned back for every seven days." })]));
    if (!s.attempts.length) {
      children.push(el("div", { class: "card" }, [el("p", { class: "muted", text: "No attempts yet. Take a quick check and your history starts here." }), el("a", { class: "btn btn-primary", href: "#/exam/quick", text: "Start a quick check" })]));
    } else {
      var trend = scored.slice(0, 12).reverse();
      if (trend.length >= 2) {
        var w = 320, h = 90, pad = 8;
        var pts = trend.map(function (a, i) { return [pad + (i / (trend.length - 1)) * (w - pad * 2), h - pad - (a.score / 100) * (h - pad * 2)]; });
        var passY = h - pad - 0.7 * (h - pad * 2);
        var svg = '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" role="img" aria-label="Score trend"><line x1="0" y1="' + passY + '" x2="' + w + '" y2="' + passY + '" stroke="rgba(243,234,215,0.35)" stroke-dasharray="4 4"/><polyline fill="none" stroke="var(--blue)" stroke-width="2.5" stroke-linejoin="round" points="' + pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + '"/>' + pts.map(function (p, i) { return '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="4" fill="' + (trend[i].passed ? "var(--green)" : "var(--red)") + '"/>'; }).join("") + '</svg>';
        children.push(el("div", { class: "card" }, [el("h3", { text: "Score trend" }), el("div", { html: svg }), el("p", { class: "muted small", style: "margin:0", text: "Last " + trend.length + " full exams and quick checks. The dashed line is the 70 percent pass mark." })]));
      }
      var best = scored.length ? Math.max.apply(null, scored.map(function (a) { return a.score; })) : null, passes = scored.filter(function (a) { return a.passed; }).length;
      children.push(el("div", { class: "stats four" }, [
        el("div", { class: "stat" }, [el("b", { text: best === null ? "–" : best + "%" }), el("span", { text: "best" })]), el("div", { class: "stat" }, [el("b", { text: passes + "/" + scored.length }), el("span", { text: "passed" })]),
        el("div", { class: "stat" }, [el("b", { text: Object.keys(s.qstats).length + "/" + BANK.questions.length }), el("span", { text: "questions seen" })]), el("div", { class: "stat" }, [el("b", { text: String(Store.questionsAnswered()) }), el("span", { text: "answered" })])
      ]));
      var subs = {};
      BANK.questions.forEach(function (q) { var st = s.qstats[q.id]; if (!st) return; var k = BANK.categories[q.cat].short + ": " + q.sub; subs[k] = subs[k] || { seen: 0, correct: 0, cat: q.cat }; subs[k].seen += st.seen; subs[k].correct += st.correct; });
      var weak = Object.keys(subs).map(function (k) { return { k: k, seen: subs[k].seen, pct: subs[k].correct / subs[k].seen, cat: subs[k].cat }; }).filter(function (x) { return x.seen >= 2 && x.pct < 0.8; }).sort(function (a, b) { return a.pct - b.pct; }).slice(0, 6);
      if (weak.length) {
        var wl = el("ul", { class: "cats" });
        weak.forEach(function (x) { var p = Math.round(x.pct * 100); wl.appendChild(el("li", {}, [el("div", {}, [el("div", { class: "name" }, [el("a", { href: "#/study/" + moduleFor(x.cat), text: x.k, style: "color:var(--text);text-decoration:none" }), el("span", { text: x.seen + " seen" })]), el("div", { class: "bar" }, [el("span", { class: p >= 60 ? "amber" : "red", style: "width:" + p + "%" })])]), el("span", { class: "pct", text: p + "%" })])); });
        children.push(el("div", { class: "card" }, [el("h3", { text: "Topics to review" }), wl, el("a", { class: "btn btn-primary", style: "margin-top:14px", href: "#/exam/weak", text: "Drill weak spots" })]));
      }
      var list = el("div", { class: "card" }, [el("h3", { text: "All attempts" })]);
      s.attempts.forEach(function (a) { list.appendChild(attemptRow(a)); });
      children.push(list);
    }
    page(children);
    return { title: "Progress", back: true };
  };

  /* ---------- Achievements ---------- */
  SCREENS.achievements = function () {
    var el = UI.el, s = Store.state;
    var grid = el("div", { class: "badge-grid" }, Achievements.list.map(function (a) {
      var on = s.achievements[a.id];
      return el("div", { class: "badge-card " + (on ? "on" : "") }, [el("span", { class: "badge-big", text: a.icon }), el("b", { text: a.name }), el("span", { text: a.desc }), on ? el("em", { text: "Unlocked " + new Date(on).toLocaleDateString(undefined, { month: "short", day: "numeric" }) }) : null]);
    }));
    page([el("h1", { text: "Achievements" }), el("p", { class: "lede", text: Achievements.unlockedCount() + " of " + Achievements.list.length + " unlocked. Each one marks a real milestone on the way to the certificate." }), grid]);
    return { title: "Achievements", back: true };
  };

  /* ---------- More ---------- */
  SCREENS.more = function () {
    var el = UI.el, rows = el("div", { class: "rows" });
    [["#/progress", "Progress and history", "Scores, trends, streak calendar, topics to review"], ["#/achievements", "Achievements", Achievements.unlockedCount() + " of " + Achievements.list.length + " unlocked"], ["#/cards", "Flashcards", "Key numbers and definitions, spaced"], ["#/path/costs", "Costs and timeline", "What the certificate costs and how long it takes"], ["#/ref/regs", "Part 107 cheat sheet", "The rule, section by section"], ["#/ref/safety", "Safety", "Go/no-go, preflight checklist, emergencies"], ["#/ref/resources", "Resources", "Official FAA links and tools"],
     ["#/settings", "Settings", "Name, test date, daily goal, reminders, sounds"], ["#/backup", "Backup and restore", "Move your progress to a new phone"], ["#/privacy", "Privacy", "How your data is handled"], ["#/about", "About", "Version, sources, " + COMPANY]].forEach(function (p) {
      rows.appendChild(el("a", { class: "row row-2", href: p[0] }, [el("span", {}, [el("div", { class: "label", text: p[1] }), el("div", { class: "sub", text: p[2] })]), el("span", { class: "chev", html: ICONS.chev })]));
    });
    page([el("h1", { text: "More" }), rows]);
    return { title: "More" };
  };

  SCREENS.settings = function () {
    var el = UI.el, s = Store.state;
    var name = el("input", { type: "text", maxlength: "40", value: s.profile.name || "", placeholder: "First name or call sign" });
    name.addEventListener("change", function () { s.profile.name = name.value.trim().slice(0, 40); Store.save(); UI.toast("Saved"); });
    var date = el("input", { type: "date", value: s.profile.testDate || "" });
    date.addEventListener("change", function () { s.profile.testDate = date.value || ""; Store.save(); UI.toast("Saved"); });
    function sw(label, sub, key, onChange) {
      var t = el("button", { type: "button", class: "toggle", role: "switch", "aria-checked": s.settings[key] ? "true" : "false", "aria-label": label });
      t.addEventListener("click", function () { s.settings[key] = !s.settings[key]; Store.save(); t.setAttribute("aria-checked", s.settings[key] ? "true" : "false"); if (onChange) onChange(s.settings[key], t); });
      return el("div", { class: "switch" }, [el("div", {}, [el("div", { class: "sw-label", text: label }), el("div", { class: "sw-sub", text: sub })]), t]);
    }
    var timeInput = el("input", { type: "time", value: String(s.settings.reminderHour).padStart(2, "0") + ":" + String(s.settings.reminderMinute).padStart(2, "0"), "aria-label": "Reminder time" });
    function applyReminder(on, toggleEl) {
      if (!on) { Reminders.disable(); UI.toast("Reminder off"); return; }
      var parts = timeInput.value.split(":").map(Number); s.settings.reminderHour = parts[0]; s.settings.reminderMinute = parts[1]; Store.save();
      if (!Reminders.available()) { UI.toast("Reminders work in the installed app on your phone.", 3200); return; }
      Reminders.enable(parts[0], parts[1]).then(function () { UI.toast("Reminder set for " + timeInput.value); }).catch(function (e) { s.settings.reminder = false; Store.save(); if (toggleEl) toggleEl.setAttribute("aria-checked", "false"); UI.toast(e.message || "Could not set the reminder", 3200); });
    }
    timeInput.addEventListener("change", function () { if (s.settings.reminder) applyReminder(true); else { var p = timeInput.value.split(":").map(Number); s.settings.reminderHour = p[0]; s.settings.reminderMinute = p[1]; Store.save(); } });
    var reset = el("button", { type: "button", class: "btn btn-danger btn-block", text: "Erase all progress" });
    reset.addEventListener("click", function () { UI.confirm("Start over?", "This clears your name, checked steps, module progress, flashcards, and exam history from this phone.", "Erase", function () { Exam.clear(); Reminders.disable(); Store.reset().then(function () { location.replace("#/welcome"); UI.toast("Fresh start"); }); }, true); });
    page([
      el("h1", { text: "Settings" }),
      el("div", { class: "card" }, [el("div", { class: "field" }, [el("label", { text: "Your name" }), name]), el("div", { class: "field" }, [el("label", { text: "Test date" }), date, el("div", { class: "hint", text: "Shows a countdown and tightens your daily plan as the day approaches." })]), el("div", { class: "field", style: "margin:0" }, [el("label", { text: "Daily goal" }), goalChips(s.goal, function (g) { s.goal = g; Store.save(); UI.toast("Goal: " + g + " a day"); })])]),
      el("div", { class: "card", style: "padding:6px 18px" }, [
        sw("Daily reminder", "A nudge at the time you choose. Scheduled on your phone, not from a server.", "reminder", applyReminder),
        el("div", { class: "switch" }, [el("div", {}, [el("div", { class: "sw-label", text: "Reminder time" })]), el("div", { style: "width:130px" }, [timeInput])]),
        sw("Sound effects", "Short tones for answers, goals, and achievements", "sounds"),
        sw("Launch flyby", "The drone animation and sound when the app opens", "intro"),
        sw("Haptic feedback", "A light tap when you answer or check something off", "haptics"),
        sw("Study mode on quick checks", "Show the answer after each question", "studyMode")
      ]),
      el("div", { class: "card" }, [el("h3", { text: "Start over" }), el("p", { class: "muted small", text: "Clears everything this app has saved on this phone." }), reset])
    ]);
    return { title: "Settings", back: true };
  };

  SCREENS.backup = function () {
    var el = UI.el;
    var code = el("textarea", { readonly: "readonly", "aria-label": "Backup code" }); code.value = Store.exportCode();
    var copy = el("button", { type: "button", class: "btn btn-primary", text: "Copy code" }); copy.addEventListener("click", function () { UI.copy(Store.exportCode(), "Backup code copied"); });
    var share = el("button", { type: "button", class: "btn btn-secondary", text: "Share" }); share.addEventListener("click", function () { UI.share(Store.exportCode()); });
    var paste = el("textarea", { placeholder: "Paste a backup code here", "aria-label": "Restore code" });
    var restore = el("button", { type: "button", class: "btn btn-blue btn-block", text: "Restore from code" });
    restore.addEventListener("click", function () {
      var v = paste.value.trim(); if (!v) { UI.toast("Paste a backup code first"); return; }
      UI.confirm("Replace your progress?", "Restoring replaces what is currently saved on this phone with the backup.", "Restore", function () { Store.importCode(v).then(function () { Exam.clear(); UI.toast("Progress restored"); UI.go("#/home"); }).catch(function (e) { UI.toast(e.message || "That code did not work"); }); }, true);
    });
    page([
      el("h1", { text: "Backup and restore" }), el("p", { class: "lede", text: "Your progress lives on this phone, which is why there is nothing to sign in to. Getting a new phone? Copy a backup code to your notes or email and paste it into the new one. Your phone's own backup (iCloud or Google) usually carries it over too." }),
      el("div", { class: "card" }, [el("h3", { text: "Your backup code" }), el("div", { class: "field" }, [code]), el("div", { class: "btn-row", style: "margin-bottom:0" }, [copy, share]), el("p", { class: "muted small", style: "margin:12px 0 0", text: "The code contains your name, test date, checked steps, module progress, flashcards, and exam history. Nothing else." })]),
      el("div", { class: "card" }, [el("h3", { text: "Restore on this phone" }), el("div", { class: "field" }, [paste]), restore])
    ]);
    return { title: "Backup", back: true };
  };

  SCREENS.privacy = function () {
    var el = UI.el;
    page([
      el("h1", { text: "Privacy" }),
      el("div", { class: "privacy-note" }, [el("span", { html: ICONS.shield }), el("p", { html: "<strong>Your study data is yours.</strong> Part 107 Prep has no accounts, no analytics, no advertising, and no server. We built it that way on purpose." })]),
      el("div", { class: "content" }, [
        el("h2", { text: "What stays on your phone" }), el("p", { text: "The name you choose, an optional test date, the steps and modules you have marked complete, your flashcard and review schedule, your settings, and your practice exam results. The app keeps this in its own private storage on your device and uses it only to show you your progress." }),
        el("h2", { text: "What is sent anywhere" }), el("p", { text: "Nothing. The app does not transmit your information to " + COMPANY + " or to anyone else, and we have no way to see it. If you turn on a daily reminder, it is scheduled by your phone itself." }),
        el("h2", { text: "Your own backups" }), el("p", { text: "If you use your phone's backup service (iCloud Backup or Google's Android backup), the app's storage can be included in it under your own account, which keeps your progress when you move to a new phone. The Backup screen in the app gives you a code you can carry over yourself as well." }),
        el("h2", { text: "Links to the FAA and others" }), el("p", { text: "Resources in the app open FAA and other third-party websites in your browser. Those sites have their own privacy policies." }),
        el("h2", { text: "Removing your data" }), el("p", { text: "Settings, then Erase all progress, clears everything the app has saved. Deleting the app does the same." }),
        el("h2", { text: "Contact" }), el("p", { html: "Questions are welcome through the app's store listing. The full policy is published on the <a href='" + SITE + "privacy.html'>Part 107 Prep website</a>." })
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
        el("p", { class: "muted small", text: "A free, independent study app for the FAA remote pilot certificate. Not affiliated with or endorsed by the Federal Aviation Administration. Regulations change: before you fly, confirm every rule against the current 14 CFR Part 107 and FAA guidance." }),
        el("p", { class: "muted small", text: BANK.questions.length + " practice questions and " + CARDS.length + " flashcards across five knowledge areas, all original and referenced to FAA sources. The practice chart is fictional and not for navigation." }),
        el("p", { style: "margin:0" }, [el("a", { href: SITE, text: "Part 107 Prep website" })])
      ]),
      el("div", { class: "card" }, [el("h3", { text: "Sources" }), el("ul", { class: "small", style: "margin:0" }, [el("li", { text: "14 CFR Parts 48, 89, 91, 107" }), el("li", { text: "FAA Remote Pilot Small UAS Study Guide and Airman Certification Standards" }), el("li", { text: "Pilot's Handbook of Aeronautical Knowledge" }), el("li", { text: "Aeronautical Chart User's Guide and Aeronautical Information Manual" }), el("li", { text: "Advisory Circular 107-2A" })])]),
      el("div", { class: "card", style: "text-align:center" }, [el("img", { src: "img/logo.svg", alt: "", style: "width:56px;height:56px" }), el("p", { style: "margin:8px 0 2px", html: "<strong>" + COMPANY + "</strong>" }), el("p", { class: "muted small", style: "margin:0", text: "Elgin, Illinois" })])
    ]);
    return { title: "About", back: true };
  };

  /* ---------- Background ---------- */
  function paintBackground() {
    var canvas = document.getElementById("chart-bg"); if (!canvas || !canvas.getContext) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2), W = window.innerWidth, H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    var c = canvas.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    var g = c.createRadialGradient(W * 0.3, H * 0.1, 0, W * 0.3, H * 0.1, Math.max(W, H)); g.addColorStop(0, "#141c3a"); g.addColorStop(0.55, "#0b1020"); g.addColorStop(1, "#070b18");
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
        var px = x * cell, py = y * cell, P = [[px + cell * lerp(a, b, level), py], [px + cell, py + cell * lerp(b, e, level)], [px + cell * lerp(d, e, level), py + cell], [px, py + cell * lerp(a, d, level)]], sg = SEG[idx];
        for (var k = 0; k < sg.length; k += 2) { c.moveTo(P[sg[k]][0], P[sg[k]][1]); c.lineTo(P[sg[k + 1]][0], P[sg[k + 1]][1]); }
      }
      c.stroke();
    }
    c.setLineDash([8, 5]); c.lineWidth = 1.5;
    c.strokeStyle = "rgba(93,150,245,0.28)"; c.beginPath(); c.arc(W * 0.78, H * 0.3, Math.min(W, H) * 0.3, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = "rgba(240,94,166,0.22)"; c.beginPath(); c.arc(W * 0.15, H * 0.78, Math.min(W, H) * 0.22, 0, Math.PI * 2); c.stroke();
    c.setLineDash([]); c.strokeStyle = "rgba(93,150,245,0.45)"; c.lineWidth = 2; c.beginPath(); c.arc(W * 0.78, H * 0.3, 9, 0, Math.PI * 2); c.stroke();
    c.save(); c.translate(W * 0.78, H * 0.3); c.rotate(-0.5); c.fillStyle = "rgba(93,150,245,0.45)"; c.fillRect(-12, -1.5, 24, 3); c.rotate(1.6); c.fillRect(-8, -1.2, 16, 2.4); c.restore();
  }

  /* ---------- Native integration ---------- */
  function initNative() {
    if (StatusBar) { try { StatusBar.setStyle({ style: "DARK" }).catch(function () {}); } catch (e) { /* web */ } try { StatusBar.setBackgroundColor({ color: "#0b1020" }).catch(function () {}); } catch (e) { /* iOS */ } }
    if (CapApp && CapApp.addListener) {
      CapApp.addListener("backButton", function () {
        var lb = document.getElementById("lightbox"); if (lb.classList.contains("open")) { closeLightbox(); return; }
        var modal = document.getElementById("modal"); if (modal.classList.contains("open")) { modal.classList.remove("open"); return; }
        var r = parseRoute();
        if (r.name === "exam" && Exam.active()) { UI.go("#/home"); return; }
        if (r.name === "home" || r.name === "welcome") { CapApp.exitApp(); return; }
        if (["path", "study", "exam", "more"].indexOf(r.name) >= 0 && !r.a) { UI.go("#/home"); return; }
        UI.back();
      });
      CapApp.addListener("appStateChange", function (st) { if (!st.isActive) { Exam.persist(); Store.flush(); } else { Store.reconcileStreak(); if (parseRoute().name === "home") rerender(); } });
    }
    window.addEventListener("pagehide", function () { Exam.persist(); Store.flush(); });
    document.addEventListener("visibilitychange", function () { if (document.hidden) { Exam.persist(); Store.flush(); } });
  }

  /* ---------- Boot ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    buildShell(); paintBackground();
    var rt = 0; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(paintBackground, 150); });
    initNative(); Sound.unlockOnGesture();
    Store.load().then(function () {
      if (!location.hash) location.replace(Store.state.profile.onboarded ? "#/home" : "#/welcome");
      var showIntro = Store.state.settings.intro;
      if (Splash) { try { Splash.hide().catch(function () {}); } catch (e) { /* web */ } }
      if (showIntro) Intro.play({ company: COMPANY, sound: Store.state.settings.sounds, onDone: function () { render(); if (Store.state.profile.onboarded) window.afterEvent(); } });
      else { render(); if (Store.state.profile.onboarded) window.afterEvent(); }
      if (showIntro) render();
    });
  });
})();
