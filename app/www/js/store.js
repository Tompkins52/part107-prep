/* On-device storage for Part 107 Prep.
   Everything lives in one JSON document saved through the Capacitor Preferences
   plugin (UserDefaults on iOS, SharedPreferences on Android). In a plain browser
   the plugin falls back to localStorage. Nothing is ever sent to a server. */
(function () {
  "use strict";

  var KEY = "p107.state";
  var VERSION = 1;
  var MAX_ATTEMPTS = 100;

  function nativePrefs() {
    return (window.capacitorPreferences && window.capacitorPreferences.Preferences) || null;
  }

  function blank() {
    return {
      v: VERSION,
      profile: { name: "", createdAt: "", testDate: "", onboarded: false },
      steps: {},        /* stepId -> ISO date completed */
      checks: {},       /* test-day checklist index -> true */
      modules: {},      /* moduleId -> { openedAt, completedAt, lastSection } */
      attempts: [],     /* newest first */
      qstats: {},       /* questionId -> { seen, correct, last, lastCorrect } */
      days: {},         /* YYYY-MM-DD -> true, days with any study activity */
      settings: { studyMode: true, haptics: true }
    };
  }

  function merge(base, saved) {
    if (!saved || typeof saved !== "object") return base;
    Object.keys(base).forEach(function (k) {
      if (saved[k] === undefined) return;
      if (base[k] && typeof base[k] === "object" && !Array.isArray(base[k])) base[k] = Object.assign({}, base[k], saved[k]);
      else base[k] = saved[k];
    });
    base.v = VERSION;
    return base;
  }

  var Store = {
    state: blank(),
    loaded: false,
    _timer: 0,

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
        return self.state;
      }).catch(function () { self.loaded = true; return self.state; });
    },

    /* Debounced write; flush() forces it */
    save: function () {
      var self = this;
      clearTimeout(this._timer);
      this._timer = setTimeout(function () { self.flush(); }, 250);
    },
    flush: function () {
      clearTimeout(this._timer);
      var raw = JSON.stringify(this.state);
      var prefs = nativePrefs();
      if (prefs) return prefs.set({ key: KEY, value: raw }).catch(function () {});
      try { localStorage.setItem(KEY, raw); } catch (e) { /* storage full or unavailable */ }
      return Promise.resolve();
    },

    today: function () {
      var d = new Date();
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    },
    touchDay: function () {
      var t = this.today();
      if (!this.state.days[t]) { this.state.days[t] = true; this.save(); }
    },
    streak: function () {
      var days = this.state.days, n = 0;
      var d = new Date();
      /* A streak counts today if studied today, otherwise it counts from yesterday */
      if (!days[this.today()]) d.setDate(d.getDate() - 1);
      for (;;) {
        var key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
        if (!days[key]) break;
        n++;
        d.setDate(d.getDate() - 1);
        if (n > 3650) break;
      }
      return n;
    },

    /* ----- steps ----- */
    toggleStep: function (id) {
      if (this.state.steps[id]) delete this.state.steps[id];
      else this.state.steps[id] = new Date().toISOString();
      this.touchDay();
      this.save();
      return !!this.state.steps[id];
    },
    toggleCheck: function (i) {
      if (this.state.checks[i]) delete this.state.checks[i];
      else this.state.checks[i] = true;
      this.save();
      return !!this.state.checks[i];
    },

    /* ----- modules ----- */
    moduleState: function (id) { return this.state.modules[id] || {}; },
    openModule: function (id) {
      var m = this.state.modules[id] || (this.state.modules[id] = {});
      if (!m.openedAt) m.openedAt = new Date().toISOString();
      this.touchDay();
      this.save();
    },
    setModuleSection: function (id, section) {
      var m = this.state.modules[id] || (this.state.modules[id] = {});
      if (m.lastSection !== section) { m.lastSection = section; this.save(); }
    },
    toggleModuleComplete: function (id) {
      var m = this.state.modules[id] || (this.state.modules[id] = {});
      if (m.completedAt) delete m.completedAt;
      else m.completedAt = new Date().toISOString();
      this.touchDay();
      this.save();
      return !!m.completedAt;
    },

    /* ----- exams ----- */
    recordAttempt: function (attempt, results) {
      /* results: [{ id, cat, correct(bool), answered(bool) }] */
      var self = this;
      this.state.attempts.unshift(attempt);
      if (this.state.attempts.length > MAX_ATTEMPTS) this.state.attempts.length = MAX_ATTEMPTS;
      var now = new Date().toISOString();
      results.forEach(function (r) {
        if (!r.answered) return;
        var q = self.state.qstats[r.id] || (self.state.qstats[r.id] = { seen: 0, correct: 0 });
        q.seen++;
        if (r.correct) q.correct++;
        q.last = now;
        q.lastCorrect = !!r.correct;
      });
      this.touchDay();
      this.flush();
    },

    /* Accuracy per category across every question answered, using the bank for category lookup */
    categoryAccuracy: function (bank) {
      var acc = {};
      Object.keys(bank.categories).forEach(function (c) { acc[c] = { seen: 0, correct: 0 }; });
      var qs = this.state.qstats;
      bank.questions.forEach(function (q) {
        var s = qs[q.id];
        if (!s) return;
        acc[q.cat].seen += s.seen;
        acc[q.cat].correct += s.correct;
      });
      return acc;
    },

    /* Readiness estimate, 0 to 100 */
    readiness: function (bank, modules) {
      var scored = this.state.attempts.filter(function (a) { return a.mode === "full" || a.mode === "quick"; }).slice(0, 3);
      var examAvg = scored.length ? scored.reduce(function (s, a) { return s + a.score; }, 0) / scored.length : 0;
      var acc = this.categoryAccuracy(bank);
      var weights = { regulations: 0.2, airspace: 0.2, weather: 0.135, loading: 0.09, operations: 0.4 };
      var mastery = 0, covered = 0;
      Object.keys(weights).forEach(function (c) {
        if (acc[c].seen >= 3) { mastery += weights[c] * (acc[c].correct / acc[c].seen) * 100; covered += weights[c]; }
      });
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
      var b64 = btoa(unescape(encodeURIComponent(json)));
      return "P107v1." + b64;
    },
    importCode: function (code) {
      code = (code || "").trim();
      if (code.indexOf("P107v1.") !== 0) throw new Error("That is not a Part 107 Prep backup code.");
      var json = decodeURIComponent(escape(atob(code.slice(7))));
      var parsed = JSON.parse(json);
      if (!parsed || typeof parsed !== "object" || !parsed.profile) throw new Error("The backup code is damaged.");
      this.state = merge(blank(), parsed);
      return this.flush();
    },
    reset: function () {
      this.state = blank();
      return this.flush();
    }
  };

  window.Store = Store;
})();
