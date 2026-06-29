// Drag the DNA: the drag is decomposed relative to the strand's 45-degree axis.
//  - The bottom-left <-> top-right component scrubs the helical-spin animation
//    (toward top-right = forward, toward bottom-left = reverse). This persists;
//    the ambient spin resumes from there on release.
//  - The perpendicular component rotates the whole strand in-plane (clamped to
//    +-90 deg), which springs back to rest when you let go.
// Plus a themed on-screen cursor that mirrors the mouse on hover.
(function () {
  var INV = 1 / Math.SQRT2;

  function init() {
    var handle = document.querySelector('.computer-monitor');
    var loader = document.querySelector('.loader');
    if (!handle || !loader) return;
    var dots = loader.querySelectorAll('.dot');
    if (!dots.length) return;
    var screenCursor = handle.querySelector('.screen-cursor');

    var BASE = 45;
    loader.style.transition = 'none';
    function anims() { try { return loader.getAnimations({ subtree: true }); } catch (e) { return []; } }

    // ----- Calibrate the rotation pivot to the helix's center of mass -----
    var loaderW = loader.offsetWidth, loaderH = loader.offsetHeight;
    var sx = 0, sy = 0;
    dots.forEach(function (d) { sx += d.offsetLeft + d.offsetWidth / 2; sy += d.offsetTop + d.offsetHeight / 2; });
    var ccx = sx / dots.length, ccy = sy / dots.length;
    loader.style.transformOrigin = ccx + 'px ' + ccy + 'px';
    var rad = BASE * Math.PI / 180, sc = 0.6;
    var la = sc * Math.cos(rad), lb = sc * Math.sin(rad), lc = -sc * Math.sin(rad), ld = sc * Math.cos(rad);
    var vx = ccx - loaderW / 2, vy = ccy - loaderH / 2;
    var tx = la * vx + lc * vy - vx;
    var ty = lb * vx + ld * vy - vy;
    var rotation = 0;
    function build() { return 'translate(' + tx + 'px,' + ty + 'px) scale(0.6) rotate(' + (BASE + rotation) + 'deg)'; }
    loader.style.transform = build();

    function positionCursor(x, y) {
      if (!screenCursor) return;
      var r = handle.getBoundingClientRect(), bw = 10;
      var px = Math.max(0, Math.min(r.width - bw * 2, x - r.left - bw));
      var py = Math.max(0, Math.min(r.height - bw * 2, y - r.top - bw));
      screenCursor.style.transform = 'translate(' + (px - 6.5) + 'px,' + (py - 6.5) + 'px)';
    }

    var SCRUB_SENS = 16;   // ms of spin per px along the bottom-left<->top-right axis
    var ROT_SENS = 0.7;    // deg of rotation per px along the perpendicular axis
    var ROT_MAX = 90;

    var dragging = false, startX = 0, startY = 0, startTime = 0, rotBase = 0;
    var pivotX = 0, pivotY = 0, startAngle = 0;

    function centroidScreen() {  // rendered center of mass = rotation pivot
      var a = 1e9, b = 1e9, c = -1e9, d = -1e9;
      dots.forEach(function (x) { var r = x.getBoundingClientRect(); a = Math.min(a, r.left); b = Math.min(b, r.top); c = Math.max(c, r.right); d = Math.max(d, r.bottom); });
      return { x: (a + c) / 2, y: (b + d) / 2 };
    }

    function start(x, y) {
      dragging = true;
      startX = x; startY = y;
      var list = anims();
      startTime = list.length ? (Number(list[0].currentTime) || 0) : 0;
      list.forEach(function (a) { a.pause(); });
      try { var m = new DOMMatrixReadOnly(getComputedStyle(loader).transform); rotation = Math.atan2(m.b, m.a) * 180 / Math.PI - BASE; } catch (e) {}
      rotBase = rotation;
      var c = centroidScreen();
      pivotX = c.x; pivotY = c.y;
      startAngle = Math.atan2(y - pivotY, x - pivotX);
      loader.style.transition = 'transform 0.7s cubic-bezier(0.25, 1, 0.5, 1)';   // rotation eases toward the cursor (slow follow)
      loader.style.transform = build();
    }
    function move(x, y) {
      if (!dragging) return;
      var dx = x - startX, dy = y - startY;
      // scrub: bottom-left -> top-right component of the drag (screen vector (1, -1))
      var s = (dx - dy) * INV;
      var t = startTime + s * SCRUB_SENS;
      if (t < 0) t = 0;
      anims().forEach(function (a) { try { a.currentTime = t; } catch (e) {} });
      // rotate: knob — follow the angle swept around the centroid (CCW drag -> CCW)
      var dA = (Math.atan2(y - pivotY, x - pivotX) - startAngle) * 180 / Math.PI;
      while (dA > 180) dA -= 360;
      while (dA < -180) dA += 360;
      rotation = Math.max(-ROT_MAX, Math.min(ROT_MAX, rotBase + dA));
      loader.style.transform = build();
    }
    function end() {
      if (!dragging) return;
      dragging = false;
      anims().forEach(function (a) { try { a.play(); } catch (e) {} });   // resume spin from scrubbed point
      loader.style.transition = 'transform 1.6s cubic-bezier(0.22, 1, 0.36, 1)';   // gradual drift back to rest
      rotation = 0;
      loader.style.transform = build();
    }

    handle.addEventListener('mousedown', function (e) { e.preventDefault(); start(e.clientX, e.clientY); });
    window.addEventListener('mousemove', function (e) { positionCursor(e.clientX, e.clientY); move(e.clientX, e.clientY); });
    window.addEventListener('mouseup', end);
    handle.addEventListener('touchstart', function (e) { if (e.touches[0]) start(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    window.addEventListener('touchmove', function (e) { if (dragging && e.touches[0]) { positionCursor(e.touches[0].clientX, e.touches[0].clientY); move(e.touches[0].clientX, e.touches[0].clientY); } }, { passive: true });
    window.addEventListener('touchend', end);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
