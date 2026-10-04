/* The phase-by-phase tour: one scene at a time. Next/Back buttons, the lamps,
   the bus stops, the mouse wheel and the arrow keys all move between phases. */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var scenes = Array.prototype.slice.call(document.querySelectorAll(".scene"));
  var lamps = Array.prototype.slice.call(document.querySelectorAll("#lamps button"));
  var stopsBox = document.getElementById("stops"), bus = document.getElementById("bus");
  var countEl = document.getElementById("count"), status = document.getElementById("tour-status");
  var nextBtn = document.getElementById("next"), prevBtn = document.getElementById("prev");
  var N = scenes.length, cur = 0, busy = false, seen = {};

  function pos(i) { return 3 + i * (94 / (N - 1)); }
  var stops = scenes.map(function (s, i) {
    var b = document.createElement("button");
    b.type = "button"; b.style.left = pos(i) + "%";
    b.innerHTML = "<i></i><span>" + s.dataset.name + "</span>";
    b.setAttribute("aria-label", "Stop " + (i + 1) + ": " + s.dataset.name);
    b.addEventListener("click", function () { go(i); });
    stopsBox.appendChild(b);
    return b;
  });

  function render() {
    lamps.forEach(function (l, i) { l.classList.toggle("on", i === cur); l.classList.toggle("seen", !!seen[i] && i !== cur); l.setAttribute("aria-current", i === cur ? "step" : "false"); });
    stops.forEach(function (b, i) { b.classList.toggle("on", i === cur); b.classList.toggle("seen", !!seen[i] && i !== cur); });
    bus.style.left = pos(cur) + "%";
    countEl.textContent = "PHASE " + (cur + 1) + " OF " + N;
    status.textContent = "Scene " + (cur + 1) + " of " + N + ": " + scenes[cur].dataset.name;
    prevBtn.style.visibility = cur === 0 ? "hidden" : "";
    nextBtn.disabled = cur === N - 1;
    nextBtn.textContent = cur === N - 1 ? "End of tour" : "Next phase ▸";
  }

  function enter(i) {
    var s = scenes[i];
    Array.prototype.forEach.call(s.querySelectorAll(".draw"), function (el) {
      try { el.style.setProperty("--len", Math.ceil(el.getTotalLength() + 2)); } catch (e) {}
    });
    s.classList.remove("on"); void s.getBoundingClientRect(); s.classList.add("on");
    if (hooks[i] && hooks[i].enter) hooks[i].enter();
  }
  function leave(i) {
    scenes[i].classList.remove("on");
    if (hooks[i] && hooks[i].leave) hooks[i].leave();
  }

  function go(i) {
    if (busy) return;
    i = Math.max(0, Math.min(N - 1, i));
    if (i === cur) return;
    busy = true;
    lamps[cur].classList.remove("on"); lamps[cur].classList.add("yellow");
    scenes[cur].classList.add("fade");
    setTimeout(function () {
      lamps[cur].classList.remove("yellow");
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
  lamps.forEach(function (l, i) { l.addEventListener("click", function () { go(i); }); });
  Array.prototype.forEach.call(document.querySelectorAll("[data-next]"), function (b) { b.addEventListener("click", next); });

  /* mouse wheel: one gesture = one phase (desktop layout only) */
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
  var tx = null;
  document.getElementById("stagebox").addEventListener("touchstart", function (e) { tx = e.touches[0].clientX; }, { passive: true });
  document.getElementById("stagebox").addEventListener("touchend", function (e) {
    if (tx === null || window.innerWidth <= 900) return;
    var dx = e.changedTouches[0].clientX - tx; tx = null;
    if (Math.abs(dx) > 60) { if (dx < 0) next(); else prev(); }
  });

  /* ---------- per-scene animations and click toys ---------- */
  var raf = null, tick = null;
  function loop(t) { if (tick) tick(t); raf = requestAnimationFrame(loop); }
  function run(fn) { tick = fn; if (!raf && !reduce) raf = requestAnimationFrame(loop); }
  function stop() { tick = null; if (raf) cancelAnimationFrame(raf); raf = null; }

  var hooks = {};

  hooks[1] = {                                        // plane along the arc
    enter: function () {
      var path = document.getElementById("flight"), plane = document.getElementById("plane");
      var L = path.getTotalLength(), t0 = null;
      function place(f) {
        var p = path.getPointAtLength(f * L), q = path.getPointAtLength(Math.min(L, f * L + 1));
        var ang = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI;
        plane.setAttribute("transform", "translate(" + p.x + " " + p.y + ") rotate(" + ang + ")");
      }
      if (reduce) { place(1); return; }
      run(function (t) { if (t0 === null) t0 = t; var f = Math.min(1, (t - t0) / 2600); place(f < 1 ? (1 - Math.pow(1 - f, 2)) : 1); if (f >= 1) stop(); });
    },
    leave: stop
  };

  var wbMode = "old";
  hooks[2] = {                                        // waterbus: 2010 route vs the proposed loop
    enter: function () {
      var boat = document.getElementById("boat"), t0 = null;
      function at(theta) {
        var x = 280 + 201 * Math.cos(theta), y = 210 + 146 * Math.sin(theta);
        var dx = -201 * Math.sin(theta), dy = 146 * Math.cos(theta);
        boat.setAttribute("transform", "translate(" + x + " " + y + ") rotate(" + (Math.atan2(dy, dx) * 180 / Math.PI) + ")");
      }
      if (reduce) { at(wbMode === "old" ? 2.4 : 0.6); return; }
      run(function (t) {
        if (t0 === null) t0 = t;
        var s = (t - t0) / 1000;
        if (wbMode === "old") { var u = (Math.sin(s * 0.55) + 1) / 2; at(Math.PI / 2 + u * Math.PI / 2); }
        else at(Math.PI / 2 - s * 0.45);
      });
    },
    leave: stop
  };
  Array.prototype.forEach.call(document.querySelectorAll("[data-wb]"), function (b) {
    b.addEventListener("click", function () {
      wbMode = b.dataset.wb;
      Array.prototype.forEach.call(document.querySelectorAll("[data-wb]"), function (x) { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", String(x === b)); });
      Array.prototype.forEach.call(document.querySelectorAll("[data-wbpanel]"), function (p) { p.hidden = p.dataset.wbpanel !== wbMode; });
      document.getElementById("wb-old").style.display = wbMode === "old" ? "" : "none";
      var ring = document.getElementById("wb-ring");
      ring.setAttribute("stroke", wbMode === "old" ? "#8EC1D6" : "#0B6A4C");
      ring.setAttribute("stroke-width", wbMode === "old" ? "2" : "7");
      ring.setAttribute("stroke-dasharray", wbMode === "old" ? "6 8" : "none");
    });
  });

  var arima = document.getElementById("run-arima");
  arima.addEventListener("click", function () {
    var chart = document.querySelector(".chart");
    var on = chart.classList.toggle("run");
    arima.textContent = on ? "Hide the forecast" : "Run ARIMA(6,1,7) ▸";
  });

  var lane = document.getElementById("close-lane");
  lane.addEventListener("click", function () {
    var wz = document.getElementById("wz");
    var closed = wz.classList.toggle("closed");
    lane.setAttribute("aria-pressed", String(closed));
    lane.textContent = closed ? "Reopen the lane" : "Close a lane ▸";
    document.getElementById("wz-note").textContent = closed ? "ONE LANE CLOSED · A QUEUE BUILDS UPSTREAM" : "TWO LANES OPEN · FREE FLOW";
  });

  hooks[5] = {                                        // B/C counts up, a car circulates
    enter: function () {
      var bc = document.getElementById("bc"), car = document.getElementById("rcar"), t0 = null;
      if (reduce) { bc.textContent = "B/C 1.12"; car.setAttribute("transform", "translate(280 107)"); return; }
      run(function (t) {
        if (t0 === null) t0 = t;
        var s = (t - t0) / 1000, f = Math.min(1, s / 1.4);
        bc.textContent = "B/C " + (1.12 * (1 - Math.pow(1 - f, 3))).toFixed(2);
        var th = -Math.PI / 2 - s * 0.9, r = 103;
        var x = 280 + r * Math.cos(th), y = 210 + r * Math.sin(th);
        car.setAttribute("transform", "translate(" + x + " " + y + ") rotate(" + (th * 180 / Math.PI - 90) + ")");
      });
    },
    leave: stop
  };

  var pedTimers = [];
  hooks[6] = {                                        // WAIT, then WALK with a countdown
    enter: function () {
      var hand = document.getElementById("ped-hand"), man = document.getElementById("ped-man");
      var cnt = document.getElementById("ped-count"), word = document.getElementById("ped-word");
      function set(walk, w, c) { hand.style.display = walk ? "none" : ""; man.style.display = walk ? "" : "none"; word.textContent = w; word.setAttribute("class", "word" + (walk ? " walk" : "")); cnt.textContent = c; }
      pedTimers.forEach(clearTimeout); pedTimers = [];
      if (reduce) { set(true, "WALK", ""); return; }
      set(false, "WAIT", "");
      pedTimers.push(setTimeout(function () {
        var n = 9; set(true, "WALK", String(n));
        (function tickDown() {
          pedTimers.push(setTimeout(function () { n -= 1; if (n > 0) { set(true, "WALK", String(n)); tickDown(); } else set(false, "DON'T WALK", "0"); }, 1000));
        })();
      }, 1200));
    },
    leave: function () { pedTimers.forEach(clearTimeout); pedTimers = []; }
  };
  var copy2 = document.getElementById("copy-email2");
  copy2.addEventListener("click", function () {
    var email = window.SITE.person.email;
    try { navigator.clipboard.writeText(email).then(function () { window.toast("Email copied"); }, function () { window.toast(email); }); }
    catch (e) { window.toast(email); }
  });

  /* ---------- start (supports tour.html#s3) ---------- */
  var m = /^#s([1-7])$/.exec(location.hash);
  if (m) { scenes[0].hidden = true; cur = +m[1] - 1; scenes[cur].hidden = false; }
  seen[cur] = true;
  render(); enter(cur);
})();
