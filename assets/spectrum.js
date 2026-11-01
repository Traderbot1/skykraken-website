/* SkyKraken — live RF spectrum + waterfall (synthetic demonstration).
   Two bands side by side: 2.4 GHz (DJI OcuSync hopping, Remote ID Wi-Fi beacons)
   and 5.8 GHz (an analog FPV carrier appears and holds). */
(function () {
  var hosts = document.querySelectorAll('[data-spectrum]');
  if (!hosts.length) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FR = (document.documentElement.lang || '').toLowerCase().indexOf('fr') === 0;
  var L = FR ? {
    ocu: 'DJI OcuSync · sauts de fréquence', rid: 'Remote ID · balise Wi-Fi canal 6', fpv: 'FPV analogique · 5 865 MHz',
    b24: 'Bande 2,4 GHz', b58: 'Bande 5,8 GHz', sim: 'Simulation · données illustratives', mhz: 'MHz'
  } : {
    ocu: 'DJI OcuSync · frequency hopping', rid: 'Remote ID · Wi-Fi beacon ch. 6', fpv: 'FPV analog · 5,865 MHz',
    b24: '2.4 GHz band', b58: '5.8 GHz band', sim: 'Simulation · illustrative data', mhz: 'MHz'
  };
  var fmt = function (n) { return FR ? String(n).replace('.', ',') : String(n); };

  // colour ramp: navy ground -> cream -> insignia red
  var RAMP = [[10, 14, 26], [22, 32, 56], [70, 86, 120], [190, 186, 172], [245, 242, 234], [236, 91, 91], [210, 40, 40]];
  var LUT = new Uint8ClampedArray(256 * 3);
  for (var i = 0; i < 256; i++) {
    var t = i / 255 * (RAMP.length - 1), k = Math.min(RAMP.length - 2, Math.floor(t)), f = t - k;
    for (var c = 0; c < 3; c++) LUT[i * 3 + c] = RAMP[k][c] + (RAMP[k + 1][c] - RAMP[k][c]) * f;
  }

  hosts.forEach(function (host) {
    var canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    host.appendChild(canvas);
    var ctx = canvas.getContext('2d', { alpha: false });
    var labels = document.createElement('div'); labels.className = 'spec-labels'; labels.setAttribute('aria-hidden', 'true'); host.appendChild(labels);
    var sim = document.createElement('p'); sim.className = 'spec-sim'; sim.textContent = L.sim; host.appendChild(sim);

    var BANDS = [
      { name: L.b24, f0: 2400, f1: 2483.5, ticks: [2400, 2420, 2440, 2460, 2480] },
      { name: L.b58, f0: 5725, f1: 5875, ticks: [5725, 5765, 5805, 5845, 5875] }
    ];
    var W, H, dpr, regions, traceH, wfTop, row, power;
    var stacked = false;

    function layout() {
      var r = host.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(300, Math.round(r.width)); H = Math.max(260, Math.round(r.height));
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      stacked = W < 700;
      var pad = 0, gap = stacked ? 34 : 28, axis = 26;
      traceH = Math.round(H * (stacked ? 0.12 : 0.22));
      if (stacked) {
        var h = (H - gap) / 2;
        regions = [{ x: 0, y: 0, w: W, h: h }, { x: 0, y: h + gap, w: W, h: h }];
      } else {
        var w = (W - gap) / 2;
        regions = [{ x: pad, y: 0, w: w, h: H }, { x: w + gap, y: 0, w: w, h: H }];
      }
      regions.forEach(function (g) { g.axis = axis; g.trace = traceH; g.wfY = g.y + traceH + axis; g.wfH = g.y + g.h - g.wfY; });
      row = regions.map(function (g) { return new Float32Array(Math.round(g.w * dpr)); });
      power = regions.map(function (g) { return new Float32Array(Math.round(g.w * dpr)); });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      buildLabels();
      // fill the whole waterfall history so the instrument never opens on an empty screen
      var rows = Math.ceil(Math.max.apply(null, regions.map(function (g) { return g.wfH; })) * dpr) + 2;
      for (var n = 0; n < rows; n++) step(0.016);
      drawStatic();
    }

    function fx(b, g, f) { return g.x + (f - BANDS[b].f0) / (BANDS[b].f1 - BANDS[b].f0) * g.w; }

    function buildLabels() {
      labels.innerHTML = '';
      var mk = function (txt, cls, b, f) {
        var g = regions[b];
        var el = document.createElement('span'); el.className = 'spec-tag ' + cls; el.textContent = txt;
        el.style.left = fx(b, g, f) + 'px'; el.style.top = (g.wfY + 14) + 'px';
        labels.appendChild(el); return el;
      };
      mk(L.ocu, 't-ocu', 0, 2452);
      mk(L.rid, 't-rid', 0, 2437);
      mk(L.fpv, 't-fpv', 1, 5865);
      BANDS.forEach(function (bd, b) {
        var g = regions[b];
        var fr = document.createElement('span'); fr.className = 'spec-frame';
        fr.style.left = g.x + 'px'; fr.style.top = g.wfY + 'px'; fr.style.width = g.w + 'px'; fr.style.height = g.wfH + 'px'; labels.appendChild(fr);
        var n = document.createElement('span'); n.className = 'spec-band'; n.textContent = bd.name;
        n.style.left = g.x + 'px'; n.style.top = (g.y) + 'px'; labels.appendChild(n);
        bd.ticks.forEach(function (tk) {
          var t = document.createElement('span'); t.className = 'spec-tick'; t.textContent = fmt(tk);
          t.style.left = fx(b, g, tk) + 'px'; t.style.top = (g.y + g.trace + 6) + 'px'; labels.appendChild(t);
        });
      });
    }

    // signal model
    var clock = 0, hop = 2452, hopT = 0, dl = 2462, dlT = 0, fpvOn = 0;
    function gauss(x, c, w) { var d = (x - c) / w; return Math.exp(-d * d); }
    function rect(x, c, w) { return Math.abs(x - c) < w / 2 ? 1 : 0; }

    function compute(b, out, now) {
      var bd = BANDS[b], n = out.length;
      for (var i = 0; i < n; i++) {
        var f = bd.f0 + (bd.f1 - bd.f0) * i / (n - 1);
        var p = 0.035 + Math.random() * 0.05; // noise floor
        if (b === 0) {
          // ambient Wi-Fi activity on ch. 1 and 11
          p += (Math.random() < 0.006 ? 0.16 : 0) * (rect(f, 2412, 20) + rect(f, 2462, 20) * 0.6);
          // DJI OcuSync: hopping control bursts + 10 MHz video downlink that moves every second
          p += 0.6 * gauss(f, hop, 0.9);
          p += (0.26 + 0.06 * Math.random()) * rect(f, dl, 10);
          // Remote ID beacon: short, regular, ch. 6
          p += ((now % 0.5) < 0.035 ? 0.62 : 0) * rect(f, 2437, 18) * (0.7 + 0.3 * Math.random());
        } else {
          p += (Math.random() < 0.004 ? 0.14 : 0) * rect(f, 5745, 20);
          // analog FPV: wide FM carrier with a bright centre, fades in and holds
          p += fpvOn * (0.55 * gauss(f, 5865, 4.5) + 0.28 * rect(f, 5865, 16) * (0.8 + 0.2 * Math.random()));
        }
        out[i] = Math.min(1, p);
      }
    }

    function step(dt) {
      clock += dt;
      if ((hopT += dt) > 0.09) { hopT = 0; hop = 2406 + Math.random() * 72; }
      if ((dlT += dt) > 1.3) { dlT = 0; dl = 2412 + Math.random() * 60; }
      var cyc = clock % 14;
      fpvOn += ((cyc > 3.5 ? 1 : 0) - fpvOn) * Math.min(1, dt * 3);
      regions.forEach(function (g, b) {
        compute(b, row[b], clock);
        var pw = power[b];
        for (var i = 0; i < pw.length; i++) pw[i] = pw[i] * 0.7 + row[b][i] * 0.3;
        // scroll the waterfall down by one device pixel and paint the new row on top
        var x = Math.round(g.x * dpr), y = Math.round(g.wfY * dpr), w = row[b].length, h = Math.round(g.wfH * dpr);
        ctx.drawImage(canvas, x, y, w, h - 1, x, y + 1, w, h - 1);
        var img = ctx.createImageData(w, 1), d = img.data;
        for (var j = 0; j < w; j++) {
          var v = Math.min(255, Math.max(0, Math.round(Math.pow(row[b][j], 0.85) * 255)));
          d[j * 4] = LUT[v * 3]; d[j * 4 + 1] = LUT[v * 3 + 1]; d[j * 4 + 2] = LUT[v * 3 + 2]; d[j * 4 + 3] = 255;
        }
        ctx.putImageData(img, x, y);
      });
    }

    function drawStatic() {
      // spectrum trace area (redrawn each frame)
      ctx.save(); ctx.scale(dpr, dpr);
      regions.forEach(function (g, b) {
        var top = g.y + 22, h = g.trace - 22;
        ctx.fillStyle = '#0A0E1A'; ctx.fillRect(g.x, g.y, g.w, g.trace + g.axis);
        ctx.strokeStyle = 'rgba(245,242,234,0.10)'; ctx.lineWidth = 1;
        for (var q = 0; q <= 3; q++) { var yy = Math.round(top + h * q / 3) + 0.5; ctx.beginPath(); ctx.moveTo(g.x, yy); ctx.lineTo(g.x + g.w, yy); ctx.stroke(); }
        BANDS[b].ticks.forEach(function (tk) { var xx = Math.round(fx(b, g, tk)) + 0.5; ctx.beginPath(); ctx.moveTo(xx, top); ctx.lineTo(xx, g.y + g.trace + 4); ctx.stroke(); });
        var pw = power[b], n = pw.length;
        ctx.beginPath();
        for (var i = 0; i < n; i += 2) {
          var px = g.x + i / dpr, py = top + h - pw[i] * h;
          i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.strokeStyle = '#F5F2EA'; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.lineTo(g.x + g.w, top + h); ctx.lineTo(g.x, top + h); ctx.closePath();
        ctx.fillStyle = 'rgba(245,242,234,0.06)'; ctx.fill();
      });
      ctx.restore();
    }

    var running = false, visible = false, last = 0;
    function loop(now) {
      if (!running) return;
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      step(dt); step(dt * 0.5);
      drawStatic();
      requestAnimationFrame(loop);
    }
    function start() { if (running || reduce) return; running = true; last = performance.now(); requestAnimationFrame(loop); }
    function stop() { running = false; }

    new ResizeObserver(function () { layout(); }).observe(host);
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; visible ? start() : stop(); }).observe(host);
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : (visible && start()); });
  });
})();
