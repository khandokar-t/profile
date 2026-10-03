/* The static 3D world: grass, roads, markings, signals and the four corner blocks
   (huts, trees, the bus stop, the metro entrance, the ITS Lab, the cabinet).
   Coordinates: x = east, z = south (toward the camera), y = up. 1 unit ≈ 1 m. */
window.World = (function () {
  "use strict";
  var T = THREE;
  var LANE = 3, HALF = 6, LEG = 140;

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
    grass: 0xBFDCA6, grass2: 0xB0D396, road: 0xCFCCC4, walk: 0xE9E5DC, yellow: 0xEFC24A, white: 0xFFFFFF,
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
  function flat(w, h, color, y) {               // a flat ground plane (w along x, h along z)
    var m = new T.Mesh(new T.PlaneGeometry(w, h), mat(color));
    m.rotation.x = -Math.PI / 2; m.position.y = y || 0.02; m.receiveShadow = true;
    return m;
  }
  function canvasTex(w, h, draw) {
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    var t = new T.CanvasTexture(c); t.anisotropy = 4; return t;
  }

  /* ---------------- build ---------------- */
  function build(scene) {
    var picks = [];                                  // clickable meshes
    var anchors = [];                                // where HTML labels sit
    var occupied = [];                               // decoration footprints [x, z, radius]
    function free(x, z, r) {
      if (Math.abs(x) < HALF + 4 + r || Math.abs(z) < HALF + 4 + r) return false;     // keep off roads + sidewalks
      if (x > 12 && x < 27 && z > 5 && z < 16) return false;                            // bus bay + shelter
      for (var i = 0; i < occupied.length; i++) {
        var o = occupied[i]; if (Math.hypot(o[0] - x, o[1] - z) < o[2] + r) return false;
      }
      return true;
    }
    function claim(x, z, r) { occupied.push([x, z, r]); }
    function pickable(obj, action, label) {
      obj.traverse(function (o) { if (o.isMesh || o.isSprite) { o.userData.pick = action; picks.push(o); } });
      obj.userData.pickRoot = true;
      obj.userData.action = action;
      action.root = obj;
      if (label) action.label = label;
    }

    /* ground + grass patches */
    var ground = new T.Mesh(new T.PlaneGeometry(420, 420), mat(COL.grass));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    var patchGeo = new T.CircleGeometry(1, 18);
    for (var i = 0; i < 70; i++) {
      var px = (Math.random() * 2 - 1) * 70, pz = (Math.random() * 2 - 1) * 60;
      if (Math.abs(px) < 11 || Math.abs(pz) < 11) continue;
      var p = new T.Mesh(patchGeo, mat(COL.grass2)); p.rotation.x = -Math.PI / 2; p.position.set(px, 0.006, pz);
      var s = 1.5 + Math.random() * 3.5; p.scale.set(s, s * (0.6 + Math.random() * 0.5), 1); p.receiveShadow = true; scene.add(p);
    }

    /* roads */
    scene.add(flat(LEG * 2, HALF * 2, COL.road, 0.02));
    var ns = flat(HALF * 2, LEG * 2, COL.road, 0.021); scene.add(ns);

    /* sidewalks (raised strips) with a bus bay cut into the south side of the east leg */
    var walkMat = mat(COL.walk);
    function walk(x0, x1, z0, z1) {
      var b = mesh(new T.BoxGeometry(Math.abs(x1 - x0), 0.16, Math.abs(z1 - z0)), walkMat);
      b.castShadow = false; b.position.set((x0 + x1) / 2, 0.08, (z0 + z1) / 2); scene.add(b);
    }
    [-1, 1].forEach(function (sx) {
      [-1, 1].forEach(function (sz) {
        var a = HALF, b = HALF + 2.4;
        if (sx === 1 && sz === 1) {                    // SE quadrant: leave room for the bus bay
          walk(a, 14, sz * a, sz * b); walk(24, LEG, sz * a, sz * b);
        } else {
          walk(sx * a, sx * LEG, sz * a, sz * b);
        }
        walk(sx * a, sx * b, sz * b, sz * LEG);
      });
    });
    scene.add((function () { var m = flat(10, 2.4, COL.road, 0.03); m.position.set(19, 0.03, 7.2); return m; })());
    walk(13, 25, 8.4, 10.8);

    /* markings */
    var lineMat = new T.MeshBasicMaterial({ color: COL.white });
    var yelMat = new T.MeshBasicMaterial({ color: COL.yellow });
    var dashGeo = new T.PlaneGeometry(0.16, 2.2);
    var dashes = [];
    var stripeGeo = new T.PlaneGeometry(0.55, 2.0);
    var stripes = [];
    var M4 = new T.Matrix4(), Q = new T.Quaternion(), V = new T.Vector3(), SC = new T.Vector3(1, 1, 1);
    var flatQ = new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), -Math.PI / 2);
    function flatMatrix(x, z, yaw, y) {
      Q.setFromAxisAngle(new T.Vector3(0, 1, 0), yaw).multiply(flatQ);
      V.set(x, y || 0.04, z); M4.compose(V, Q, SC); return M4.clone();
    }
    Object.keys(APP).forEach(function (a) {
      var A = APP[a], yaw = yawTo(A.d[0], A.d[1]);
      // double yellow centre line on this approach's leg
      [-0.18, 0.18].forEach(function (off) {
        var p0 = L2W(a, -9.0, off), p1 = L2W(a, -LEG, off);
        var len = Math.hypot(p1.x - p0.x, p1.z - p0.z);
        var m = new T.Mesh(new T.PlaneGeometry(0.13, len), yelMat);
        m.rotation.set(-Math.PI / 2, 0, 0);
        var g = new T.Group(); g.add(m); g.rotation.y = yaw; g.position.set((p0.x + p1.x) / 2, 0.04, (p0.z + p1.z) / 2);
        scene.add(g);
      });
      // dashed lane lines (inbound t=+3, outbound t=-3)
      [3, -3].forEach(function (t) {
        for (var s = -10.5; s > -LEG; s -= 4.8) { var q = L2W(a, s, t); dashes.push(flatMatrix(q.x, q.z, yaw)); }
      });
      // stop bar
      var sb = L2W(a, -9.0, 3.1);
      var bar = new T.Mesh(new T.PlaneGeometry(5.8, 0.45), lineMat); bar.rotation.x = -Math.PI / 2;
      var gb = new T.Group(); gb.add(bar); gb.rotation.y = yaw; gb.position.set(sb.x, 0.04, sb.z); scene.add(gb);
      // crosswalk stripes across the whole leg
      for (var t2 = -5.3; t2 <= 5.31; t2 += 1.18) { var c = L2W(a, -7.2, t2); stripes.push(flatMatrix(c.x, c.z, yaw)); }
      // left-turn arrow in the left lane
      var arrow = new T.Shape();
      arrow.moveTo(-0.12, 0); arrow.lineTo(0.12, 0); arrow.lineTo(0.12, 1.4); arrow.lineTo(-0.6, 1.4); arrow.lineTo(-0.6, 1.64);
      arrow.lineTo(-1.12, 1.28); arrow.lineTo(-0.6, 0.92); arrow.lineTo(-0.6, 1.16); arrow.lineTo(-0.12, 1.16); arrow.lineTo(-0.12, 0);
      var am = new T.Mesh(new T.ShapeGeometry(arrow), lineMat); am.rotation.x = -Math.PI / 2; am.scale.set(1.25, 1.25, 1.25);
      var ga = new T.Group(); ga.add(am);
      var ap = L2W(a, -16, 1.75); ga.position.set(ap.x, 0.04, ap.z);
      ga.rotation.y = Math.atan2(-A.d[0], -A.d[1]); scene.add(ga);
    });
    var dashMesh = new T.InstancedMesh(dashGeo, lineMat, dashes.length);
    dashes.forEach(function (m, i) { dashMesh.setMatrixAt(i, m); }); scene.add(dashMesh);
    var stripeMesh = new T.InstancedMesh(stripeGeo, lineMat, stripes.length);
    stripes.forEach(function (m, i) { stripeMesh.setMatrixAt(i, m); }); scene.add(stripeMesh);

    /* ---------- signals ---------- */
    var glowTex = canvasTex(64, 64, function (g, w) {
      var grd = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.35, "rgba(255,255,255,.95)");
      grd.addColorStop(0.6, "rgba(255,255,255,.35)"); grd.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grd; g.fillRect(0, 0, w, w);
    });
    var arrowTex = canvasTex(64, 64, function (g, w) {
      var grd = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      grd.addColorStop(0, "rgba(255,255,255,.55)"); grd.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grd; g.fillRect(0, 0, w, w);
      g.fillStyle = "#fff"; g.beginPath();
      g.moveTo(12, 32); g.lineTo(30, 16); g.lineTo(30, 26); g.lineTo(52, 26); g.lineTo(52, 38); g.lineTo(30, 38); g.lineTo(30, 48); g.closePath(); g.fill();
    });
    var signals = {};
    var poleMat = mat(COL.pole, { roughness: 0.6 }), houseMat = mat(COL.housing, { roughness: 0.5 });
    var lampGeo = new T.CylinderGeometry(0.17, 0.17, 0.08, 14); lampGeo.rotateX(Math.PI / 2);
    Object.keys(APP).forEach(function (a) {
      var A = APP[a], g = new T.Group();
      var base = L2W(a, -9.6, 9.0);
      var pole = mesh(new T.CylinderGeometry(0.13, 0.17, 5.0, 10), poleMat); pole.position.set(base.x, 2.5, base.z); g.add(pole);
      var armMid = L2W(a, -9.6, 6.2);
      var arm = mesh(new T.BoxGeometry(0.15, 0.15, 5.7), poleMat); arm.position.set(armMid.x, 4.8, armMid.z);
      arm.rotation.y = yawTo(A.r[0], A.r[1]); g.add(arm);
      var hp = L2W(a, -9.6, 3.5);
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
      pickable(g, { type: "phase", ph: A.thru });
      signals[a] = { lamps: lamps, ball: ball, arrow: arr };
    });

    /* ---------- decoration builders ---------- */
    var unitBox = new T.BoxGeometry(1, 1, 1);
    var trunkGeo = new T.CylinderGeometry(0.16, 0.22, 1, 6);
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
        var b = mesh(blobGeo, mat(col, { flatShading: true })); b.scale.set(1.25 * s, 1.15 * s, 1.25 * s); b.position.y = 1.85 * s; g.add(b);
        if (Math.random() < 0.5) { var b2 = mesh(blobGeo, mat(col, { flatShading: true })); b2.scale.setScalar(0.75 * s); b2.position.set(0.7 * s, 1.5 * s, 0.3 * s); g.add(b2); }
      }
      scene.add(g);
    }
    function bush(x, z, s) {
      if (!free(x, z, 0.8 * s)) return; claim(x, z, 0.8 * s);
      var b = mesh(blobGeo, mat(COL.leaf[Math.floor(Math.random() * 4)], { flatShading: true }));
      b.scale.set(0.75 * s, 0.55 * s, 0.75 * s); b.position.set(x, 0.4 * s, z); scene.add(b);
    }
    function hut(x, z, o) {
      var w = o.w || 3.2, d = o.d || 3.2, h = o.h || 2.2;
      claim(x, z, Math.max(w, d) * 0.8);
      var g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = o.rot || 0;
      var walls = mesh(unitBox, mat(o.wall)); walls.scale.set(w, h, d); walls.position.y = h / 2; g.add(walls);
      var side = Math.max(w, d) + 0.7;                 // square pyramid, then stretched to the footprint
      var cone = mesh(new T.ConeGeometry(side / Math.SQRT2, h * 0.8, 4), mat(o.roof, { flatShading: true }));
      cone.rotation.y = Math.PI / 4;
      var roof = new T.Group(); roof.add(cone); roof.position.y = h + h * 0.4;
      roof.scale.set((w + 0.7) / side, 1, (d + 0.7) / side);
      g.add(roof);
      var door = mesh(unitBox, mat(0x6B4F3A)); door.scale.set(0.7, 1.25, 0.08); door.position.set(0, 0.62, d / 2 + 0.02); g.add(door);
      [-1, 1].forEach(function (k) { var wdw = mesh(unitBox, mat(0xBFE0EE, { roughness: 0.3 })); wdw.scale.set(0.55, 0.5, 0.06); wdw.position.set(k * w * 0.3, h * 0.62, d / 2 + 0.02); g.add(wdw); });
      scene.add(g);
      return g;
    }
    function bench(x, z, rot) {
      var g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = rot || 0;
      var seat = mesh(unitBox, mat(0x9C6B45)); seat.scale.set(1.8, 0.12, 0.5); seat.position.y = 0.48; g.add(seat);
      var back = mesh(unitBox, mat(0x9C6B45)); back.scale.set(1.8, 0.45, 0.1); back.position.set(0, 0.8, -0.22); g.add(back);
      [-0.75, 0.75].forEach(function (k) { var l = mesh(unitBox, mat(0x4A524E)); l.scale.set(0.1, 0.48, 0.45); l.position.set(k, 0.24, 0); g.add(l); });
      scene.add(g); claim(x, z, 1.2);
    }
    function lampPost(x, z) {
      var g = new T.Group(); g.position.set(x, 0, z);
      var p = mesh(new T.CylinderGeometry(0.07, 0.09, 3.6, 8), poleMat); p.position.y = 1.8; g.add(p);
      var hd = mesh(unitBox, mat(0xF7F2D8, { emissive: 0x3a3520 })); hd.scale.set(0.45, 0.18, 0.45); hd.position.y = 3.65; g.add(hd);
      scene.add(g);
    }
    function flowers(cx, cz, n, spread) {
      var geo = new T.IcosahedronGeometry(0.13, 0), cols = [0xF2A0B6, 0xF7D154, 0xFFFFFF, 0xE97C5A, 0xB89BE8];
      var im = new T.InstancedMesh(geo, new T.MeshStandardMaterial({ roughness: 0.8 }), n);
      var c = new T.Color();
      for (var k = 0; k < n; k++) {
        var fx = cx + (Math.random() * 2 - 1) * spread, fz = cz + (Math.random() * 2 - 1) * spread * 0.7;
        M4.makeTranslation(fx, 0.14, fz); im.setMatrixAt(k, M4);
        im.setColorAt(k, c.setHex(cols[k % cols.length]));
      }
      scene.add(im);
    }

    /* ---------- SE: bus stop + parked bus (starts the tour) ---------- */
    (function () {
      var g = new T.Group();
      var shelterGlass = new T.MeshStandardMaterial({ color: 0xBFE3F0, transparent: true, opacity: 0.55, roughness: 0.15 });
      var back = mesh(unitBox, shelterGlass); back.scale.set(4, 2.2, 0.1); back.position.set(19, 1.1, 12.6); g.add(back);
      [-1, 1].forEach(function (k) { var side = mesh(unitBox, shelterGlass); side.scale.set(0.1, 2.2, 1.6); side.position.set(19 + k * 2, 1.1, 11.85); g.add(side); });
      var roof = mesh(unitBox, mat(0x0B6A4C)); roof.scale.set(4.5, 0.16, 2.0); roof.position.set(19, 2.3, 11.85); g.add(roof);
      var seat = mesh(unitBox, mat(0x9C6B45)); seat.scale.set(2.6, 0.12, 0.5); seat.position.set(19, 0.5, 12.25); g.add(seat);
      var sp = mesh(new T.CylinderGeometry(0.06, 0.06, 2.8, 8), poleMat); sp.position.set(24.4, 1.4, 10.0); g.add(sp);
      var signTex = canvasTex(128, 128, function (c, w) {
        c.fillStyle = "#0B6A4C"; c.fillRect(0, 0, w, w); c.fillStyle = "#fff"; c.font = "bold 46px Arial, sans-serif";
        c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("BUS", w / 2, w / 2 + 2);
      });
      var sign = new T.Mesh(new T.BoxGeometry(0.9, 0.9, 0.08), [mat(0x0B6A4C), mat(0x0B6A4C), mat(0x0B6A4C), mat(0x0B6A4C),
        new T.MeshStandardMaterial({ map: signTex }), new T.MeshStandardMaterial({ map: signTex })]);
      sign.position.set(24.4, 2.85, 10.0); sign.castShadow = true; g.add(sign);
      // the bus, Mini Motorways style: one rounded body, a window band, a light roof
      var bus = new T.Group(); bus.position.set(19, 0, 7.2); bus.rotation.y = Math.PI / 2;
      var body = mesh(window.Traffic.roundedBlock(2.1, 6.6, 1.55, 0.45), mat(0xF2B134, { roughness: 0.55 })); body.position.y = 0.32; bus.add(body);
      var band = mesh(window.Traffic.roundedBlock(2.16, 6.2, 0.55, 0.42), mat(0x2E3B42, { roughness: 0.3 })); band.position.y = 1.18; bus.add(band);
      var top = mesh(window.Traffic.roundedBlock(1.9, 6.1, 0.12, 0.4), mat(0xFFF6DE)); top.position.y = 2.08; bus.add(top);
      g.add(bus);
      scene.add(g);
      claim(19, 12, 3);
      pickable(g, { type: "link", href: "tour.html" });
      anchors.push({ kind: "obj", text: "Bus stop · Tour", short: "Tour", arrow: "▸", x: 21.5, y: 3.6, z: 10.5, action: g.userData.action });
    })();

    /* ---------- SW: metro entrance (opens the map) ---------- */
    (function () {
      var g = new T.Group(), cx = -17, cz = 14;
      var hole = flat(2.8, 4.2, 0x2A3330, 0.03); hole.position.set(cx, 0.03, cz); g.add(hole);
      for (var k = 0; k < 6; k++) { var st = flat(2.6, 0.18, 0x56625C, 0.035); st.position.set(cx, 0.035, cz - 1.7 + k * 0.62); g.add(st); }
      var wallM = mat(0xC9CEC8);
      var lw = mesh(unitBox, wallM); lw.scale.set(0.2, 0.9, 4.4); lw.position.set(cx - 1.5, 0.45, cz); g.add(lw);
      var rw = mesh(unitBox, wallM); rw.scale.set(0.2, 0.9, 4.4); rw.position.set(cx + 1.5, 0.45, cz); g.add(rw);
      var bw = mesh(unitBox, wallM); bw.scale.set(3.2, 0.9, 0.2); bw.position.set(cx, 0.45, cz + 2.2); g.add(bw);
      var tp = mesh(new T.CylinderGeometry(0.08, 0.08, 3.0, 8), poleMat); tp.position.set(cx - 2.4, 1.5, cz - 2.2); g.add(tp);
      var mTex = canvasTex(128, 128, function (c, w) {
        c.fillStyle = "#ffffff"; c.fillRect(0, 0, w, w);
        c.fillStyle = "#2a78d6"; c.beginPath(); c.arc(w / 2, w / 2, 52, 0, Math.PI * 2); c.fill();
        c.fillStyle = "#fff"; c.font = "bold 66px Arial, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("M", w / 2, w / 2 + 4);
      });
      var mm = new T.MeshStandardMaterial({ map: mTex });
      var cube = new T.Mesh(new T.BoxGeometry(1.0, 1.0, 1.0), mm); cube.position.set(cx - 2.4, 3.4, cz - 2.2); cube.castShadow = true; g.add(cube);
      scene.add(g); claim(cx, cz, 3.2); claim(cx - 2.4, cz - 2.2, 1);
      pickable(g, { type: "link", href: "map.html" });
      anchors.push({ kind: "obj", text: "Metro · Map", short: "Map", arrow: "▸", x: cx - 2.4, y: 4.4, z: cz - 2.2, action: g.userData.action });
    })();

    /* ---------- SE corner: pedestrian push button (contact) ---------- */
    (function () {
      var g = new T.Group(), x = 10.9, z = 9.3;
      var p = mesh(new T.CylinderGeometry(0.07, 0.08, 1.7, 8), poleMat); p.position.set(x, 0.85, z); g.add(p);
      var box = mesh(unitBox, mat(0xF4B400, { roughness: 0.5 })); box.scale.set(0.5, 0.7, 0.3); box.position.set(x, 1.35, z - 0.12); g.add(box);
      var btn = mesh(new T.CylinderGeometry(0.13, 0.13, 0.08, 16), mat(0x17201C)); btn.rotation.x = Math.PI / 2; btn.position.set(x, 1.3, z - 0.3); g.add(btn);
      scene.add(g); claim(x, z, 0.8);
      pickable(g, { type: "contact" });
      anchors.push({ kind: "obj push", text: "Push for contact", short: "Contact", x: x, y: 2.3, z: z, action: g.userData.action });
    })();

    /* ---------- NW corner: controller cabinet (pre-timed tour) ---------- */
    (function () {
      var g = new T.Group(), x = -12.2, z = -10.6;
      var cab = mesh(unitBox, mat(0xB9C0BB, { roughness: 0.5 })); cab.scale.set(1.0, 1.6, 0.7); cab.position.set(x, 0.8, z); g.add(cab);
      var door = mesh(unitBox, mat(0xA3ABA6)); door.scale.set(0.8, 1.3, 0.05); door.position.set(x, 0.8, z + 0.37); g.add(door);
      var pad = mesh(unitBox, mat(0xA9A59A)); pad.scale.set(1.4, 0.1, 1.1); pad.position.set(x, 0.05, z); g.add(pad);
      scene.add(g); claim(x, z, 1.2);
      pickable(g, { type: "auto" });
      anchors.push({ kind: "obj", text: "Cabinet · Auto tour", short: "Auto tour", x: x, y: 2.3, z: z, action: g.userData.action });
    })();

    /* ---------- NE: the ITS Lab (opens research) + pond ---------- */
    (function () {
      var g = new T.Group(), x = 20, z = -17;
      var walls = mesh(unitBox, mat(0xF6F4EE)); walls.scale.set(8.5, 3.2, 6); walls.position.set(x, 1.6, z); g.add(walls);
      var roof = mesh(unitBox, mat(0x4F7FBF)); roof.scale.set(9.0, 0.3, 6.5); roof.position.set(x, 3.35, z); g.add(roof);
      var band = mesh(unitBox, mat(0x9CCBE0, { roughness: 0.25 })); band.scale.set(7.6, 0.8, 0.06); band.position.set(x, 2.0, z + 3.02); g.add(band);
      var door = mesh(unitBox, mat(0x2E3B42)); door.scale.set(1.2, 1.5, 0.06); door.position.set(x - 2.5, 0.75, z + 3.03); g.add(door);
      var dishPole = mesh(new T.CylinderGeometry(0.08, 0.08, 1.2, 8), poleMat); dishPole.position.set(x + 2.6, 4.1, z - 1); g.add(dishPole);
      var dish = mesh(new T.CylinderGeometry(0.95, 0.15, 0.45, 18), mat(0xEDEFF0)); dish.position.set(x + 2.6, 4.85, z - 1); dish.rotation.z = 0.55; g.add(dish);
      var ant = mesh(new T.CylinderGeometry(0.04, 0.04, 2.2, 6), poleMat); ant.position.set(x - 3, 4.5, z - 2); g.add(ant);
      scene.add(g); claim(x, z, 5.6);
      pickable(g, { type: "phase", ph: 2 });
      anchors.push({ kind: "obj", text: "ITS Lab · Research", short: "ITS Lab", x: x, y: 5.6, z: z, action: g.userData.action });
      var pond = new T.Mesh(new T.CircleGeometry(1, 32), mat(0x9FCFE2, { roughness: 0.2 }));
      pond.rotation.x = -Math.PI / 2; pond.scale.set(4.2, 2.8, 1); pond.position.set(31, 0.02, -11.5); pond.receiveShadow = true; scene.add(pond);
      var rim = new T.Mesh(new T.RingGeometry(1, 1.12, 32), mat(0xE6F1E2)); rim.rotation.x = -Math.PI / 2; rim.scale.set(4.2, 2.8, 1); rim.position.set(31, 0.025, -11.5); scene.add(rim);
      claim(31, -11.5, 4.6);
    })();

    /* ---------- huts, benches, lamps, trees, bushes, flowers ---------- */
    hut(-19, -16, { wall: 0xF6E7B8, roof: 0xD9843E, rot: 0.1 });
    hut(-27, -21, { wall: 0xF4F1EA, roof: 0x5E8FCB, w: 3.6, d: 3.0, rot: -0.2 });
    hut(-15, -25, { wall: 0xF1C9B5, roof: 0xB8574A, w: 2.6, d: 2.6, h: 1.9, rot: 0.3 });
    hut(-26, 13, { wall: 0xE9F0F6, roof: 0x3E8A6A, rot: -0.15 });
    hut(-22, 22, { wall: 0xF6E7B8, roof: 0xB8574A, w: 2.8, d: 2.8, rot: 0.25 });
    hut(30, 15, { wall: 0xF1C9B5, roof: 0x5E8FCB, w: 3.4, d: 3.0, rot: 0.15 });
    hut(25, 23, { wall: 0xF4F1EA, roof: 0xD9843E, w: 2.8, d: 2.8, h: 2.0, rot: -0.3 });
    hut(34, -22, { wall: 0xF6E7B8, roof: 0x3E8A6A, w: 3.0, d: 3.0, rot: 0.2 });
    hut(-36, 6.5 + 14, { wall: 0xE9F0F6, roof: 0xD9843E, w: 3.0, d: 3.0, rot: 0.4 });
    hut(40, 12, { wall: 0xF6E7B8, roof: 0xB8574A, w: 2.6, d: 2.6, rot: 0.1 });
    bench(-13.2, 10.6, 0); bench(14.5, -10.7, Math.PI);
    [[-14, 9.6], [-30, 9.6], [30, 9.6], [-14, -9.6], [28, -9.6], [9.6, 30], [-9.6, 26], [9.6, -28], [-9.6, -30]].forEach(function (p) { lampPost(p[0], p[1]); });
    flowers(-20, 18, 26, 2.6); flowers(-22, -12.5, 22, 2.2); flowers(26, 19, 22, 2.4); flowers(15, -24, 18, 2);
    var spots = [
      [-12, 18, 1.0], [-14.5, 22, 1.2, 1], [-30, 18, 1.1], [-33, 12, 1.0, 1], [-11.5, 28, 1.1], [-18, 28, 1.0],
      [13, 18, 1.1], [16.5, 22, 1.0, 1], [21, 18.5, 0.9], [33, 20, 1.2], [36, 27, 1.0, 1], [14, 28, 1.1], [29, 30, 1.0],
      [-12.5, -14.5, 1.0], [-11.8, -20, 1.1, 1], [-23, -12, 1.0], [-32, -14, 1.2, 1], [-21.5, -27, 1.0], [-30, -28, 1.1],
      [12.5, -13, 1.0, 1], [12, -22, 1.1], [27, -24, 1.0], [38, -15, 1.1, 1], [13.5, -28, 1.0], [24, -29, 1.2, 1], [40, -28, 1.0],
      [-40, -10, 1.2, 1], [-44, 14, 1.1], [44, 22, 1.2], [45, -9, 1.0, 1], [-38, 30, 1.2], [38, 36, 1.1, 1], [-24, 36, 1.0], [22, 38, 1.1]
    ];
    spots.forEach(function (s) { tree(s[0], s[1], s[2], !!s[3]); });
    for (var k = 0; k < 90; k++) {                    // fill the outskirts
      var tx = (Math.random() * 2 - 1) * 75, tz = (Math.random() * 2 - 1) * 60;
      if (Math.abs(tx) < 30 && Math.abs(tz) < 26) continue;
      tree(tx, tz, 0.9 + Math.random() * 0.5, Math.random() < 0.35);
    }
    [[-16.5, 18.5], [-24, 9.8], [17, 15.5], [27, 12], [-17, -12], [-24, -25], [26, -14.5], [16, -13]].forEach(function (b) { bush(b[0], b[1], 1 + Math.random() * 0.5); });

    /* street-name labels sit over each road */
    Object.keys(APP).forEach(function (a) {
      var A = APP[a], dist = a === "S" ? 18 : a === "N" ? 21 : 23, p = L2W(a, -dist, 0);
      anchors.push({ kind: "street", a: a, ph: A.thru, text: A.street, x: p.x, y: 0.6, z: p.z, action: { type: "phase", ph: A.thru } });
    });

    return { picks: picks, anchors: anchors, signals: signals };
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
    var ball = st === "g" ? "g" : st === "y" ? "y" : "r";
    sig.ball.material.color.setHex(LAMP[ball]);
    sig.arrow.visible = st === "ga" || st === "ya";
    if (sig.arrow.visible) sig.arrow.material.color.setHex(LAMP[st === "ga" ? "g" : "y"]);
  }

  return { APP: APP, L2W: L2W, yawTo: yawTo, LEG: LEG, HALF: HALF, COL: COL, build: build, setSignal: setSignal };
})();
