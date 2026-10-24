/* The tour: twelve stops in time order, one scene at a time. Next/Back, the timeline,
   the bus stops, the mouse wheel and the arrow keys all move between stops.
   Each scene has its own small animation, started when the scene opens. */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var NS = "http://www.w3.org/2000/svg";
  var scenes = Array.prototype.slice.call(document.querySelectorAll(".scene"));
  var railBox = document.getElementById("rail"), stopsBox = document.getElementById("stops"), bus = document.getElementById("bus");
  var countEl = document.getElementById("count"), status = document.getElementById("tour-status");
  var nextBtn = document.getElementById("next"), prevBtn = document.getElementById("prev");
  var N = scenes.length, cur = 0, busy = false, seen = {};

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function clamp01(x) { return Math.max(0, Math.min(1, x)); }
  function smooth(x) { x = clamp01(x); return x * x * (3 - 2 * x); }
  function ease(x) { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }

  /* ---------- the timeline (left) and the bus route (bottom), built from each scene's year and name ---------- */
  var rail = scenes.map(function (s, i) {
    var li = document.createElement("li"), b = document.createElement("button");
    b.type = "button";
    b.innerHTML = '<i></i><span class="y">' + s.dataset.year + '</span><span class="n">' + s.dataset.name + "</span>";
    b.setAttribute("aria-label", "Stop " + (i + 1) + ": " + s.dataset.name + ", " + s.dataset.year);
    b.addEventListener("click", function () { go(i); });
    li.appendChild(b); railBox.appendChild(li);
    return b;
  });
  function pos(i) { return 2 + i * (96 / (N - 1)); }
  var lastYear = null;
  var stops = scenes.map(function (s, i) {
    var b = document.createElement("button");
    b.type = "button"; b.tabIndex = -1; b.style.left = pos(i) + "%";
    b.innerHTML = '<i></i><span class="yr">' + s.dataset.year + "</span>";
    if (s.dataset.year !== lastYear) b.classList.add("first");
    lastYear = s.dataset.year;
    b.addEventListener("click", function () { go(i); });
    stopsBox.appendChild(b);
    return b;
  });

  function render() {
    rail.forEach(function (b, i) { b.classList.toggle("on", i === cur); b.classList.toggle("seen", !!seen[i] && i !== cur); b.setAttribute("aria-current", i === cur ? "step" : "false"); });
    stops.forEach(function (b, i) { b.classList.toggle("on", i === cur); b.classList.toggle("seen", !!seen[i] && i !== cur); });
    bus.style.left = pos(cur) + "%";
    countEl.textContent = "STOP " + (cur + 1) + " OF " + N;
    status.textContent = "Stop " + (cur + 1) + " of " + N + ": " + scenes[cur].dataset.name + ", " + scenes[cur].dataset.year;
    prevBtn.style.visibility = cur === 0 ? "hidden" : "";
    nextBtn.disabled = cur === N - 1;
    nextBtn.textContent = cur === N - 1 ? "End of tour" : "Next stop ▸";
  }

  /* the text shrinks a little when a stop has more to say, so nothing scrolls on a desktop screen */
  function fit(scene) {
    var txt = scene.querySelector(".txt");
    if (!txt) return;
    txt.style.setProperty("--fs", "1"); txt.style.overflowY = "";
    if (window.innerWidth <= 900) return;
    var fs = 1;
    for (var k = 0; k < 30 && txt.scrollHeight > txt.clientHeight + 1 && fs > 0.68; k++) {
      fs -= 0.025; txt.style.setProperty("--fs", fs.toFixed(3));
    }
    if (txt.scrollHeight > txt.clientHeight + 1) txt.style.overflowY = "auto";   // a very small window: let it scroll
  }

  function enter(i) {
    var s = scenes[i];
    Array.prototype.forEach.call(s.querySelectorAll(".draw"), function (e) {
      try { e.style.setProperty("--len", Math.ceil(e.getTotalLength() + 2)); } catch (err) {}
    });
    s.classList.remove("on"); void s.getBoundingClientRect(); s.classList.add("on");
    fit(s);
    var m = modules[s.dataset.scene];
    if (m && m.enter) m.enter();
  }
  function leave(i) {
    scenes[i].classList.remove("on");
    var m = modules[scenes[i].dataset.scene];
    if (m && m.leave) m.leave();
  }

  function go(i) {
    if (busy) return;
    i = Math.max(0, Math.min(N - 1, i));
    if (i === cur) return;
    busy = true;
    rail[cur].classList.remove("on"); rail[cur].classList.add("yellow");
    scenes[cur].classList.add("fade");
    setTimeout(function () {
      rail.forEach(function (b) { b.classList.remove("yellow"); });
      leave(cur);
      scenes[cur].hidden = true; scenes[cur].classList.remove("fade");
      cur = i; seen[i] = true;
      var s = scenes[cur];
      s.classList.add("fade"); s.hidden = false; void s.getBoundingClientRect();
      requestAnimationFrame(function () { s.classList.remove("fade"); });
      enter(cur); render();
      busy = false;
      try { history.replaceState(null, "", "#s" + (cur + 1)); } catch (e) {}
      if (window.innerWidth <= 900) window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    }, reduce ? 0 : 320);
  }
  function next() { if (cur < N - 1) go(cur + 1); }
  function prev() { go(cur - 1); }

  nextBtn.addEventListener("click", next);
  prevBtn.addEventListener("click", prev);
  Array.prototype.forEach.call(document.querySelectorAll("[data-next]"), function (b) { b.addEventListener("click", next); });

  /* mouse wheel: one gesture = one stop (desktop layout only) */
  var lockStart = 0, lastWheel = 0, locked = false, acc = 0;
  window.addEventListener("wheel", function (e) {
    if (window.innerWidth <= 900) return;
    if (e.target.closest && e.target.closest("dialog")) return;
    e.preventDefault();
    var now = performance.now();
    if (locked) {
      if (now - lockStart > 700 && now - lastWheel > 200) locked = false;     // the previous gesture has ended
      lastWheel = now;
      if (locked) return;
    }
    if (now - lastWheel > 300) acc = 0;
    lastWheel = now; acc += e.deltaY;
    if (Math.abs(acc) >= 30) {
      if (acc > 0) next(); else prev();
      acc = 0; locked = true; lockStart = now;
    }
  }, { passive: false });

  /* keyboard */
  document.addEventListener("keydown", function (e) {
    if (e.target.closest && e.target.closest("input, textarea, dialog")) return;
    if (["ArrowRight", "ArrowDown", "PageDown"].indexOf(e.key) >= 0) { e.preventDefault(); next(); }
    else if (["ArrowLeft", "ArrowUp", "PageUp"].indexOf(e.key) >= 0) { e.preventDefault(); prev(); }
    else if (e.key === "Home") { e.preventDefault(); go(0); }
    else if (e.key === "End") { e.preventDefault(); go(N - 1); }
  });

  /* swipe on wide touch screens */
  var tx = null, box = document.getElementById("stagebox");
  box.addEventListener("touchstart", function (e) { tx = e.touches[0].clientX; }, { passive: true });
  box.addEventListener("touchend", function (e) {
    if (tx === null || window.innerWidth <= 900) return;
    var dx = e.changedTouches[0].clientX - tx; tx = null;
    if (Math.abs(dx) > 60) { if (dx < 0) next(); else prev(); }
  });

  /* ---------- one animation loop, used by whichever scene is open ---------- */
  var raf = null, tick = null, t0 = null;
  function loop(t) { if (t0 === null) t0 = t; if (tick) tick((t - t0) / 1000); raf = requestAnimationFrame(loop); }
  function run(fn) { tick = fn; t0 = null; if (!raf) raf = requestAnimationFrame(loop); }
  function stop() { tick = null; if (raf) cancelAnimationFrame(raf); raf = null; }

  var modules = {};

  /* ---------- 1 · the globe, on Bangladesh ---------- */
  modules.start = (function () {
    var g = null, last = 0;
    function draw(s) {
      last = s;
      g.view(80 + 8 * Math.sin(s * 0.22), 20);
      g.draw({ highlight: { "050": "#3E9B6F" }, marks: [{ lon: 90.41, lat: 23.81, label: "Dhaka", pulse: !reduce }], t: s });
    }
    return {
      enter: function () {
        if (!g) { g = window.Globe.create(document.getElementById("globe-start")); g.onload = function () { if (cur === 0) draw(last); }; }
        if (reduce) { draw(0); return; }
        run(draw);
      },
      leave: stop,
      resize: function () { if (g) draw(last); }
    };
  })();

  /* ---------- 2 · a Warren truss solved by the method of joints as the truck rolls across ---------- */
  modules.buet = (function () {
    var X0 = 64, PW = 72, YB = 262, YT = 168, nodes = [], M = [], lines = [], fmax = 0, built = false;
    var truck = document.getElementById("truss-truck"), ra = document.getElementById("ra"), rb = document.getElementById("rb");
    function gauss(A, b) {
      var n = b.length, r, c, k;
      for (c = 0; c < n; c++) {
        var p = c;
        for (r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
        var tA = A[c]; A[c] = A[p]; A[p] = tA; var tb = b[c]; b[c] = b[p]; b[p] = tb;
        var piv = A[c][c]; if (Math.abs(piv) < 1e-12) continue;
        for (r = c + 1; r < n; r++) {
          var f = A[r][c] / piv; if (!f) continue;
          for (k = c; k < n; k++) A[r][k] -= f * A[c][k];
          b[r] -= f * b[c];
        }
      }
      var x = new Array(n);
      for (r = n - 1; r >= 0; r--) {
        var s = b[r];
        for (k = r + 1; k < n; k++) s -= A[r][k] * x[k];
        x[r] = Math.abs(A[r][r]) < 1e-12 ? 0 : s / A[r][r];
      }
      return x;
    }
    // member forces (+ tension, − compression) and the two vertical reactions for loads on the bottom joints
    function solve(loads) {
      var n = nodes.length, U = M.length + 3, A = [], b = [], r;
      for (r = 0; r < 2 * n; r++) { A.push(new Array(U).fill(0)); b.push(0); }
      M.forEach(function (m, k) {
        var a = nodes[m[0]], c = nodes[m[1]], dx = c[0] - a[0], dy = a[1] - c[1], L = Math.hypot(dx, dy);
        A[2 * m[0]][k] += dx / L; A[2 * m[0] + 1][k] += dy / L;
        A[2 * m[1]][k] -= dx / L; A[2 * m[1] + 1][k] -= dy / L;
      });
      A[0][M.length] = 1; A[1][M.length + 1] = 1; A[13][M.length + 2] = 1;     // pin at the left joint, roller at the right
      for (var i = 0; i <= 6; i++) b[2 * i + 1] = loads[i];
      return gauss(A, b);
    }
    function loadsAt(x) {
      var L = [0, 0, 0, 0, 0, 0, 0], u = (x - X0) / PW;
      if (u < 0 || u > 6) return L;
      var i = Math.min(5, Math.floor(u)), f = u - i;
      L[i] += 1 - f; L[i + 1] += f;
      return L;
    }
    function build() {
      var i, j;
      for (i = 0; i <= 6; i++) nodes.push([X0 + i * PW, YB]);
      for (j = 0; j < 6; j++) nodes.push([X0 + (j + 0.5) * PW, YT]);
      for (i = 0; i < 6; i++) M.push([i, i + 1]);
      for (j = 0; j < 5; j++) M.push([7 + j, 8 + j]);
      for (j = 0; j < 6; j++) { M.push([j, 7 + j]); M.push([7 + j, j + 1]); }
      var g = document.getElementById("truss-members"), gn = document.getElementById("truss-nodes");
      M.forEach(function (m) {
        lines.push(el("line", { x1: nodes[m[0]][0], y1: nodes[m[0]][1], x2: nodes[m[1]][0], y2: nodes[m[1]][1], "class": "mem", stroke: "#9AA39D", "stroke-width": 3 }, g));
      });
      nodes.forEach(function (p) { el("circle", { cx: p[0], cy: p[1], r: 4.5, "class": "node" }, gn); });
      for (var x = X0; x <= X0 + 6 * PW; x += 6) {                 // the largest force over a full crossing sets the scale
        solve(loadsAt(x)).slice(0, M.length).forEach(function (f) { fmax = Math.max(fmax, Math.abs(f)); });
      }
      if (!fmax) fmax = 1;
      built = true;
    }
    function arrow(path, x, R) {
      var top = 350 - 48 * R;
      path.setAttribute("d", R > 0.02 ? "M" + x + " 350V" + top.toFixed(1) + "M" + (x - 6) + " " + (top + 8).toFixed(1) + "L" + x + " " + top.toFixed(1) + "L" + (x + 6) + " " + (top + 8).toFixed(1) : "");
    }
    function frame(x) {
      var sol = solve(loadsAt(x));
      lines.forEach(function (ln, k) {
        var f = sol[k], a = Math.abs(f) / fmax;
        ln.setAttribute("stroke", a < 0.02 ? "#9AA39D" : f > 0 ? "#2a78d6" : "#D63A2F");
        ln.setAttribute("stroke-width", (2.5 + 7 * a).toFixed(2));
      });
      truck.setAttribute("transform", "translate(" + x.toFixed(1) + " " + (YB - 3) + ")");
      arrow(ra, X0, sol[M.length + 1]); arrow(rb, X0 + 6 * PW, sol[M.length + 2]);
    }
    return {
      enter: function () {
        if (!built) build();
        if (reduce) { frame(X0 + 2.5 * PW); return; }
        run(function (s) { frame(-60 + ((s * 70) % 680)); });
      },
      leave: stop
    };
  })();

  /* ---------- 3 · the forecast appears on its own after the history is drawn, or on click ---------- */
  modules.crash = (function () {
    var chart = document.getElementById("chart"), btn = document.getElementById("run-arima"), timer = null;
    function set(on) {
      chart.classList.toggle("run", on);
      btn.setAttribute("aria-pressed", String(on));
      btn.textContent = on ? "Hide the forecast" : "Run the forecast ▸";
    }
    btn.addEventListener("click", function () { clearTimeout(timer); set(!chart.classList.contains("run")); });
    return {
      enter: function () { if (!chart.classList.contains("run")) timer = setTimeout(function () { set(true); }, reduce ? 0 : 2000); },
      leave: function () { clearTimeout(timer); }
    };
  })();

  /* ---------- 4 · the capstone plan, one layer at a time ---------- */
  modules.capstone = (function () {
    var svg = document.getElementById("kchar"), chips = Array.prototype.slice.call(document.querySelectorAll("[data-layer]")), timers = [];
    function set(n, on) {
      svg.classList.toggle("l" + n, on);
      chips[n - 1].setAttribute("aria-pressed", String(on));
    }
    function clear() { timers.forEach(clearTimeout); timers = []; }
    function buildAll() {
      clear();
      for (var n = 1; n <= 5; n++) set(n, false);
      for (n = 1; n <= 5; n++) (function (k) { timers.push(setTimeout(function () { set(k, true); }, reduce ? 0 : 300 + (k - 1) * 800)); })(n);
    }
    chips.forEach(function (b, i) { b.addEventListener("click", function () { clear(); set(i + 1, b.getAttribute("aria-pressed") !== "true"); }); });
    document.getElementById("build-plan").addEventListener("click", buildAll);
    return {
      enter: function () { if (!chips.some(function (b) { return b.getAttribute("aria-pressed") === "true"; })) buildAll(); },
      leave: clear
    };
  })();

  /* ---------- 5 · Dhaka's circular waterway, drawn from latitude and longitude ---------- */
  modules.waterbus = (function () {
    // the loop, clockwise from Sadarghat: Buriganga, Turag, Tongi Khal, Balu, Shitalakshya, Dhaleshwari, back up the Buriganga
    var LOOP = [[23.7055, 90.4100], [23.7108, 90.4025], [23.7158, 90.3958], [23.7186, 90.3884], [23.7172, 90.3800], [23.7146, 90.3712],
      [23.7178, 90.3618], [23.7262, 90.3552], [23.7362, 90.3518], [23.7480, 90.3462], [23.7610, 90.3418], [23.7728, 90.3392],
      [23.7840, 90.3380], [23.7985, 90.3362], [23.8150, 90.3330], [23.8345, 90.3292], [23.8545, 90.3302], [23.8705, 90.3408],
      [23.8790, 90.3585], [23.8848, 90.3800], [23.8882, 90.4040], [23.8838, 90.4245], [23.8782, 90.4440], [23.8700, 90.4625],
      [23.8480, 90.4755], [23.8220, 90.4790], [23.7955, 90.4805], [23.7700, 90.4790], [23.7462, 90.4858], [23.7228, 90.4985],
      [23.6990, 90.5150], [23.6745, 90.5182], [23.6500, 90.5118], [23.6200, 90.5050], [23.5930, 90.5120], [23.5660, 90.5060],
      [23.5720, 90.4900], [23.5880, 90.4820], [23.6120, 90.4760], [23.6380, 90.4680], [23.6640, 90.4510], [23.6875, 90.4310]];
    var STUBS = [[[23.8882, 90.4040], [23.9150, 90.3950], [23.9450, 90.3830]],
      [[23.7228, 90.4985], [23.7500, 90.5150], [23.7900, 90.5300], [23.8300, 90.5450]],
      [[23.6120, 90.4760], [23.6000, 90.4400], [23.5900, 90.4000], [23.5850, 90.3600]],
      [[23.5660, 90.5060], [23.5550, 90.5300], [23.5450, 90.5600]]];
    // [index, name, label side, which service]
    var ST = [[0, "Sadarghat", "br", "old new"], [2, "Showarighat", "tl", "old"], [8, "Kholamura", "l", "old"], [12, "Gabtoli", "l", "old new"],
      [14, "Mirpur Bridge", "l", "ref"], [17, "Ashulia", "l", "ref"], [20, "Tongi", "t", "new"], [25, "Talna", "r", "new"],
      [29, "Demra", "r", "ref"], [30, "Kachpur", "r", "new"], [33, "Narayanganj", "r", "new"], [39, "Fatullah", "l", "new"]];
    var RL = [["Buriganga", 238, 258, "end"], ["Turag", 210, 92, "start"], ["Tongi Khal", 312, 54, "middle"], ["Balu", 372, 140, "start"],
      ["Shitalakshya", 412, 283, "start"], ["Dhaleshwari", 362, 412, "end"]];
    var svg = document.getElementById("wbmap"), built = false, mode = "old", loop, old, LL, LO, boats = [], last = 0;
    function P(p) { return [300 + (p[1] - 90.424) * 101.9 * 10.6, 22 + (23.892 - p[0]) * 111.2 * 10.6]; }
    function spline(pts, closed) {
      var n = pts.length, d = "M" + pts[0][0].toFixed(1) + " " + pts[0][1].toFixed(1);
      for (var i = 0; i < (closed ? n : n - 1); i++) {
        var p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
        if (!closed) { if (i === 0) p0 = p1; if (i + 2 >= n) p3 = p2; }
        d += "C" + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + " " + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) + " " +
          (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + " " + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) + " " + p2[0].toFixed(1) + " " + p2[1].toFixed(1);
      }
      return d + (closed ? "Z" : "");
    }
    function boat(parent) {
      var g = el("g", { "class": "boat" }, parent);
      el("path", { d: "M-9 -4H7L10 0L7 4H-9Z" }, g); el("rect", { x: -6, y: -2.5, width: 8, height: 5, rx: 1.5 }, g);
      return g;
    }
    function build() {
      var water = document.getElementById("wb-water"), pts = LOOP.map(P);
      STUBS.forEach(function (s) { el("path", { d: spline(s.map(P), false), "class": "river thin" }, water); });
      el("path", { d: spline(pts, true), "class": "river" }, water);
      loop = document.getElementById("wb-loop"); loop.setAttribute("d", spline(pts, true));
      old = document.getElementById("wb-old"); old.setAttribute("d", spline(pts.slice(0, 13), false));
      LL = loop.getTotalLength(); LO = old.getTotalLength();
      var sg = document.getElementById("wb-stations");
      ST.forEach(function (s) {
        var p = pts[s[0]], g = el("g", { "class": "st " + s[3] }, sg);
        el("circle", { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: s[3] === "ref" ? 3.2 : 4.5 }, g);
        var o = { l: [-9, 4, "end"], r: [9, 4, "start"], t: [0, -9, "middle"], br: [7, 15, "start"], tl: [-5, -8, "end"] }[s[2]];
        var t = el("text", { x: (p[0] + o[0]).toFixed(1), y: (p[1] + o[1]).toFixed(1), "text-anchor": o[2] }, g); t.textContent = s[1];
      });
      var rg = document.getElementById("wb-rlabels");
      RL.forEach(function (r) { var t = el("text", { x: r[1], y: r[2], "text-anchor": r[3], "class": "rl" }, rg); t.textContent = r[0].toUpperCase(); });
      var bg = document.getElementById("wb-boats");
      for (var i = 0; i < 22; i++) boats.push(boat(bg));
      built = true;
    }
    function place(b, path, L, s, side, wrap) {
      s = wrap ? ((s % L) + L) % L : Math.max(0, Math.min(L - 1.6, s));
      var a = path.getPointAtLength(s), c = path.getPointAtLength(Math.min(L, s + 1.5));
      var ang = Math.atan2(c.y - a.y, c.x - a.x), nx = -Math.sin(ang) * side, ny = Math.cos(ang) * side;
      b.setAttribute("transform", "translate(" + (a.x + nx).toFixed(1) + " " + (a.y + ny).toFixed(1) + ") rotate(" + (ang * 180 / Math.PI + (side < 0 ? 180 : 0)).toFixed(1) + ")");
    }
    function frame(s) {
      last = s;
      if (mode === "old") {                               // two boats shuttle slowly between Sadarghat and Gabtoli
        boats.forEach(function (b, i) { b.style.display = i < 2 ? "" : "none"; });
        [0, 0.5].forEach(function (off, i) {
          var u = ((s / 26 + off) % 1), f = u < 0.5 ? u * 2 : 2 - u * 2;
          place(boats[i], old, LO, f * LO, u < 0.5 ? 1 : -1, false);
        });
      } else {                                            // ten boats each way around the loop
        boats.forEach(function (b, i) {
          if (i >= 20) { b.style.display = "none"; return; }
          b.style.display = "";
          var cw = i < 10, k = i % 10, u = (s / 40 + k / 10) % 1;
          place(b, loop, LL, cw ? u * LL : (1 - u) * LL, cw ? 4.5 : -4.5, true);
        });
      }
    }
    function setMode(m) {
      mode = m;
      svg.classList.toggle("mode-new", m === "new");
      document.getElementById("wb-keytext").textContent = m === "new" ? "Proposed loop · 110 km · 20 boats" : "2010 route · 16 km · 2 boats";
      Array.prototype.forEach.call(document.querySelectorAll("[data-wb]"), function (x) { x.classList.toggle("on", x.dataset.wb === m); x.setAttribute("aria-pressed", String(x.dataset.wb === m)); });
      Array.prototype.forEach.call(document.querySelectorAll("[data-wbpanel]"), function (p) { p.hidden = p.dataset.wbpanel !== m; });
      if (built) frame(last);
      fit(scenes[cur]);
    }
    Array.prototype.forEach.call(document.querySelectorAll("[data-wb]"), function (b) { b.addEventListener("click", function () { setMode(b.dataset.wb); }); });
    return {
      enter: function () {
        if (!built) build();
        if (reduce) { frame(6); return; }
        run(frame);
      },
      leave: stop
    };
  })();

  /* ---------- 6 · evidence → NLP → ontology → agenda, on a loop ---------- */
  modules.climas = (function () {
    var root = document.getElementById("climas"), steps = null, state = [];
    function q(s) { return root.querySelector(s); }
    function build() {
      steps = [[0.4, q(".d1")], [0.7, q(".d2")], [1.0, q(".d3")],
        [1.5, q(".k1")], [1.9, q(".k2")], [2.3, q(".k3")], [2.7, q(".k4")], [3.1, q(".k5")],
        [3.7, q(".n0")], [4.0, q(".e1")], [4.0, q(".n1")], [4.3, q(".e2")], [4.3, q(".n2")], [4.6, q(".e3")], [4.6, q(".n3")],
        [4.9, q(".e4")], [4.9, q(".n4")], [5.3, q(".e6")], [5.5, q(".e7")],
        [6.1, q(".a1")], [6.5, q(".a2")], [6.9, q(".a3")]];
    }
    function frame(s) {
      var t = s % 10.5;
      steps.forEach(function (st, i) {
        var on = t >= st[0] && t < 9.8;
        if (state[i] !== on) { st[1].classList.toggle("on", on); state[i] = on; }
      });
    }
    return {
      enter: function () { if (!steps) build(); state = []; if (reduce) { frame(9); return; } run(frame); },
      leave: stop
    };
  })();

  /* ---------- 8 · BUET to WMU on the globe ---------- */
  modules.move = (function () {
    var g = null, last = 0, km = document.getElementById("km");
    var A = [90.3925, 23.7265], B = [-85.6141, 42.2834], TOTAL = 12664;
    function draw(s) {
      last = s;
      var f = ease((s - 1) / 5);
      g.view(4 + 3 * Math.sin(s * 0.15), 52);
      g.draw({
        highlight: { "050": "#3E9B6F", "840": "#9CCBB0" },
        route: { from: A, to: B, f: f },
        marks: [{ lon: 90.41, lat: 23.81, label: "Dhaka", align: "right" }, { lon: -85.59, lat: 42.29, label: "Kalamazoo", align: "left" }],
        t: s
      });
      km.textContent = Math.round(TOTAL * f).toLocaleString("en-US");
    }
    return {
      enter: function () {
        if (!g) { g = window.Globe.create(document.getElementById("globe-move")); g.onload = function () { if (scenes[cur].dataset.scene === "move") draw(last); }; }
        if (reduce) { draw(99); return; }
        run(draw);
      },
      leave: stop,
      resize: function () { if (g) draw(last); }
    };
  })();

  /* ---------- 9 · a work zone: lane closure, merge, queue, and what each sensor sees ---------- */
  modules.workzone = (function () {
    var svg = document.getElementById("wz"), carsG = document.getElementById("wz-cars"), speedG = document.getElementById("wz-speed");
    var LANES = [178, 234], V = 90, CL = 34, AMAX = 70, BCOMF = 110, TH = 0.85, S0 = 9;
    var BT1 = 70, BT2 = 490, MV = 206, CAM = 414, TAPER = 304, MERGE = 110, NORMAL = (BT2 - BT1) / V, MIN_PER_S = 2 / NORMAL;
    var COLORS = ["#E5533D", "#3A86D6", "#F2B134", "#3DAA6D", "#8E6BD8", "#2EB5B0", "#F07FA6", "#56616B"];
    var cars = [], pool = [], closed = false, time = 0, next = [0, 0.7], tts = [], spot = 60, built = false, segs = [], lastUi = -1, simT = 0;
    var btn = document.getElementById("close-lane");
    function build() {
      for (var k = 0; k < 8; k++) segs.push(el("rect", { x: 20 + k * 65, y: 76, width: 61, height: 9, rx: 3, fill: "#B7C1BA" }, speedG));
      var t = el("text", { x: 20, y: 70, "class": "seg-lbl" }, speedG); t.textContent = "SPEED BY ROAD SEGMENT";
      built = true;
    }
    function make(lane) {
      var g = pool.pop();
      if (!g) {
        g = el("g", {});
        el("rect", { x: -CL, y: -10, width: CL, height: 20, rx: 6 }, g);
        el("rect", { x: -CL * 0.62, y: -7, width: CL * 0.4, height: 14, rx: 3, fill: "rgba(255,255,255,.55)" }, g);
      }
      g.firstChild.setAttribute("fill", COLORS[Math.floor(Math.random() * COLORS.length)]);
      carsG.appendChild(g);
      return { x: -8, lane: lane, y: LANES[lane], ty: LANES[lane], v: V * 0.92, el: g, t1: null };
    }
    function idm(c, gap, dv) {
      var s = S0 + Math.max(0, c.v * TH + c.v * dv / (2 * Math.sqrt(AMAX * BCOMF)));
      return AMAX * (1 - Math.pow(c.v / V, 4) - Math.pow(s / Math.max(gap, 0.5), 2));
    }
    function ping(id) {
      var e = document.getElementById(id); e.classList.add("ping");
      setTimeout(function () { e.classList.remove("ping"); }, 220);
    }
    function step(dt) {
      time += dt;
      for (var ln = 0; ln < 2; ln++) {
        if (time < next[ln]) continue;
        var last = null;
        cars.forEach(function (c) { if (c.lane === ln && (!last || c.x < last.x)) last = c; });
        if (!last || last.x > CL + 8) { cars.push(make(ln)); next[ln] = time + 1.05 + Math.random() * 1.1; }
        else next[ln] = time + 0.25;
      }
      if (closed) cars.forEach(function (c) {                 // drivers in the closed lane look for a gap on the left
        if (c.lane !== 1 || c.x < MERGE || c.x > TAPER) return;
        var ahead = null, behind = null;
        cars.forEach(function (o) {
          if (o.lane !== 0) return;
          if (o.x >= c.x && (!ahead || o.x < ahead.x)) ahead = o;
          if (o.x < c.x && (!behind || o.x > behind.x)) behind = o;
        });
        var u = (c.x - MERGE) / (TAPER - MERGE);
        var ga = ahead ? ahead.x - CL - c.x : 1e9, gb = behind ? c.x - CL - behind.x : 1e9;
        if (ga > 6 + c.v * 0.35 * (1 - u) && gb > 5 + (behind ? behind.v : 0) * 0.4 * (1 - 0.7 * u)) { c.lane = 0; c.ty = LANES[0]; }
      });
      cars.forEach(function (c) {
        var lead = null;
        cars.forEach(function (o) { if (o !== c && o.lane === c.lane && o.x > c.x && (!lead || o.x < lead.x)) lead = o; });
        var a = AMAX * (1 - Math.pow(c.v / V, 4));
        if (lead) a = Math.min(a, idm(c, lead.x - CL - c.x, c.v - lead.v));
        if (closed && c.lane === 1 && c.x < TAPER) a = Math.min(a, idm(c, TAPER - c.x, c.v));
        c.a = Math.max(-BCOMF * 3, a);
      });
      cars.forEach(function (c) {
        c.v = Math.max(0, c.v + c.a * dt);
        var x0 = c.x; c.x += c.v * dt;
        c.y += (c.ty - c.y) * Math.min(1, dt * 3.5);
        if (x0 < BT1 && c.x >= BT1) { c.t1 = time; if (simT === 0) ping("bt1"); }
        if (x0 < BT2 && c.x >= BT2 && c.t1 !== null) { tts.push(time - c.t1); if (tts.length > 8) tts.shift(); if (simT === 0) ping("bt2"); }
        if (x0 < MV && c.x >= MV && simT === 0) ping("mvds");
        if (x0 < CAM && c.x >= CAM && simT === 0) ping("cam");
      });
      cars = cars.filter(function (c) { if (c.x > 610) { carsG.removeChild(c.el); pool.push(c.el); return false; } return true; });
    }
    function draw() {
      cars.forEach(function (c) { c.el.setAttribute("transform", "translate(" + c.x.toFixed(1) + " " + c.y.toFixed(1) + ")"); });
      if (time - lastUi < 0.25) return;
      lastUi = time;
      segs.forEach(function (r, k) {                          // RITIS-style segment speeds
        var x0 = 20 + k * 65, x1 = x0 + 65, sum = 0, n = 0;
        cars.forEach(function (c) { if (c.x >= x0 && c.x < x1) { sum += c.v; n++; } });
        if (!n) return;
        var f = sum / n / V;
        r.setAttribute("fill", f > 0.75 ? "#2FA36B" : f > 0.4 ? "#F2A900" : "#D63A2F");
      });
      var near = cars.filter(function (c) { return Math.abs(c.x - MV) < 30; });
      if (near.length) spot = near.reduce(function (s, c) { return s + c.v; }, 0) / near.length / V * 60;
      var tt = tts.length ? tts.reduce(function (a, b) { return a + b; }, 0) / tts.length : NORMAL;
      tt = Math.max(tt, NORMAL);
      var wn = 110, wc = Math.min(330, 110 * tt / NORMAL);
      document.getElementById("bar-n").setAttribute("width", wn);
      document.getElementById("bar-c").setAttribute("width", wc.toFixed(1));
      document.getElementById("val-n").setAttribute("x", 96 + wn + 8);
      document.getElementById("val-c").setAttribute("x", (96 + wc + 8).toFixed(1));
      document.getElementById("val-n").textContent = "2.0 min";
      document.getElementById("val-c").textContent = (tt * MIN_PER_S).toFixed(1) + " min";
      document.getElementById("val-d").textContent = "+" + ((tt - NORMAL) * MIN_PER_S).toFixed(1) + " min";
      document.getElementById("val-s").textContent = Math.round(spot) + " mph";
    }
    function warm(seconds) { simT = 1; for (var k = 0; k < seconds * 30; k++) step(1 / 30); simT = 0; }
    btn.addEventListener("click", function () {
      closed = !closed;
      svg.classList.toggle("closed", closed);
      btn.setAttribute("aria-pressed", String(closed));
      btn.textContent = closed ? "Reopen the lane" : "Close the right lane ▸";
    });
    return {
      enter: function () {
        if (!built) { build(); warm(8); }
        draw();
        if (reduce) return;
        var prevS = 0;
        run(function (s) { var dt = Math.min(0.05, s - prevS); prevS = s; step(dt / 2); step(dt / 2); draw(); });
      },
      leave: stop
    };
  })();

  /* ---------- 10 · Safe System: layers of protection ---------- */
  modules.safe = (function () {
    var LX = [156, 226, 296, 366, 436], HOLE = 42, TOP = 92, BOT = 330, W = 34;
    var NAMES = [["Safe road", "users"], ["Safe", "vehicles"], ["Safe", "speeds"], ["Safe", "roads"], ["Post-crash", "care"]];
    var holes = [], layers = [], risk = document.getElementById("risk"), built = false, plan = null, cycle = -1, stopLbl = null;
    function build() {
      var g = document.getElementById("layers");
      LX.forEach(function (x, i) {
        var l = el("g", { "class": "layer" }, g);
        var r1 = el("rect", { x: x - W / 2, y: TOP, width: W, height: 0, rx: 6, "class": "slab" }, l);
        var r2 = el("rect", { x: x - W / 2, y: 0, width: W, height: 0, rx: 6, "class": "slab" }, l);
        NAMES[i].forEach(function (s, k) { var t = el("text", { x: x, y: 354 + k * 14 }, l); t.textContent = s; });
        layers.push({ g: l, r1: r1, r2: r2, x: x });
      });
      stopLbl = el("text", { "class": "stopped", y: TOP - 12, "text-anchor": "middle" }, g); stopLbl.textContent = "STOPPED";
      built = true;
    }
    function setHoles(hs) {
      holes = hs;
      layers.forEach(function (L, i) {
        var h0 = hs[i] - HOLE / 2, h1 = hs[i] + HOLE / 2;
        L.r1.setAttribute("height", Math.max(0, h0 - TOP)); L.r2.setAttribute("y", h1); L.r2.setAttribute("height", Math.max(0, BOT - h1));
      });
    }
    function newPlan(n) {                                     // the mistake slips through a few holes, then a layer stops it
      var catchAt = 1 + (n % 4), hs = [], pts = [[104, 211]];
      for (var i = 0; i < 5; i++) hs.push(130 + ((i * 53 + n * 37) % 160));
      for (i = 0; i < catchAt; i++) pts.push([LX[i], hs[i]]);
      var miss = hs[catchAt] > 210 ? hs[catchAt] - 70 : hs[catchAt] + 70;
      pts.push([LX[catchAt] - W / 2 - 9, miss]);
      return { hs: hs, pts: pts, catchAt: catchAt };
    }
    function along(pts, f) {
      var L = 0, segs = [];
      for (var i = 1; i < pts.length; i++) { var d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(d); L += d; }
      var s = f * L;
      for (i = 0; i < segs.length; i++) {
        if (s <= segs[i] || i === segs.length - 1) { var u = segs[i] ? Math.min(1, s / segs[i]) : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u]; }
        s -= segs[i];
      }
    }
    function frame(s) {
      var n = Math.floor(s / 4.6), t = s - n * 4.6;
      if (n !== cycle) { cycle = n; plan = newPlan(n); setHoles(plan.hs); layers.forEach(function (L) { L.g.classList.remove("hit"); }); }
      var f = clamp01(t / 2.4), p = along(plan.pts, ease(f));
      risk.setAttribute("cx", p[0].toFixed(1)); risk.setAttribute("cy", p[1].toFixed(1));
      risk.setAttribute("opacity", t < 3.6 ? 1 : Math.max(0, 1 - (t - 3.6) * 2));
      var hit = f >= 1 && t < 4.2;
      layers[plan.catchAt].g.classList.toggle("hit", hit);
      stopLbl.setAttribute("x", LX[plan.catchAt]); stopLbl.style.opacity = hit ? 1 : 0;
    }
    return {
      enter: function () { if (!built) build(); cycle = -1; if (reduce) { frame(2.6); return; } run(frame); },
      leave: stop
    };
  })();

  /* ---------- 11 · two-lane vs turbo roundabout ---------- */
  modules.turbo = (function () {
    var svg = document.getElementById("rbt"), C = [280, 210], built = false, mode = "two", cars = [], paths = {}, tc = 0, flashG = document.getElementById("rbt-flash");
    var V = 70, CYCLE = 11;
    function Pp(r, deg) { var a = deg * Math.PI / 180; return [C[0] + r * Math.cos(a), C[1] - r * Math.sin(a)]; }
    function tang(deg) { var a = deg * Math.PI / 180; return [-Math.sin(a), -Math.cos(a)]; }    // counterclockwise travel on screen
    function line(out, a, b, n) { for (var i = 1; i <= n; i++) out.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]); }
    function bez(out, p0, p1, p2, p3, n) {
      for (var i = 1; i <= n; i++) {
        var t = i / n, u = 1 - t;
        out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
      }
    }
    function arc(out, rf, d0, d1, n) { for (var i = 1; i <= n; i++) { var d = d0 + (d1 - d0) * i / n; out.push(Pp(rf(d), d)); } }
    function poly(pts) {
      var cum = [0];
      for (var i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      return { pts: pts, cum: cum, len: cum[cum.length - 1] };
    }
    function at(pl, s) {
      var c = pl.cum, i = 1;
      while (i < c.length - 1 && c[i] < s) i++;
      var a = pl.pts[i - 1], b = pl.pts[i], u = Math.max(0, Math.min(1, (s - c[i - 1]) / ((c[i] - c[i - 1]) || 1)));
      return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, Math.atan2(b[1] - a[1], b[0] - a[0])];
    }
    function sAtAngle(pl, deg) {                          // distance along a path when it first reaches a polar angle
      for (var i = 0; i < pl.pts.length; i++) {
        var p = pl.pts[i], a = Math.atan2(C[1] - p[1], p[0] - C[0]) * 180 / Math.PI; if (a < 0) a += 360;
        if (p[0] > 150 && a >= deg && a < 350) return pl.cum[i];
      }
      return 0;
    }
    function rot(pl) { return poly(pl.pts.map(function (p) { return [2 * C[0] - p[0], 2 * C[1] - p[1]]; })); }
    function exitTo(out, r, deg, y) {
      var p0 = Pp(r, deg), t = tang(deg);
      bez(out, p0, [p0[0] + 18 * t[0], p0[1] + 18 * t[1]], [392, y], [412, y], 14);
      line(out, [412, y], [640, y], 20);
    }
    function entry(out, y, r, deg) {
      line(out, [-40, y], [150, y], 20);
      var p3 = Pp(r, deg), t = tang(deg), k = r > 90 ? 18 : 24;
      bez(out, [150, y], [150 + k, y], [p3[0] - k * t[0], p3[1] - k * t[1]], p3, 14);
    }
    function buildPaths() {
      var a = [], b = [], bt = [];
      entry(a, 255, 104, 215); arc(a, function () { return 104; }, 215, 320, 40); exitTo(a, 104, 320, 255);
      entry(b, 225, 70, 225); arc(b, function () { return 70; }, 225, 290, 26);
      arc(b, function (d) { return 70 + 34 * smooth((d - 290) / 28); }, 290, 318, 16); arc(b, function () { return 104; }, 318, 322, 3); exitTo(b, 104, 322, 255);
      entry(bt, 225, 70, 225);
      arc(bt, function (d) { return d < 255 ? 70 : 70 + 20 * smooth((d - 255) / 80); }, 225, 335, 44); exitTo(bt, 90, 335, 225);
      paths.A = poly(a); paths.B = poly(b); paths.Bt = poly(bt);
      paths.A2 = rot(paths.A); paths.B2 = rot(paths.B); paths.Bt2 = rot(paths.Bt);
      // A trails B so that B's lane change cuts across just in front of it
      tc = sAtAngle(paths.B, 312) / V;
      paths.delayA = Math.max(0, tc + 0.45 - sAtAngle(paths.A, 312) / V);
    }
    function d(pts) { return "M" + pts.map(function (p) { return p[0].toFixed(1) + " " + p[1].toFixed(1); }).join("L"); }
    function divider(sign) {                              // a raised spiral divider; sign -1 draws the copy turned 180°
      var pts = [[170, 240]];
      arc(pts, function (dd) { return dd < 255 ? 87 : 87 + 10 * smooth((dd - 255) / 70); }, 200, 325, 50);
      var p0 = Pp(97, 325), t = tang(325);
      bez(pts, p0, [p0[0] + 14 * t[0], p0[1] + 14 * t[1]], [384, 240], [404, 240], 12);
      if (sign < 0) pts = pts.map(function (p) { return [2 * C[0] - p[0], 2 * C[1] - p[1]]; });
      return d(pts);
    }
    function build() {
      var base = document.getElementById("rbt-base");
      el("rect", { x: 0, y: 150, width: 180, height: 120, "class": "road" }, base);
      el("rect", { x: 380, y: 150, width: 180, height: 120, "class": "road" }, base);
      el("rect", { x: 250, y: 0, width: 60, height: 110, "class": "road" }, base);
      el("rect", { x: 250, y: 310, width: 60, height: 110, "class": "road" }, base);
      el("circle", { cx: C[0], cy: C[1], r: 123, "class": "road" }, base);
      el("circle", { cx: C[0], cy: C[1], r: 57, "class": "apron" }, base);
      el("circle", { cx: C[0], cy: C[1], r: 49, "class": "island" }, base);
      [["M110 210L166 199L174 210L166 221Z"], ["M450 210L394 199L386 210L394 221Z"], ["M280 20L271 82L280 90L289 82Z"], ["M280 400L271 338L280 330L289 338Z"]]
        .forEach(function (p) { el("path", { d: p[0], "class": "split" }, base); });
      el("path", { d: "M0 240H150M0 180H150M410 180H560M410 240H560", "class": "lane" }, base);
      el("path", { d: "M0 210H110M450 210H560M280 0V20M280 400V420", stroke: "#EFC24A", "stroke-width": 3, fill: "none" }, base);
      el("path", { d: "M170 213V267M390 207V153M253 112H278M282 308H307", stroke: "#fff", "stroke-width": 3, "stroke-dasharray": "5 5", fill: "none" }, base);
      el("circle", { cx: C[0], cy: C[1], r: 87, "class": "lane" }, document.getElementById("rbt-two"));
      var tb = document.getElementById("rbt-turbo");
      [1, -1].forEach(function (sg) { el("path", { d: divider(sg), "class": "divider" }, tb); el("path", { d: divider(sg), "class": "divider-hi" }, tb); });
      var cg = document.getElementById("rbt-cars");
      ["#E5533D", "#3A86D6", "#F2B134", "#3DAA6D"].forEach(function (col) {
        var g = el("g", {}, cg);
        el("rect", { x: -13, y: -7.5, width: 26, height: 15, rx: 5, fill: col }, g);
        el("rect", { x: -3, y: -5.5, width: 10, height: 11, rx: 2.5, fill: "rgba(255,255,255,.6)" }, g);
        cars.push(g);
      });
      buildPaths();
      built = true;
    }
    function put(g, pl, s) {
      if (s < 0 || s > pl.len) { g.style.display = "none"; return; }
      var p = at(pl, s); g.style.display = "";
      g.setAttribute("transform", "translate(" + p[0].toFixed(1) + " " + p[1].toFixed(1) + ") rotate(" + (p[2] * 180 / Math.PI).toFixed(1) + ")");
    }
    // A brakes for a moment when B cuts in (two-lane only); t is A's own clock
    function sA(t) {
      if (mode !== "two") return t * V;
      var slow = 0.32, T0 = tc - paths.delayA - 0.15, T1 = T0 + 1.15;
      if (t <= T0) return t * V;
      if (t <= T1) return T0 * V + (t - T0) * V * slow;
      return T0 * V + (T1 - T0) * V * slow + (t - T1) * V;
    }
    var flashed = [false, false];
    function frame(s) {
      [0, 1].forEach(function (k) {
        var t = ((s - k * CYCLE / 2) % CYCLE + CYCLE) % CYCLE;
        var pa = k ? paths.A2 : paths.A, pb = mode === "two" ? (k ? paths.B2 : paths.B) : (k ? paths.Bt2 : paths.Bt);
        put(cars[k * 2 + 1], pb, t * V);
        put(cars[k * 2], pa, sA(t - paths.delayA));
        var hit = mode === "two" && t >= tc - 0.05 && t < tc + 0.5;
        if (hit && !flashed[k]) {
          flashed[k] = true;
          var p = Pp(100, 312); if (k) p = [2 * C[0] - p[0], 2 * C[1] - p[1]];
          flashG.setAttribute("transform", "translate(" + p[0].toFixed(1) + " " + p[1].toFixed(1) + ")");
          flashG.classList.remove("on"); void flashG.getBoundingClientRect(); flashG.classList.add("on");
        }
        if (t < tc - 0.2) flashed[k] = false;
      });
    }
    function setMode(m) {
      mode = m;
      svg.classList.toggle("turbo", m === "turbo");
      document.getElementById("rbt-note").textContent = m === "turbo" ? "TURBO: EACH LANE LEADS TO ITS OWN EXIT, SO NO ONE CHANGES LANES" : "TWO-LANE: A CAR CHANGES LANES INSIDE AND CUTS ANOTHER OFF";
      Array.prototype.forEach.call(document.querySelectorAll("[data-rb]"), function (x) { x.classList.toggle("on", x.dataset.rb === m); x.setAttribute("aria-pressed", String(x.dataset.rb === m)); });
    }
    Array.prototype.forEach.call(document.querySelectorAll("[data-rb]"), function (b) { b.addEventListener("click", function () { setMode(b.dataset.rb); }); });
    return {
      enter: function () {
        if (!built) build();
        var bc = document.getElementById("bc");
        if (reduce) { bc.textContent = "B/C = 1.12"; frame(3); return; }
        run(function (s) {
          bc.textContent = "B/C = " + (1.12 * ease(s / 1.4)).toFixed(2);
          frame(s);
        });
      },
      leave: stop
    };
  })();

  /* ---------- 12 · WAIT, then WALK with a 30-second countdown, then DON'T WALK ---------- */
  modules.walk = (function () {
    var timers = [];
    function clear() { timers.forEach(clearTimeout); timers = []; }
    return {
      enter: function () {
        var hand = document.getElementById("ped-hand"), man = document.getElementById("ped-man");
        var cnt = document.getElementById("ped-count"), word = document.getElementById("ped-word");
        function set(walk, w, c) { hand.style.display = walk ? "none" : ""; man.style.display = walk ? "" : "none"; word.textContent = w; word.setAttribute("class", "word" + (walk ? " walk" : "")); cnt.textContent = c; }
        clear();
        if (reduce) { set(true, "WALK", ""); return; }
        set(false, "WAIT", "");
        timers.push(setTimeout(function () {
          var n = 30; set(true, "WALK", String(n));
          (function down() {
            timers.push(setTimeout(function () { n -= 1; if (n > 0) { set(true, "WALK", String(n)); down(); } else set(false, "DON'T WALK", ""); }, 1000));
          })();
        }, 1200));
      },
      leave: clear
    };
  })();
  document.getElementById("copy-email2").addEventListener("click", function () {
    var email = window.SITE.person.email;
    try { navigator.clipboard.writeText(email).then(function () { window.toast("Email copied"); }, function () { window.toast(email); }); }
    catch (e) { window.toast(email); }
  });

  /* ---------- keep the text fitted, and redraw still frames, when the window changes ---------- */
  var rt = null;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      fit(scenes[cur]);
      var m = modules[scenes[cur].dataset.scene];
      if (m && m.resize && (reduce || !tick)) m.resize();
    }, 120);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fit(scenes[cur]); });

  /* ---------- start (supports tour.html#s3) ---------- */
  var m = /^#s(\d{1,2})$/.exec(location.hash);
  if (m && +m[1] >= 1 && +m[1] <= N) { scenes[0].hidden = true; cur = +m[1] - 1; scenes[cur].hidden = false; }
  seen[cur] = true;
  render(); enter(cur);
})();
