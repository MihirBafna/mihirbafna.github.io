// DNA interactions:
//  - Grab near the ENDS/corners of the helix -> rotate it (about its center of
//    mass). On release it carries momentum, then a spring eases it back to rest.
//  - Grab near the MIDDLE -> scrub the helical-spin animation like a slider
//    (drag right = forward, left = backward); the ambient spin resumes on release.
// Also shows a themed on-screen cursor that mirrors the mouse on hover.
(function () {
  function init() {
    var handle = document.querySelector('.computer-monitor');
    var loader = document.querySelector('.loader');
    if (!handle || !loader) return;
    var dots = loader.querySelectorAll('.dot');
    if (!dots.length) return;
    var screenCursor = handle.querySelector('.screen-cursor');

    var BASE = 45;
    loader.style.transition = 'none';   // RAF drives the rotation smoothness
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

    function helix() {
      var a = 1e9, b = 1e9, c = -1e9, d = -1e9;
      dots.forEach(function (x) { var r = x.getBoundingClientRect(); a = Math.min(a, r.left); b = Math.min(b, r.top); c = Math.max(c, r.right); d = Math.max(d, r.bottom); });
      return { x: (a + c) / 2, y: (b + d) / 2, half: Math.hypot((c - a) / 2, (d - b) / 2) };
    }
    function positionCursor(x, y) {
      if (!screenCursor) return;
      var r = handle.getBoundingClientRect(), bw = 10;
      var px = Math.max(0, Math.min(r.width - bw * 2, x - r.left - bw));
      var py = Math.max(0, Math.min(r.height - bw * 2, y - r.top - bw));
      screenCursor.style.transform = 'translate(' + (px - 6.5) + 'px,' + (py - 6.5) + 'px)';   // center the crosshair on the point
    }

    var ROTATE_FRAC = 0.55;
    var MIN_TIME = 2950, SENS = 18;
    // spring-damper for the momentum / settle-back
    var STIFF = 0.012, DAMP = 0.9, MAXVEL = 30;
    var mode = null, rafId = null;
    var pivotX = 0, pivotY = 0, lastAngle = 0, vel = 0;   // rotate state
    var startX = 0, startTime = 0;                          // scrub state

    function angleAt(x, y) { return Math.atan2(y - pivotY, x - pivotX) * 180 / Math.PI; }

    function spring() {
      vel += -STIFF * rotation;     // pull toward the resting conformation
      vel *= DAMP;                  // friction
      rotation += vel;
      loader.style.transform = build();
      if (Math.abs(rotation) < 0.12 && Math.abs(vel) < 0.12) {
        rotation = 0;
        loader.style.transform = build();
        rafId = null;
        return;
      }
      rafId = requestAnimationFrame(spring);
    }

    function start(x, y) {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      var h = helix();
      if (Math.hypot(x - h.x, y - h.y) > ROTATE_FRAC * h.half) {
        mode = 'rotate';
        pivotX = h.x; pivotY = h.y;
        lastAngle = angleAt(x, y);
        vel = 0;
      } else {
        var list = anims();
        if (!list.length) { mode = null; return; }
        mode = 'scrub';
        startX = x;
        startTime = Number(list[0].currentTime) || MIN_TIME;
        list.forEach(function (a) { a.pause(); });
      }
    }
    function move(x, y) {
      if (mode === 'rotate') {
        var a = angleAt(x, y), dd = a - lastAngle;
        while (dd > 180) dd -= 360;
        while (dd < -180) dd += 360;
        rotation += dd;
        lastAngle = a;
        vel = 0.4 * vel + 0.6 * dd;                 // track angular velocity for the flick
        if (vel > MAXVEL) vel = MAXVEL; else if (vel < -MAXVEL) vel = -MAXVEL;
        loader.style.transform = build();
      } else if (mode === 'scrub') {
        var t = startTime + (x - startX) * SENS;
        if (t < MIN_TIME) t = MIN_TIME;
        anims().forEach(function (a) { try { a.currentTime = t; } catch (e) {} });
      }
    }
    function end() {
      if (mode === 'rotate') {
        if (!rafId) spring();                       // momentum + settle back to rest
      } else if (mode === 'scrub') {
        anims().forEach(function (a) { try { a.play(); } catch (e) {} });
      }
      mode = null;
    }

    handle.addEventListener('mousedown', function (e) { e.preventDefault(); start(e.clientX, e.clientY); });
    window.addEventListener('mousemove', function (e) { positionCursor(e.clientX, e.clientY); move(e.clientX, e.clientY); });
    window.addEventListener('mouseup', end);
    handle.addEventListener('touchstart', function (e) { if (e.touches[0]) start(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    window.addEventListener('touchmove', function (e) { if (mode && e.touches[0]) { positionCursor(e.touches[0].clientX, e.touches[0].clientY); move(e.touches[0].clientX, e.touches[0].clientY); } }, { passive: true });
    window.addEventListener('touchend', end);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
