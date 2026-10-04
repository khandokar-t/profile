/* The metro map: stations are built from the data below (text comes from content.js).
   The mouse wheel rides the lines one by one; a click on a station sends the train there.
   The card on the right keeps one size and scales its text to fit. */
(function () {
  "use strict";
  var SITE = window.SITE, S = SITE.sections, NS = "http://www.w3.org/2000/svg";
  var LINES = {
    s: { name: "Safety line", color: "#eb6834", letter: "S", about: "Crash data, safer designs and the Safe System approach.", route: ["buet", "crash", "wmu", "safesystem", "detroit"] },
    o: { name: "Operations line", color: "#2a78d6", letter: "O", about: "Work zones, traffic design and signal operations.", route: ["mdot", "ta", "detroit"] },
    p: { name: "Planning & Waterways line", color: "#1baf7a", letter: "P", about: "Transit, rivers and decision support, from Dhaka to Michigan.", route: ["buet", "waterbus", "buriganga", "climas", "planning", "wmu"] },
    t: { name: "Teaching & Community line", color: "#17201C", letter: "T", about: "Classrooms and professional chapters in both countries.", route: ["buet", "asce", "presidency", "wmu", "itechapter", "detroit"] }
  };
  var ORDER = [null, "s", "o", "p", "t"];                 // the wheel steps: overview, then each line

  // lab: "above" | "below" | [x, y, anchor]   y2 makes a capsule interchange
  var STATIONS = [
    { id: "buet", name: "BUET", sub: "B.Sc. 2023", x: 150, y: 320, big: true, lines: ["p", "s", "t"], lab: [128, 316, "end"], ph: 8,
      from: S.about.items[1], extra: "Where the Planning, Safety and Teaching lines begin." },
    { id: "waterbus", name: "Waterbus study", sub: "Thesis + ICCESD 2024", x: 230, y: 240, lines: ["p"], lab: "above", ph: 5,
      from: S.papers.items[0], bullets: [S.research.items[1].bullets[0]] },
    { id: "buriganga", name: "Buriganga capstone", sub: "BUET · 2023", x: 330, y: 240, lines: ["p"], lab: "below", ph: 6, from: S.projects.items[1] },
    { id: "climas", name: "CLIMAS", sub: "Indetechs · 2024–25", x: 430, y: 240, lines: ["p"], lab: "above", ph: 6, from: S.projects.items[2] },
    { id: "crash", name: "Crash forecasting", sub: "ICACE 2022", x: 290, y: 320, lines: ["s"], lab: "below", ph: 5, from: S.papers.items[1] },
    { id: "asce", name: "ASCE chapter", sub: "BUET · 2022–23", x: 250, y: 400, lines: ["t"], lab: "below", ph: 7, from: S.leadership.items[1] },
    { id: "presidency", name: "Presidency University", sub: "Lecturer · 2025", x: 380, y: 400, lines: ["t"], lab: "below", ph: 4, from: S.teaching.items[1] },
    { id: "mdot", name: "MDOT work zones", sub: "Research · 2025 – Present", x: 680, y: 150, lines: ["o"], lab: "above", ph: 2, from: S.research.items[0] },
    { id: "ta", name: "Traffic Design TA", sub: "CCE 4300 · CCE 3300", x: 840, y: 150, lines: ["o"], lab: "above", ph: 4, from: S.teaching.items[0] },
    { id: "planning", name: "Planning courses", sub: "WMU coursework", x: 680, y: 240, lines: ["p"], lab: "above", ph: 8,
      from: { title: "Graduate coursework", meta: "Western Michigan University · 2025 – Present", text: S.about.items[0].text } },
    { id: "wmu", name: "WMU", sub: "M.S. 2025 – Present", x: 760, y: 320, y2: 400, lines: ["p", "s", "t"], lab: [784, 356, "start"], ph: 8, from: S.about.items[0] },
    { id: "safesystem", name: "Safe System comp.", sub: "ITE · 2025", x: 850, y: 320, lines: ["s"], lab: "above", ph: 7, from: S.leadership.items[2] },
    { id: "itechapter", name: "ITE chapter", sub: "Vice Secretary", x: 850, y: 400, lines: ["t"], lab: "below", ph: 7, from: S.leadership.items[0] },
    { id: "detroit", name: "Detroit 2026", sub: "Design win · Traffic Bowl", x: 940, y: 320, y2: 400, lines: ["s", "o", "t"], lab: [990, 436, "end"], subY: 466, ph: 6,
      from: S.projects.items[0], also: [S.awards.items[0], S.awards.items[1]] }
  ];
  var BY = {}; STATIONS.forEach(function (st) { BY[st.id] = st; });

  var layer = document.getElementById("stations");
  var tracks = {};
  Array.prototype.forEach.call(document.querySelectorAll("#tracks path"), function (p) { tracks[p.dataset.line] = p; });
  function el(tag, attrs, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text) e.textContent = text;
    return e;
  }

  /* ---------- build stations ---------- */
  STATIONS.forEach(function (st) {
    var g = el("g", { "class": "hit", tabindex: "0", role: "button", "aria-label": st.name + ", " + st.sub });
    if (st.y2) g.appendChild(el("rect", { x: st.x - 24, y: st.y - 24, width: 48, height: st.y2 - st.y + 48, rx: 24, fill: "transparent" }));
    else g.appendChild(el("circle", { cx: st.x, cy: st.y, r: 24, fill: "transparent" }));
    if (st.y2) g.appendChild(el("rect", { "class": "xchg", x: st.x - 13, y: st.y - 13, width: 26, height: st.y2 - st.y + 26, rx: 13 }));
    else g.appendChild(el("circle", { "class": st.big ? "xchg" : "stn", cx: st.x, cy: st.y, r: st.big ? 15 : 9 }));
    var nx, ny, sy, anchor = "middle";
    if (st.lab === "above") { nx = st.x; ny = st.y - 38; sy = st.y - 22; }
    else if (st.lab === "below") { nx = st.x; ny = st.y + 32; sy = st.y + 48; }
    else { nx = st.lab[0]; ny = st.lab[1]; sy = st.subY || ny + 17; anchor = st.lab[2]; }
    g.appendChild(el("text", { "class": "name", x: nx, y: ny, "text-anchor": anchor }, st.name));
    g.appendChild(el("text", { "class": "sub", x: nx, y: sy, "text-anchor": anchor }, st.sub));
    g.addEventListener("click", function () { selectStation(st); });
    g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectStation(st); } });
    layer.appendChild(g);
    st.g = g;
    st.at = {};
    st.lines.forEach(function (ln) {
      var p = tracks[ln], L = p.getTotalLength(), best = 0, bd = Infinity;
      for (var d = 0; d <= L; d += 2) {
        var q = p.getPointAtLength(d), dd = Math.hypot(q.x - st.x, q.y - st.y);
        if (dd < bd) { bd = dd; best = d; }
      }
      st.at[ln] = best;
    });
  });

  /* ---------- card ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var head = document.getElementById("st-head"), body = document.getElementById("st-body");
  function itemHTML(it) {
    var h = '<article class="item"><h3>' + esc(it.title) + "</h3>";
    if (it.meta) h += '<p class="meta">' + esc(it.meta) + "</p>";
    if (it.text) h += "<p>" + esc(it.text) + "</p>";
    if (it.bullets) h += "<ul>" + it.bullets.map(function (b) { return "<li>" + esc(b) + "</li>"; }).join("") + "</ul>";
    if (it.tags) h += '<div class="tags">' + it.tags.map(function (t) { return "<span>" + esc(t) + "</span>"; }).join("") + "</div>";
    if (it.links) it.links.forEach(function (l) { h += '<a class="btn small" href="' + esc(l.href) + '" target="_blank" rel="noopener">' + esc(l.label) + " ↗</a>"; });
    return h + "</article>";
  }
  function setCard(cls, ph, title, html) {
    head.className = "card-head" + (cls ? " " + cls : "");
    head.innerHTML = '<span class="ph">' + ph + '</span><span class="street">' + esc(title) + "</span>";
    body.innerHTML = html;
    window.fitBox(body);
  }
  function overviewCard() {
    setCard("", "MAP", "The network",
      "<h2>Four lines, two cities</h2>" +
      '<p class="lead">Each line is a theme of my work. Stations are projects, papers, roles and places; the capsules are interchanges where themes meet.</p>' +
      '<article class="item"><h3>Lines</h3><ul>' + ORDER.slice(1).map(function (k) {
        return "<li><b>" + LINES[k].letter + "</b> · " + esc(LINES[k].name) + "</li>";
      }).join("") + "</ul></article>" +
      '<p class="meta">Scroll to ride each line · click a station</p>');
  }
  function lineCard(k) {
    var L = LINES[k];
    setCard("line-" + k, L.letter, L.name,
      "<h2>" + esc(L.name) + "</h2>" + '<p class="lead">' + esc(L.about) + "</p>" +
      '<article class="item"><h3>Stations</h3><ol>' + L.route.map(function (id) {
        var st = BY[id]; return "<li><b>" + esc(st.name) + "</b> · " + esc(st.sub) + "</li>";
      }).join("") + "</ol></article>");
  }
  function stationCard(st) {
    var h = "<h2>" + esc(st.name) + "</h2>";
    h += '<p class="lead">' + st.lines.map(function (l) { return esc(LINES[l].name); }).join(", ") + (st.extra ? ". " + esc(st.extra) : ".") + "</p>";
    var main = st.from;
    if (st.bullets) main = { title: main.title, meta: main.meta, text: main.text, links: main.links, bullets: st.bullets };
    h += itemHTML(main);
    (st.also || []).forEach(function (it) { h += itemHTML(it); });
    h += '<a class="btn sign small" href="index.html#p' + st.ph + '">At the intersection: Φ' + st.ph + " " + esc(SITE.phases[st.ph].label) + " ▸</a>";
    setCard("line-" + st.lines[0], st.lines.map(function (l) { return LINES[l].letter; }).join(" · "), st.name, h);
  }
  window.addEventListener("resize", function () { window.fitBox(body); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { window.fitBox(body); });

  /* ---------- the train ---------- */
  var train = document.getElementById("train"), trainBody = train.querySelector("rect");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var tState = { line: null, d: 0 }, anim = null;
  function placeTrain(line, d) {
    var p = tracks[line], L = p.getTotalLength();
    var a = p.getPointAtLength(Math.max(0, Math.min(L, d)));
    var b = p.getPointAtLength(Math.max(0, Math.min(L, d + 1))), c = p.getPointAtLength(Math.max(0, Math.min(L, d - 1)));
    train.setAttribute("transform", "translate(" + a.x + " " + a.y + ") rotate(" + (Math.atan2(b.y - c.y, b.x - c.x) * 180 / Math.PI) + ")");
  }
  function runTrain(line, from, to) {
    trainBody.setAttribute("fill", LINES[line].color);
    train.setAttribute("opacity", "1");
    if (anim) cancelAnimationFrame(anim);
    if (reduce) { tState = { line: line, d: to }; placeTrain(line, to); return; }
    var dur = Math.max(450, Math.abs(to - from) / 0.5), t0 = null;
    function step(t) {
      if (t0 === null) t0 = t;
      var f = Math.min(1, (t - t0) / dur), e = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
      var d = from + (to - from) * e;
      placeTrain(line, d); tState = { line: line, d: d };
      anim = f < 1 ? requestAnimationFrame(step) : null;
    }
    anim = requestAnimationFrame(step);
  }

  /* ---------- states: overview, a line, or a station ---------- */
  var idx = 0, selected = null;
  var legendBtns = Array.prototype.slice.call(document.querySelectorAll("#legend button"));
  var lineGroups = Array.prototype.slice.call(document.querySelectorAll("#lines > g"));
  function highlight(k) {
    legendBtns.forEach(function (x) { x.setAttribute("aria-pressed", String(x.dataset.line === k)); });
    lineGroups.forEach(function (g) { g.classList.toggle("dim", !!k && g.dataset.line !== k); });
    STATIONS.forEach(function (st) { st.g.style.opacity = k && st.lines.indexOf(k) < 0 ? "0.3" : ""; });
  }
  function clearStation() { if (selected) selected.g.classList.remove("sel"); selected = null; }
  function showStep(i) {
    idx = Math.max(0, Math.min(ORDER.length - 1, i));
    clearStation();
    var k = ORDER[idx];
    highlight(k);
    if (!k) { overviewCard(); train.setAttribute("opacity", "0"); return; }
    lineCard(k);
    runTrain(k, 0, tracks[k].getTotalLength());
  }
  function selectStation(st) {
    clearStation();
    selected = st; st.g.classList.add("sel");
    stationCard(st);
    var k = ORDER[idx];
    var line = k && st.lines.indexOf(k) >= 0 ? k : (tState.line && st.lines.indexOf(tState.line) >= 0 ? tState.line : st.lines[0]);
    runTrain(line, tState.line === line ? tState.d : 0, st.at[line]);
    if (window.innerWidth <= 900) document.getElementById("station-card").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }
  legendBtns.forEach(function (b) {
    b.addEventListener("click", function () {
      var i = ORDER.indexOf(b.dataset.line);
      showStep(idx === i && !selected ? 0 : i);
    });
  });

  /* mouse wheel (desktop): overview → S → O → P → T and back */
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
    var target = idx + dir;
    if (target >= 0 && target < ORDER.length) showStep(target);
  }, { passive: false });

  showStep(0);
})();
