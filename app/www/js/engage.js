/* Engagement layer: synthesized sounds, the launch flyby, achievements,
   celebrations, study reminders, and the daily plan. No audio files, no server. */
(function () {
  "use strict";

  /* ---------- Sound: everything synthesized with the Web Audio API ---------- */
  var Sound = {
    ctx: null,
    enabled: function () { return !!(window.Store && Store.state.settings.sounds); },
    context: function () {
      if (this.ctx) return this.ctx;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { this.ctx = new AC(); } catch (e) { return null; }
      return this.ctx;
    },
    unlockOnGesture: function () {
      var self = this;
      function resume() { var c = self.context(); if (c && c.state === "suspended") c.resume().catch(function () {}); }
      ["pointerdown", "touchstart", "keydown"].forEach(function (ev) { document.addEventListener(ev, resume, { passive: true }); });
    },
    tone: function (freq, start, dur, type, gain, glideTo) {
      var c = this.context(); if (!c) return;
      var o = c.createOscillator(), g = c.createGain();
      o.type = type || "sine"; o.frequency.setValueAtTime(freq, start);
      if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, start + dur);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(gain || 0.12, start + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      o.connect(g); g.connect(c.destination);
      o.start(start); o.stop(start + dur + 0.02);
    },
    correct: function () {
      if (!this.enabled()) return; var c = this.context(); if (!c) return; var t = c.currentTime;
      this.tone(659.25, t, 0.09, "sine", 0.1); this.tone(987.77, t + 0.09, 0.14, "sine", 0.1);
    },
    wrong: function () {
      if (!this.enabled()) return; var c = this.context(); if (!c) return; var t = c.currentTime;
      this.tone(220, t, 0.18, "triangle", 0.09, 170);
    },
    tick: function () {
      if (!this.enabled()) return; var c = this.context(); if (!c) return;
      this.tone(1200, c.currentTime, 0.03, "sine", 0.05);
    },
    unlock: function () {
      if (!this.enabled()) return; var c = this.context(); if (!c) return; var t = c.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { Sound.tone(f, t + i * 0.08, 0.22, "sine", 0.09); });
    },
    goal: function () {
      if (!this.enabled()) return; var c = this.context(); if (!c) return; var t = c.currentTime;
      [587.33, 783.99, 1174.66].forEach(function (f, i) { Sound.tone(f, t + i * 0.1, 0.25, "triangle", 0.08); });
    },
    pass: function () {
      if (!this.enabled()) return; var c = this.context(); if (!c) return; var t = c.currentTime;
      [[523.25, 0], [659.25, 0.12], [783.99, 0.24], [1046.5, 0.36], [1318.5, 0.6]].forEach(function (p) { Sound.tone(p[0], t + p[1], 0.3, "triangle", 0.09); });
      [[1046.5, 0.6], [1318.5, 0.7], [1567.98, 0.8]].forEach(function (p) { Sound.tone(p[0], t + p[1], 0.5, "sine", 0.05); });
    },
    /* A quadcopter passing left to right: detuned oscillators through a low-pass
       filter, a Doppler pitch drop, stereo pan, and a little filtered noise for air. */
    flyby: function (duration) {
      if (!this.enabled()) return null; var c = this.context(); if (!c) return null;
      var t = c.currentTime, d = duration || 2.6;
      var master = c.createGain(); master.gain.setValueAtTime(0.0001, t);
      master.gain.exponentialRampToValueAtTime(0.5, t + d * 0.35);
      master.gain.setValueAtTime(0.5, t + d * 0.55);
      master.gain.exponentialRampToValueAtTime(0.0001, t + d);
      var pan = null;
      if (c.createStereoPanner) { pan = c.createStereoPanner(); pan.pan.setValueAtTime(-0.9, t); pan.pan.linearRampToValueAtTime(0.9, t + d); }
      var lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.setValueAtTime(700, t); lp.frequency.linearRampToValueAtTime(1100, t + d * 0.5); lp.frequency.linearRampToValueAtTime(500, t + d); lp.Q.value = 2;
      var nodes = [];
      [[132, "sawtooth", 0.16], [133.7, "sawtooth", 0.16], [264, "triangle", 0.1], [396.5, "sine", 0.05], [88, "sine", 0.12]].forEach(function (p) {
        var o = c.createOscillator(), g = c.createGain();
        o.type = p[1];
        o.frequency.setValueAtTime(p[0] * 1.12, t);
        o.frequency.linearRampToValueAtTime(p[0] * 1.12, t + d * 0.42);
        o.frequency.exponentialRampToValueAtTime(p[0] * 0.88, t + d * 0.62);
        o.frequency.linearRampToValueAtTime(p[0] * 0.86, t + d);
        g.gain.value = p[2];
        o.connect(g); g.connect(lp);
        o.start(t); o.stop(t + d + 0.05);
        nodes.push(o);
      });
      /* air noise */
      var len = Math.floor(c.sampleRate * (d + 0.1)), buf = c.createBuffer(1, len, c.sampleRate), data = buf.getChannelData(0), last = 0;
      for (var i = 0; i < len; i++) { var w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; data[i] = last * 3.5; }
      var noise = c.createBufferSource(); noise.buffer = buf;
      var ng = c.createGain(); ng.gain.value = 0.25;
      var bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 900; bp.Q.value = 0.6;
      noise.connect(bp); bp.connect(ng); ng.connect(lp);
      noise.start(t); noise.stop(t + d + 0.05);
      lp.connect(pan || master); if (pan) pan.connect(master);
      master.connect(c.destination);
      return { stop: function () { try { master.gain.cancelScheduledValues(c.currentTime); master.gain.setValueAtTime(master.gain.value, c.currentTime); master.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.15); } catch (e) { /* already ended */ } } };
    }
  };

  /* ---------- Launch flyby ---------- */
  var Intro = {
    play: function (opts) {
      opts = opts || {};
      var el = document.getElementById("intro");
      var canvas = document.getElementById("intro-canvas");
      if (!el || !canvas) { if (opts.onDone) opts.onDone(); return; }
      var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      var D = reduce ? 1400 : 3300;
      el.classList.add("show");
      el.querySelector(".intro-company").textContent = opts.company || "";
      var dpr = Math.min(window.devicePixelRatio || 1, 2), W = window.innerWidth, H = window.innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.width = W + "px"; canvas.style.height = H + "px";
      var ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var start = performance.now(), raf = 0, done = false, sound = null;
      if (!reduce && opts.sound !== false) sound = Sound.flyby(2.7);
      var stars = [];
      for (var i = 0; i < 70; i++) stars.push([Math.random() * W, Math.random() * H * 0.7, Math.random() * 1.4 + 0.3, Math.random() * Math.PI * 2]);

      function drone(x, y, scale, tilt, t) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(scale, scale);
        /* arms */
        ctx.strokeStyle = "rgba(243,234,215,0.95)"; ctx.lineWidth = 4; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(-26, -16); ctx.lineTo(26, 16); ctx.moveTo(-26, 16); ctx.lineTo(26, -16); ctx.stroke();
        /* body */
        ctx.fillStyle = "#0b1020"; ctx.strokeStyle = "rgba(243,234,215,0.95)"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(0, 0, 14, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        /* camera */
        ctx.fillStyle = "#ffb02e"; ctx.beginPath(); ctx.arc(6, 7, 3.2, 0, Math.PI * 2); ctx.fill();
        /* props: blurred discs with a spinning blade pair */
        [[-26, -16], [26, 16], [-26, 16], [26, -16]].forEach(function (p, i) {
          ctx.save(); ctx.translate(p[0], p[1]);
          ctx.fillStyle = "rgba(243,234,215,0.12)"; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
          ctx.rotate((t / 18) * (i % 2 ? 1 : -1) + i);
          ctx.strokeStyle = "rgba(243,234,215,0.55)"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(12, 0); ctx.stroke();
          ctx.restore();
          ctx.fillStyle = "rgba(243,234,215,0.9)"; ctx.beginPath(); ctx.arc(p[0], p[1], 2.2, 0, Math.PI * 2); ctx.fill();
        });
        /* navigation lights: red on the left side, green on the right side (seen from above, nose right) */
        ctx.fillStyle = "#ff4d4d"; ctx.beginPath(); ctx.arc(-26, -16, 2.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#3cf07a"; ctx.beginPath(); ctx.arc(-26, 16, 2.6, 0, Math.PI * 2); ctx.fill();
        /* anti-collision strobe: double flash */
        var ph = (t % 1000) / 1000;
        if (ph < 0.06 || (ph > 0.13 && ph < 0.19)) {
          var g = ctx.createRadialGradient(0, -4, 0, 0, -4, 34);
          g.addColorStop(0, "rgba(255,255,255,0.95)"); g.addColorStop(0.3, "rgba(255,176,46,0.55)"); g.addColorStop(1, "rgba(255,176,46,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -4, 34, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }

      function frame(now) {
        if (done) return;
        var t = now - start, p = Math.min(1, t / D);
        ctx.clearRect(0, 0, W, H);
        /* stars */
        stars.forEach(function (s) { var a = 0.35 + 0.35 * Math.sin(t / 600 + s[3]); ctx.fillStyle = "rgba(243,234,215," + a.toFixed(2) + ")"; ctx.beginPath(); ctx.arc(s[0], s[1], s[2], 0, Math.PI * 2); ctx.fill(); });
        if (!reduce) {
          /* flight path: enters left, slight climb, exits right */
          var fp = Math.max(0, Math.min(1, (t - 150) / (D - 650)));
          var ease = fp < 0.5 ? 2 * fp * fp : 1 - Math.pow(-2 * fp + 2, 2) / 2;
          var x = -90 + (W + 180) * ease;
          var y = H * 0.40 - Math.sin(fp * Math.PI) * H * 0.08 + Math.sin(t / 230) * 5;
          var tilt = -0.14 + Math.sin(t / 400) * 0.03;
          /* wake */
          for (var k = 1; k <= 14; k++) {
            var wx = x - k * 14, wy = y + Math.sin((t - k * 40) / 230) * 5 + k * 0.6;
            ctx.fillStyle = "rgba(93,150,245," + (0.28 - k * 0.018).toFixed(3) + ")";
            ctx.beginPath(); ctx.arc(wx, wy, 2.2 - k * 0.1, 0, Math.PI * 2); ctx.fill();
          }
          drone(x, y, Math.min(1.25, W / 380), tilt, t);
        } else {
          drone(W / 2, H * 0.38, Math.min(1.25, W / 380), -0.1, 0);
        }
        if (p >= 1) finish(); else raf = requestAnimationFrame(frame);
      }
      function finish() {
        if (done) return; done = true;
        cancelAnimationFrame(raf);
        if (sound) sound.stop();
        el.classList.add("fade");
        setTimeout(function () { el.classList.remove("show", "fade"); el.removeEventListener("click", finish); if (opts.onDone) opts.onDone(); }, 420);
      }
      el.addEventListener("click", finish);
      raf = requestAnimationFrame(frame);
    }
  };

  /* ---------- Achievements ---------- */
  var ACHIEVEMENTS = [
    { id: "first-flight", name: "First flight", desc: "Finish your first quiz or exam.", icon: "🛫", check: function (s) { return s.attempts.length >= 1; } },
    { id: "streak-3", name: "Three in a row", desc: "Hit your daily goal three days running.", icon: "🔥", check: function (s) { return s.streak.current >= 3 || s.streak.best >= 3; } },
    { id: "streak-7", name: "One full week", desc: "A seven day streak. This is where habits stick.", icon: "📅", check: function (s) { return s.streak.best >= 7; } },
    { id: "streak-30", name: "Thirty days", desc: "A thirty day streak. Most people book the test before this.", icon: "🏆", check: function (s) { return s.streak.best >= 30; } },
    { id: "rulebook", name: "Rule book", desc: "Complete the Regulations module.", icon: "📘", check: function (s) { return !!(s.modules.regulations || {}).completedAt; } },
    { id: "chart-reader", name: "Chart reader", desc: "Complete the Airspace and chart reading module.", icon: "🗺️", check: function (s) { return !!(s.modules.airspace || {}).completedAt; } },
    { id: "weather-eye", name: "Weather eye", desc: "Complete the Weather module.", icon: "⛅", check: function (s) { return !!(s.modules.weather || {}).completedAt; } },
    { id: "ground-school", name: "Ground school", desc: "Complete all five study modules.", icon: "🎓", check: function (s) { return ["regulations", "airspace", "weather", "performance", "operations"].every(function (m) { return (s.modules[m] || {}).completedAt; }); } },
    { id: "full-send", name: "Full send", desc: "Finish a full 60-question timed exam.", icon: "⏱️", check: function (s) { return s.attempts.some(function (a) { return a.mode === "full"; }); } },
    { id: "passing-grade", name: "Passing grade", desc: "Score 70 percent or better on a full exam.", icon: "✅", check: function (s) { return s.attempts.some(function (a) { return a.mode === "full" && a.passed; }); } },
    { id: "ace", name: "Ace", desc: "Score 90 percent or better on a full exam.", icon: "🌟", check: function (s) { return s.attempts.some(function (a) { return a.mode === "full" && a.score >= 90; }); } },
    { id: "century", name: "Century", desc: "Answer 100 practice questions.", icon: "💯", check: function (s, S) { return S.questionsAnswered() >= 100; } },
    { id: "five-hundred", name: "Five hundred", desc: "Answer 500 practice questions.", icon: "🚀", check: function (s, S) { return S.questionsAnswered() >= 500; } },
    { id: "card-shark", name: "Card shark", desc: "Review 100 flashcards.", icon: "🃏", check: function (s, S) { return S.cardsReviewedTotal() >= 100; } },
    { id: "pathfinder", name: "Pathfinder", desc: "Check off five certification steps.", icon: "🧭", check: function (s) { return Object.keys(s.steps).length >= 5; } },
    { id: "certified", name: "Certified", desc: "Check off every step on the path. Congratulations, remote pilot.", icon: "🪪", check: function (s) { return Object.keys(s.steps).length >= 10; } }
  ];
  var Achievements = {
    list: ACHIEVEMENTS,
    /* Returns newly unlocked achievements */
    evaluate: function () {
      var s = Store.state, fresh = [];
      ACHIEVEMENTS.forEach(function (a) {
        if (s.achievements[a.id]) return;
        var ok = false;
        try { ok = a.check(s, Store); } catch (e) { ok = false; }
        if (ok && Store.unlock(a.id)) fresh.push(a);
      });
      return fresh;
    },
    unlockedCount: function () { return Object.keys(Store.state.achievements).length; }
  };

  /* ---------- Confetti ---------- */
  var Celebrate = {
    confetti: function (duration) {
      var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) return;
      var c = document.getElementById("confetti"); if (!c) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2), W = window.innerWidth, H = window.innerHeight;
      c.width = W * dpr; c.height = H * dpr; c.style.width = W + "px"; c.style.height = H + "px"; c.style.display = "block";
      var ctx = c.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var colors = ["#ffb02e", "#5d96f5", "#f05ea6", "#3fd08a", "#f3ead7"], parts = [];
      for (var i = 0; i < 120; i++) parts.push({ x: W / 2 + (Math.random() - 0.5) * 80, y: H * 0.35, vx: (Math.random() - 0.5) * 9, vy: -Math.random() * 11 - 3, r: Math.random() * 5 + 3, c: colors[i % colors.length], a: Math.random() * Math.PI, va: (Math.random() - 0.5) * 0.3 });
      var start = performance.now(), D = duration || 1800;
      function frame(now) {
        var t = now - start; ctx.clearRect(0, 0, W, H);
        parts.forEach(function (p) { p.vy += 0.28; p.x += p.vx; p.y += p.vy; p.a += p.va; p.vx *= 0.99; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.globalAlpha = Math.max(0, 1 - t / D); ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); ctx.restore(); });
        if (t < D) requestAnimationFrame(frame); else { ctx.clearRect(0, 0, W, H); c.style.display = "none"; }
      }
      requestAnimationFrame(frame);
    }
  };

  /* ---------- Study reminders (local notifications, scheduled on the device) ---------- */
  var Reminders = {
    plugin: function () { return (window.capacitorLocalNotifications && window.capacitorLocalNotifications.LocalNotifications) || null; },
    available: function () { return !!this.plugin() && !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); },
    enable: function (hour, minute) {
      var p = this.plugin(); if (!p) return Promise.reject(new Error("Reminders are available in the installed app."));
      return p.requestPermissions().then(function (r) {
        if (r.display !== "granted") throw new Error("Notifications are turned off for this app in your phone's settings.");
        return p.cancel({ notifications: [{ id: 1 }] }).catch(function () {});
      }).then(function () {
        var name = Store.state.profile.name;
        return p.schedule({ notifications: [{
          id: 1, title: "Part 107 Prep",
          body: (name ? name + ", a" : "A") + " few questions keeps the streak alive. Ten minutes is enough.",
          schedule: { on: { hour: hour, minute: minute }, allowWhileIdle: true }
        }] });
      });
    },
    disable: function () { var p = this.plugin(); if (!p) return Promise.resolve(); return p.cancel({ notifications: [{ id: 1 }] }).catch(function () {}); }
  };

  /* ---------- Today's plan ---------- */
  function buildPlan(bank, content, cards) {
    var s = Store.state, today = Store.today(), items = [];
    var act = s.activity[today] || { pts: 0, q: 0, cards: 0, mods: 0 };
    var attemptsToday = s.attempts.filter(function (a) { return a.date.slice(0, 10) === today; });
    var due = Store.dueReviews(bank).length;
    if (due) items.push({ id: "review", title: "Review " + due + " due question" + (due === 1 ? "" : "s"), sub: "Questions you missed, back when memory science says to see them again.", href: "#/exam/review", done: attemptsToday.some(function (a) { return a.mode === "review"; }), minutes: Math.ceil(due * 0.6) });
    var inProgress = content.modules.filter(function (m) { var ms = s.modules[m.id] || {}; return ms.openedAt && !ms.completedAt; })[0];
    var unread = content.modules.filter(function (m) { return !(s.modules[m.id] || {}).completedAt; })[0];
    var mod = inProgress || unread;
    if (mod) items.push({ id: "module", title: (inProgress ? "Continue: " : "Read: ") + mod.title, sub: "Module " + mod.num + " of 5. About " + mod.minutes + " minutes.", href: "#/study/" + mod.id, done: act.mods > 0, minutes: mod.minutes });
    var dueCards = Store.dueCards(cards).length, newCards = Store.newCards(cards).length;
    if (dueCards || newCards) items.push({ id: "cards", title: dueCards ? "Flip " + Math.min(15, dueCards) + " flashcards due today" : "Learn 15 new flashcards", sub: "The numbers and codes the test wants from memory.", href: "#/cards", done: act.cards >= 10, minutes: 5 });
    var dU = s.profile.testDate ? Math.round((new Date(s.profile.testDate + "T00:00:00") - new Date(today + "T00:00:00")) / 86400000) : null;
    var scored = s.attempts.filter(function (a) { return a.mode === "full" || a.mode === "quick"; });
    var dayNum = Math.floor(new Date(today + "T00:00:00").getTime() / 86400000);
    if (dU !== null && dU <= 14 && dU >= 0 && dayNum % 2 === 0) items.push({ id: "full", title: "Full practice exam", sub: "Test is close. Rehearse the real thing: 60 questions, timed.", href: "#/exam/full", done: attemptsToday.some(function (a) { return a.mode === "full"; }), minutes: 45 });
    else if (!scored.length || dayNum % 3 === 0) items.push({ id: "quick", title: "Quick check", sub: "20 questions across all five areas.", href: "#/exam/quick", done: attemptsToday.some(function (a) { return a.mode === "quick" || a.mode === "full"; }), minutes: 10 });
    else items.push({ id: "weak", title: "Drill your weak spots", sub: "15 questions weighted toward what you have missed.", href: "#/exam/weak", done: attemptsToday.some(function (a) { return a.mode === "weak" || a.mode === "topic" || a.mode === "full" || a.mode === "quick"; }), minutes: 8 });
    return items.slice(0, 4);
  }

  window.Sound = Sound;
  window.Intro = Intro;
  window.Achievements = Achievements;
  window.Celebrate = Celebrate;
  window.Reminders = Reminders;
  window.buildPlan = buildPlan;
})();
