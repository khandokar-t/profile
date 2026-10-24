/* Traffic: Mini Motorways-style cars and a small car-following simulation, plus the people.
   Each approach has three lanes in: left turn only, through only and right turn only.
   Cars follow the car ahead (Intelligent Driver Model), stop at the stop bar on red, decide
   at yellow whether they can stop, and on green drive all the way through and away.
   People pop up in place and only move a little: no walking, so the scene stays calm. */
window.Traffic = (function () {
  "use strict";
  var T = THREE;

  /* ---------- rounded geometry ---------- */
  function roundedRectShape(w, l, r) {
    var s = new T.Shape(), x = -w / 2, y = -l / 2;
    r = Math.min(r, w / 2, l / 2);
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + l - r); s.quadraticCurveTo(x + w, y + l, x + w - r, y + l);
    s.lineTo(x + r, y + l); s.quadraticCurveTo(x, y + l, x, y + l - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  // A soft block: rounded footprint w (x) by l (z), height h, base at y = 0.
  function roundedBlock(w, l, h, r) {
    var bev = Math.min(0.12, h * 0.25);
    var g = new T.ExtrudeGeometry(roundedRectShape(w - 2 * bev, l - 2 * bev, Math.max(0.02, r - bev)), {
      depth: Math.max(0.01, h - 2 * bev), bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 6
    });
    g.rotateX(-Math.PI / 2);
    g.translate(0, bev, 0);
    return g;
  }

  /* ---------- car model ---------- */
  var CAR_LEN = 2.7;
  var GEO = null, MATS = {}, BRAKE_ON = null, BRAKE_OFF = null;
  var PALETTE = [0xE5533D, 0x3A86D6, 0xF2B134, 0x3DAA6D, 0x8E6BD8, 0xF07FA6, 0x2EB5B0, 0xF4F1EA, 0x56616B];
  function initModels() {
    if (GEO) return;
    GEO = {
      body: roundedBlock(1.42, CAR_LEN, 0.6, 0.42),
      cabin: roundedBlock(1.16, 1.42, 0.44, 0.32),
      brake: new T.BoxGeometry(1.0, 0.1, 0.06)
    };
    BRAKE_ON = new T.MeshStandardMaterial({ color: 0xff3b2f, emissive: 0xff2a1a, emissiveIntensity: 1 });
    BRAKE_OFF = new T.MeshStandardMaterial({ color: 0x7a2a24, roughness: 0.6 });
  }
  function materials(hex) {
    if (!MATS[hex]) {
      var top = new T.Color(hex).lerp(new T.Color(0xffffff), 0.5);
      if (hex === 0xF4F1EA) top = new T.Color(0xC9D6DD);
      MATS[hex] = {
        body: new T.MeshStandardMaterial({ color: hex, roughness: 0.55 }),
        cabin: new T.MeshStandardMaterial({ color: top, roughness: 0.35 })
      };
    }
    return MATS[hex];
  }
  function makeCar(hex) {
    initModels();
    var m = materials(hex), g = new T.Group();
    var body = new T.Mesh(GEO.body, m.body); body.position.y = 0.14; body.castShadow = true; body.receiveShadow = true; g.add(body);
    var cab = new T.Mesh(GEO.cabin, m.cabin); cab.position.set(0, 0.7, -0.12); cab.castShadow = true; g.add(cab);
    var br = new T.Mesh(GEO.brake, BRAKE_OFF); br.position.set(0, 0.52, -CAR_LEN / 2 - 0.01); g.add(br);
    g.userData.brake = br;
    return g;
  }

  /* ---------- paths, in an approach's local frame (s along travel, t to the right) ----------
     Lanes in: left turn t = 0, through t = 3, right turn t = 6. Lanes out: t = 3 and 6 on the far
     leg (through), the outer lane of the cross street (right turn), its inner lane (left turn). */
  var SPAWN = -80, OUT = 80;
  var STOP_S = -10.75, BOX_S = -9.9;           // front bumper waits at STOP_S (stop bar at s = -10.5); the box starts at BOX_S
  function line(s0, t0, s1, t1) { return { k: "L", s0: s0, t0: t0, s1: s1, t1: t1, len: Math.hypot(s1 - s0, t1 - t0) }; }
  function arc(cs, ct, r, a0, a1) { return { k: "A", cs: cs, ct: ct, r: r, a0: a0, a1: a1, len: Math.abs(a1 - a0) * r }; }
  function mkPath(segs, arcSpeed) {
    var total = 0, arcStart = 0, arcEnd = 0;
    segs.forEach(function (sg) { if (sg.k === "A") { arcStart = total; arcEnd = total + sg.len; } total += sg.len; });
    return { segs: segs, len: total, arcStart: arcStart, arcEnd: arcEnd, arcSpeed: arcSpeed };
  }
  var PATHS = {
    thru: mkPath([line(SPAWN, 3, OUT, 3)], 0),
    right: mkPath([line(SPAWN, 6, -10.2, 6), arc(-10.2, 10.2, 4.2, -Math.PI / 2, 0), line(-6, 10.2, -6, OUT)], 4.6),
    left: mkPath([line(SPAWN, 0, -8, 0), arc(-8, -11, 11, Math.PI / 2, 0), line(3, -11, 3, -OUT)], 6.5)
  };
  var STOP_D = STOP_S - SPAWN;                 // distance along the path where the front waits
  var ENTRY_D = BOX_S - SPAWN;                 // the front enters the box
  var EXIT_D = {                               // the rear has left the box
    thru: -BOX_S - SPAWN + CAR_LEN,
    right: PATHS.right.arcEnd + CAR_LEN,
    left: PATHS.left.arcEnd + CAR_LEN
  };

  function evalPath(path, d) {
    var segs = path.segs;
    for (var i = 0; i < segs.length; i++) {
      var sg = segs[i];
      if (d <= sg.len || i === segs.length - 1) {
        var f = Math.max(0, Math.min(1, d / sg.len));
        if (sg.k === "L") {
          return { s: sg.s0 + (sg.s1 - sg.s0) * f, t: sg.t0 + (sg.t1 - sg.t0) * f, ds: (sg.s1 - sg.s0) / sg.len, dt: (sg.t1 - sg.t0) / sg.len };
        }
        var a = sg.a0 + (sg.a1 - sg.a0) * f, sgn = sg.a1 > sg.a0 ? 1 : -1;
        return { s: sg.cs + sg.r * Math.cos(a), t: sg.ct + sg.r * Math.sin(a), ds: -Math.sin(a) * sgn, dt: Math.cos(a) * sgn };
      }
      d -= sg.len;
    }
  }

  /* ---------- simulation ---------- */
  var V0 = 10, ACC = 4.5, DEC = 6, HEAD = 0.85, GAP = 1.5;
  function idm(v, gap, dv, v0, s0) {
    var sStar = s0 + Math.max(0, v * HEAD + v * dv / (2 * Math.sqrt(ACC * DEC)));
    return ACC * (1 - Math.pow(v / v0, 4) - Math.pow(sStar / Math.max(gap, 0.05), 2));
  }
  function expRand(mean, min) { return Math.max(min, -Math.log(1 - Math.random()) * mean); }

  function Sim(scene, World, Signal) {
    initModels();
    this.scene = scene; this.W = World; this.Sig = Signal;
    this.time = 0; this.lanes = [];
    var self = this;
    Object.keys(World.APP).forEach(function (a) {
      self.lanes.push({ a: a, kind: "left",  stage: World.stageOf(a, "left"), cars: [], next: 0, mean: 6.5, maxQ: 3, start: 1 });
      self.lanes.push({ a: a, kind: "thru",  stage: World.stageOf(a, "thru"), cars: [], next: 0, mean: 3.2, maxQ: 6, start: 3 });
      self.lanes.push({ a: a, kind: "right", stage: World.stageOf(a, "thru"), cars: [], next: 0, mean: 7.0, maxQ: 3, start: 1 });
    });
    this.enabled = false;
  }

  // Cars drive in from the edges and line up at the (red) stop bars.
  Sim.prototype.enable = function (instant) {
    if (this.enabled) return;
    this.enabled = true;
    var self = this;
    this.lanes.forEach(function (ln) {
      for (var k = 0; k < ln.start; k++) {
        if (instant) self.spawn(ln, STOP_D - 0.3 - k * (CAR_LEN + 1.9), 0);
        else self.spawn(ln, 36 - k * 13 - Math.random() * 4, V0 * 0.95);
      }
      ln.cars.sort(function (x, y) { return y.d - x.d; });
      ln.next = self.time + 2 + Math.random() * 3;
    });
  };
  Sim.prototype.disable = function () {
    if (!this.enabled) return;
    this.enabled = false;
    var self = this;
    this.lanes.forEach(function (ln) { ln.cars.forEach(function (c) { self.scene.remove(c.mesh); }); ln.cars = []; });
  };

  Sim.prototype.spawn = function (lane, d, v) {
    var mesh = makeCar(PALETTE[Math.floor(Math.random() * PALETTE.length)]);
    var car = { a: lane.a, lane: lane, move: lane.kind, path: PATHS[lane.kind], d: d, v: v, mesh: mesh, goYellow: false, braking: false };
    this.scene.add(mesh);
    lane.cars.push(car);
    this.place(car);
    return car;
  };

  Sim.prototype.place = function (car) {
    var p = evalPath(car.path, car.d), A = this.W.APP[car.a];
    var x = p.s * A.d[0] + p.t * A.r[0], z = p.s * A.d[1] + p.t * A.r[1];
    var dx = p.ds * A.d[0] + p.dt * A.r[0], dz = p.ds * A.d[1] + p.dt * A.r[1];
    // car.d is the front bumper; the model is centred, so step back half a length
    car.mesh.position.set(x - dx * CAR_LEN / 2, 0, z - dz * CAR_LEN / 2);
    car.mesh.rotation.y = Math.atan2(dx, dz);
  };

  Sim.prototype.signalFor = function (car) {
    var st = this.Sig.state;
    if (st.stage !== car.lane.stage || st.status === "allred") return "red";
    return st.status;                                  // 'green' or 'yellow'
  };

  // Don't enter while a car from another stage is still clearing the box.
  Sim.prototype.boxBusy = function (car) {
    for (var i = 0; i < this.lanes.length; i++) {
      var ln = this.lanes[i]; if (ln.stage === car.lane.stage) continue;
      for (var j = 0; j < ln.cars.length; j++) {
        var c = ln.cars[j];
        if (c.d > ENTRY_D - 0.5 && c.d < EXIT_D[c.move]) return true;
      }
    }
    return false;
  };

  Sim.prototype.step = function (dt) {
    this.time += dt;
    if (!this.enabled) return;
    var self = this;
    this.lanes.forEach(function (ln) {
      var cars = ln.cars;
      for (var i = 0; i < cars.length; i++) {
        var c = cars[i], v0 = V0;
        // slow down for the turn
        if (c.path.arcSpeed) {
          var toArc = c.path.arcStart - c.d;
          if (c.d < c.path.arcEnd) v0 = Math.min(V0, c.path.arcSpeed + Math.max(0, toArc) * 0.45);
        }
        var acc = ACC * (1 - Math.pow(c.v / v0, 4));
        if (i > 0) { var L = cars[i - 1]; acc = Math.min(acc, idm(c.v, L.d - CAR_LEN - c.d, c.v - L.v, v0, GAP)); }
        // the stop bar, until the car has crossed it
        if (c.d < STOP_D + 0.05) {
          var sig = self.signalFor(c), go = false, dist = STOP_D - c.d;
          if (sig === "green") { go = !self.boxBusy(c); c.goYellow = false; }
          else if (sig === "yellow") {
            if (!c.goYellow && c.v * c.v / (2 * 5) > dist - 0.4 && c.v > 2) c.goYellow = true;
            go = c.goYellow;
          } else c.goYellow = false;
          if (!go) acc = Math.min(acc, idm(c.v, dist + 0.25, c.v, v0, 0.25));
        }
        acc = Math.max(-DEC * 2.2, Math.min(ACC, acc));
        c.v = Math.max(0, c.v + acc * dt);
        c.d += c.v * dt;
        var braking = acc < -0.8 || c.v < 0.3;
        if (braking !== c.braking) { c.braking = braking; c.mesh.userData.brake.material = braking ? BRAKE_ON : BRAKE_OFF; }
        self.place(c);
      }
      // leave the map
      for (var k = cars.length - 1; k >= 0; k--) {
        if (cars[k].d >= cars[k].path.len) { self.scene.remove(cars[k].mesh); cars.splice(k, 1); }
      }
      // new arrivals
      if (self.time >= ln.next) {
        var queued = 0; cars.forEach(function (c) { if (c.d < STOP_D + 0.05) queued++; });
        var last = cars[cars.length - 1];
        if (queued < ln.maxQ && (!last || last.d > CAR_LEN + 3)) {
          self.spawn(ln, 0, V0 * 0.9);
          ln.next = self.time + expRand(ln.mean, 1.3);
        } else {
          ln.next = self.time + 0.5;
        }
      }
    });
  };

  /* ---------- people: they pop up where they stand, then only move in place ---------- */
  function clamp01(x) { return Math.max(0, Math.min(1, x)); }
  function back(x) { var c = 1.7; return x <= 0 ? 0 : 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }
  function Peds(scene, spots) {
    var cols = [0xE5533D, 0x3A86D6, 0xF2B134, 0x3DAA6D, 0x8E6BD8, 0x2EB5B0, 0x56616B, 0xF07FA6];
    var skin = [0x8D5A3B, 0xC68B5E, 0xE0B48A, 0x6B4630];
    var bodyGeo = new T.CylinderGeometry(0.26, 0.32, 0.9, 12), headGeo = new T.SphereGeometry(0.22, 14, 12);
    var armGeo = new T.CylinderGeometry(0.075, 0.065, 0.52, 8); armGeo.translate(0, -0.26, 0);   // pivots at the shoulder
    var self = this;
    this.people = []; this.time = 0;
    spots.slice().sort(function (p, q) { return Math.hypot(p.x, p.z) - Math.hypot(q.x, q.z); }).forEach(function (sp, k) {
      var shirt = new T.MeshStandardMaterial({ color: cols[k % cols.length], roughness: 0.7 });
      var g = new T.Group(), inner = new T.Group(), headG = new T.Group();
      g.position.set(sp.x, 0.16, sp.z); g.rotation.y = sp.rot || 0; g.add(inner);
      var b = new T.Mesh(bodyGeo, shirt); b.position.y = 0.45; b.castShadow = true; inner.add(b);
      var h = new T.Mesh(headGeo, new T.MeshStandardMaterial({ color: skin[k % skin.length], roughness: 0.7 }));
      h.castShadow = true; headG.add(h); headG.position.y = 1.12; inner.add(headG);
      var armL = new T.Mesh(armGeo, shirt), armR = new T.Mesh(armGeo, shirt);
      armL.position.set(-0.31, 0.84, 0); armR.position.set(0.31, 0.84, 0);
      armL.rotation.z = -0.1; armR.rotation.z = 0.1; armL.castShadow = armR.castShadow = true;
      inner.add(armL); inner.add(armR);
      g.visible = false; g.scale.setScalar(0.001); scene.add(g);
      self.people.push({ g: g, inner: inner, head: headG, armL: armL, armR: armR, pose: sp.pose, ph: Math.random() * 10, f: 0 });
    });
  }
  // The intro drives this: p = 0 hides everyone, p = 1 shows everyone; in between they pop up one by one.
  Peds.prototype.reveal = function (p) {
    var n = this.people.length;
    this.people.forEach(function (q, i) {
      var f = back(clamp01((p - (i / n) * 0.6) / 0.4));
      q.f = f; q.g.visible = f > 0.001; q.g.scale.setScalar(Math.max(0.001, f));
    });
  };
  // Small movements in place: breathing, a gentle sway, looking around, the odd gesture or wave.
  Peds.prototype.step = function (dt) {
    var t = (this.time += dt);
    this.people.forEach(function (q) {
      if (!q.g.visible) return;
      var u = t + q.ph;
      q.inner.position.y = 0.012 * Math.sin(u * 2.1);
      q.inner.rotation.z = 0.03 * Math.sin(u * 1.2);
      q.head.rotation.y = 0.5 * Math.sin(u * 0.45);
      var swing = 0.08 * Math.sin(u * 1.2);
      q.armL.rotation.x = swing; q.armR.rotation.x = -swing;
      if (q.pose === "talk") {
        var gst = Math.max(0, Math.sin(u * 1.7));
        q.armR.rotation.x = -0.35 - 0.6 * gst;
        q.armR.rotation.z = 0.1 + 0.15 * gst;
      } else if (q.pose === "wave") {
        var w = (u % 9) < 2.6 ? Math.min(1, Math.min(u % 9, 2.6 - (u % 9)) * 3) : 0;   // wave for a moment, rest a while
        q.armR.rotation.z = 0.1 + w * (2.5 + 0.35 * Math.sin(u * 9));
        q.armR.rotation.x = -swing * (1 - w);
      }
    });
  };

  return { Sim: Sim, Peds: Peds, makeCar: makeCar, roundedBlock: roundedBlock, CAR_LEN: CAR_LEN };
})();
