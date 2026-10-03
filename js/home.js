/* Home page: the signal controller (one phase served at a time, with a
   yellow change interval and an all-red clearance) plus the menu, card and status.
   This part works with or without the 3D scene. */
(function () {
  "use strict";
  var SITE = window.SITE;
  var YELLOW = 1.0, ALLRED = 0.6;          // seconds
  var listeners = [];
  var S = { phase: 8, status: "green", pending: null };
  var timer = null;

  function emit() { listeners.forEach(function (f) { f(S); }); }

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
        timer = setTimeout(function () {
          S.phase = S.pending; S.pending = null; S.status = "green"; emit();
        }, ALLRED * 1000);
      }, YELLOW * 1000);
    } else {
      emit();                              // already clearing: just retarget the call
    }
  }

  window.Signal = {
    state: S,
    request: request,
    on: function (f) { listeners.push(f); f(S); }
  };

  /* ---------- card ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var head = document.getElementById("card-head"), body = document.getElementById("card-body");

  function renderCard(p, intro) {
    var info = SITE.phases[p], sec = SITE.sections[info.key];
    var left = info.turn === "left";
    head.innerHTML = '<span class="ph">Φ' + p + '</span><span class="street">' + esc(left ? info.label : info.street) + '</span>' +
      '<span class="turn">' + (left ? "left turn · " + esc(info.street) : "through") + '</span>';
    var h = '';
    if (intro) h += '<div class="howto"><b>You run this signal.</b> Click a signal, a street sign or a phase below. ' +
      'The <b>bus stop</b> starts the tour, the <b>metro</b> opens the map and the yellow <b>push button</b> is contact.</div>';
    h += '<h2>' + esc(sec.title) + '</h2>';
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
    if (sec.cta) h += '<a class="btn sign" href="' + esc(sec.cta.href) + '">' + esc(sec.cta.label) + ' ▸</a>';
    body.innerHTML = h;
    body.scrollTop = 0;
  }

  /* ---------- menu + status ---------- */
  var buttons = Array.prototype.slice.call(document.querySelectorAll("#rb button[data-ph]"));
  var status = document.getElementById("sig-status");
  function name(p) {
    var i = SITE.phases[p];
    return "Φ" + p + " · " + (i.turn === "left" ? i.label : i.street);
  }

  var lastGreen = null;
  window.Signal.on(function (s) {
    buttons.forEach(function (b) {
      var p = +b.dataset.ph;
      b.classList.toggle("on", s.status === "green" && p === s.phase);
      b.classList.toggle("call", s.pending === p);
      b.setAttribute("aria-pressed", String(s.status === "green" && p === s.phase));
    });
    if (s.status === "green") {
      var i = SITE.phases[s.phase];
      status.innerHTML = "Serving <b>" + esc(name(s.phase)) + "</b>" + (i.turn === "left" ? " (protected left turn)." : ".");
      if (lastGreen !== s.phase) { renderCard(s.phase); lastGreen = s.phase; }
      body.classList.remove("out");
    } else if (s.status === "yellow") {
      status.innerHTML = "Call placed on <b>" + esc(name(s.pending)) + "</b>. Clearing " + esc(name(s.phase)) + ": <b>yellow</b>…";
      body.classList.add("out");
    } else {
      status.innerHTML = "<b>All-red</b> clearance, then " + esc(name(s.pending)) + " turns green.";
    }
  });

  buttons.forEach(function (b) { b.addEventListener("click", function () { request(+b.dataset.ph); hideHint(); }); });

  /* ---------- pre-timed tour (the controller cabinet) ---------- */
  var autoBtn = document.getElementById("auto"), autoTimer = null;
  var seq = [2, 6, 4, 8, 5, 1, 7, 3];
  function stopAuto() {
    if (!autoTimer) return;
    clearInterval(autoTimer); autoTimer = null;
    autoBtn.setAttribute("aria-pressed", "false"); autoBtn.textContent = "Run pre-timed tour";
  }
  function toggleAuto() {
    if (autoTimer) { stopAuto(); window.toast && window.toast("Actuated mode: the signal waits for your click"); return; }
    autoBtn.setAttribute("aria-pressed", "true"); autoBtn.textContent = "Stop tour (actuated)";
    var i = (seq.indexOf(S.phase) + 1) % seq.length;
    request(seq[i], true);
    autoTimer = setInterval(function () { i = (i + 1) % seq.length; request(seq[i], true); }, 7000);
    window.toast && window.toast("Pre-timed mode: phases change every 7 seconds");
  }
  autoBtn.addEventListener("click", toggleAuto);
  window.Signal.toggleAuto = toggleAuto;

  /* ---------- first-visit how-to lives at the top of the first card ---------- */
  function hideHint() { var el = body.querySelector(".howto"); if (el) el.remove(); }
  window.Signal.hideHint = hideHint;

  /* ---------- start: optional deep link like index.html#p2 ---------- */
  renderCard(8, true); lastGreen = 8;
  var m = /^#p([1-8])$/.exec(location.hash);
  if (m) { S.phase = +m[1]; renderCard(S.phase, true); lastGreen = S.phase; emit(); }
})();
