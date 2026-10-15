/* On-device storage for Part 107 Prep.
   Everything lives in one JSON document saved through the Capacitor Preferences
   plugin (UserDefaults on iOS, SharedPreferences on Android). In a plain browser
   the plugin falls back to localStorage. Nothing is ever sent to a server. */
(function () {
  "use strict";

  var KEY = "p107.state";
  var VERSION = 2;
  var MAX_ATTEMPTS = 150;
  var MAX_FREEZES = 2;
  var BOX_DAYS = [1, 3, 7, 14, 30, 60]; /* spaced review intervals by box */

  function nativePrefs() {
    return (window.capacitorPreferences && window.capacitorPreferences.Preferences) || null;
  }
  function dayKey(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function addDays(key, n) {
    var p = key.split("-").map(Number);
    var d = new Date(p[0], p[1] - 1, p[2] + n);
    return dayKey(d);
  }

  function blank() {
    return {
      v: VERSION,
      profile: { name: "", createdAt: "", testDate: "", onboarded: false },
      goal: 10,            /* daily goal in points: 1 per question or flashcard, module completion counts in full */
      steps: {},           /* stepId -> ISO date completed */
      checks: {},          /* test-day checklist index -> true */
      modules: {},         /* moduleId -> { openedAt, completedAt, lastSection } */
      attempts: [],        /* newest first */
      qstats: {},          /* questionId -> { seen, correct, last, lastCorrect } */
      review: {},          /* questionId -> { box, due } spaced review schedule */
      cards: {},           /* cardId -> { box, due, seen } flashcard schedule */
      activity: {},        /* YYYY-MM-DD -> { pts, q, cards, mods, met } */
      streak: { current: 0, best: 0, freezes: MAX_FREEZES, frozen: {}, reconciled: "", awardedAt: 0 },
      achievements: {},    /* id -> ISO date unlocked */
      qotd: { date: "", answered: false, correct: false },
      session: null,       /* in-progress exam, so a phone call never loses a test */
      settings: { studyMode: true, haptics: true, sounds: true, intro: true, reminder: false, reminderHour: 19, reminderMinute: 0 }
    };
  }

  function merge(base, saved) {
    if (!saved || typeof saved !== "object") return base;
    Object.keys(base).forEach(function (k) {
      if (saved[k] === undefined) return;
      if (base[k] && typeof base[k] === "object" && !Array.isArray(base[k])) base[k] = Object.assign({}, base[k], saved[k] || {});
      else base[k] = saved[k];
    });
    /* v1 had a plain days map; fold it into activity so old streaks survive */
    if (saved.days && !saved.activity) {
      Object.keys(saved.days).forEach(function (d) { base.activity[d] = base.activity[d] || { pts: base.goal, q: 0, cards: 0, mods: 0, met: true }; });
    }
    base.v = VERSION;
    return base;
  }

  var Store = {
    state: blank(),
    loaded: false,
    _timer: 0,
    listeners: [],
    on: function (fn) { this.listeners.push(fn); },
    emit: function (evt, data) { this.listeners.forEach(function (fn) { try { fn(evt, data); } catch (e) { /* listener error */ } }); },

    load: function () {
      var self = this;
      var prefs = nativePrefs();
      var read = prefs ? prefs.get({ key: KEY }).then(function (r) { return r.value; })
                       : Promise.resolve((function () { try { return localStorage.getItem(KEY); } catch (e) { return null; } })());
      return read.then(function (raw) {
        if (raw) {
          try { self.state = merge(blank(), JSON.parse(raw)); } catch (e) { self.state = blank(); }
        }
        self.loaded = true;
        self.reconcileStreak();
        return self.state;
      }).catch(function () { self.loaded = true; return self.state; });
    },

    save: function () {
      var self = this;
      if (!this.loaded) return;
      clearTimeout(this._timer);
      this._timer = setTimeout(function () { self.flush(); }, 250);
    },
    flush: function () {
      /* Never write before the saved state has been read, or a background event
         in the first milliseconds of a launch could overwrite real progress with a blank slate */
      if (!this.loaded) return Promise.resolve();
      clearTimeout(this._timer);
      var raw = JSON.stringify(this.state);
      var prefs = nativePrefs();
      if (prefs) return prefs.set({ key: KEY, value: raw }).catch(function () {});
      try { localStorage.setItem(KEY, raw); } catch (e) { /* storage unavailable */ }
      return Promise.resolve();
    },

    today: function () { return dayKey(new Date()); },
    addDays: addDays,

    /* ----- daily goal, activity, streak ----- */
    todayActivity: function () {
      var t = this.today();
      return this.state.activity[t] || (this.state.activity[t] = { pts: 0, q: 0, cards: 0, mods: 0, met: false });
    },
    addActivity: function (kind, n) {
      n = n || 1;
      var a = this.todayActivity();
      if (kind === "q") { a.q += n; a.pts += n; }
      else if (kind === "cards") { a.cards += n; a.pts += n; }
      else if (kind === "mods") { a.mods += n; a.pts += this.state.goal; }
      var wasMet = a.met;
      if (!a.met && a.pts >= this.state.goal) {
        a.met = true;
        this.reconcileStreak();
        this.flush();
        this.emit("goal-met", { streak: this.state.streak.current });
      } else this.save();
      return !wasMet && a.met;
    },
    /* Walks the days since the last reconciliation, spending freezes on missed days,
       then recomputes the current streak as consecutive covered days ending today or yesterday. */
    reconcileStreak: function () {
      var s = this.state, st = s.streak, today = this.today();
      var yesterday = addDays(today, -1);
      var from = st.reconciled ? addDays(st.reconciled, 1) : null;
      if (from) {
        for (var d = from; d < today; d = addDays(d, 1)) {
          var act = s.activity[d];
          if ((act && act.met) || st.frozen[d]) continue;
          /* missed day: freeze it if a streak was alive and a freeze is available */
          var prevCovered = (s.activity[addDays(d, -1)] && s.activity[addDays(d, -1)].met) || st.frozen[addDays(d, -1)];
          if (prevCovered && st.freezes > 0) { st.freezes--; st.frozen[d] = true; }
        }
      }
      st.reconciled = yesterday;
      var n = 0, cur = (s.activity[today] && s.activity[today].met) ? today : yesterday;
      for (;;) {
        if ((s.activity[cur] && s.activity[cur].met) || st.frozen[cur]) { n++; cur = addDays(cur, -1); }
        else break;
        if (n > 5000) break;
      }
      st.current = n;
      if (n > st.best) st.best = n;
      /* earn a freeze back for every 7 days of streak */
      var award = Math.floor(n / 7);
      if (award > st.awardedAt) { st.freezes = Math.min(MAX_FREEZES, st.freezes + (award - st.awardedAt)); st.awardedAt = award; }
      if (n === 0) st.awardedAt = 0;
    },
    weekDots: function () {
      /* last 7 days ending today: met, frozen, missed, or future-less today pending */
      var out = [], today = this.today();
      for (var i = 6; i >= 0; i--) {
        var d = addDays(today, -i), a = this.state.activity[d];
        out.push({ day: d, state: a && a.met ? "met" : this.state.streak.frozen[d] ? "frozen" : d === today ? "today" : "missed", pts: a ? a.pts : 0 });
      }
      return out;
    },
    streakDays: function () { return this.state.streak.current; },

    /* ----- steps and checklist ----- */
    toggleStep: function (id) {
      if (this.state.steps[id]) delete this.state.steps[id];
      else this.state.steps[id] = new Date().toISOString();
      this.save();
      this.emit("steps");
      return !!this.state.steps[id];
    },
    toggleCheck: function (i) {
      if (this.state.checks[i]) delete this.state.checks[i]; else this.state.checks[i] = true;
      this.save();
      return !!this.state.checks[i];
    },

    /* ----- modules ----- */
    moduleState: function (id) { return this.state.modules[id] || {}; },
    openModule: function (id) {
      var m = this.state.modules[id] || (this.state.modules[id] = {});
      if (!m.openedAt) m.openedAt = new Date().toISOString();
      this.save();
    },
    setModuleSection: function (id, section) {
      var m = this.state.modules[id] || (this.state.modules[id] = {});
      if (m.lastSection !== section) { m.lastSection = section; this.save(); }
    },
    toggleModuleComplete: function (id) {
      var m = this.state.modules[id] || (this.state.modules[id] = {});
      if (m.completedAt) { delete m.completedAt; this.save(); return false; }
      m.completedAt = new Date().toISOString();
      this.addActivity("mods", 1);
      this.emit("module-complete", id);
      return true;
    },

    /* ----- exams and spaced review ----- */
    recordAttempt: function (attempt, results) {
      var self = this, now = new Date().toISOString(), today = this.today();
      this.state.attempts.unshift(attempt);
      if (this.state.attempts.length > MAX_ATTEMPTS) this.state.attempts.length = MAX_ATTEMPTS;
      var answered = 0;
      results.forEach(function (r) {
        if (!r.answered) return;
        answered++;
        var q = self.state.qstats[r.id] || (self.state.qstats[r.id] = { seen: 0, correct: 0 });
        q.seen++; if (r.correct) q.correct++; q.last = now; q.lastCorrect = !!r.correct;
        var rv = self.state.review[r.id] || { box: 0, due: today };
        if (r.correct) { rv.box = Math.min(BOX_DAYS.length - 1, rv.box + 1); rv.due = addDays(today, BOX_DAYS[rv.box]); }
        else { rv.box = 0; rv.due = addDays(today, 1); }
        self.state.review[r.id] = rv;
      });
      this.state.session = null;
      this.addActivity("q", answered);
      this.flush();
      this.emit("attempt", attempt);
    },
    dueReviews: function (bank) {
      var today = this.today(), rv = this.state.review;
      return bank.questions.filter(function (q) { return rv[q.id] && rv[q.id].due <= today; });
    },
    saveSession: function (session) { this.state.session = session; this.save(); },
    clearSession: function () { if (this.state.session) { this.state.session = null; this.save(); } },

    /* ----- flashcards ----- */
    cardState: function (id) { return this.state.cards[id] || { box: 0, due: "", seen: 0 }; },
    gradeCard: function (id, knew) {
      var today = this.today();
      var c = this.state.cards[id] || (this.state.cards[id] = { box: 0, due: "", seen: 0 });
      c.seen++;
      if (knew) { c.box = Math.min(BOX_DAYS.length - 1, c.box + 1); c.due = addDays(today, BOX_DAYS[c.box]); }
      else { c.box = 0; c.due = today; }
      this.addActivity("cards", 1);
      this.emit("card", { id: id, knew: knew });
    },
    dueCards: function (cards) {
      var today = this.today(), cs = this.state.cards;
      return cards.filter(function (c) { var s = cs[c.id]; return s && s.due && s.due <= today; });
    },
    newCards: function (cards) { var cs = this.state.cards; return cards.filter(function (c) { return !cs[c.id]; }); },
    cardsReviewedTotal: function () { var cs = this.state.cards, n = 0; Object.keys(cs).forEach(function (k) { n += cs[k].seen; }); return n; },

    /* ----- question of the day ----- */
    qotdQuestion: function (bank) {
      var t = this.today(), h = 0;
      for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
      return bank.questions[h % bank.questions.length];
    },
    qotdState: function () {
      var q = this.state.qotd;
      if (q.date !== this.today()) { q.date = this.today(); q.answered = false; q.correct = false; }
      return q;
    },
    answerQotd: function (correct, qid) {
      var q = this.qotdState();
      q.answered = true; q.correct = correct;
      var qs = this.state.qstats[qid] || (this.state.qstats[qid] = { seen: 0, correct: 0 });
      qs.seen++; if (correct) qs.correct++; qs.last = new Date().toISOString(); qs.lastCorrect = correct;
      var today = this.today(), rv = this.state.review[qid] || { box: 0, due: today };
      if (correct) { rv.box = Math.min(BOX_DAYS.length - 1, rv.box + 1); rv.due = addDays(today, BOX_DAYS[rv.box]); } else { rv.box = 0; rv.due = addDays(today, 1); }
      this.state.review[qid] = rv;
      this.addActivity("q", 1);
    },

    /* ----- achievements ----- */
    unlock: function (id) {
      if (this.state.achievements[id]) return false;
      this.state.achievements[id] = new Date().toISOString();
      this.flush();
      return true;
    },
    questionsAnswered: function () { var qs = this.state.qstats, n = 0; Object.keys(qs).forEach(function (k) { n += qs[k].seen; }); return n; },

    /* ----- analytics shown to the user ----- */
    categoryAccuracy: function (bank) {
      var acc = {};
      Object.keys(bank.categories).forEach(function (c) { acc[c] = { seen: 0, correct: 0 }; });
      var qs = this.state.qstats;
      bank.questions.forEach(function (q) { var s = qs[q.id]; if (!s) return; acc[q.cat].seen += s.seen; acc[q.cat].correct += s.correct; });
      return acc;
    },
    readiness: function (bank, modules) {
      var scored = this.state.attempts.filter(function (a) { return a.mode === "full" || a.mode === "quick"; }).slice(0, 3);
      var examAvg = scored.length ? scored.reduce(function (s, a) { return s + a.score; }, 0) / scored.length : 0;
      var acc = this.categoryAccuracy(bank);
      var weights = { regulations: 0.2, airspace: 0.2, weather: 0.135, loading: 0.09, operations: 0.4 };
      var mastery = 0, covered = 0;
      Object.keys(weights).forEach(function (c) { if (acc[c].seen >= 3) { mastery += weights[c] * (acc[c].correct / acc[c].seen) * 100; covered += weights[c]; } });
      mastery = covered ? mastery / covered : 0;
      var done = modules.filter(function (m) { return (this.state.modules[m.id] || {}).completedAt; }, this).length;
      var modPct = modules.length ? (done / modules.length) * 100 : 0;
      var score;
      if (!scored.length && !covered) score = modPct * 0.3;
      else if (!scored.length) score = mastery * 0.6 + modPct * 0.3;
      else score = examAvg * 0.55 + mastery * 0.25 + modPct * 0.2;
      return Math.round(Math.max(0, Math.min(100, score)));
    },

    /* ----- backup ----- */
    exportCode: function () {
      var json = JSON.stringify(this.state);
      return "P107v1." + btoa(unescape(encodeURIComponent(json)));
    },
    importCode: function (code) {
      code = (code || "").trim();
      if (code.indexOf("P107v1.") !== 0) throw new Error("That is not a Part 107 Prep backup code.");
      var parsed = JSON.parse(decodeURIComponent(escape(atob(code.slice(7)))));
      if (!parsed || typeof parsed !== "object" || !parsed.profile) throw new Error("The backup code is damaged.");
      this.state = merge(blank(), parsed);
      this.reconcileStreak();
      return this.flush();
    },
    reset: function () { this.state = blank(); return this.flush(); }
  };

  window.Store = Store;
})();
