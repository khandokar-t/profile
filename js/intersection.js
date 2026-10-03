/* The 3D home scene: renderer, camera, lights, clickable objects and labels.
   Uses three.js r128 (global THREE), World (static scene), Traffic (cars), Signal (home.js). */
(function () {
  "use strict";
  var stage = document.getElementById("stage");
  var host = document.getElementById("scene");
  var labelsBox = document.getElementById("labels");
  function fail() { document.getElementById("scene-fallback").hidden = false; }
  if (!window.THREE || !window.World || !window.Traffic || !window.Signal) { fail(); return; }

  var renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" }); }
  catch (e) { fail(); return; }
  if (!renderer.getContext()) { fail(); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute("aria-hidden", "true");

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(World.COL.grass);
  scene.fog = new THREE.Fog(World.COL.grass, 130, 240);
  var camera = new THREE.PerspectiveCamera(30, 1, 1, 700);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x9DBF8B, 0.56));
  var sun = new THREE.DirectionalLight(0xfffaf0, 0.62);
  sun.position.set(-38, 72, 34); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  var sc = sun.shadow.camera; sc.left = -62; sc.right = 62; sc.top = 62; sc.bottom = -62; sc.near = 10; sc.far = 220;
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
  scene.add(sun); scene.add(sun.target);

  var world = World.build(scene);
  var sim = new Traffic.Sim(scene, World, window.Signal);
  var peds = new Traffic.Peds(scene);

  /* ---------- actions ---------- */
  function act(action) {
    if (!action) return;
    if (window.Signal.hideHint) window.Signal.hideHint();
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
      if (an.kind === "street") {                       // keep road names on screen at the edges
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

  /* ---------- camera framing ---------- */
  var ELEV = 56 * Math.PI / 180;
  function layout() {
    var w = Math.max(1, stage.clientWidth), h = Math.max(1, stage.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    var desktop = window.innerWidth > 900, cardW = 0, topPad = 0, botPad = 0;
    if (desktop) {
      cardW = document.getElementById("card").offsetWidth + 30;
      topPad = 74;
      botPad = document.querySelector(".dock-inner").offsetHeight + 26;
    }
    var tanH = Math.tan(camera.fov * Math.PI / 360);
    var visW = Math.max(200, w - cardW), visH = Math.max(160, h - topPad - botPad);
    var xHalf = w < 640 ? 16 : 22, zHalf = w < 640 ? 17 : 19;
    var R = Math.max(xHalf * h / (visW * tanH), (zHalf * Math.sin(ELEV) + 2) * 2 * h / (2 * visH * tanH));
    camera.position.set(0, R * Math.sin(ELEV), R * Math.cos(ELEV));
    camera.lookAt(0, 0, 0);
    camera.setViewOffset(w, h, cardW / 2, (botPad - topPad) / 2, w, h);
    limits = { top: desktop ? topPad + 30 : 34, right: cardW, bottom: desktop ? botPad + 6 : 6 };
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    placeLabels();
  }
  var pending = false;
  function queueLayout() { if (!pending) { pending = true; requestAnimationFrame(function () { pending = false; layout(); }); } }
  window.addEventListener("resize", queueLayout);
  if (window.ResizeObserver) new ResizeObserver(queueLayout).observe(stage);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueLayout);
  layout();

  /* ---------- picking ---------- */
  var ray = new THREE.Raycaster(), ptr = new THREE.Vector2(), hotEls = [];
  function pickAt(ev) {
    var r = renderer.domElement.getBoundingClientRect();
    ptr.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
    ptr.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(ptr, camera);
    var hits = ray.intersectObjects(world.picks, false);
    return hits.length ? hits[0].object.userData.pick : null;
  }
  function labelsFor(action) {
    return world.anchors.filter(function (an) {
      return an.action === action || (action.type === "phase" && an.kind === "street" && an.ph === action.ph);
    }).map(function (an) { return an.el; });
  }
  var canvas = renderer.domElement, down = null;
  canvas.addEventListener("pointermove", function (ev) {
    var a = pickAt(ev);
    canvas.style.cursor = a ? "pointer" : "default";
    hotEls.forEach(function (el) { el.classList.remove("hot"); });
    hotEls = a ? labelsFor(a) : [];
    hotEls.forEach(function (el) { el.classList.add("hot"); });
  });
  canvas.addEventListener("pointerleave", function () { hotEls.forEach(function (el) { el.classList.remove("hot"); }); hotEls = []; });
  canvas.addEventListener("pointerdown", function (ev) { down = { x: ev.clientX, y: ev.clientY }; });
  canvas.addEventListener("pointerup", function (ev) {
    if (!down || Math.hypot(ev.clientX - down.x, ev.clientY - down.y) > 6) { down = null; return; }
    down = null;
    act(pickAt(ev));
  });

  /* ---------- loop ---------- */
  var clock = new THREE.Clock();
  function frame() {
    var dt = Math.min(clock.getDelta(), 0.05);
    sim.step(dt / 2); sim.step(dt / 2); peds.step(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
