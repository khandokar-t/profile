/* Traffic: Mini Motorways-style cars and a small car-following simulation.
   Each approach has a left-turn lane and a through/right lane. Cars follow the
   car ahead (Intelligent Driver Model), stop at the stop bar on red, decide at
   yellow whether they can stop, and on green drive all the way through and away. */
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

  /* ---------- paths, in an approach's local frame (s along travel, t to the right) ---------- */
  var SPAWN = -80, OUT = 80;
  function line(s0, t0, s1, t1) { return { k: "L", s0: s0, t0: t0, s1: s1, t1: t1, len: Math.hypot(s1 - s0, t1 - t0) }; }
  function arc(cs, ct, r, a0, a1) { return { k: "A", cs: cs, ct: ct, r: r, a0: a0, a1: a1, len: Math.abs(a1 - a0) * r }; }
  function mkPath(segs, arcSpeed) {
    var total = 0, arcStart = 0, arcEnd = 0;
    segs.forEach(function (sg) { if (sg.k === "A") { arcStart = total; arcEnd = total + sg.len; } total += sg.len; });
    return { segs: segs, len: total, arcStart: arcStart, arcEnd: arcEnd, arcSpeed: arcSpeed };
  }
  var PATHS = {
    thru: mkPath([line(SPAWN, 4.5, OUT, 4.5)], 0),
    right: mkPath([line(SPAWN, 4.5, -9, 4.5), arc(-9, 9, 4.5, -Math.PI / 2, 0), line(-4.5, 9, -4.5, OUT)], 4.6),
    left: mkPath([line(SPAWN, 1.5, -6, 1.5), arc(-6, -6, 7.5, Math.PI / 2, 0), line(1.5, -6, 1.5, -OUT)], 6.5)
  };
  var STOP_D = -9.25 - SPAWN;        // front bumper waits here (stop bar at s = -9)
  var ENTRY_D = -6 - SPAWN;          // front enters the box
  var SPLIT_D = -9 - SPAWN;          // right-turners leave the shared lane here
  function exitD(move) { return move === "thru" ? 6 - SPAWN + CAR_LEN : move === "right" ? PATHS.right.arcEnd + CAR_LEN : PATHS.left.arcEnd + CAR_LEN; }

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
      self.lanes.push({ a: a, kind: "thru", cars: [], next: Math.random() * 2, mean: 2.6, maxQ: 6 });
      self.lanes.push({ a: a, kind: "left", cars: [], next: 1 + Math.random() * 4, mean: 6.0, maxQ: 3 });
    });
    this.enabled = false;
  }

  // Cars drive in from the edges and line up at the (red) stop bars.
  Sim.prototype.enable = function (instant) {
    if (this.enabled) return;
    this.enabled = true;
    var self = this;
    this.lanes.forEach(function (ln) {
      var n = ln.kind === "thru" ? 3 : 1;
      for (var k = 0; k < n; k++) {
        if (instant) self.spawn(ln, STOP_D - 0.3 - k * (CAR_LEN + 1.9), 0);
        else self.spawn(ln, 36 - k * 13, V0 * 0.95);
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
    var move = lane.kind === "left" ? "left" : (Math.random() < 0.25 ? "right" : "thru");
    var mesh = makeCar(PALETTE[Math.floor(Math.random() * PALETTE.length)]);
    var car = { a: lane.a, lane: lane, move: move, path: PATHS[move], d: d, v: v, mesh: mesh, goYellow: false, braking: false };
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
    var st = this.Sig.state, A = this.W.APP[car.a];
    var need = car.move === "left" ? A.left : A.thru;
    if (st.phase !== need || st.status === "allred") return "red";
    return st.status;                                  // 'green' or 'yellow'
  };

  Sim.prototype.boxBusy = function (car) {
    for (var i = 0; i < this.lanes.length; i++) {
      var ln = this.lanes[i]; if (ln.a === car.a) continue;
      for (var j = 0; j < ln.cars.length; j++) {
        var c = ln.cars[j];
        if (c.d > ENTRY_D - 0.5 && c.d < exitD(c.move)) return true;
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
        // the car ahead that still shares this car's path
        for (var j = i - 1; j >= 0; j--) {
          var L = cars[j];
          if (L.move === c.move || (L.d < SPLIT_D + 0.5 && c.d < SPLIT_D + 0.5)) {
            acc = Math.min(acc, idm(c.v, L.d - CAR_LEN - c.d, c.v - L.v, v0, GAP));
            break;
          }
        }
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

  /* ---------- pedestrians strolling on the sidewalks (decoration) ---------- */
  function Peds(scene) {
    var cols = [0xE5533D, 0x3A86D6, 0xF2B134, 0x3DAA6D, 0x8E6BD8, 0x2EB5B0, 0x56616B, 0xF07FA6];
    var skin = [0x8D5A3B, 0xC68B5E, 0xE0B48A, 0x6B4630];
    var bodyGeo = new T.CylinderGeometry(0.26, 0.32, 0.9, 10), headGeo = new T.SphereGeometry(0.22, 12, 10);
    // [x0, z0, x1, z1] along the sidewalk strips (centre line 7.2 from the road centre)
    var routes = [[-40, -7.2, -11, -7.2], [11, -7.2, 44, -7.2], [-44, 7.2, -11, 7.2], [26, 7.2, 46, 7.2],
      [-7.2, -42, -7.2, -11], [7.2, -40, 7.2, -11], [-7.2, 11, -7.2, 38], [7.2, 12, 7.2, 40], [14, 9.6, 24, 9.6]];
    this.list = [];
    this.people = [];
    this.active = false;
    var self = this;
    function person(x, z, k) {
      var g = new T.Group();
      var b = new T.Mesh(bodyGeo, new T.MeshStandardMaterial({ color: cols[k % cols.length], roughness: 0.7 }));
      b.position.y = 0.45; b.castShadow = true; g.add(b);
      var h = new T.Mesh(headGeo, new T.MeshStandardMaterial({ color: skin[k % skin.length], roughness: 0.7 }));
      h.position.y = 1.12; h.castShadow = true; g.add(h);
      g.position.set(x, 0.16, z); g.visible = false; scene.add(g);
      self.people.push(g);
      return g;
    }
    routes.forEach(function (r, k) {
      var len = Math.hypot(r[2] - r[0], r[3] - r[1]);
      self.list.push({ r: r, len: len, u: Math.random() * len, dir: Math.random() < 0.5 ? 1 : -1, v: 1.1 + Math.random() * 0.5, g: person(r[0], r[1], k), ph: Math.random() * 6 });
    });
    // two people waiting at the bus stop, one by the metro
    person(18.2, 12.1, 3); person(20.1, 12.3, 6); person(-15.2, 11.4, 1);
  }
  // p = 0..1: people pop into view one after another
  Peds.prototype.reveal = function (p) {
    var n = this.people.length;
    this.people.forEach(function (g, i) {
      var f = Math.max(0, Math.min(1, p * 1.5 - i / n * 0.5));
      g.visible = f > 0.01; g.scale.setScalar(Math.max(0.001, f));
    });
    this.active = p > 0.99;
  };
  Peds.prototype.step = function (dt) {
    if (!this.active) return;
    this.list.forEach(function (p) {
      p.u += p.dir * p.v * dt;
      if (p.u > p.len) { p.u = p.len; p.dir = -1; } else if (p.u < 0) { p.u = 0; p.dir = 1; }
      var f = p.u / p.len, r = p.r;
      p.ph += dt * 9;
      p.g.position.set(r[0] + (r[2] - r[0]) * f, 0.16 + Math.abs(Math.sin(p.ph)) * 0.08, r[1] + (r[3] - r[1]) * f);
      p.g.rotation.y = Math.atan2((r[2] - r[0]) * p.dir, (r[3] - r[1]) * p.dir);
    });
  };

  return { Sim: Sim, Peds: Peds, makeCar: makeCar, roundedBlock: roundedBlock, CAR_LEN: CAR_LEN };
})();
