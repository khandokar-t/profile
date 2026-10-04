/* Home page: the signal controller (all red at first, then one phase at a time with a
   yellow change interval and an all-red clearance), the ring menu, the card and the status.
   This part works with or without the 3D scene. */
(function () {
  "use strict";
  var SITE = window.SITE;
  var YELLOW = 1.0, ALLRED = 0.6;                    // seconds
  var listeners = [];
  var S = { phase: 0, status: "allred", pending: null };   // phase 0 = nothing served yet
  var timer = null;

  function emit() { listeners.forEach(function (f) { f(S); }); }
  function toGreen() { S.phase = S.pending; S.pending = null; S.status = "green"; timer = null; emit(); }

  function request(p, fromAuto) {
    p = +p;
    if (!SITE.phases[p]) return;
    if (!fromAuto) stopAuto();
    if (S.status === "green" && p === S.phase) { emit(); return; }
    S.pending = p;
    if (S.status === "green") {
      S.status = "yellow"; emit();
      timer = setTimeout(function () {
        S.status = "allred"; emit();
        timer = setTimeout(toGreen, ALLRED * 1000);
      }, YELLOW * 1000);
    } else if (S.status === "allred" && !timer) {
      emit(); timer = setTimeout(toGreen, ALLRED * 1000);     // starting from all red
    } else emit();                                           // already clearing: just retarget the call
  }
  function step(dir) {                                     // the mouse wheel walks through Φ1 … Φ8
    var base = S.pending || S.phase || 0;
    var next = Math.max(1, Math.min(8, base + dir));
    if (base === 0 && dir < 0) return;
    if (next !== base || S.status !== "green") request(next);
  }

  window.Signal = {
    state: S, request: request, step: step,
    on: function (f) { listeners.push(f); f(S); },
    hideHint: function () {}
  };

  /* ---------- card: one fixed-size box, text scaled to fit ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var head = document.getElementById("card-head"), body = document.getElementById("card-body");

  function itemsHTML(sec) {
    var h = '<h2>' + esc(sec.title) + '</h2>';
    if (sec.lead) h += '<p class="lead">' + esc(sec.lead) + '</p>';
    sec.items.forEach(function (it) {
      h += '<article class="item"><h3>' + esc(it.title) + '</h3>';
      if (it.meta) h += '<p class="meta">' + esc(it.meta) + '</p>';
      if (it.text) h += '<p>' + esc(it.text) + '</p>';
      if (it.bullets) h += '<ul>' + it.bullets.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join("") + '</ul>';
      if (it.tags) h += '<div class="tags">' + it.tags.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join("") + '</div>';
      if (it.links) it.links.forEach(function (l) { h += '<a class="btn small" href="' + esc(l.href) + '" target="_blank" rel="noopener">' + esc(l.label) + ' ↗</a>'; });
      h += '</article>';
    });
    if (sec.cta) h += '<a class="btn sign small" href="' + esc(sec.cta.href) + '">' + esc(sec.cta.label) + ' ▸</a>';
    return h;
  }
  function renderCard(p) {
    if (!p) {
      head.className = "card-head red";
      head.innerHTML = '<span class="ph">ALL RED</span><span class="street">Pick a phase</span>';
      body.innerHTML = itemsHTML(SITE.cards.welcome);
    } else {
      var info = SITE.phases[p], left = info.turn === "left";
      var sec = SITE.cards[info.key] || SITE.sections[info.key];
      head.className = "card-head";
      head.innerHTML = '<span class="ph">Φ' + p + '</span><span class="street">' + esc(left ? info.label : info.street) + '</span>' +
        '<span class="turn">' + (left ? "left turn · " + esc(info.street) : "through") + '</span>';
      body.innerHTML = itemsHTML(sec);
    }
    if (window.fitBox) window.fitBox(body);
  }
  window.addEventListener("resize", function () { if (window.fitBox) window.fitBox(body); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { window.fitBox && window.fitBox(body); });

  /* ---------- menu + status ---------- */
  var buttons = Array.prototype.slice.call(document.querySelectorAll("#rb button[data-ph]"));
  var status = document.getElementById("sig-status");
  function name(p) { var i = SITE.phases[p]; return "Φ" + p + " · " + (i.turn === "left" ? i.label : i.street); }

  var shown = null;
  window.Signal.on(function (s) {
    buttons.forEach(function (b) {
      var p = +b.dataset.ph;
      b.classList.toggle("on", s.status === "green" && p === s.phase);
      b.classList.toggle("call", s.pending === p);
      b.setAttribute("aria-pressed", String(s.status === "green" && p === s.phase));
    });
    if (s.status === "green") {
      var i = SITE.phases[s.phase];
      status.innerHTML = (autoTimer ? "Pre-timed · " : "") + "Serving <b>" + esc(name(s.phase)) + "</b>" + (i.turn === "left" ? " (protected left turn)." : ".");
      if (shown !== s.phase) { renderCard(s.phase); shown = s.phase; }
      body.classList.remove("out");
    } else if (s.status === "yellow") {
      status.innerHTML = "Clearing " + esc(name(s.phase)) + ": <b>yellow</b>…";
      body.classList.add("out");
    } else if (s.pending) {
      status.innerHTML = "<b>All red</b>, then " + esc(name(s.pending)) + ".";
    } else {
      status.innerHTML = "<b>All red.</b> Pick a phase.";
      if (shown !== 0) { renderCard(0); shown = 0; }
    }
  });
  buttons.forEach(function (b) { b.addEventListener("click", function () { request(+b.dataset.ph); }); });

  /* ---------- pre-timed tour (also the controller cabinet in 3D) ---------- */
  var autoBtn = document.getElementById("auto"), autoTimer = null;
  var seq = [1, 2, 3, 4, 5, 6, 7, 8];
  function stopAuto() {
    if (!autoTimer) return;
    clearInterval(autoTimer); autoTimer = null;
    autoBtn.setAttribute("aria-pressed", "false"); autoBtn.innerHTML = "▶ Run pre-timed tour";
    emit();                                              // back to actuated: the signal waits for clicks
  }
  function toggleAuto() {
    if (autoTimer) { stopAuto(); return; }
    autoBtn.setAttribute("aria-pressed", "true"); autoBtn.innerHTML = "↩ Back to actuated signal";
    autoBtn.classList.remove("pulse");
    var i = seq.indexOf(S.phase);
    i = (i + 1) % seq.length;
    request(seq[i], true);
    autoTimer = setInterval(function () { i = (i + 1) % seq.length; request(seq[i], true); }, 7000);
  }
  autoBtn.addEventListener("click", toggleAuto);
  window.Signal.toggleAuto = toggleAuto;

  /* ---------- mouse wheel: builds the intro, then steps through the phases ---------- */
  var locked = false, lockStart = 0, lastWheel = 0, acc = 0;
  window.addEventListener("wheel", function (e) {
    if (window.innerWidth <= 900) return;
    if (e.target.closest && e.target.closest("dialog")) return;
    e.preventDefault();
    var now = performance.now();
    if (locked) {
      if (now - lockStart > 650 && now - lastWheel > 180) locked = false;
      lastWheel = now;
      if (locked) return;
    }
    if (now - lastWheel > 300) acc = 0;
    lastWheel = now; acc += e.deltaY;
    if (Math.abs(acc) < 30) return;
    var dir = acc > 0 ? 1 : -1;
    acc = 0; locked = true; lockStart = now;
    if (window.IntroCtl && !window.IntroCtl.done) window.IntroCtl.wheel(dir);
    else step(dir);
  }, { passive: false });

  /* ---------- start: all red, or a deep link like index.html#p2 ---------- */
  renderCard(0); shown = 0;
  var m = /^#p([1-8])$/.exec(location.hash);
  if (m) { S.phase = +m[1]; S.status = "green"; renderCard(S.phase); shown = S.phase; emit(); }
})();
