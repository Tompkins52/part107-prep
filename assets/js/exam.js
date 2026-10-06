/* Practice exam engine. Depends on bank.js (window.P107_BANK). */
(function () {
  "use strict";
  var BANK = window.P107_BANK;
  if (!BANK) return;

  var PASS_PERCENT = 70;
  var FULL_TIME_MS = 120 * 60 * 1000;
  var STORAGE_KEY = "p107.attempts";
  var QUICK_COUNTS = { regulations: 4, airspace: 4, weather: 3, loading: 2, operations: 7 };
  var TOPIC_COUNT = 15;

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var el = function (tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "class") n.className = attrs[k];
      else if (k === "text") n.textContent = attrs[k];
      else if (k === "html") n.innerHTML = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  };
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function sample(arr, n) { return shuffle(arr).slice(0, Math.min(n, arr.length)); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function fmtTime(ms) {
    var s = Math.max(0, Math.round(ms / 1000));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return (h ? h + ":" + pad(m) : m) + ":" + pad(sec);
  }
  function loadAttempts() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveAttempt(a) {
    try {
      var list = loadAttempts();
      list.unshift(a);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 20)));
    } catch (e) { /* storage unavailable; ignore */ }
  }

  var views = { start: $("#view-start"), exam: $("#view-exam"), results: $("#view-results") };
  function show(name) {
    Object.keys(views).forEach(function (k) { views[k].hidden = (k !== name); });
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  var session = null;
  var timerHandle = 0;

  /* ---------- Building a session ---------- */
  function byCat(cat) { return BANK.questions.filter(function (q) { return q.cat === cat; }); }

  function pickQuestions(mode, cat) {
    var chosen = [];
    if (mode === "full") {
      Object.keys(BANK.categories).forEach(function (c) {
        chosen = chosen.concat(sample(byCat(c), BANK.categories[c].examCount));
      });
    } else if (mode === "quick") {
      Object.keys(QUICK_COUNTS).forEach(function (c) {
        chosen = chosen.concat(sample(byCat(c), QUICK_COUNTS[c]));
      });
    } else if (mode === "topic") {
      chosen = sample(byCat(cat), TOPIC_COUNT);
    } else if (mode === "retake") {
      chosen = cat; /* an array of questions */
    }
    return shuffle(chosen).map(function (q) {
      var order = shuffle([0, 1, 2]);
      return { q: q, order: order, correct: order.indexOf(q.c) };
    });
  }

  function startSession(mode, cat, studyMode, title) {
    var items = pickQuestions(mode, cat);
    if (!items.length) return;
    session = {
      mode: mode, title: title, items: items, cat: cat,
      answers: items.map(function () { return -1; }),
      flags: items.map(function () { return false; }),
      current: 0, study: !!studyMode,
      started: Date.now(), limit: mode === "full" ? FULL_TIME_MS : 0,
      finished: false
    };
    show("exam");
    renderQuestion();
    if (session.limit) {
      clearInterval(timerHandle);
      timerHandle = setInterval(tick, 500);
      tick();
    } else {
      $("#timer").hidden = true;
    }
  }

  function tick() {
    if (!session || session.finished) return;
    var left = session.limit - (Date.now() - session.started);
    var t = $("#timer");
    t.hidden = false;
    t.textContent = fmtTime(left);
    t.classList.toggle("low", left < 15 * 60 * 1000);
    t.classList.toggle("critical", left < 5 * 60 * 1000);
    if (left <= 0) finish(true);
  }

  /* ---------- Rendering a question ---------- */
  function renderQuestion() {
    var i = session.current;
    var item = session.items[i];
    var q = item.q;
    var cat = BANK.categories[q.cat];
    var answered = session.answers[i] >= 0;
    var reveal = session.study && answered;

    $("#counter").textContent = "Question " + (i + 1) + " of " + session.items.length;
    $("#progress-bar").style.width = Math.round(((i + 1) / session.items.length) * 100) + "%";
    $("#exam-title").textContent = session.title;

    var card = $("#qcard");
    card.innerHTML = "";
    var head = el("div", { class: "qcat" }, [
      el("span", { text: cat.name + (q.sub ? ": " + q.sub : "") }),
      el("button", {
        type: "button", class: "btn btn-sm btn-secondary flag-btn",
        "aria-pressed": session.flags[i] ? "true" : "false",
        text: session.flags[i] ? "Flagged for review" : "Flag for review"
      })
    ]);
    head.querySelector("button").addEventListener("click", function () {
      session.flags[i] = !session.flags[i];
      renderQuestion();
    });
    card.appendChild(head);
    card.appendChild(el("p", { class: "qtext", text: q.q }));

    if (q.fig && BANK.figures[q.fig]) {
      var fig = BANK.figures[q.fig];
      card.appendChild(el("figure", {}, [
        el("img", { src: fig.src, alt: "Practice sectional chart excerpt used for this question", class: "zoomable" }),
        el("figcaption", { text: fig.caption + " Tap the chart to enlarge." })
      ]));
    }

    var list = el("ul", { class: "choices", role: "radiogroup", "aria-label": "Answer choices" });
    item.order.forEach(function (origIdx, pos) {
      var letter = String.fromCharCode(65 + pos);
      var cls = "choice";
      if (reveal) {
        if (pos === item.correct) cls += " correct";
        else if (session.answers[i] === pos) cls += " wrong";
      }
      var btn = el("button", {
        type: "button", class: cls, role: "radio",
        "aria-checked": session.answers[i] === pos ? "true" : "false"
      }, [el("span", { class: "letter", text: letter }), el("span", { text: q.a[origIdx] })]);
      if (reveal) btn.disabled = true;
      btn.addEventListener("click", function () { choose(pos); });
      list.appendChild(el("li", {}, [btn]));
    });
    card.appendChild(list);

    if (reveal) card.appendChild(explanation(item, session.answers[i]));

    renderGrid();
    $("#btn-prev").disabled = i === 0;
    $("#btn-next").textContent = i === session.items.length - 1 ? "Last question" : "Next";
    $("#btn-next").disabled = i === session.items.length - 1;
    var unanswered = session.answers.filter(function (a) { return a < 0; }).length;
    $("#btn-finish").textContent = unanswered ? "Finish (" + unanswered + " unanswered)" : "Finish and score";
  }

  function explanation(item, chosenPos) {
    var q = item.q;
    var ok = chosenPos === item.correct;
    var correctLetter = String.fromCharCode(65 + item.correct);
    return el("div", { class: "explain" }, [
      el("div", { class: "verdict " + (ok ? "ok" : "bad"), text: ok ? "Correct" : (chosenPos < 0 ? "Not answered. Correct answer: " + correctLetter : "Incorrect. Correct answer: " + correctLetter) }),
      el("p", { text: q.x }),
      el("span", { class: "ref", text: "Reference: " + q.ref })
    ]);
  }

  function choose(pos) {
    var i = session.current;
    if (session.study && session.answers[i] >= 0) return;
    session.answers[i] = pos;
    renderQuestion();
  }

  function renderGrid() {
    var grid = $("#qgrid");
    grid.innerHTML = "";
    session.items.forEach(function (item, idx) {
      var cls = [];
      if (session.answers[idx] >= 0) cls.push("answered");
      if (session.flags[idx]) cls.push("flagged");
      if (idx === session.current) cls.push("current");
      var b = el("button", { type: "button", class: cls.join(" "), text: String(idx + 1), "aria-label": "Go to question " + (idx + 1) });
      b.addEventListener("click", function () { session.current = idx; renderQuestion(); });
      grid.appendChild(b);
    });
  }

  function move(delta) {
    var n = session.current + delta;
    if (n < 0 || n >= session.items.length) return;
    session.current = n;
    renderQuestion();
  }

  /* ---------- Finishing and results ---------- */
  function finish(timeUp) {
    if (!session || session.finished) return;
    var unanswered = session.answers.filter(function (a) { return a < 0; }).length;
    if (!timeUp && unanswered && !window.confirm(unanswered + " question" + (unanswered === 1 ? " is" : "s are") + " unanswered and will count as wrong. Finish anyway?")) return;
    session.finished = true;
    clearInterval(timerHandle);
    var elapsed = Date.now() - session.started;

    var total = session.items.length, correct = 0;
    var cats = {};
    session.items.forEach(function (item, idx) {
      var c = item.q.cat;
      cats[c] = cats[c] || { total: 0, correct: 0 };
      cats[c].total++;
      if (session.answers[idx] === item.correct) { correct++; cats[c].correct++; }
    });
    var pct = Math.round((correct / total) * 100);
    var passed = pct >= PASS_PERCENT;

    saveAttempt({ date: new Date().toISOString(), mode: session.title, score: pct, correct: correct, total: total, passed: passed });
    renderResults({ total: total, correct: correct, pct: pct, passed: passed, cats: cats, elapsed: elapsed, timeUp: !!timeUp });
    show("results");
  }

  function ring(pct, passed) {
    var r = 86, c = 2 * Math.PI * r;
    var color = passed ? "var(--green)" : "var(--red)";
    var svgNS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 220 220");
    svg.setAttribute("class", "ring");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Score " + pct + " percent");
    var bg = document.createElementNS(svgNS, "circle");
    bg.setAttribute("cx", "110"); bg.setAttribute("cy", "110"); bg.setAttribute("r", String(r));
    bg.setAttribute("fill", "none"); bg.setAttribute("stroke", "rgba(255,255,255,0.08)"); bg.setAttribute("stroke-width", "16");
    var fg = document.createElementNS(svgNS, "circle");
    fg.setAttribute("cx", "110"); fg.setAttribute("cy", "110"); fg.setAttribute("r", String(r));
    fg.setAttribute("fill", "none"); fg.setAttribute("stroke", color); fg.setAttribute("stroke-width", "16");
    fg.setAttribute("stroke-linecap", "round");
    fg.setAttribute("stroke-dasharray", c.toFixed(1));
    fg.setAttribute("stroke-dashoffset", (c * (1 - pct / 100)).toFixed(1));
    fg.setAttribute("transform", "rotate(-90 110 110)");
    var mark = document.createElementNS(svgNS, "circle");
    var ang = (PASS_PERCENT / 100) * 2 * Math.PI - Math.PI / 2;
    mark.setAttribute("cx", (110 + Math.cos(ang) * r).toFixed(1)); mark.setAttribute("cy", (110 + Math.sin(ang) * r).toFixed(1));
    mark.setAttribute("r", "5"); mark.setAttribute("fill", "var(--cream)");
    var t = document.createElementNS(svgNS, "text");
    t.setAttribute("x", "110"); t.setAttribute("y", "122"); t.setAttribute("text-anchor", "middle"); t.setAttribute("font-size", "52");
    t.textContent = pct + "%";
    svg.appendChild(bg); svg.appendChild(fg); svg.appendChild(mark); svg.appendChild(t);
    return svg;
  }

  function renderResults(r) {
    var head = $("#result-head");
    head.innerHTML = "";
    head.appendChild(ring(r.pct, r.passed));
    var needed = Math.ceil(r.total * PASS_PERCENT / 100);
    var stats = el("div", {}, [
      el("p", { class: "verdict-big " + (r.passed ? "pass" : "fail"), text: r.passed ? "Pass" : "Not yet" }),
      el("div", { class: "result-stats" }, [
        el("span", { html: "<b>" + r.correct + "</b> of " + r.total + " correct" }),
        el("span", { html: "<b>" + needed + "</b> needed to pass (" + PASS_PERCENT + "%)" }),
        el("span", { html: "<b>" + fmtTime(r.elapsed) + "</b> used" + (r.timeUp ? " (time expired)" : "") })
      ]),
      el("p", { text: r.passed
        ? "That would pass the real test. Keep drilling the categories below that came in under 80 percent; the FAA exam draws from a much larger pool."
        : "Below the 70 percent line. The category breakdown shows where to spend study time. Every question has an explanation and a reference in the review below." })
    ]);
    head.appendChild(stats);

    var bars = $("#cat-bars");
    bars.innerHTML = "";
    Object.keys(BANK.categories).forEach(function (c) {
      if (!r.cats[c]) return;
      var cat = r.cats[c];
      var pct = Math.round((cat.correct / cat.total) * 100);
      var cls = pct >= 80 ? "" : (pct >= 60 ? "mid" : "weak");
      var link = el("a", { href: BANK.categories[c].page, text: BANK.categories[c].name });
      bars.appendChild(el("li", {}, [
        link,
        el("div", { class: "bar" }, [el("span", { class: cls, style: "width:" + pct + "%" })]),
        el("span", { class: "score", text: cat.correct + "/" + cat.total + " (" + pct + "%)" })
      ]));
    });

    renderReview("all");
    $("#btn-retake-missed").disabled = r.correct === r.total;
  }

  function renderReview(filter) {
    var list = $("#review-list");
    list.innerHTML = "";
    document.querySelectorAll(".review-filter .btn").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-filter") === filter ? "true" : "false");
    });
    var shown = 0;
    session.items.forEach(function (item, idx) {
      var ok = session.answers[idx] === item.correct;
      if (filter === "missed" && ok) return;
      if (filter === "flagged" && !session.flags[idx]) return;
      shown++;
      var q = item.q;
      var card = el("div", { class: "qcard" });
      card.appendChild(el("div", { class: "qcat" }, [el("span", { text: "Question " + (idx + 1) + ": " + BANK.categories[q.cat].name + (q.sub ? ": " + q.sub : "") }), session.flags[idx] ? el("span", { class: "chip chip-amber", text: "Flagged" }) : null]));
      card.appendChild(el("p", { class: "qtext", text: q.q }));
      if (q.fig && BANK.figures[q.fig]) {
        card.appendChild(el("figure", {}, [el("img", { src: BANK.figures[q.fig].src, alt: "Practice sectional chart excerpt", class: "zoomable" })]));
      }
      var ul = el("ul", { class: "choices" });
      item.order.forEach(function (origIdx, pos) {
        var cls = "choice";
        if (pos === item.correct) cls += " correct";
        else if (session.answers[idx] === pos) cls += " wrong";
        var b = el("button", { type: "button", class: cls, disabled: "disabled" }, [el("span", { class: "letter", text: String.fromCharCode(65 + pos) }), el("span", { text: q.a[origIdx] })]);
        ul.appendChild(el("li", {}, [b]));
      });
      card.appendChild(ul);
      card.appendChild(explanation(item, session.answers[idx]));
      list.appendChild(el("div", { class: "review-item" }, [card]));
    });
    if (!shown) list.appendChild(el("p", { class: "callout", text: filter === "missed" ? "No missed questions. Nice work." : "No flagged questions in this attempt." }));
  }

  /* ---------- History on the start screen ---------- */
  function renderHistory() {
    var wrap = $("#history");
    var list = loadAttempts();
    wrap.innerHTML = "";
    if (!list.length) return;
    wrap.appendChild(el("h2", { text: "Your recent attempts" }));
    var tbl = el("table", {}, [
      el("thead", {}, [el("tr", {}, [el("th", { text: "Date" }), el("th", { text: "Mode" }), el("th", { text: "Score" }), el("th", { text: "Result" })])]),
      el("tbody", {}, list.slice(0, 10).map(function (a) {
        var d = new Date(a.date);
        return el("tr", {}, [
          el("td", { text: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) }),
          el("td", { text: a.mode }),
          el("td", { text: a.correct + "/" + a.total + " (" + a.score + "%)" }),
          el("td", { class: a.passed ? "pass" : "fail", text: a.passed ? "Pass" : "Below 70%" })
        ]);
      }))
    ]);
    wrap.appendChild(el("div", { class: "table-wrap" }, [tbl]));
    var clear = el("button", { type: "button", class: "btn btn-sm btn-ghost", text: "Clear history" });
    clear.addEventListener("click", function () {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
      renderHistory();
    });
    wrap.appendChild(clear);
  }

  /* ---------- Wiring ---------- */
  function studyMode() { return $("#opt-study").checked; }

  $("#mode-full").addEventListener("click", function () { startSession("full", null, studyMode(), "Full practice exam"); });
  $("#mode-quick").addEventListener("click", function () { startSession("quick", null, studyMode(), "Quick check"); });
  var topicSelect = $("#topic-select");
  Object.keys(BANK.categories).forEach(function (c) {
    topicSelect.appendChild(el("option", { value: c, text: BANK.categories[c].name + " (" + byCat(c).length + " questions)" }));
  });
  $("#mode-topic").addEventListener("click", function () {
    var c = topicSelect.value;
    startSession("topic", c, studyMode(), "Topic quiz: " + BANK.categories[c].short);
  });

  $("#btn-prev").addEventListener("click", function () { move(-1); });
  $("#btn-next").addEventListener("click", function () { move(1); });
  $("#btn-finish").addEventListener("click", function () { finish(false); });
  $("#btn-quit").addEventListener("click", function () {
    if (window.confirm("Leave this attempt? Your answers will not be scored.")) {
      clearInterval(timerHandle);
      session = null;
      renderHistory();
      show("start");
    }
  });

  document.querySelectorAll(".review-filter .btn").forEach(function (b) {
    b.addEventListener("click", function () { renderReview(b.getAttribute("data-filter")); });
  });
  $("#btn-retake-missed").addEventListener("click", function () {
    var missed = session.items.filter(function (item, idx) { return session.answers[idx] !== item.correct; }).map(function (item) { return item.q; });
    if (!missed.length) return;
    startSession("retake", missed, true, "Retake missed questions");
  });
  $("#btn-new").addEventListener("click", function () { session = null; renderHistory(); show("start"); });

  document.addEventListener("keydown", function (e) {
    if (!session || session.finished || views.exam.hidden) return;
    if (e.target && /^(input|select|textarea)$/i.test(e.target.tagName)) return;
    var k = e.key.toLowerCase();
    if (k === "arrowright" || k === "n") move(1);
    else if (k === "arrowleft" || k === "p") move(-1);
    else if (k === "f") { session.flags[session.current] = !session.flags[session.current]; renderQuestion(); }
    else if (k === "1" || k === "a") choose(0);
    else if (k === "2" || k === "b") choose(1);
    else if (k === "3" || k === "c") choose(2);
  });

  /* Deep links: exam.html?topic=airspace or ?mode=full */
  var params = new URLSearchParams(location.search);
  renderHistory();
  if (params.get("topic") && BANK.categories[params.get("topic")]) {
    topicSelect.value = params.get("topic");
    $("#opt-study").checked = true;
    startSession("topic", params.get("topic"), true, "Topic quiz: " + BANK.categories[params.get("topic")].short);
  } else if (params.get("mode") === "full") {
    startSession("full", null, false, "Full practice exam");
  } else {
    show("start");
  }
})();
