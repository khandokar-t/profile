/* The 3D home scene: renderer, camera, labels, clicks and the build-up intro
   (square → four legs → grass → huts and trees → signals → people → cars → menus).
   Uses three.js r128 (global THREE), World, Traffic, Signal (home.js) and Intro (intro.js). */
(function () {
  "use strict";
  var stage = document.getElementById("stage"), host = document.getElementById("scene"), labelsBox = document.getElementById("labels");
  var bodyEl = document.body;
  function uiOn() { bodyEl.classList.add("ui-on"); }
  function fail() {
    document.getElementById("scene-fallback").hidden = false;
    window.IntroCtl = { done: true, wheel: function () {} };
    window.Intro.onNameDone(uiOn);
  }
  if (!window.THREE || !window.World || !window.Traffic || !window.Signal || !window.Intro) { fail(); return; }

  var renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" }); }
  catch (e) { fail(); return; }
  if (!renderer.getContext()) { fail(); return; }
  var desktopGPU = window.innerWidth > 900;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute("aria-hidden", "true");

  var PAGE = new THREE.Color(World.COL.page), GRASS = new THREE.Color(World.COL.grass);
  var scene = new THREE.Scene();
  scene.background = PAGE.clone();
  scene.fog = new THREE.Fog(PAGE.clone(), 130, 240);
  var camera = new THREE.PerspectiveCamera(30, 1, 1, 700);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x9DBF8B, 0.56));
  var sun = new THREE.DirectionalLight(0xfffaf0, 0.62);
  sun.position.set(-38, 72, 34); sun.castShadow = true;
  var sm = desktopGPU ? 4096 : 2048;
  sun.shadow.mapSize.set(sm, sm);
  var sc = sun.shadow.camera; sc.left = -62; sc.right = 62; sc.top = 62; sc.bottom = -62; sc.near = 10; sc.far = 220;
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
  scene.add(sun); scene.add(sun.target);

  var world = World.build(scene);
  var G = world.groups;
  var sim = new Traffic.Sim(scene, World, window.Signal);
  var peds = new Traffic.Peds(scene);

  /* ---------- actions ---------- */
  function act(action) {
    if (!action) return;
    if (action.type === "phase") window.Signal.request(action.ph);
    else if (action.type === "link") window.location.href = action.href;
    else if (action.type === "contact") window.openContact && window.openContact();
    else if (action.type === "auto") window.Signal.toggleAuto && window.Signal.toggleAuto();
  }

  /* ---------- labels anchored to 3D points ---------- */
  world.anchors.forEach(function (an) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "tag3d " + an.kind;
    if (an.kind === "street") b.innerHTML = "<b>Φ" + an.ph + "</b>" + an.text;
    else {
      b.innerHTML = '<span class="long">' + an.text + '</span><span class="short">' + (an.short || an.text) + "</span>" +
        (an.arrow ? '<span class="arrow">' + an.arrow + "</span>" : "");
      b.title = an.text;
    }
    b.addEventListener("click", function () { act(an.action); });
    labelsBox.appendChild(b);
    an.el = b;
    an.v = new THREE.Vector3(an.x, an.y, an.z);
  });
  var limits = { top: 30, right: 0, bottom: 0 };
  function placeLabels() {
    var w = stage.clientWidth, h = stage.clientHeight, p = new THREE.Vector3();
    world.anchors.forEach(function (an) {
      p.copy(an.v).project(camera);
      var x = (p.x + 1) / 2 * w, y = (1 - p.y) / 2 * h;
      if (an.kind === "street") {
        var hw = (an.el.offsetWidth || 120) / 2 + 6;
        x = Math.max(hw, Math.min(w - limits.right - hw, x)); y = Math.max(limits.top, Math.min(h - limits.bottom, y));
      }
      an.el.style.setProperty("--x", x.toFixed(1) + "px");
      an.el.style.setProperty("--y", y.toFixed(1) + "px");
      an.el.hidden = p.z > 1 || x < -40 || x > w + 40 || y < 10 || y > h + 30;
    });
  }

  /* ---------- signal lamps follow the controller ---------- */
  window.Signal.on(function (s) {
    Object.keys(World.APP).forEach(function (a) {
      var A = World.APP[a], st = "r";
      if (s.status !== "allred") {
        if (s.phase === A.thru) st = s.status === "green" ? "g" : "y";
        else if (s.phase === A.left) st = s.status === "green" ? "ga" : "ya";
      }
      World.setSignal(world.signals[a], st);
    });
    world.anchors.forEach(function (an) {
      if (an.kind !== "street") return;
      var A = World.APP[an.a];
      an.el.classList.toggle("on", s.status === "green" && (s.phase === A.thru || s.phase === A.left));
    });
  });

  /* ---------- resolution: sharp on high-DPI screens and when zoomed ---------- */
  function pixelRatio(w, h) {
    var dpr = window.devicePixelRatio || 1, vv = window.visualViewport ? window.visualViewport.scale : 1;
    var pr = Math.min(3, Math.max(1.5, dpr * vv));
    if (window.innerWidth <= 900) pr = Math.min(pr, 2.5);
    while (pr > 1 && w * h * pr * pr > 9.5e6) pr -= 0.25;
    return pr;
  }

  /* ---------- camera: a top-down "square" view and the angled full view ---------- */
  var ELEV_FULL = 56 * Math.PI / 180, ELEV_SQ = 89.4 * Math.PI / 180;
  var F = null, camK = 1;                              // camK: 0 = square view, 1 = full view
  function frames() {
    var w = Math.max(1, stage.clientWidth), h = Math.max(1, stage.clientHeight), desktop = window.innerWidth > 900;
    var tanH = Math.tan(camera.fov * Math.PI / 360);
    var cardW = 0, topPad = 0, botPad = 0;
    if (desktop) {
      cardW = document.getElementById("card").offsetWidth + 30;
      topPad = 74;
      botPad = document.querySelector(".dock-inner").offsetHeight + 26;
    } else {                                            // phones: the tour button and the rings float over the scene
      topPad = document.getElementById("ctrl").offsetHeight + 18;
      botPad = document.querySelector(".dock-inner").offsetHeight + 18;
    }
    var visW = Math.max(200, w - cardW), visH = Math.max(160, h - topPad - botPad);
    var xHalf = w < 640 ? 16 : 22, zHalf = w < 640 ? 17 : 19;
    var Rf = Math.max(xHalf * h / (visW * tanH), (zHalf * Math.sin(ELEV_FULL) + 2) * h / (visH * tanH));
    var px = Math.min(0.46 * h, (w < 700 ? 0.62 : 0.34) * w, 430), ppu = px / (World.EDGE * 2);
    var wide = w >= 700;
    return {
      w: w, h: h, desktop: desktop, cardW: cardW, topPad: topPad, botPad: botPad,
      full: { elev: ELEV_FULL, R: Rf, ox: cardW / 2, oy: (botPad - topPad) / 2 },
      sq: { elev: ELEV_SQ, R: (h / 2) / (ppu * tanH), ox: wide ? 0.09 * w : 0, oy: wide ? 0 : 0.1 * h }
    };
  }
  function applyCamera() {
    if (!F) return;
    var a = F.sq, b = F.full, k = camK;
    var elev = a.elev + (b.elev - a.elev) * k;
    var R = Math.exp(Math.log(a.R) + (Math.log(b.R) - Math.log(a.R)) * k);
    camera.position.set(0, R * Math.sin(elev), R * Math.cos(elev));
    camera.lookAt(0, 0, 0);
    camera.setViewOffset(F.w, F.h, a.ox + (b.ox - a.ox) * k, a.oy + (b.oy - a.oy) * k, F.w, F.h);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    if (camK >= 1) placeLabels();
  }
  function layout() {
    F = frames();
    renderer.setPixelRatio(pixelRatio(F.w, F.h));
    renderer.setSize(F.w, F.h, false);
    camera.aspect = F.w / F.h;
    limits = { top: F.topPad + (F.desktop ? 30 : 26), right: F.cardW, bottom: F.botPad + 6 };
    applyCamera();
    if (Ctl.state === "gate") positionGate();
  }
  var pending = false;
  function queueLayout() { if (!pending) { pending = true; requestAnimationFrame(function () { pending = false; layout(); }); } }
  window.addEventListener("resize", queueLayout);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", queueLayout);
  if (window.ResizeObserver) new ResizeObserver(queueLayout).observe(stage);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueLayout);

  /* ---------- the build-up intro ---------- */
  function clamp01(x) { return Math.max(0, Math.min(1, x)); }
  function ease(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function back(x) { var c = 1.7; return x <= 0 ? 0 : 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }
  var legs = Object.keys(G.legs).map(function (a) { return G.legs[a]; });
  var steps = [
    { name: "square", dur: 0.7, apply: function (p) { var s = Math.max(0.001, back(p)); G.box.scale.set(s, 1, s); G.box.visible = p > 0; } },
    { name: "unfold", dur: 1.9, apply: function (p) {
        var e = ease(p);
        legs.forEach(function (g) { g.visible = p > 0; g.scale.set(1, 1, Math.max(0.001, e)); });
        camK = e; applyCamera();
      } },
    { name: "grass", dur: 1.1, apply: function (p) {
        var e = ease(p);
        G.ground.visible = p > 0; G.ground.scale.setScalar(Math.max(0.001, e));
        scene.background.copy(PAGE).lerp(GRASS, clamp01((p - 0.6) / 0.4)); scene.fog.color.copy(scene.background);
      } },
    { name: "decor", dur: 1.7, apply: function (p) {
        var n = world.decor.length;
        world.decor.forEach(function (d, i) {
          var f = back(clamp01((p - (i / n) * 0.65) / 0.35));
          d.obj.visible = f > 0.001;
          d.obj.scale.set(d.base.x * Math.max(0.001, f), d.base.y * Math.max(0.001, f), d.base.z * Math.max(0.001, f));
        });
      } },
    { name: "signals", dur: 0.8, apply: function (p) {
        G.signals.forEach(function (g, i) { var f = back(clamp01(p * 1.4 - i * 0.12)); g.visible = f > 0.001; g.scale.set(1, Math.max(0.001, f), 1); });
      } },
    { name: "people", dur: 0.9, apply: function (p) { peds.reveal(p); } },
    { name: "cars", dur: 1.8, apply: function (p) { if (p > 0) sim.enable(false); else sim.disable(); } },
    { name: "ui", dur: 0.6, apply: function (p) { if (p > 0) uiOn(); else bodyEl.classList.remove("ui-on"); if (p >= 1) placeLabels(); } }
  ];
  var LAST = steps.length - 1;
  var Ctl = { state: "name", cur: 0, prog: 0, dir: 0, auto: false, done: false };

  function positionGate() {                           // the gate lives inside the stage, so it scrolls with it
    var p = new THREE.Vector3();
    if (F.w >= 700) {
      p.set(World.EDGE, 0, 0).project(camera);
      window.Intro.showGate((p.x + 1) / 2 * F.w + 34, (1 - p.y) / 2 * F.h, false);
    } else {
      p.set(0, 0, World.EDGE).project(camera);
      window.Intro.showGate(F.w / 2, (1 - p.y) / 2 * F.h + 22, true);
    }
  }
  function go() {                                       // the visitor clicked the square
    if (Ctl.state !== "gate") return;
    Ctl.state = "build";
    window.Intro.gateGreen();
    setTimeout(function () {
      window.Intro.hideGate();
      Ctl.cur = 1; Ctl.prog = 0; Ctl.dir = 1; Ctl.auto = true;
    }, 420);
  }
  function finish() {
    Ctl.done = true; Ctl.state = "done"; Ctl.dir = 0;
    try { sessionStorage.setItem("ktr-intro", "1"); } catch (e) {}
  }
  function enterGate() { Ctl.state = "gate"; Ctl.cur = 0; Ctl.prog = 1; Ctl.dir = 0; positionGate(); }
  function tickIntro(dt) {
    if (!Ctl.dir) return;
    var st = steps[Ctl.cur];
    Ctl.prog = clamp01(Ctl.prog + Ctl.dir * dt / st.dur);
    st.apply(Ctl.prog);
    if (Ctl.dir > 0 && Ctl.prog >= 1) {
      if (Ctl.cur === 0) enterGate();
      else if (Ctl.cur === LAST) finish();
      else if (Ctl.auto) { Ctl.cur += 1; Ctl.prog = 0; }
      else Ctl.dir = 0;
    } else if (Ctl.dir < 0 && Ctl.prog <= 0) {
      if (Ctl.cur === 1) { Ctl.cur = 0; enterGate(); }
      else { Ctl.cur -= 1; Ctl.prog = 1; Ctl.dir = 0; }
    }
  }
  Ctl.wheel = function (dir) {
    if (Ctl.state === "gate") { if (dir > 0) go(); return; }
    if (Ctl.state !== "build") return;
    if (dir > 0) {
      if (Ctl.dir < 0) { Ctl.dir = 1; Ctl.auto = true; return; }
      steps[Ctl.cur].apply(1); Ctl.prog = 1;            // finish this step now and move on
      if (Ctl.cur === LAST) { finish(); return; }
      Ctl.cur += 1; Ctl.prog = 0; Ctl.dir = 1; Ctl.auto = true;
    } else {
      Ctl.auto = false;
      Ctl.dir = -1;
    }
  };
  window.IntroCtl = Ctl;
  window.Intro.onGateClick(go);

  // starting state: only the square exists
  steps.forEach(function (st, i) { if (i > 0) st.apply(0); });
  if (window.Intro.skip) {
    steps.forEach(function (st) { st.apply(1); });
    sim.disable(); sim.enable(true);
    peds.stop(); peds.start(true);
    camK = 1; Ctl.cur = LAST; Ctl.prog = 1; finish(); uiOn();
  } else {
    camK = 0; steps[0].apply(0);
  }
  layout();
  if (!window.Intro.skip) window.Intro.onNameDone(function () { Ctl.state = "square"; Ctl.cur = 0; Ctl.prog = 0; Ctl.dir = 1; });

  /* ---------- picking ---------- */
  var ray = new THREE.Raycaster(), ptr = new THREE.Vector2(), hotEls = [];
  function rayAt(ev) {
    var r = renderer.domElement.getBoundingClientRect();
    ptr.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
    ptr.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(ptr, camera);
  }
  function pickAt(ev) {
    rayAt(ev);
    var hits = ray.intersectObjects(world.picks, false);
    for (var i = 0; i < hits.length; i++) if (hits[i].object.visible) return hits[i].object.userData.pick;
    return null;
  }
  function onSquare(ev) { rayAt(ev); return ray.intersectObjects(world.boxPick, false).length > 0; }
  function labelsFor(action) {
    return world.anchors.filter(function (an) {
      return an.action === action || (action.type === "phase" && an.kind === "street" && an.ph === action.ph);
    }).map(function (an) { return an.el; });
  }
  var canvas = renderer.domElement, down = null;
  canvas.addEventListener("pointermove", function (ev) {
    hotEls.forEach(function (el) { el.classList.remove("hot"); }); hotEls = [];
    if (Ctl.state === "gate") { canvas.style.cursor = onSquare(ev) ? "pointer" : "default"; return; }
    if (!Ctl.done) { canvas.style.cursor = "default"; return; }
    var a = pickAt(ev);
    canvas.style.cursor = a ? "pointer" : "default";
    hotEls = a ? labelsFor(a) : [];
    hotEls.forEach(function (el) { el.classList.add("hot"); });
  });
  canvas.addEventListener("pointerleave", function () { hotEls.forEach(function (el) { el.classList.remove("hot"); }); hotEls = []; });
  canvas.addEventListener("pointerdown", function (ev) { down = { x: ev.clientX, y: ev.clientY }; });
  canvas.addEventListener("pointerup", function (ev) {
    if (!down || Math.hypot(ev.clientX - down.x, ev.clientY - down.y) > 6) { down = null; return; }
    down = null;
    if (Ctl.state === "gate") { if (onSquare(ev)) go(); return; }
    if (Ctl.done) act(pickAt(ev));
  });

  /* ---------- loop ---------- */
  var clock = new THREE.Clock();
  function frame() {
    var dt = Math.min(clock.getDelta(), 0.05);
    tickIntro(dt);
    sim.step(dt / 2); sim.step(dt / 2); peds.step(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
