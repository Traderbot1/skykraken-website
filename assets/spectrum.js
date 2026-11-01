/* SkyKraken — live RF spectrum analyser + waterfall (synthetic demonstration).
   One preset per product, chosen with data-spectrum="…":
     all  — home: 1.2, 2.4, 5.8 and 6.5 GHz overview
     rid  — Mobile / Horizon: DJI OcuSync and Remote ID (Wi-Fi + Bluetooth) on 2.4 and 5.8 GHz
     fpv  — SK-1: the four FPV bands 1.2 · 3.3 · 5.8 · 6.5 GHz, analog carriers
   It always runs (it is an instrument, not decoration) and can be paused. */
(function () {
  var hosts = document.querySelectorAll('[data-spectrum]');
  if (!hosts.length) return;
  var FR = (document.documentElement.lang || '').toLowerCase().indexOf('fr') === 0;
  var T = FR ? {
    ocu: 'DJI OcuSync · sauts', ocudl: 'DJI OcuSync · liaison vidéo', ridw: 'Remote ID · balise Wi-Fi', ridb: 'Remote ID · Bluetooth',
    fpv: 'FPV analogique', band: 'Bande', sim: 'Simulation · données illustratives', pause: 'Pause', play: 'Lecture',
    pauseLabel: 'Mettre en pause l’analyseur de spectre', ghz: 'GHz'
  } : {
    ocu: 'DJI OcuSync · hopping', ocudl: 'DJI OcuSync · video link', ridw: 'Remote ID · Wi-Fi beacon', ridb: 'Remote ID · Bluetooth',
    fpv: 'FPV analog', band: 'Band', sim: 'Simulation · illustrative data', pause: 'Pause', play: 'Play',
    pauseLabel: 'Pause the spectrum analyser', ghz: 'GHz'
  };
  var num = function (n) { return FR ? String(n).replace('.', ',') : String(n); };
  var mhz = function (n) { return (FR ? n.toLocaleString('fr-FR') : n.toLocaleString('en-US')) + ' MHz'; };

  // colour ramp: navy ground -> cream -> insignia red
  var RAMP = [[10, 14, 26], [22, 32, 56], [70, 86, 120], [190, 186, 172], [245, 242, 234], [236, 91, 91], [210, 40, 40]];
  var LUT = new Uint8ClampedArray(256 * 3);
  for (var i = 0; i < 256; i++) {
    var t = i / 255 * (RAMP.length - 1), k = Math.min(RAMP.length - 2, Math.floor(t)), f = t - k;
    for (var c = 0; c < 3; c++) LUT[i * 3 + c] = RAMP[k][c] + (RAMP[k + 1][c] - RAMP[k][c]) * f;
  }

  /* ---- band definitions ---- */
  // signal kinds: hop (control hopping), dl (video downlink block that moves), beacon (periodic burst),
  // ble (advertising on 3 channels), fpv (analog FM carrier, on during [on, off] of the cycle), amb (ambient Wi-Fi)
  function B(gname, f0, f1, ticks, sig, tags) { return { name: gname, f0: f0, f1: f1, ticks: ticks, sig: sig, tags: tags || [] }; }
  var B12 = function (on, off) { return B('1,2 GHz|1.2 GHz', 1080, 1360, [1100, 1160, 1220, 1280, 1340], [{ k: 'fpv', c: 1258, on: on, off: off }], [{ f: 1258, t: 'fpv', mhz: 1258 }]); };
  var B33 = function (on, off) { return B('3,3 GHz|3.3 GHz', 3170, 3470, [3200, 3260, 3320, 3380, 3440], [{ k: 'fpv', c: 3330, on: on, off: off }], [{ f: 3330, t: 'fpv', mhz: 3330 }]); };
  var B65 = function (on, off) { return B('6,5 GHz|6.5 GHz', 6200, 6800, [6250, 6400, 6550, 6700], [{ k: 'fpv', c: 6545, on: on, off: off }], [{ f: 6545, t: 'fpv', mhz: 6545 }]); };
  var B58fpv = function (on, off) { return B('5,8 GHz|5.8 GHz', 5645, 5945, [5660, 5740, 5820, 5900], [{ k: 'amb', c: 5745, w: 20 }, { k: 'fpv', c: 5865, on: on, off: off }], [{ f: 5865, t: 'fpv', mhz: 5865 }]); };
  var B24rid = B('2,4 GHz|2.4 GHz', 2400, 2483.5, [2400, 2420, 2440, 2460, 2480], [
    { k: 'amb', c: 2412, w: 20 }, { k: 'hop', lo: 2406, hi: 2478 }, { k: 'dl', lo: 2412, hi: 2472, w: 10 },
    { k: 'beacon', c: 2437, w: 18, period: 0.5, dur: 0.035 }, { k: 'ble' }
  ], [{ f: 2452, t: 'ocu' }, { f: 2437, t: 'ridw', dy: 30 }, { f: 2480, t: 'ridb', dy: 60, right: true }]);
  var B58rid = B('5,8 GHz|5.8 GHz', 5725, 5850, [5725, 5750, 5775, 5800, 5825, 5850], [
    { k: 'amb', c: 5745, w: 20 }, { k: 'hop', lo: 5730, hi: 5845 }, { k: 'dl', lo: 5740, hi: 5835, w: 20 },
    { k: 'beacon', c: 5745, w: 18, period: 0.7, dur: 0.03 }
  ], [{ f: 5790, t: 'ocudl' }, { f: 5745, t: 'ridw', dy: 30 }]);

  var PRESETS = {
    all: function () { return [B12(9, 13), B24rid, B58fpv(3.5, 14), B65(6, 11)]; },
    rid: function () { return [B24rid, B58rid]; },
    fpv: function () { return [B12(1, 5.5), B33(4.5, 9), B58fpv(0, 14), B65(8.5, 13.5)]; }
  };

  hosts.forEach(function (host) {
    var BANDS = (PRESETS[host.getAttribute('data-spectrum')] || PRESETS.all)();
    var canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    host.appendChild(canvas);
    var ctx = canvas.getContext('2d', { alpha: false });
    var labels = document.createElement('div'); labels.className = 'spec-labels'; labels.setAttribute('aria-hidden', 'true'); host.appendChild(labels);
    var foot = document.createElement('div'); foot.className = 'spec-foot';
    var sim = document.createElement('span'); sim.className = 'spec-sim'; sim.textContent = T.sim;
    var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'map-pause spec-pause';
    foot.appendChild(sim); foot.appendChild(btn); host.appendChild(foot);

    var W, H, dpr, regions = [], row = [], power = [];
    var state = BANDS.map(function () { return { hop: 0, hopT: 0, dl: 0, dlT: 0, fpv: 0 }; });

    function bandName(b) { var p = BANDS[b].name.split('|'); return T.band + ' ' + (FR ? p[0] : p[1]); }

    function layout() {
      var r = host.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(280, Math.round(r.width)); H = Math.max(240, Math.round(r.height - 34));
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      var n = BANDS.length, cols = W < 700 ? 1 : (n >= 4 ? 2 : n), rows = Math.ceil(n / cols);
      var gx = 28, gy = 30, cw = (W - gx * (cols - 1)) / cols, rh = (H - gy * (rows - 1)) / rows;
      var traceH = Math.max(52, Math.min(110, rh * 0.3)), axis = 22;
      regions = BANDS.map(function (_, b) {
        var cx = b % cols, cy = Math.floor(b / cols);
        var g = { x: cx * (cw + gx), y: cy * (rh + gy), w: cw, h: rh, trace: traceH, axis: axis };
        g.wfY = g.y + traceH + axis; g.wfH = g.y + g.h - g.wfY; return g;
      });
      row = regions.map(function (g) { return new Float32Array(Math.max(2, Math.round(g.w * dpr))); });
      power = regions.map(function (g) { return new Float32Array(Math.max(2, Math.round(g.w * dpr))); });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      buildLabels();
      var rowsN = Math.ceil(Math.max.apply(null, regions.map(function (g) { return g.wfH; })) * dpr) + 2;
      for (var q = 0; q < rowsN; q++) step(0.016);
      drawTrace();
    }

    function fx(b, f) { var g = regions[b]; return g.x + (f - BANDS[b].f0) / (BANDS[b].f1 - BANDS[b].f0) * g.w; }

    var fpvTags = [];
    function buildLabels() {
      labels.innerHTML = ''; fpvTags = [];
      BANDS.forEach(function (bd, b) {
        var g = regions[b];
        var add = function (cls, txt, x, y, extra) { var el = document.createElement('span'); el.className = cls; el.textContent = txt; el.style.left = x + 'px'; el.style.top = y + 'px'; if (extra) extra(el); labels.appendChild(el); return el; };
        add('spec-band', bandName(b), g.x, g.y);
        add('spec-frame', '', g.x, g.wfY, function (el) { el.style.width = g.w + 'px'; el.style.height = g.wfH + 'px'; });
        bd.ticks.forEach(function (tk) { add('spec-tick', (tk >= 1000 ? num(tk) : tk), fx(b, tk), g.y + g.trace + 4); });
        bd.tags.forEach(function (tg) {
          var txt = tg.t === 'fpv' ? T.fpv + ' · ' + mhz(tg.mhz) : T[tg.t];
          var el = add('spec-tag t-' + tg.t + (tg.right ? ' t-right' : ''), txt, fx(b, tg.f), g.wfY + 12 + (tg.dy || 0));
          if (tg.t === 'fpv') fpvTags.push({ el: el, b: b });
        });
      });
    }

    var clock = 0;
    function gauss(x, c, w) { var d = (x - c) / w; return Math.exp(-d * d); }
    function rect(x, c, w) { return Math.abs(x - c) < w / 2 ? 1 : 0; }
    var BLE = [2402, 2426, 2480];

    function compute(b, out, dt) {
      var bd = BANDS[b], st = state[b], n = out.length, cyc = clock % 14;
      bd.sig.forEach(function (s) {
        if (s.k === 'hop' && (st.hopT += dt) > 0.09) { st.hopT = 0; st.hop = s.lo + Math.random() * (s.hi - s.lo); }
        if (s.k === 'dl' && ((st.dlT += dt) > 1.3 || !st.dl)) { st.dlT = 0; st.dl = s.lo + Math.random() * (s.hi - s.lo); }
        if (s.k === 'fpv') { var on = cyc >= s.on && cyc < s.off ? 1 : 0; st.fpv += (on - st.fpv) * Math.min(1, dt * 3); }
      });
      var bleCh = BLE[Math.floor(clock * 30) % 3], bleOn = (clock % 0.3) < 0.02;
      for (var i = 0; i < n; i++) {
        var f = bd.f0 + (bd.f1 - bd.f0) * i / (n - 1);
        var p = 0.035 + Math.random() * 0.05;
        for (var j = 0; j < bd.sig.length; j++) {
          var s = bd.sig[j];
          if (s.k === 'amb') p += (Math.random() < 0.005 ? 0.15 : 0) * rect(f, s.c, s.w);
          else if (s.k === 'hop') p += 0.6 * gauss(f, st.hop, 0.9);
          else if (s.k === 'dl') p += (0.26 + 0.06 * Math.random()) * rect(f, st.dl, s.w);
          else if (s.k === 'beacon') p += ((clock % s.period) < s.dur ? 0.6 : 0) * rect(f, s.c, s.w) * (0.75 + 0.25 * Math.random());
          else if (s.k === 'ble') p += bleOn ? 0.7 * gauss(f, bleCh, 0.8) : 0;
          else if (s.k === 'fpv') p += st.fpv * (0.55 * gauss(f, s.c, (bd.f1 - bd.f0) / 60) + 0.28 * rect(f, s.c, (bd.f1 - bd.f0) / 18) * (0.8 + 0.2 * Math.random()));
        }
        out[i] = Math.min(1, p);
      }
    }

    function step(dt) {
      clock += dt;
      regions.forEach(function (g, b) {
        compute(b, row[b], dt);
        var pw = power[b], rw = row[b];
        for (var i = 0; i < pw.length; i++) pw[i] = pw[i] * 0.7 + rw[i] * 0.3;
        var x = Math.round(g.x * dpr), y = Math.round(g.wfY * dpr), w = rw.length, h = Math.round(g.wfH * dpr);
        if (h > 2) ctx.drawImage(canvas, x, y, w, h - 1, x, y + 1, w, h - 1);
        var img = ctx.createImageData(w, 1), d = img.data;
        for (var j = 0; j < w; j++) {
          var v = Math.min(255, Math.max(0, Math.round(Math.pow(rw[j], 0.85) * 255)));
          d[j * 4] = LUT[v * 3]; d[j * 4 + 1] = LUT[v * 3 + 1]; d[j * 4 + 2] = LUT[v * 3 + 2]; d[j * 4 + 3] = 255;
        }
        ctx.putImageData(img, x, y);
      });
    }

    function drawTrace() {
      fpvTags.forEach(function (o) { o.el.style.opacity = (0.22 + 0.78 * state[o.b].fpv).toFixed(2); });
      ctx.save(); ctx.scale(dpr, dpr);
      regions.forEach(function (g, b) {
        var top = g.y + 22, h = g.trace - 22;
        ctx.fillStyle = '#0A0E1A'; ctx.fillRect(g.x, g.y, g.w, g.trace + g.axis);
        ctx.strokeStyle = 'rgba(245,242,234,0.10)'; ctx.lineWidth = 1;
        for (var q = 0; q <= 3; q++) { var yy = Math.round(top + h * q / 3) + 0.5; ctx.beginPath(); ctx.moveTo(g.x, yy); ctx.lineTo(g.x + g.w, yy); ctx.stroke(); }
        BANDS[b].ticks.forEach(function (tk) { var xx = Math.round(fx(b, tk)) + 0.5; ctx.beginPath(); ctx.moveTo(xx, top); ctx.lineTo(xx, g.y + g.trace + 2); ctx.stroke(); });
        var pw = power[b], n = pw.length;
        ctx.beginPath();
        for (var i = 0; i < n; i += 2) { var px = g.x + i / dpr, py = top + h - pw[i] * h; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.strokeStyle = '#F5F2EA'; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.lineTo(g.x + g.w, top + h); ctx.lineTo(g.x, top + h); ctx.closePath();
        ctx.fillStyle = 'rgba(245,242,234,0.06)'; ctx.fill();
      });
      ctx.restore();
    }

    var running = false, visible = false, paused = false, last = 0;
    function loop(now) {
      if (!running) return;
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      step(dt); step(dt * 0.5);
      drawTrace();
      requestAnimationFrame(loop);
    }
    function start() { if (running || paused || !visible || document.hidden) return; running = true; last = performance.now(); requestAnimationFrame(loop); }
    function stop() { running = false; }
    function paint() {
      btn.innerHTML = (paused ? '<svg viewBox="0 0 10 10" fill="currentColor" aria-hidden="true"><path d="M2 1l7 4-7 4z"/></svg>' : '<svg viewBox="0 0 10 10" fill="currentColor" aria-hidden="true"><rect x="1" y="1" width="3" height="8"/><rect x="6" y="1" width="3" height="8"/></svg>') + '<span>' + (paused ? T.play : T.pause) + '</span>';
      btn.setAttribute('aria-pressed', String(paused)); btn.setAttribute('aria-label', T.pauseLabel);
    }
    btn.addEventListener('click', function () { paused = !paused; paint(); paused ? stop() : start(); });
    paint();

    var lastW = 0;
    new ResizeObserver(function () { var w = Math.round(host.getBoundingClientRect().width); if (w !== lastW) { lastW = w; layout(); } }).observe(host);
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; visible ? start() : stop(); }, { rootMargin: '100px 0px' }).observe(host);
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
  });
})();
