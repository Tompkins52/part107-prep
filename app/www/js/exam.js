/* Practice exam engine for the app. Depends on bank.js (window.P107_BANK),
   store.js (window.Store) and the helpers in app.js (window.UI). */
(function () {
  "use strict";
  var BANK = window.P107_BANK;
  var PASS = 70;
  var FULL_MS = 120 * 60 * 1000;
  var QUICK = { regulations: 4, airspace: 4, weather: 3, loading: 2, operations: 7 };
  var TOPIC_N = 15;
  var WEAK_N = 15;

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function sample(a, n) { return shuffle(a).slice(0, Math.min(n, a.length)); }
  function byCat(c) { return BANK.questions.filter(function (q) { return q.cat === c; }); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function fmt(ms) {
    var s = Math.max(0, Math.round(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return (h ? h + ":" + pad(m) : m) + ":" + pad(sec);
  }

  function weightedSample(items, weightFn, n) {
    var pool = items.map(function (q) { return { q: q, w: weightFn(q) }; }).filter(function (x) { return x.w > 0; });
    var out = [];
    while (out.length < n && pool.length) {
      var total = pool.reduce(function (s, x) { return s + x.w; }, 0);
      var r = Math.random() * total, i = 0;
      for (; i < pool.length; i++) { r -= pool[i].w; if (r <= 0) break; }
      if (i >= pool.length) i = pool.length - 1;
      out.push(pool[i].q);
      pool.splice(i, 1);
    }
    return out;
  }

  function pick(mode, opt) {
    var chosen = [];
    if (mode === "full") {
      Object.keys(BANK.categories).forEach(function (c) { chosen = chosen.concat(sample(byCat(c), BANK.categories[c].examCount)); });
    } else if (mode === "quick") {
      Object.keys(QUICK).forEach(function (c) { chosen = chosen.concat(sample(byCat(c), QUICK[c])); });
    } else if (mode === "topic") {
      chosen = sample(byCat(opt.cat), TOPIC_N);
    } else if (mode === "weak") {
      var qs = Store.state.qstats;
      chosen = weightedSample(BANK.questions, function (q) {
        var s = qs[q.id];
        if (!s || !s.seen) return 2;
        var acc = s.correct / s.seen;
        var w = acc < 0.5 ? 4 : acc < 0.8 ? 2.5 : 0.4;
        if (s.lastCorrect === false) w += 2;
        return w;
      }, WEAK_N);
    } else if (mode === "retake") {
      chosen = opt.questions;
    }
    return shuffle(chosen).map(function (q) {
      var order = shuffle([0, 1, 2]);
      return { q: q, order: order, correct: order.indexOf(q.c) };
    });
  }

  var TITLES = { full: "Full practice exam", quick: "Quick check", topic: "Topic quiz", weak: "Weak spots", retake: "Retake missed" };

  var Exam = {
    session: null,
    result: null,
    _timer: 0,
    _container: null,
    onUpdate: null,

    start: function (mode, opt) {
      opt = opt || {};
      var items = pick(mode, opt);
      if (!items.length) return false;
      var title = TITLES[mode] + (mode === "topic" ? ": " + BANK.categories[opt.cat].short : "");
      this.result = null;
      this.session = {
        mode: mode, title: title, cat: opt.cat || null, items: items,
        answers: items.map(function () { return -1; }), flags: items.map(function () { return false; }),
        current: 0, study: !!opt.study, started: Date.now(), limit: mode === "full" ? FULL_MS : 0, finished: false
      };
      clearInterval(this._timer);
      if (this.session.limit) this._timer = setInterval(this.tick.bind(this), 1000);
      Store.touchDay();
      return true;
    },
    active: function () { return !!(this.session && !this.session.finished); },
    hasResult: function () { return !!this.result; },
    clear: function () { clearInterval(this._timer); this.session = null; this.result = null; },

    tick: function () {
      var s = this.session;
      if (!s || s.finished) { clearInterval(this._timer); return; }
      var left = s.limit - (Date.now() - s.started);
      var t = this._container && this._container.querySelector(".timer");
      if (t) {
        t.textContent = fmt(left);
        t.classList.toggle("low", left < 15 * 60 * 1000);
        t.classList.toggle("critical", left < 5 * 60 * 1000);
      }
      if (left <= 0) { this.finish(true); UI.toast("Time is up. Your exam was scored."); if (this.onUpdate) this.onUpdate(); }
    },

    /* ---------- run view ---------- */
    render: function (container) {
      this._container = container;
      container.innerHTML = "";
      if (this.result) return this.renderResults(container);
      if (!this.session) return;
      var s = this.session, i = s.current, item = s.items[i], q = item.q, cat = BANK.categories[q.cat];
      var answered = s.answers[i] >= 0, reveal = s.study && answered;
      var el = UI.el;

      var head = el("div", { class: "exam-head" }, [
        el("span", { class: "counter", text: (i + 1) + " / " + s.items.length }),
        el("div", { class: "bar", "aria-hidden": "true" }, [el("span", { style: "width:" + Math.round(((i + 1) / s.items.length) * 100) + "%" })]),
        s.limit ? el("span", { class: "timer", text: fmt(s.limit - (Date.now() - s.started)) }) : el("span", { class: "chip", text: s.study ? "Study mode" : s.title })
      ]);
      container.appendChild(head);

      var card = el("div", { class: "card" });
      var flag = el("button", { type: "button", class: "btn btn-sm btn-secondary flag-btn", "aria-pressed": s.flags[i] ? "true" : "false", text: s.flags[i] ? "Flagged" : "Flag" });
      flag.addEventListener("click", function () { s.flags[i] = !s.flags[i]; Exam.render(container); });
      card.appendChild(el("div", { class: "qcat" }, [el("span", { text: cat.name + (q.sub ? ": " + q.sub : "") }), flag]));
      card.appendChild(el("p", { class: "qtext", text: q.q }));
      if (q.fig && BANK.figures[q.fig]) {
        var fig = BANK.figures[q.fig];
        card.appendChild(el("figure", { class: "qfig" }, [
          el("img", { src: fig.src, alt: "Practice sectional chart excerpt for this question", class: "zoomable" }),
          el("figcaption", { text: fig.caption + " Tap to enlarge." })
        ]));
      }
      var list = el("ul", { class: "choices", role: "radiogroup", "aria-label": "Answer choices" });
      item.order.forEach(function (orig, pos) {
        var cls = "choice";
        if (reveal) { if (pos === item.correct) cls += " correct"; else if (s.answers[i] === pos) cls += " wrong"; }
        var b = el("button", { type: "button", class: cls, role: "radio", "aria-checked": s.answers[i] === pos ? "true" : "false" },
          [el("span", { class: "letter", text: String.fromCharCode(65 + pos) }), el("span", { text: q.a[orig] })]);
        if (reveal) b.disabled = true;
        b.addEventListener("click", function () { Exam.choose(pos); });
        list.appendChild(el("li", {}, [b]));
      });
      card.appendChild(list);
      if (reveal) card.appendChild(this.explanation(item, s.answers[i]));
      container.appendChild(card);

      var prev = el("button", { type: "button", class: "btn btn-secondary", text: "Previous" });
      prev.disabled = i === 0;
      prev.addEventListener("click", function () { Exam.move(-1); });
      var last = i === s.items.length - 1;
      var next = el("button", { type: "button", class: "btn btn-blue", text: last ? "Last question" : "Next" });
      next.disabled = last;
      next.addEventListener("click", function () { Exam.move(1); });
      var unanswered = s.answers.filter(function (a) { return a < 0; }).length;
      var finish = el("button", { type: "button", class: "btn btn-primary full", text: unanswered ? "Finish (" + unanswered + " unanswered)" : "Finish and score" });
      finish.addEventListener("click", function () { Exam.confirmFinish(); });
      var quit = el("button", { type: "button", class: "btn btn-ghost full", text: "Quit without scoring" });
      quit.addEventListener("click", function () {
        UI.confirm("Leave this attempt?", "Your answers will not be scored or saved.", "Leave", function () { Exam.clear(); UI.go("#/exam"); });
      });
      container.appendChild(el("div", { class: "exam-nav" }, [prev, next, finish, quit]));

      var nav = el("details", { class: "navbox" }, [el("summary", { text: "Question navigator" })]);
      var grid = el("div", { class: "qgrid" });
      s.items.forEach(function (it, idx) {
        var c = [];
        if (s.answers[idx] >= 0) c.push("answered");
        if (s.flags[idx]) c.push("flagged");
        if (idx === i) c.push("current");
        var b = el("button", { type: "button", class: c.join(" "), text: String(idx + 1), "aria-label": "Go to question " + (idx + 1) });
        b.addEventListener("click", function () { s.current = idx; Exam.render(container); container.closest("#screen").scrollTop = 0; });
        grid.appendChild(b);
      });
      nav.appendChild(grid);
      nav.appendChild(el("p", { class: "muted small", text: "Blue: answered. Amber line: flagged. Outlined: current." }));
      container.appendChild(nav);
    },

    explanation: function (item, chosen) {
      var q = item.q, ok = chosen === item.correct, letter = String.fromCharCode(65 + item.correct);
      return UI.el("div", { class: "explain" }, [
        UI.el("div", { class: "verdict " + (ok ? "ok" : "bad"), text: ok ? "Correct" : (chosen < 0 ? "Not answered. Correct answer: " + letter : "Incorrect. Correct answer: " + letter) }),
        UI.el("p", { text: q.x }),
        UI.el("span", { class: "ref", text: "Reference: " + q.ref })
      ]);
    },

    choose: function (pos) {
      var s = this.session; if (!s) return;
      if (s.study && s.answers[s.current] >= 0) return;
      s.answers[s.current] = pos;
      UI.haptic();
      this.render(this._container);
      if (!s.study && s.current < s.items.length - 1) {
        /* In exam mode, advance automatically after a short pause */
        var cur = s.current;
        setTimeout(function () { if (Exam.session === s && s.current === cur && !s.finished) Exam.move(1); }, 260);
      }
    },
    move: function (d) {
      var s = this.session; if (!s) return;
      var n = s.current + d;
      if (n < 0 || n >= s.items.length) return;
      s.current = n;
      this.render(this._container);
      var sc = this._container.closest("#screen"); if (sc) sc.scrollTop = 0;
    },
    confirmFinish: function () {
      var s = this.session; if (!s) return;
      var un = s.answers.filter(function (a) { return a < 0; }).length;
      if (!un) return this.finish(false);
      UI.confirm("Finish with " + un + " unanswered?", "Unanswered questions count as wrong.", "Finish anyway", function () { Exam.finish(false); });
    },

    finish: function (timeUp) {
      var s = this.session; if (!s || s.finished) return;
      s.finished = true;
      clearInterval(this._timer);
      var elapsed = Date.now() - s.started, total = s.items.length, correct = 0, cats = {}, results = [];
      s.items.forEach(function (it, idx) {
        var c = it.q.cat;
        cats[c] = cats[c] || { correct: 0, total: 0 };
        cats[c].total++;
        var ok = s.answers[idx] === it.correct;
        if (ok) { correct++; cats[c].correct++; }
        results.push({ id: it.q.id, cat: c, correct: ok, answered: s.answers[idx] >= 0 });
      });
      var pct = Math.round((correct / total) * 100), passed = pct >= PASS;
      var attempt = { id: Date.now().toString(36), date: new Date().toISOString(), mode: s.mode, title: s.title, cat: s.cat, score: pct, correct: correct, total: total, passed: passed, elapsed: elapsed, timeUp: !!timeUp, cats: cats };
      Store.recordAttempt(attempt, results);
      this.result = { attempt: attempt, session: s };
      if (this._container && document.body.contains(this._container)) {
        this.render(this._container);
        var sc = this._container.closest("#screen"); if (sc) sc.scrollTop = 0;
      }
    },

    /* ---------- results view ---------- */
    renderResults: function (container) {
      var r = this.result.attempt, s = this.result.session, el = UI.el;
      var needed = Math.ceil(r.total * PASS / 100);
      container.appendChild(el("p", { class: "kicker", text: r.title }));
      container.appendChild(el("h1", { text: r.passed ? "Pass" : "Not yet" }));
      var card = el("div", { class: "card" });
      card.appendChild(el("div", { class: "result-head" }, [
        UI.ring(r.score, r.passed ? "var(--green)" : "var(--red)", PASS),
        el("div", {}, [
          el("div", { class: "result-stats" }, [
            el("span", { html: "<b>" + r.correct + "</b> of " + r.total + " correct" }),
            el("span", { html: "<b>" + needed + "</b> to pass" }),
            el("span", { html: "<b>" + fmt(r.elapsed) + "</b>" + (r.timeUp ? " (time expired)" : "") })
          ]),
          el("p", { class: "small muted", style: "margin:8px 0 0", text: r.passed
            ? "That would pass the real test. Keep drilling anything under 80 percent; the FAA pool is bigger than this one."
            : "Below the 70 percent line. The breakdown shows where to spend your study time." })
        ])
      ]));
      var bars = el("ul", { class: "cats", style: "margin-top:16px" });
      Object.keys(BANK.categories).forEach(function (c) {
        if (!r.cats[c]) return;
        var cc = r.cats[c], pct = Math.round((cc.correct / cc.total) * 100), cls = pct >= 80 ? "green" : pct >= 60 ? "amber" : "red";
        var a = el("a", { href: "#/study/" + modulePage(c), text: BANK.categories[c].name });
        bars.appendChild(el("li", {}, [
          el("div", {}, [el("div", { class: "name" }, [a, el("span", { text: cc.correct + "/" + cc.total })]), el("div", { class: "bar" }, [el("span", { class: cls, style: "width:" + pct + "%" })])]),
          el("span", { class: "pct", text: pct + "%" })
        ]));
      });
      card.appendChild(bars);
      var missed = s.items.filter(function (it, idx) { return s.answers[idx] !== it.correct; }).map(function (it) { return it.q; });
      var retake = el("button", { type: "button", class: "btn btn-primary", text: "Retake missed (" + missed.length + ")" });
      retake.disabled = !missed.length;
      retake.addEventListener("click", function () { Exam.start("retake", { questions: missed, study: true }); UI.go("#/exam"); });
      var again = el("button", { type: "button", class: "btn btn-secondary", text: "New exam" });
      again.addEventListener("click", function () { Exam.clear(); UI.go("#/exam"); });
      card.appendChild(el("div", { class: "btn-row", style: "margin-bottom:0" }, [retake, again]));
      container.appendChild(card);

      var filters = el("div", { class: "review-filter" });
      var listEl = el("div");
      var current = "missed";
      function renderList(f) {
        current = f;
        filters.querySelectorAll(".btn").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-f") === f ? "true" : "false"); });
        listEl.innerHTML = "";
        var shown = 0;
        s.items.forEach(function (it, idx) {
          var ok = s.answers[idx] === it.correct;
          if (f === "missed" && ok) return;
          if (f === "flagged" && !s.flags[idx]) return;
          shown++;
          var q = it.q;
          var qc = el("div", { class: "card" });
          qc.appendChild(el("div", { class: "qcat" }, [el("span", { text: (idx + 1) + ". " + BANK.categories[q.cat].name + (q.sub ? ": " + q.sub : "") }), s.flags[idx] ? el("span", { class: "chip chip-amber", text: "Flagged" }) : null]));
          qc.appendChild(el("p", { class: "qtext", text: q.q }));
          if (q.fig && BANK.figures[q.fig]) qc.appendChild(el("figure", { class: "qfig" }, [el("img", { src: BANK.figures[q.fig].src, alt: "Practice chart", class: "zoomable" })]));
          var ul = el("ul", { class: "choices" });
          it.order.forEach(function (orig, pos) {
            var cls = "choice";
            if (pos === it.correct) cls += " correct"; else if (s.answers[idx] === pos) cls += " wrong";
            var b = el("button", { type: "button", class: cls }, [el("span", { class: "letter", text: String.fromCharCode(65 + pos) }), el("span", { text: q.a[orig] })]);
            b.disabled = true;
            ul.appendChild(el("li", {}, [b]));
          });
          qc.appendChild(ul);
          qc.appendChild(Exam.explanation(it, s.answers[idx]));
          listEl.appendChild(el("div", { class: "review-item" }, [qc]));
        });
        if (!shown) listEl.appendChild(el("p", { class: "callout", text: f === "missed" ? "No missed questions. Nice work." : "No flagged questions in this attempt." }));
      }
      [["missed", "Missed"], ["all", "All questions"], ["flagged", "Flagged"]].forEach(function (p) {
        var b = el("button", { type: "button", class: "btn btn-sm btn-secondary", "data-f": p[0], text: p[1] });
        b.addEventListener("click", function () { renderList(p[0]); });
        filters.appendChild(b);
      });
      container.appendChild(el("h2", { style: "margin-top:22px", text: "Review" }));
      container.appendChild(filters);
      container.appendChild(listEl);
      renderList(current);
    }
  };

  function modulePage(cat) {
    return { regulations: "regulations", airspace: "airspace", weather: "weather", loading: "performance", operations: "operations" }[cat] || "regulations";
  }

  window.Exam = Exam;
})();
