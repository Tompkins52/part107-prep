/* Shared behavior: navigation, table of contents, lightbox, and the chart background. */
(function () {
  "use strict";

  /* Mobile navigation */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* Mark the current page in the navigation */
  var here = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".site-nav a, .site-footer nav a").forEach(function (a) {
    var target = a.getAttribute("href").split("#")[0];
    if (target === here) a.setAttribute("aria-current", "page");
  });

  /* Table of contents: highlight the section in view */
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll(".toc a[href^='#']"));
  if (tocLinks.length && "IntersectionObserver" in window) {
    var map = {};
    tocLinks.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          tocLinks.forEach(function (a) { a.classList.remove("active"); });
          var link = map[entry.target.id];
          if (link) link.classList.add("active");
        }
      });
    }, { rootMargin: "-20% 0px -70% 0px", threshold: 0 });
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) observer.observe(el);
    });
  }

  /* Lightbox for zoomable images (the practice chart) */
  var box = document.createElement("div");
  box.className = "lightbox";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-label", "Enlarged image");
  box.innerHTML = '<button type="button" aria-label="Close">×</button><img alt="">';
  document.body.appendChild(box);
  var boxImg = box.querySelector("img");
  function closeBox() { box.classList.remove("open"); }
  box.addEventListener("click", function (e) { if (e.target !== boxImg) closeBox(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeBox(); });
  document.addEventListener("click", function (e) {
    var img = e.target.closest && e.target.closest("img.zoomable");
    if (!img) return;
    boxImg.src = img.getAttribute("src");
    boxImg.alt = img.alt || "";
    box.classList.add("open");
    box.querySelector("button").focus();
  });

  /* Background: a night sectional. Terrain contours, two airport rings,
     lat/long ticks, and a small aircraft flying a pattern with its
     anti-collision light flashing. Static when reduced motion is requested. */
  var canvas = document.getElementById("chart-bg");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var W = 0, H = 0, dpr = 1, staticLayer = null, raf = 0, start = performance.now();

  function noise2(x, y) {
    /* Smooth, cheap pseudo-terrain built from a few sine waves */
    return (
      Math.sin(x * 0.0071 + 1.3) * 0.5 +
      Math.sin(y * 0.0083 - 0.7) * 0.5 +
      Math.sin((x + y) * 0.0041 + 2.1) * 0.6 +
      Math.sin((x - y * 1.3) * 0.0032 - 1.1) * 0.7 +
      Math.sin(x * 0.019 + y * 0.013) * 0.22
    );
  }

  function buildStatic() {
    var off = document.createElement("canvas");
    off.width = Math.round(W * dpr);
    off.height = Math.round(H * dpr);
    var c = off.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* Contour lines via marching squares on a coarse grid */
    var cell = 14;
    var cols = Math.ceil(W / cell) + 1;
    var rows = Math.ceil(H / cell) + 1;
    var field = new Float32Array(cols * rows);
    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) field[j * cols + i] = noise2(i * cell, j * cell);
    }
    c.lineWidth = 1;
    for (var level = -2.2; level <= 2.2; level += 0.28) {
      c.strokeStyle = (Math.round(level * 100) % 56 === 0) ? "rgba(201,169,122,0.22)" : "rgba(201,169,122,0.11)";
      c.beginPath();
      for (var y = 0; y < rows - 1; y++) {
        for (var x = 0; x < cols - 1; x++) {
          var a = field[y * cols + x], b = field[y * cols + x + 1];
          var d = field[(y + 1) * cols + x], e = field[(y + 1) * cols + x + 1];
          var idx = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (e > level ? 2 : 0) | (d > level ? 1 : 0);
          if (idx === 0 || idx === 15) continue;
          var px = x * cell, py = y * cell;
          var top = [px + cell * lerp(a, b, level), py];
          var right = [px + cell, py + cell * lerp(b, e, level)];
          var bottom = [px + cell * lerp(d, e, level), py + cell];
          var left = [px, py + cell * lerp(a, d, level)];
          var segs = SEGMENTS[idx];
          for (var s = 0; s < segs.length; s += 2) {
            var p = pick(segs[s], top, right, bottom, left);
            var q = pick(segs[s + 1], top, right, bottom, left);
            c.moveTo(p[0], p[1]);
            c.lineTo(q[0], q[1]);
          }
        }
      }
      c.stroke();
    }

    /* Latitude and longitude ticks along the edges */
    c.strokeStyle = "rgba(233,238,249,0.14)";
    c.lineWidth = 1;
    c.beginPath();
    for (var tx = 40; tx < W; tx += 40) {
      var long = (tx % 200 === 0) ? 12 : 6;
      c.moveTo(tx + 0.5, 0); c.lineTo(tx + 0.5, long);
      c.moveTo(tx + 0.5, H); c.lineTo(tx + 0.5, H - long);
    }
    for (var ty = 40; ty < H; ty += 40) {
      var longY = (ty % 200 === 0) ? 12 : 6;
      c.moveTo(0, ty + 0.5); c.lineTo(longY, ty + 0.5);
      c.moveTo(W, ty + 0.5); c.lineTo(W - longY, ty + 0.5);
    }
    c.stroke();

    /* A Class D ring (dashed blue) and a Class E surface area (dashed magenta) */
    var d = ringD();
    c.setLineDash([9, 6]);
    c.lineWidth = 1.5;
    c.strokeStyle = "rgba(93,150,245,0.32)";
    c.beginPath(); c.arc(d.x, d.y, d.r, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = "rgba(240,94,166,0.26)";
    c.beginPath(); c.arc(W * 0.16, H * 0.72, Math.min(W, H) * 0.14, 0, Math.PI * 2); c.stroke();
    c.setLineDash([]);

    /* Soft magenta vignette hinting at a Class E 700 ft floor */
    var g = c.createRadialGradient(W * 0.72, H * 0.3, Math.min(W, H) * 0.22, W * 0.72, H * 0.3, Math.min(W, H) * 0.36);
    g.addColorStop(0, "rgba(240,94,166,0)");
    g.addColorStop(0.75, "rgba(240,94,166,0.06)");
    g.addColorStop(1, "rgba(240,94,166,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);

    /* Airport symbol inside the Class D ring */
    c.save();
    c.translate(d.x, d.y);
    c.strokeStyle = "rgba(93,150,245,0.5)";
    c.fillStyle = "rgba(93,150,245,0.5)";
    c.lineWidth = 2;
    c.beginPath(); c.arc(0, 0, 11, 0, Math.PI * 2); c.stroke();
    c.rotate(-0.5);
    c.fillRect(-14, -2, 28, 4);
    c.rotate(1.6);
    c.fillRect(-10, -1.5, 20, 3);
    c.restore();

    /* VOR compass rose, faint, lower right */
    var vx = W * 0.84, vy = H * 0.78, vr = Math.min(W, H) * 0.11;
    c.strokeStyle = "rgba(93,150,245,0.18)";
    c.lineWidth = 1;
    c.beginPath(); c.arc(vx, vy, vr, 0, Math.PI * 2); c.stroke();
    c.beginPath();
    for (var ang = 0; ang < 360; ang += 5) {
      var rad = (ang - 90) * Math.PI / 180;
      var len = ang % 30 === 0 ? 10 : (ang % 10 === 0 ? 6 : 3);
      c.moveTo(vx + Math.cos(rad) * vr, vy + Math.sin(rad) * vr);
      c.lineTo(vx + Math.cos(rad) * (vr - len), vy + Math.sin(rad) * (vr - len));
    }
    c.stroke();
    c.beginPath();
    for (var k = 0; k < 6; k++) {
      var hx = (k / 6) * Math.PI * 2;
      c.lineTo(vx + Math.cos(hx) * 7, vy + Math.sin(hx) * 7);
    }
    c.closePath(); c.stroke();

    staticLayer = off;
  }

  var SEGMENTS = {
    1: [3, 2], 2: [2, 1], 3: [3, 1], 4: [0, 1], 5: [0, 3, 1, 2], 6: [0, 2], 7: [0, 3],
    8: [0, 3], 9: [0, 2], 10: [0, 1, 2, 3], 11: [0, 1], 12: [3, 1], 13: [2, 1], 14: [3, 2]
  };
  function pick(i, t, r, b, l) { return i === 0 ? t : i === 1 ? r : i === 2 ? b : l; }
  function lerp(a, b, level) { var t = (level - a) / (b - a); return t < 0 ? 0 : t > 1 ? 1 : t; }
  function ringD() { return { x: W * 0.74, y: H * 0.42, r: Math.min(W, H) * 0.2 }; }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildStatic();
    if (reduceMotion) frame(start + 4000);
  }

  function aircraftPosition(t) {
    /* A long, slow racetrack around the Class D ring */
    var d = ringD();
    var period = 42000;
    var u = ((t - start) % period) / period * Math.PI * 2;
    var rx = d.r * 1.35, ry = d.r * 0.55;
    var x = d.x + Math.cos(u) * rx;
    var y = d.y + Math.sin(u) * ry + Math.sin(u * 2) * 10;
    var heading = Math.atan2(Math.cos(u) * ry + Math.cos(u * 2) * 20, -Math.sin(u) * rx);
    return { x: x, y: y, heading: heading };
  }

  function drawAircraft(t) {
    var p = aircraftPosition(t);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.heading);
    /* Quadcopter outline */
    ctx.strokeStyle = "rgba(243,234,215,0.75)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-9, -9); ctx.lineTo(9, 9);
    ctx.moveTo(-9, 9); ctx.lineTo(9, -9);
    ctx.stroke();
    ctx.fillStyle = "rgba(243,234,215,0.85)";
    ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(243,234,215,0.35)";
    [[-9, -9], [9, 9], [-9, 9], [9, -9]].forEach(function (pt) {
      ctx.beginPath(); ctx.arc(pt[0], pt[1], 5, 0, Math.PI * 2); ctx.stroke();
    });
    /* Position lights: red left, green right */
    ctx.fillStyle = "rgba(255,70,70,0.9)";
    ctx.beginPath(); ctx.arc(9, -9, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(60,230,120,0.9)";
    ctx.beginPath(); ctx.arc(9, 9, 1.6, 0, Math.PI * 2); ctx.fill();
    /* Anti-collision strobe: a double flash about once a second */
    var phase = (t % 1100) / 1100;
    var flash = (phase < 0.06 || (phase > 0.14 && phase < 0.2)) ? 1 : 0;
    if (flash) {
      var grd = ctx.createRadialGradient(0, 0, 0, 0, 0, 26);
      grd.addColorStop(0, "rgba(255,255,255,0.9)");
      grd.addColorStop(0.3, "rgba(255,176,46,0.5)");
      grd.addColorStop(1, "rgba(255,176,46,0)");
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  var lastFrame = 0;
  function frame(t) {
    if (!staticLayer) return;
    /* About 30 frames per second is plenty for a slow aircraft and a strobe */
    if (t - lastFrame >= 32 || reduceMotion) {
      lastFrame = t;
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(staticLayer, 0, 0, W, H);
      drawAircraft(t);
    }
    if (!reduceMotion && !document.hidden) raf = requestAnimationFrame(frame);
  }

  var resizeTimer = 0;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  });
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && !reduceMotion) { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); }
  });

  resize();
  if (!reduceMotion) raf = requestAnimationFrame(frame);
})();
