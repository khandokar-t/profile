/* A small orthographic globe drawn on a canvas, for the tour's first stop and the move to
   Michigan. Country shapes come from the world-atlas package (Natural Earth, 1:110m) on
   jsDelivr; without a connection the globe still shows the grid, the cities and the route. */
window.Globe = (function () {
  "use strict";
  var D2R = Math.PI / 180;
  var URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
  var dataP = null;

  // TopoJSON -> rings of [lon, lat]
  function decode(topo) {
    var tf = topo.transform;
    var arcs = topo.arcs.map(function (arc) {
      var x = 0, y = 0;
      return arc.map(function (p) { x += p[0]; y += p[1]; return [x * tf.scale[0] + tf.translate[0], y * tf.scale[1] + tf.translate[1]]; });
    });
    function ring(idx) {
      var out = [];
      idx.forEach(function (i, k) {
        var a = i < 0 ? arcs[~i].slice().reverse() : arcs[i];
        for (var j = k ? 1 : 0; j < a.length; j++) out.push(a[j]);
      });
      return out;
    }
    return topo.objects.countries.geometries.filter(function (g) { return g.id !== "010"; }).map(function (g) {   // no Antarctica
      var polys = g.type === "Polygon" ? [g.arcs] : g.type === "MultiPolygon" ? g.arcs : [];
      return { id: g.id, polys: polys.map(function (p) { return p.map(ring); }) };
    });
  }
  function load() {
    if (!dataP) {
      dataP = (window.fetch ? fetch(URL) : Promise.reject())
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(decode)
        .catch(function () { return null; });
    }
    return dataP;
  }

  function vec(lon, lat) { var a = lon * D2R, b = lat * D2R; return [Math.cos(b) * Math.cos(a), Math.cos(b) * Math.sin(a), Math.sin(b)]; }
  function lonlat(v) { return [Math.atan2(v[1], v[0]) / D2R, Math.atan2(v[2], Math.hypot(v[0], v[1])) / D2R]; }
  // a point a fraction f of the way along the great circle from A to B (both [lon, lat])
  function slerp(A, B, f) {
    var a = vec(A[0], A[1]), b = vec(B[0], B[1]);
    var om = Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
    if (om < 1e-6) return A.slice();
    var s1 = Math.sin((1 - f) * om) / Math.sin(om), s2 = Math.sin(f * om) / Math.sin(om);
    return lonlat([a[0] * s1 + b[0] * s2, a[1] * s1 + b[1] * s2, a[2] * s1 + b[2] * s2]);
  }

  function G(canvas) {
    this.c = canvas; this.ctx = canvas.getContext("2d");
    this.lon0 = 0; this.lat0 = 0; this.data = null;
    var self = this;
    load().then(function (d) { self.data = d; if (self.onload) self.onload(); });
  }
  G.prototype.size = function () {
    var r = this.c.getBoundingClientRect(), dpr = Math.min(2.5, window.devicePixelRatio || 1);
    var w = Math.max(10, Math.round(r.width * dpr)), h = Math.max(10, Math.round(r.height * dpr));
    if (this.c.width !== w || this.c.height !== h) { this.c.width = w; this.c.height = h; }
    this.w = w; this.h = h; this.dpr = dpr;
    this.R = Math.min(w, h) * 0.45; this.cx = w / 2; this.cy = h / 2;
  };
  G.prototype.view = function (lon, lat) { this.lon0 = lon; this.lat0 = lat; };
  // [screen x, screen y, cos c]; cos c < 0 means the point is on the far side
  G.prototype.p = function (lon, lat) {
    var l = (lon - this.lon0) * D2R, ph = lat * D2R, p0 = this.lat0 * D2R;
    var cl = Math.cos(l), cp = Math.cos(ph), sp = Math.sin(ph);
    var x = cp * Math.sin(l), y = Math.cos(p0) * sp - Math.sin(p0) * cp * cl;
    return [this.cx + x * this.R, this.cy - y * this.R, Math.sin(p0) * sp + Math.cos(p0) * cp * cl, x, y];
  };
  G.prototype.ringPath = function (ring) {          // far-side points slide to the rim, so fills stay closed
    var ctx = this.ctx, seen = false;
    for (var i = 0; i < ring.length; i++) {
      var q = this.p(ring[i][0], ring[i][1]), X = q[0], Y = q[1];
      if (q[2] < 0) { var m = Math.hypot(q[3], q[4]) || 1; X = this.cx + q[3] / m * this.R; Y = this.cy - q[4] / m * this.R; }
      else seen = true;
      if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
    }
    ctx.closePath();
    return seen;
  };
  G.prototype.line = function (pts, upTo) {         // a polyline of [lon, lat], only the near side
    var ctx = this.ctx, pen = false, n = Math.max(2, Math.min(pts.length, upTo || pts.length));
    ctx.beginPath();
    for (var i = 0; i < n; i++) {
      var q = this.p(pts[i][0], pts[i][1]);
      if (q[2] < 0) { pen = false; continue; }
      if (pen) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]);
      pen = true;
    }
    ctx.stroke();
  };
  /* o: { highlight: {id: color}, route: {from, to, f}, marks: [{lon, lat, label, pulse}], t } */
  G.prototype.draw = function (o) {
    o = o || {};
    this.size();
    var ctx = this.ctx, R = this.R, cx = this.cx, cy = this.cy, d = this.dpr, self = this;
    ctx.clearRect(0, 0, this.w, this.h);
    // halo and sea
    var halo = ctx.createRadialGradient(cx, cy, R * 0.96, cx, cy, R * 1.1);
    halo.addColorStop(0, "rgba(120,170,200,.28)"); halo.addColorStop(1, "rgba(120,170,200,0)");
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, R * 1.1, 0, Math.PI * 2); ctx.fill();
    var sea = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
    sea.addColorStop(0, "#E3F0F6"); sea.addColorStop(1, "#C3DCE8");
    ctx.fillStyle = sea; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    // graticule every 30°
    ctx.strokeStyle = "rgba(90,130,150,.22)"; ctx.lineWidth = 1 * d;
    var lat, lon, pts;
    for (lon = -180; lon < 180; lon += 30) { pts = []; for (lat = -90; lat <= 90; lat += 3) pts.push([lon, lat]); this.line(pts); }
    for (lat = -60; lat <= 60; lat += 30) { pts = []; for (lon = -180; lon <= 180; lon += 3) pts.push([lon, lat]); this.line(pts); }
    // countries
    if (this.data) {
      var hl = o.highlight || {};
      this.data.forEach(function (c) {
        c.polys.forEach(function (poly) {
          ctx.beginPath();
          var any = false;
          poly.forEach(function (ring) { if (self.ringPath(ring)) any = true; });
          if (!any) return;
          ctx.fillStyle = hl[c.id] || "#E9EFE1"; ctx.fill("evenodd");
          ctx.strokeStyle = "rgba(120,140,120,.45)"; ctx.lineWidth = 0.6 * d; ctx.stroke();
        });
      });
    }
    // rim
    ctx.strokeStyle = "rgba(60,90,100,.35)"; ctx.lineWidth = 1.2 * d; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    // route along the great circle
    if (o.route) {
      var r = o.route, N = 120, path = [];
      for (var i = 0; i <= N; i++) path.push(slerp(r.from, r.to, i / N));
      ctx.setLineDash([2 * d, 6 * d]); ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(23,32,28,.35)"; ctx.lineWidth = 2 * d; this.line(path);
      ctx.setLineDash([]);
      ctx.strokeStyle = "#0B6A4C"; ctx.lineWidth = 3 * d; this.line(path, Math.round(r.f * N) + 1);
      if (r.f > 0 && r.f < 1) {                       // the plane
        var a = this.p.apply(this, slerp(r.from, r.to, r.f)), b = this.p.apply(this, slerp(r.from, r.to, Math.min(1, r.f + 0.01)));
        if (a[2] > 0) {
          ctx.save(); ctx.translate(a[0], a[1]); ctx.rotate(Math.atan2(b[1] - a[1], b[0] - a[0])); ctx.scale(d * 1.15, d * 1.15);
          ctx.fillStyle = "#17201C"; ctx.beginPath();
          ctx.moveTo(13, 0); ctx.lineTo(2, -2); ctx.lineTo(-3, -11); ctx.lineTo(-7, -11); ctx.lineTo(-3, -2); ctx.lineTo(-10, -2); ctx.lineTo(-13, -6);
          ctx.lineTo(-15, -6); ctx.lineTo(-13, 0); ctx.lineTo(-15, 6); ctx.lineTo(-13, 6); ctx.lineTo(-10, 2); ctx.lineTo(-3, 2); ctx.lineTo(-7, 11); ctx.lineTo(-3, 11); ctx.lineTo(2, 2);
          ctx.closePath(); ctx.fill(); ctx.restore();
        }
      }
    }
    // city markers
    (o.marks || []).forEach(function (m) {
      var q = self.p(m.lon, m.lat);
      if (q[2] < 0.05) return;
      if (m.pulse) {
        var k = ((o.t || 0) % 1.6) / 1.6;
        ctx.strokeStyle = "rgba(11,106,76," + (1 - k).toFixed(3) + ")"; ctx.lineWidth = 2 * d;
        ctx.beginPath(); ctx.arc(q[0], q[1], (6 + k * 18) * d, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = "#17201C"; ctx.beginPath(); ctx.arc(q[0], q[1], 4.5 * d, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(q[0], q[1], 1.8 * d, 0, Math.PI * 2); ctx.fill();
      if (m.label) {
        ctx.font = "800 " + Math.round(12.5 * d) + "px Overpass, 'Arial Narrow', sans-serif";
        ctx.textAlign = m.align || "left"; ctx.textBaseline = "middle";
        var dx = (m.align === "right" ? -10 : m.align === "center" ? 0 : 10) * d, dy = (m.dy || 0) * d;
        ctx.lineWidth = 4 * d; ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.strokeText(m.label, q[0] + dx, q[1] + dy);
        ctx.fillStyle = "#17201C"; ctx.fillText(m.label, q[0] + dx, q[1] + dy);
      }
    });
  };

  return { create: function (canvas) { return new G(canvas); }, slerp: slerp, load: load };
})();
