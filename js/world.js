/* The static 3D world, built in parts so the intro can assemble it step by step:
   the square (box + crosswalks), four legs, the grass, the decorations and the signals.
   Coordinates: x = east, z = south (toward the camera), y = up. 1 unit ≈ 1 m. */
window.World = (function () {
  "use strict";
  var T = THREE;
  var HALF = 6, EDGE = 8.4, LEG = 140;

  // Approaches, named by the leg the traffic comes FROM.
  // d = direction of travel, r = the driver's right-hand side.
  var APP = {
    W: { d: [1, 0],  r: [0, 1],  thru: 2, left: 5, street: "Research Rd" },
    E: { d: [-1, 0], r: [0, -1], thru: 6, left: 1, street: "Projects Ave" },
    N: { d: [0, 1],  r: [-1, 0], thru: 4, left: 7, street: "Teaching St" },
    S: { d: [0, -1], r: [1, 0],  thru: 8, left: 3, street: "About Blvd" }
  };
  function L2W(a, s, t) { var A = APP[a]; return { x: s * A.d[0] + t * A.r[0], z: s * A.d[1] + t * A.r[1] }; }
  function yawTo(dx, dz) { return Math.atan2(dx, dz); }          // rotation.y that points local +z along (dx, dz)

  var COL = {
    page: 0xEEF2EC, grass: 0xBFDCA6, grass2: 0xB0D396, road: 0xCFCCC4, walk: 0xE9E5DC, yellow: 0xEFC24A, white: 0xFFFFFF,
    trunk: 0x8C6A4C, leaf: [0x5FA35C, 0x4F9150, 0x77B66B, 0x6AAE5F], pine: [0x3F7F4E, 0x4A8C57],
    pole: 0x4A524E, housing: 0x232A27, lampOff: 0x3B403D
  };
  var matCache = {};
  function mat(color, extra) {
    var key = color + (extra ? JSON.stringify(extra) : "");
    if (!matCache[key]) {
      var o = { color: color, roughness: 0.88, metalness: 0 };
      if (extra) for (var k in extra) o[k] = extra[k];
      matCache[key] = new T.MeshStandardMaterial(o);
    }
    return matCache[key];
  }
  function mesh(geo, material, shadow) {
    var m = new T.Mesh(geo, material);
    if (shadow !== false) { m.castShadow = true; m.receiveShadow = true; }
    return m;
  }
  function flat(w, h, material, x, y, z) {            // a flat plane: w along x, h along z
    var m = new T.Mesh(new T.PlaneGeometry(w, h), material);
    m.rotation.x = -Math.PI / 2; m.position.set(x || 0, y || 0.02, z || 0); m.receiveShadow = true;
    return m;
  }
  function box(w, h, d, material, x, y, z) {
    var m = mesh(new T.BoxGeometry(w, h, d), material); m.position.set(x, y, z); return m;
  }
  function canvasTex(w, h, draw) {
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    var t = new T.CanvasTexture(c); t.anisotropy = 8; return t;
  }
  function recenter(g, cx, cz) {                      // children were placed in world x/z; move the pivot to (cx, cz)
    g.children.forEach(function (c) { c.position.x -= cx; c.position.z -= cz; });
    g.position.set(cx, 0, cz);
    return g;
  }

  /* ---------------- build ---------------- */
  function build(scene, maxAniso) {
    var picks = [], anchors = [], occupied = [], decor = [];
    var G = { ground: new T.Group(), box: new T.Group(), legs: {}, signals: [], decor: new T.Group() };
    scene.add(G.ground); scene.add(G.box); scene.add(G.decor);

    function free(x, z, r) {
      if (Math.abs(x) < HALF + 4 + r || Math.abs(z) < HALF + 4 + r) return false;
      if (x > 12 && x < 27 && z > 5 && z < 16) return false;
      for (var i = 0; i < occupied.length; i++) {
        var o = occupied[i]; if (Math.hypot(o[0] - x, o[1] - z) < o[2] + r) return false;
      }
      return true;
    }
    function claim(x, z, r) { occupied.push([x, z, r]); }
    function addDecor(obj, x, z) {
      G.decor.add(obj);
      decor.push({ obj: obj, dist: Math.hypot(x, z), base: obj.scale.clone() });
    }
    function pickable(obj, action) {
      obj.traverse(function (o) { if (o.isMesh || o.isSprite) { o.userData.pick = action; picks.push(o); } });
      action.root = obj;
      obj.userData.action = action;
      return action;
    }

    /* ground: a big disc of grass that can grow outward, plus darker patches */
    var ground = new T.Mesh(new T.CircleGeometry(240, 72), mat(COL.grass));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; G.ground.add(ground);
    var patchGeo = new T.CircleGeometry(1, 18);
    for (var i = 0; i < 80; i++) {
      var px = (Math.random() * 2 - 1) * 75, pz = (Math.random() * 2 - 1) * 62;
      if (Math.abs(px) < 11 || Math.abs(pz) < 11) continue;
      var p = new T.Mesh(patchGeo, mat(COL.grass2)); p.rotation.x = -Math.PI / 2; p.position.set(px, 0.006, pz);
      var s = 1.5 + Math.random() * 3.5; p.scale.set(s, s * (0.6 + Math.random() * 0.5), 1); p.receiveShadow = true; G.ground.add(p);
    }

    var roadMat = mat(COL.road), walkMat = mat(COL.walk);
    var lineMat = new T.MeshBasicMaterial({ color: COL.white });
    var yelMat = new T.MeshBasicMaterial({ color: COL.yellow });

    /* the square: box, crosswalk zones, corner sidewalks and zebra stripes */
    G.box.add(flat(EDGE * 2, EDGE * 2, roadMat, 0, 0.02, 0));
    [-1, 1].forEach(function (sx) { [-1, 1].forEach(function (sz) {
      var c = box(2.4, 0.16, 2.4, walkMat, sx * 7.2, 0.08, sz * 7.2); c.castShadow = false; G.box.add(c);
    }); });
    var stripeGeo = new T.PlaneGeometry(0.55, 2.0), stripes = [];
    var M4 = new T.Matrix4(), Q = new T.Quaternion(), V = new T.Vector3(), SC = new T.Vector3(1, 1, 1);
    var flatQ = new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), -Math.PI / 2), up = new T.Vector3(0, 1, 0);
    function flatMatrix(x, z, yaw, y) {
      Q.setFromAxisAngle(up, yaw).multiply(flatQ);
      V.set(x, y || 0.04, z); M4.compose(V, Q, SC); return M4.clone();
    }
    Object.keys(APP).forEach(function (a) {
      var A = APP[a], yaw = yawTo(A.d[0], A.d[1]);
      for (var t2 = -5.3; t2 <= 5.31; t2 += 1.18) { var c = L2W(a, -7.2, t2); stripes.push(flatMatrix(c.x, c.z, yaw)); }
    });
    var stripeMesh = new T.InstancedMesh(stripeGeo, lineMat, stripes.length);
    stripes.forEach(function (m, k) { stripeMesh.setMatrixAt(k, m); });
    G.box.add(stripeMesh);

    /* four legs, each built in its own frame: x = the driver's right, z = distance out from the square */
    var LEN = LEG - EDGE;
    var dashGeo = new T.PlaneGeometry(0.16, 2.2);
    var arrowShape = new T.Shape();
    arrowShape.moveTo(-0.12, 0); arrowShape.lineTo(0.12, 0); arrowShape.lineTo(0.12, 1.4); arrowShape.lineTo(-0.6, 1.4); arrowShape.lineTo(-0.6, 1.64);
    arrowShape.lineTo(-1.12, 1.28); arrowShape.lineTo(-0.6, 0.92); arrowShape.lineTo(-0.6, 1.16); arrowShape.lineTo(-0.12, 1.16); arrowShape.lineTo(-0.12, 0);
    var arrowGeo = new T.ShapeGeometry(arrowShape);
    Object.keys(APP).forEach(function (a) {
      var A = APP[a], g = new T.Group(), o = L2W(a, -EDGE, 0);
      g.position.set(o.x, 0, o.z); g.rotation.y = Math.atan2(-A.d[0], -A.d[1]);
      g.add(flat(12, LEN, roadMat, 0, 0.021, LEN / 2));
      function walkStrip(x, u0, u1, w) { var b = box(w || 2.4, 0.16, u1 - u0, walkMat, x, 0.08, (u0 + u1) / 2); b.castShadow = false; g.add(b); }
      walkStrip(7.2, 0, LEN);
      if (a === "E") {                                  // bus bay on the south side of the east leg
        walkStrip(-7.2, 0, 5.6); walkStrip(-7.2, 15.6, LEN);
        g.add(flat(2.4, 10, roadMat, -7.2, 0.03, 10.6));
        walkStrip(-9.6, 4.6, 16.6);
      } else walkStrip(-7.2, 0, LEN);
      [-0.18, 0.18].forEach(function (x) { g.add(flat(0.13, LEN - 0.6, yelMat, x, 0.04, (LEN + 0.6) / 2)); });
      g.add(flat(5.8, 0.45, lineMat, 3.1, 0.04, 0.6));
      var dashes = [];
      [3, -3].forEach(function (x) { for (var u = 2.1; u < LEN; u += 4.8) dashes.push(flatMatrix(x, u, 0)); });
      var dm = new T.InstancedMesh(dashGeo, lineMat, dashes.length);
      dashes.forEach(function (m, k) { dm.setMatrixAt(k, m); }); g.add(dm);
      var arrow = new T.Mesh(arrowGeo, lineMat); arrow.rotation.x = -Math.PI / 2; arrow.scale.setScalar(1.25); arrow.position.set(1.75, 0.04, 7.6);
      g.add(arrow);
      scene.add(g);
      G.legs[a] = g;
    });

    /* ---------- signals (each grows from its own base) ---------- */
    var glowTex = canvasTex(128, 128, function (c, w) {
      var grd = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.35, "rgba(255,255,255,.95)");
      grd.addColorStop(0.6, "rgba(255,255,255,.35)"); grd.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = grd; c.fillRect(0, 0, w, w);
    });
    var arrowTex = canvasTex(128, 128, function (c, w) {
      var grd = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      grd.addColorStop(0, "rgba(255,255,255,.55)"); grd.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = grd; c.fillRect(0, 0, w, w);
      c.fillStyle = "#fff"; c.beginPath();
      c.moveTo(24, 64); c.lineTo(60, 32); c.lineTo(60, 52); c.lineTo(104, 52); c.lineTo(104, 76); c.lineTo(60, 76); c.lineTo(60, 96); c.closePath(); c.fill();
    });
    var signals = {};
    var poleMat = mat(COL.pole, { roughness: 0.6 }), houseMat = mat(COL.housing, { roughness: 0.5 });
    var lampGeo = new T.CylinderGeometry(0.17, 0.17, 0.08, 18); lampGeo.rotateX(Math.PI / 2);
    Object.keys(APP).forEach(function (a) {
      var A = APP[a], b = L2W(a, -9.6, 9.0), g = new T.Group();
      g.position.set(b.x, 0, b.z);
      function rel(p) { return { x: p.x - b.x, z: p.z - b.z }; }
      var pole = mesh(new T.CylinderGeometry(0.13, 0.17, 5.0, 12), poleMat); pole.position.set(0, 2.5, 0); g.add(pole);
      var am = rel(L2W(a, -9.6, 6.2));
      var arm = mesh(new T.BoxGeometry(0.15, 0.15, 5.7), poleMat); arm.position.set(am.x, 4.8, am.z); arm.rotation.y = yawTo(A.r[0], A.r[1]); g.add(arm);
      var hp = rel(L2W(a, -9.6, 3.5));
      var head = new T.Group(); head.position.set(hp.x, 3.85, hp.z); head.rotation.y = yawTo(-A.d[0], -A.d[1]);
      head.add(mesh(new T.BoxGeometry(0.62, 1.95, 0.5), houseMat));
      var lamps = [];
      [0.66, 0.22, -0.22, -0.66].forEach(function (y) {
        var lm = new T.MeshStandardMaterial({ color: COL.lampOff, emissive: 0x000000, roughness: 0.4 });
        var l = new T.Mesh(lampGeo, lm); l.position.set(0, y, 0.27); head.add(l); lamps.push(lm);
      });
      g.add(head);
      var ball = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0xff3b30, transparent: true, depthWrite: false }));
      ball.position.set(hp.x - 0.6, 6.0, hp.z); ball.scale.set(1.9, 1.9, 1); g.add(ball);
      var arr = new T.Sprite(new T.SpriteMaterial({ map: arrowTex, color: 0x30d07a, transparent: true, depthWrite: false }));
      arr.position.set(hp.x + 1.05, 6.0, hp.z); arr.scale.set(1.6, 1.6, 1); arr.visible = false; g.add(arr);
      scene.add(g);
      G.signals.push(g);
      pickable(g, { type: "phase", ph: A.thru });
      signals[a] = { lamps: lamps, ball: ball, arrow: arr };
    });

    /* ---------- decoration builders (every item pivots on its own base) ---------- */
    var unitBox = new T.BoxGeometry(1, 1, 1);
    var trunkGeo = new T.CylinderGeometry(0.16, 0.22, 1, 7);
    var blobGeo = new T.IcosahedronGeometry(1, 0);
    var coneGeo = new T.ConeGeometry(1, 1, 7);
    function tree(x, z, s, pine) {
      if (!free(x, z, 1.4 * s)) return; claim(x, z, 1.4 * s);
      var g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = Math.random() * Math.PI;
      var tr = mesh(trunkGeo, mat(COL.trunk)); tr.scale.set(s, s * 1.1, s); tr.position.y = 0.55 * s; g.add(tr);
      if (pine) {
        var c = mesh(coneGeo, mat(COL.pine[Math.floor(Math.random() * 2)], { flatShading: true }));
        c.scale.set(1.1 * s, 2.8 * s, 1.1 * s); c.position.y = 2.3 * s; g.add(c);
      } else {
        var col = COL.leaf[Math.floor(Math.random() * COL.leaf.length)];
        var b1 = mesh(blobGeo, mat(col, { flatShading: true })); b1.scale.set(1.25 * s, 1.15 * s, 1.25 * s); b1.position.y = 1.85 * s; g.add(b1);
        if (Math.random() < 0.5) { var b2 = mesh(blobGeo, mat(col, { flatShading: true })); b2.scale.setScalar(0.75 * s); b2.position.set(0.7 * s, 1.5 * s, 0.3 * s); g.add(b2); }
      }
      addDecor(g, x, z);
    }
    function bush(x, z, s) {
      if (!free(x, z, 0.8 * s)) return; claim(x, z, 0.8 * s);
      var g = new T.Group(); g.position.set(x, 0, z);
      var b = mesh(blobGeo, mat(COL.leaf[Math.floor(Math.random() * 4)], { flatShading: true }));
      b.scale.set(0.75 * s, 0.55 * s, 0.75 * s); b.position.y = 0.4 * s; g.add(b);
      addDecor(g, x, z);
    }
    function hut(x, z, o) {
      var w = o.w || 3.2, d = o.d || 3.2, h = o.h || 2.2;
      claim(x, z, Math.max(w, d) * 0.8);
      var g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = o.rot || 0;
      var walls = mesh(unitBox, mat(o.wall)); walls.scale.set(w, h, d); walls.position.y = h / 2; g.add(walls);
      var side = Math.max(w, d) + 0.7;
      var cone = mesh(new T.ConeGeometry(side / Math.SQRT2, h * 0.8, 4), mat(o.roof, { flatShading: true }));
      cone.rotation.y = Math.PI / 4;
      var roof = new T.Group(); roof.add(cone); roof.position.y = h + h * 0.4;
      roof.scale.set((w + 0.7) / side, 1, (d + 0.7) / side); g.add(roof);
      var door = mesh(unitBox, mat(0x6B4F3A)); door.scale.set(0.7, 1.25, 0.08); door.position.set(0, 0.62, d / 2 + 0.02); g.add(door);
      [-1, 1].forEach(function (k) { var wd = mesh(unitBox, mat(0xBFE0EE, { roughness: 0.3 })); wd.scale.set(0.55, 0.5, 0.06); wd.position.set(k * w * 0.3, h * 0.62, d / 2 + 0.02); g.add(wd); });
      addDecor(g, x, z);
    }
    function bench(x, z, rot) {
      var g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = rot || 0;
      var seat = mesh(unitBox, mat(0x9C6B45)); seat.scale.set(1.8, 0.12, 0.5); seat.position.y = 0.48; g.add(seat);
      var back = mesh(unitBox, mat(0x9C6B45)); back.scale.set(1.8, 0.45, 0.1); back.position.set(0, 0.8, -0.22); g.add(back);
      [-0.75, 0.75].forEach(function (k) { var l = mesh(unitBox, mat(0x4A524E)); l.scale.set(0.1, 0.48, 0.45); l.position.set(k, 0.24, 0); g.add(l); });
      claim(x, z, 1.2); addDecor(g, x, z);
    }
    function lampPost(x, z) {
      var g = new T.Group(); g.position.set(x, 0, z);
      var pl = mesh(new T.CylinderGeometry(0.07, 0.09, 3.6, 8), poleMat); pl.position.y = 1.8; g.add(pl);
      var hd = mesh(unitBox, mat(0xF7F2D8, { emissive: 0x3a3520 })); hd.scale.set(0.45, 0.18, 0.45); hd.position.y = 3.65; g.add(hd);
      addDecor(g, x, z);
    }
    function flowers(cx, cz, n, spread) {
      var geo = new T.IcosahedronGeometry(0.13, 0), cols = [0xF2A0B6, 0xF7D154, 0xFFFFFF, 0xE97C5A, 0xB89BE8];
      var im = new T.InstancedMesh(geo, new T.MeshStandardMaterial({ roughness: 0.8 }), n), c = new T.Color();
      for (var k = 0; k < n; k++) {
        M4.makeTranslation((Math.random() * 2 - 1) * spread, 0.14, (Math.random() * 2 - 1) * spread * 0.7);
        im.setMatrixAt(k, M4); im.setColorAt(k, c.setHex(cols[k % cols.length]));
      }
      var g = new T.Group(); g.position.set(cx, 0, cz); g.add(im);
      addDecor(g, cx, cz);
    }

    /* SE: bus stop + parked bus (starts the tour) */
    (function () {
      var g = new T.Group();
      var glass = new T.MeshStandardMaterial({ color: 0xBFE3F0, transparent: true, opacity: 0.55, roughness: 0.15 });
      var back = mesh(unitBox, glass); back.scale.set(4, 2.2, 0.1); back.position.set(19, 1.1, 12.6); g.add(back);
      [-1, 1].forEach(function (k) { var sd = mesh(unitBox, glass); sd.scale.set(0.1, 2.2, 1.6); sd.position.set(19 + k * 2, 1.1, 11.85); g.add(sd); });
      var roof = mesh(unitBox, mat(0x0B6A4C)); roof.scale.set(4.5, 0.16, 2.0); roof.position.set(19, 2.3, 11.85); g.add(roof);
      var seat = mesh(unitBox, mat(0x9C6B45)); seat.scale.set(2.6, 0.12, 0.5); seat.position.set(19, 0.5, 12.25); g.add(seat);
      var sp = mesh(new T.CylinderGeometry(0.06, 0.06, 2.8, 8), poleMat); sp.position.set(24.4, 1.4, 10.0); g.add(sp);
      var signTex = canvasTex(256, 256, function (c, w) {
        c.fillStyle = "#0B6A4C"; c.fillRect(0, 0, w, w); c.fillStyle = "#fff"; c.font = "bold 92px Arial, sans-serif";
        c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("BUS", w / 2, w / 2 + 4);
      });
      var sMat = new T.MeshStandardMaterial({ map: signTex }), gMat = mat(0x0B6A4C);
      var sign = new T.Mesh(new T.BoxGeometry(0.9, 0.9, 0.08), [gMat, gMat, gMat, gMat, sMat, sMat]);
      sign.position.set(24.4, 2.85, 10.0); sign.castShadow = true; g.add(sign);
      var bus = new T.Group(); bus.position.set(19, 0, 7.2); bus.rotation.y = Math.PI / 2;
      var body = mesh(window.Traffic.roundedBlock(2.1, 6.6, 1.55, 0.45), mat(0xF2B134, { roughness: 0.55 })); body.position.y = 0.32; bus.add(body);
      var band = mesh(window.Traffic.roundedBlock(2.16, 6.2, 0.55, 0.42), mat(0x2E3B42, { roughness: 0.3 })); band.position.y = 1.18; bus.add(band);
      var top = mesh(window.Traffic.roundedBlock(1.9, 6.1, 0.12, 0.4), mat(0xFFF6DE)); top.position.y = 2.08; bus.add(top);
      g.add(bus);
      recenter(g, 19, 10);
      claim(19, 12, 3);
      var act = pickable(g, { type: "link", href: "tour.html" });
      addDecor(g, 19, 10);
      anchors.push({ kind: "obj", text: "Bus stop · Tour", short: "Tour", arrow: "▸", x: 21.5, y: 3.6, z: 10.5, action: act });
    })();

    /* SW: metro entrance (opens the map) */
    (function () {
      var g = new T.Group(), cx = -17, cz = 14;
      var holeMat = mat(0x2A3330), stepMat = mat(0x56625C), wallM = mat(0xC9CEC8);
      g.add(flat(2.8, 4.2, holeMat, cx, 0.03, cz));
      for (var k = 0; k < 6; k++) g.add(flat(2.6, 0.18, stepMat, cx, 0.035, cz - 1.7 + k * 0.62));
      var lw = mesh(unitBox, wallM); lw.scale.set(0.2, 0.9, 4.4); lw.position.set(cx - 1.5, 0.45, cz); g.add(lw);
      var rw = mesh(unitBox, wallM); rw.scale.set(0.2, 0.9, 4.4); rw.position.set(cx + 1.5, 0.45, cz); g.add(rw);
      var bw = mesh(unitBox, wallM); bw.scale.set(3.2, 0.9, 0.2); bw.position.set(cx, 0.45, cz + 2.2); g.add(bw);
      var tp = mesh(new T.CylinderGeometry(0.08, 0.08, 3.0, 8), poleMat); tp.position.set(cx - 2.4, 1.5, cz - 2.2); g.add(tp);
      var mTex = canvasTex(256, 256, function (c, w) {
        c.fillStyle = "#ffffff"; c.fillRect(0, 0, w, w);
        c.fillStyle = "#2a78d6"; c.beginPath(); c.arc(w / 2, w / 2, 104, 0, Math.PI * 2); c.fill();
        c.fillStyle = "#fff"; c.font = "bold 132px Arial, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("M", w / 2, w / 2 + 8);
      });
      var cube = new T.Mesh(new T.BoxGeometry(1.0, 1.0, 1.0), new T.MeshStandardMaterial({ map: mTex }));
      cube.position.set(cx - 2.4, 3.4, cz - 2.2); cube.castShadow = true; g.add(cube);
      recenter(g, cx, cz);
      claim(cx, cz, 3.2); claim(cx - 2.4, cz - 2.2, 1);
      var act = pickable(g, { type: "link", href: "map.html" });
      addDecor(g, cx, cz);
      anchors.push({ kind: "obj", text: "Metro · Map", short: "Map", arrow: "▸", x: cx - 2.4, y: 4.4, z: cz - 2.2, action: act });
    })();

    /* SE corner: pedestrian push button (contact) */
    (function () {
      var g = new T.Group(), x = 10.9, z = 9.3;
      var pl = mesh(new T.CylinderGeometry(0.07, 0.08, 1.7, 8), poleMat); pl.position.set(x, 0.85, z); g.add(pl);
      var bx = mesh(unitBox, mat(0xF4B400, { roughness: 0.5 })); bx.scale.set(0.5, 0.7, 0.3); bx.position.set(x, 1.35, z - 0.12); g.add(bx);
      var btn = mesh(new T.CylinderGeometry(0.13, 0.13, 0.08, 16), mat(0x17201C)); btn.rotation.x = Math.PI / 2; btn.position.set(x, 1.3, z - 0.3); g.add(btn);
      recenter(g, x, z); claim(x, z, 0.8);
      var act = pickable(g, { type: "contact" });
      addDecor(g, x, z);
      anchors.push({ kind: "obj push", text: "Push for contact", short: "Contact", x: x, y: 2.3, z: z, action: act });
    })();

    /* NW corner: controller cabinet (pre-timed tour) */
    (function () {
      var g = new T.Group(), x = -12.2, z = -10.6;
      var cab = mesh(unitBox, mat(0xB9C0BB, { roughness: 0.5 })); cab.scale.set(1.0, 1.6, 0.7); cab.position.set(x, 0.8, z); g.add(cab);
      var dr = mesh(unitBox, mat(0xA3ABA6)); dr.scale.set(0.8, 1.3, 0.05); dr.position.set(x, 0.8, z + 0.37); g.add(dr);
      var pad = mesh(unitBox, mat(0xA9A59A)); pad.scale.set(1.4, 0.1, 1.1); pad.position.set(x, 0.05, z); g.add(pad);
      recenter(g, x, z); claim(x, z, 1.2);
      var act = pickable(g, { type: "auto" });
      addDecor(g, x, z);
      anchors.push({ kind: "obj", text: "Cabinet · Auto tour", short: "Auto tour", x: x, y: 2.3, z: z, action: act });
    })();

    /* NE: the ITS Lab (opens research) + a pond */
    (function () {
      var g = new T.Group(), x = 20, z = -17;
      var walls = mesh(unitBox, mat(0xF6F4EE)); walls.scale.set(8.5, 3.2, 6); walls.position.set(x, 1.6, z); g.add(walls);
      var roof = mesh(unitBox, mat(0x4F7FBF)); roof.scale.set(9.0, 0.3, 6.5); roof.position.set(x, 3.35, z); g.add(roof);
      var band = mesh(unitBox, mat(0x9CCBE0, { roughness: 0.25 })); band.scale.set(7.6, 0.8, 0.06); band.position.set(x, 2.0, z + 3.02); g.add(band);
      var door = mesh(unitBox, mat(0x2E3B42)); door.scale.set(1.2, 1.5, 0.06); door.position.set(x - 2.5, 0.75, z + 3.03); g.add(door);
      var dp = mesh(new T.CylinderGeometry(0.08, 0.08, 1.2, 8), poleMat); dp.position.set(x + 2.6, 4.1, z - 1); g.add(dp);
      var dish = mesh(new T.CylinderGeometry(0.95, 0.15, 0.45, 20), mat(0xEDEFF0)); dish.position.set(x + 2.6, 4.85, z - 1); dish.rotation.z = 0.55; g.add(dish);
      var ant = mesh(new T.CylinderGeometry(0.04, 0.04, 2.2, 6), poleMat); ant.position.set(x - 3, 4.5, z - 2); g.add(ant);
      recenter(g, x, z); claim(x, z, 5.6);
      var act = pickable(g, { type: "phase", ph: 2 });
      addDecor(g, x, z);
      anchors.push({ kind: "obj", text: "ITS Lab · Research", short: "ITS Lab", x: x, y: 5.6, z: z, action: act });
      var pg = new T.Group(); pg.position.set(31, 0, -11.5);
      var pond = new T.Mesh(new T.CircleGeometry(1, 40), mat(0x9FCFE2, { roughness: 0.2 })); pond.rotation.x = -Math.PI / 2; pond.scale.set(4.2, 2.8, 1); pond.position.y = 0.02; pond.receiveShadow = true; pg.add(pond);
      var rim = new T.Mesh(new T.RingGeometry(1, 1.12, 40), mat(0xE6F1E2)); rim.rotation.x = -Math.PI / 2; rim.scale.set(4.2, 2.8, 1); rim.position.y = 0.025; pg.add(rim);
      claim(31, -11.5, 4.6); addDecor(pg, 31, -11.5);
    })();

    /* huts, benches, lamps, trees, bushes, flowers */
    hut(-19, -16, { wall: 0xF6E7B8, roof: 0xD9843E, rot: 0.1 });
    hut(-27, -21, { wall: 0xF4F1EA, roof: 0x5E8FCB, w: 3.6, d: 3.0, rot: -0.2 });
    hut(-15, -25, { wall: 0xF1C9B5, roof: 0xB8574A, w: 2.6, d: 2.6, h: 1.9, rot: 0.3 });
    hut(-26, 13, { wall: 0xE9F0F6, roof: 0x3E8A6A, rot: -0.15 });
    hut(-22, 22, { wall: 0xF6E7B8, roof: 0xB8574A, w: 2.8, d: 2.8, rot: 0.25 });
    hut(30, 15, { wall: 0xF1C9B5, roof: 0x5E8FCB, w: 3.4, d: 3.0, rot: 0.15 });
    hut(25, 23, { wall: 0xF4F1EA, roof: 0xD9843E, w: 2.8, d: 2.8, h: 2.0, rot: -0.3 });
    hut(34, -22, { wall: 0xF6E7B8, roof: 0x3E8A6A, w: 3.0, d: 3.0, rot: 0.2 });
    hut(-36, 20.5, { wall: 0xE9F0F6, roof: 0xD9843E, w: 3.0, d: 3.0, rot: 0.4 });
    hut(40, 12, { wall: 0xF6E7B8, roof: 0xB8574A, w: 2.6, d: 2.6, rot: 0.1 });
    bench(-13.2, 10.6, 0); bench(14.5, -10.7, Math.PI);
    [[-14, 9.6], [-30, 9.6], [30, 9.6], [-14, -9.6], [28, -9.6], [9.6, 30], [-9.6, 26], [9.6, -28], [-9.6, -30]].forEach(function (q) { lampPost(q[0], q[1]); });
    flowers(-20, 18, 26, 2.6); flowers(-22, -12.5, 22, 2.2); flowers(26, 19, 22, 2.4); flowers(15, -24, 18, 2);
    [[-12, 18, 1.0], [-14.5, 22, 1.2, 1], [-30, 18, 1.1], [-33, 12, 1.0, 1], [-11.5, 28, 1.1], [-18, 28, 1.0],
     [13, 18, 1.1], [16.5, 22, 1.0, 1], [21, 18.5, 0.9], [33, 20, 1.2], [36, 27, 1.0, 1], [14, 28, 1.1], [29, 30, 1.0],
     [-12.5, -14.5, 1.0], [-11.8, -20, 1.1, 1], [-23, -12, 1.0], [-32, -14, 1.2, 1], [-21.5, -27, 1.0], [-30, -28, 1.1],
     [12.5, -13, 1.0, 1], [12, -22, 1.1], [27, -24, 1.0], [38, -15, 1.1, 1], [13.5, -28, 1.0], [24, -29, 1.2, 1], [40, -28, 1.0],
     [-40, -10, 1.2, 1], [-44, 14, 1.1], [44, 22, 1.2], [45, -9, 1.0, 1], [-38, 30, 1.2], [38, 36, 1.1, 1], [-24, 36, 1.0], [22, 38, 1.1]
    ].forEach(function (q) { tree(q[0], q[1], q[2], !!q[3]); });
    for (var k = 0; k < 90; k++) {
      var tx = (Math.random() * 2 - 1) * 75, tz = (Math.random() * 2 - 1) * 60;
      if (Math.abs(tx) < 30 && Math.abs(tz) < 26) continue;
      tree(tx, tz, 0.9 + Math.random() * 0.5, Math.random() < 0.35);
    }
    [[-16.5, 18.5], [-24, 9.8], [17, 15.5], [27, 12], [-17, -12], [-24, -25], [26, -14.5], [16, -13]].forEach(function (q) { bush(q[0], q[1], 1 + Math.random() * 0.5); });

    /* street-name labels sit over each road */
    Object.keys(APP).forEach(function (a) {
      var A = APP[a], dist = a === "S" ? 18 : a === "N" ? 21 : 23, q = L2W(a, -dist, 0);
      anchors.push({ kind: "street", a: a, ph: A.thru, text: A.street, x: q.x, y: 0.6, z: q.z, action: { type: "phase", ph: A.thru } });
    });

    // nearer things pop up first
    decor.sort(function (p1, p2) { return p1.dist - p2.dist; });
    var boxPick = [];
    G.box.traverse(function (o) { if (o.isMesh) boxPick.push(o); });
    return { picks: picks, anchors: anchors, signals: signals, groups: G, decor: decor, boxPick: boxPick };
  }

  /* lamp states: 'r' | 'y' | 'g' | 'ga' (red ball + green arrow) | 'ya' */
  var LAMP = { r: 0xff3b30, y: 0xffb020, g: 0x2fd27a };
  function setSignal(sig, st) {
    var on = [null, null, null, null];
    if (st === "r") on[0] = "r"; if (st === "y") on[1] = "y"; if (st === "g") on[2] = "g";
    if (st === "ga") { on[0] = "r"; on[3] = "g"; } if (st === "ya") { on[0] = "r"; on[3] = "y"; }
    sig.lamps.forEach(function (m, i) {
      if (on[i]) { m.color.setHex(LAMP[on[i]]); m.emissive.setHex(LAMP[on[i]]); m.emissiveIntensity = 0.9; }
      else { m.color.setHex(COL.lampOff); m.emissive.setHex(0x000000); }
    });
    var ballSt = st === "g" ? "g" : st === "y" ? "y" : "r";
    sig.ball.material.color.setHex(LAMP[ballSt]);
    sig.arrow.visible = st === "ga" || st === "ya";
    if (sig.arrow.visible) sig.arrow.material.color.setHex(LAMP[st === "ga" ? "g" : "y"]);
  }

  return { APP: APP, L2W: L2W, yawTo: yawTo, LEG: LEG, HALF: HALF, EDGE: EDGE, COL: COL, build: build, setSignal: setSignal };
})();
