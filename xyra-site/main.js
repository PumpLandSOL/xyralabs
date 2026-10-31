(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia("(pointer: coarse)").matches;
  var lenis = null;

  var HEX = "0123456789abcdef";
  function hex(n) {
    var s = "";
    for (var i = 0; i < n; i++) s += HEX[(Math.random() * 16) | 0];
    return s;
  }

  /* The mark's squares, read once from the inline symbol. */
  function markRects() {
    return Array.prototype.map.call(document.querySelectorAll("#mark rect"), function (r) {
      return { x: +r.getAttribute("x"), y: +r.getAttribute("y"), w: +r.getAttribute("width"), h: +r.getAttribute("height") };
    });
  }

  /* Value noise, used by the hero field and the ledger tile. */
  var perm = new Uint8Array(512);
  (function seed() {
    var p = [];
    for (var i = 0; i < 256; i++) p[i] = i;
    var s = 1337;
    for (var j = 255; j > 0; j--) {
      s = (s * 16807) % 2147483647;
      var k = s % (j + 1);
      var tmp = p[j]; p[j] = p[k]; p[k] = tmp;
    }
    for (var n = 0; n < 512; n++) perm[n] = p[n & 255];
  })();

  function lattice(x, y) {
    return perm[(perm[x & 255] + y) & 255] / 255;
  }

  function vnoise(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y);
    var xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf);
    var v = yf * yf * (3 - 2 * yf);
    var a = lattice(xi, yi), b = lattice(xi + 1, yi);
    var c = lattice(xi, yi + 1), d = lattice(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  function marble(x, y, t) {
    var w = vnoise(x * 0.6 + t * 0.05, y * 0.6 - t * 0.04);
    x += w * 0.9;
    y += w * 0.6;
    return 0.5 * vnoise(x + t * 0.08, y - t * 0.05)
         + 0.3 * vnoise(x * 2.1 - t * 0.1, y * 2.1 + t * 0.07)
         + 0.2 * vnoise(x * 4.2 + t * 0.14, y * 4.2 - t * 0.11);
  }

  /* Dotted field: a grid of jittered points, lit where the noise runs high.
     With opts.mark the same points can first assemble into the mark, hold it, then
     disperse into the field: draw(t, phase) runs -1 (nothing) through 0 (the mark) to 1 (the field). */
  function makeField(canvas, opts) {
    var ctx = canvas.getContext("2d");
    if (!ctx) return null;

    var spacing = opts.spacing || 6;
    var scale = opts.scale || 230;
    var threshold = opts.threshold || 0.5;
    var rects = opts.mark || null;
    var width = 0, height = 0, dpr = 1;
    var xs = new Float32Array(0), ys = new Float32Array(0), count = 0;
    var inMark = new Uint8Array(0), cue = new Float32Array(0), fx = new Float32Array(0), fy = new Float32Array(0);
    var offsetX = 0, offsetY = 0;

    function resize() {
      var rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var cols = Math.ceil(width / spacing) + 1;
      var rows = Math.ceil(height / spacing) + 1;
      count = cols * rows;
      xs = new Float32Array(count);
      ys = new Float32Array(count);
      var i = 0;
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var j = lattice(c * 7 + 3, r * 13 + 5);
          var k = lattice(c * 11 + 1, r * 5 + 9);
          xs[i] = c * spacing + (j - 0.5) * spacing;
          ys[i] = r * spacing + (k - 0.5) * spacing;
          i++;
        }
      }

      if (rects) {
        /* Which points fall inside the mark, drawn large at the centre, plus each point's own
           cue and the direction it flies in from and leaves by. */
        var size = Math.min(width * 0.5, height * 0.6, 560);
        var s = size / 84, mx = width * 0.5 - size / 2, my = height * 0.52 - size / 2;
        inMark = new Uint8Array(count);
        cue = new Float32Array(count);
        fx = new Float32Array(count);
        fy = new Float32Array(count);
        for (i = 0; i < count; i++) {
          var px = (xs[i] - mx) / s + 8, py = (ys[i] - my) / s + 8, hit = 0;
          if (px >= 8 && px <= 92 && py >= 8 && py <= 92) {
            for (var q = 0; q < rects.length; q++) {
              var rc = rects[q];
              if (px >= rc.x && px <= rc.x + rc.w && py >= rc.y && py <= rc.y + rc.h) { hit = 1; break; }
            }
          }
          inMark[i] = hit;
          if (!hit) continue;
          var cc = i % cols, rr = (i / cols) | 0;
          cue[i] = lattice(cc * 5 + 2, rr * 3 + 11);
          var ang = lattice(cc * 9 + 4, rr * 17 + 1) * 6.2832;
          var dist = 50 + lattice(cc * 13 + 6, rr * 7 + 3) * 110;
          fx[i] = Math.cos(ang) * dist;
          fy[i] = Math.sin(ang) * dist;
        }
      }
    }

    function draw(t, phase) {
      if (phase === undefined) phase = 1;
      ctx.clearRect(0, 0, width, height);
      var inv = 1 / scale;
      var hole = opts.hole;
      var hx = width * 0.5, hy = height * 0.52;
      var hrx = Math.max(300, width * 0.34), hry = Math.max(180, height * 0.3);
      var ox = offsetX * inv, oy = offsetY * inv;
      var dim = "rgba(232,228,220,";
      var bright = "rgba(255,255,255,";
      var assembling = phase < 0;
      var gather = assembling ? phase + 1 : 1;
      var disperse = phase > 0 ? phase : 0;
      for (var i = 0; i < count; i++) {
        if (disperse > 0) {
          var v = marble(xs[i] * inv + ox, ys[i] * inv + oy, t);
          if (v > threshold) {
            var a = (v - threshold) * 5.5;
            if (a > 1) a = 1;
            if (hole) {
              /* Thin the field out behind the headline so the type stays readable. */
              var dx = (xs[i] - hx) / hrx, dy = (ys[i] - hy) / hry;
              var d = dx * dx + dy * dy;
              if (d < 1) a *= d * d;
            }
            if (a >= 0.04) {
              var size = 1.5 + a * 1.4;
              ctx.fillStyle = (a > 0.82 ? bright : dim) + ((0.22 + a * 0.6) * disperse).toFixed(2) + ")";
              ctx.fillRect(xs[i] - size * 0.5, ys[i] - size * 0.5, size, size);
            }
          }
        }
        if (rects && inMark[i] && disperse < 1) {
          /* Each square's point arrives and leaves on its own cue, along its own line. */
          var e, off;
          if (assembling) {
            var g = Math.min(1, Math.max(0, (gather - cue[i] * 0.4) / 0.6));
            e = 1 - Math.pow(1 - g, 3);
            off = 1 - e;
          } else {
            var k = disperse <= 0 ? 0 : Math.min(1, Math.max(0, (disperse - cue[i] * 0.55) / 0.45));
            e = 1 - k * k;
            off = k * k;
          }
          if (e <= 0.001) continue;
          var m = e * (0.86 + 0.14 * Math.sin(t * 2.6 + cue[i] * 6.2832));
          var ms = 2.9 * (0.6 + 0.4 * e);
          var x = xs[i] + fx[i] * off, y = ys[i] + fy[i] * off;
          ctx.fillStyle = bright + (0.12 + 0.88 * m).toFixed(2) + ")";
          ctx.fillRect(x - ms * 0.5, y - ms * 0.5, ms, ms);
        }
      }
    }

    return {
      resize: resize,
      draw: draw,
      setOffset: function (x, y) { offsetX = x; offsetY = y; },
      get width() { return width; },
      get height() { return height; }
    };
  }

  /* Hero: animated field, pinned, fading out as the page scrolls over it. */
  function hero() {
    var canvas = document.getElementById("field");
    var inner = document.getElementById("hero-inner");
    var section = canvas && canvas.parentElement;
    if (!canvas || !inner || !section) return;

    var field = makeField(canvas, { spacing: coarse ? 7 : 6, scale: 240, threshold: 0.5, hole: true, mark: reduceMotion ? null : markRects() });
    if (!field) return;

    var running = false, rafId = 0, tick = 0;
    var start = performance.now();
    var targetX = 0, targetY = 0, curX = 0, curY = 0;
    var progress = 0;

    /* Intro, in seconds: the points fly in and form the mark, hold it, then disperse into the
       field. The headline's CSS delay (--hero-delay) is timed to the dispersal. */
    var ASSEMBLE = [0.1, 0.9], HOLD_END = 1.6, DISPERSE_END = 2.8;
    function phaseAt(sec) {
      if (reduceMotion) return 1;
      if (sec < ASSEMBLE[0]) return -1;
      if (sec < ASSEMBLE[1]) return -1 + (sec - ASSEMBLE[0]) / (ASSEMBLE[1] - ASSEMBLE[0]);
      if (sec < HOLD_END) return 0;
      if (sec < DISPERSE_END) return (sec - HOLD_END) / (DISPERSE_END - HOLD_END);
      return 1;
    }

    function frame(now) {
      if (!running) return;
      tick++;
      var sec = (now - start) / 1000;
      var ph = phaseAt(sec);
      if (ph < 1 || tick % 2 === 0) {
        curX += (targetX - curX) * 0.05;
        curY += (targetY - curY) * 0.05;
        field.setOffset(curX * 40, curY * 30);
        field.draw(sec, ph);
      }
      rafId = requestAnimationFrame(frame);
    }

    function play() {
      if (running || reduceMotion) return;
      running = true;
      rafId = requestAnimationFrame(frame);
    }
    function pause() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    }

    function onScroll() {
      var h = section.offsetHeight || 1;
      var p = Math.min(1, Math.max(0, window.scrollY / (h * 0.85)));
      if (p === progress) return;
      progress = p;
      inner.style.opacity = String(1 - p);
      inner.style.transform = "translateY(" + (-40 * p).toFixed(1) + "px) scale(" + (1 + 0.22 * p).toFixed(3) + ")";
      inner.style.filter = "blur(" + (12 * p).toFixed(1) + "px)";
      canvas.style.opacity = String(1 - p * 0.75);
      if (p >= 1) pause(); else play();
    }

    if (!coarse) {
      section.addEventListener("mousemove", function (e) {
        var rect = section.getBoundingClientRect();
        targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        targetY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      });
      section.addEventListener("mouseleave", function () { targetX = 0; targetY = 0; });
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) pause(); else if (progress < 1) play();
    });

    function resize() {
      field.resize();
      var sec = reduceMotion ? 0 : (performance.now() - start) / 1000;
      field.draw(sec, phaseAt(sec));
    }
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener("resize", resize);
    resize();

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    play();
  }

  /* The mark beside the design lead: the symbol's squares cloned in, ranked from the
     centre out, so the build animation grows outward. Returns a function that replays it. */
  function leadMark() {
    var svg = document.getElementById("lead-mark");
    var symbol = document.getElementById("mark");
    if (!svg || !symbol) return null;
    var ranked = Array.prototype.map.call(symbol.querySelectorAll("rect"), function (r) {
      var cx = +r.getAttribute("x") + r.getAttribute("width") / 2;
      var cy = +r.getAttribute("y") + r.getAttribute("height") / 2;
      return { el: r, d: Math.hypot(cx - 50, cy - 50) };
    }).sort(function (a, b) { return a.d - b.d; });
    ranked.forEach(function (it, i) {
      var c = it.el.cloneNode(false);
      c.style.setProperty("--i", String(i));
      svg.appendChild(c);
    });
    svg.classList.add("is-built");
    return function rebuild() {
      if (reduceMotion) return;
      svg.classList.remove("is-built");
      void svg.getBoundingClientRect();
      svg.classList.add("is-built");
    };
  }

  /* Threat scene: one payment is recorded as ciphertext, the years pass, and then it is
     read. The XYRA copy beside it goes through the same years and stays sealed. */
  function scene() {
    var root = document.getElementById("scene");
    if (!root) return;
    var beatEl = document.getElementById("scene-beat");
    var yearEl = document.getElementById("scene-year");
    var replay = document.getElementById("scene-replay");
    var curveRows = Array.prototype.slice.call(document.querySelectorAll("#scene-curve dd"));
    var xyraRows = Array.prototype.slice.call(document.querySelectorAll("#scene-xyra dd"));
    var stateCurve = document.getElementById("scene-state-curve");
    var stateXyra = document.getElementById("scene-state-xyra");
    var words = Array.prototype.slice.call(document.querySelectorAll("#threat-title span"));
    if (!beatEl || !yearEl || !replay || curveRows.length !== xyraRows.length) return;

    var RECORD = 1400, WAIT = 2000, DECRYPT = 1900;
    var ciphers = [], rafId = 0, t0 = 0;

    function cipher() { return hex(4) + " " + hex(4) + " " + hex(4) + " " + hex(4); }
    function setBeat(i, label) {
      beatEl.textContent = label;
      words.forEach(function (w, k) { w.classList.toggle("is-live", k === i); });
    }
    function setState(el, text, cls) { el.textContent = text; el.className = "scene-state" + (cls ? " " + cls : ""); }
    /* Resolve left to right: settled positions show the plain text, the rest keep churning. */
    function resolved(c, plain, p) {
      var n = Math.round(c.length * p), out = "";
      for (var i = 0; i < c.length; i++) {
        if (i < n) out += i < plain.length ? plain[i] : "";
        else out += c[i] === " " ? " " : HEX[(Math.random() * 16) | 0];
      }
      return out;
    }
    function reset() {
      ciphers = curveRows.map(cipher);
      curveRows.concat(xyraRows).forEach(function (dd) { dd.textContent = " "; dd.classList.remove("is-plain"); });
      yearEl.textContent = "2026";
      setState(stateCurve, "Recorded");
      setState(stateXyra, "Recorded");
      replay.hidden = true;
    }
    function finish() {
      curveRows.forEach(function (dd, i) {
        dd.textContent = dd.getAttribute("data-plain");
        dd.classList.add("is-plain");
        xyraRows[i].textContent = ciphers[i];
      });
      yearEl.textContent = "2035";
      setBeat(2, "Decrypt.");
      setState(stateCurve, "Exposed", "is-exposed");
      setState(stateXyra, "Still sealed", "is-sealed");
    }
    function frame(now) {
      var t = now - t0;
      if (t < RECORD) {
        setBeat(0, "Record.");
        curveRows.forEach(function (dd, i) {
          var p = Math.min(1, Math.max(0, (t - i * 160) / 650));
          var s = ciphers[i].slice(0, Math.round(ciphers[i].length * p));
          dd.textContent = s || " ";
          xyraRows[i].textContent = dd.textContent;
        });
      } else if (t < RECORD + WAIT) {
        setBeat(1, "Wait.");
        var p = (t - RECORD) / WAIT;
        yearEl.textContent = String(2026 + Math.round(p * p * 9));
        curveRows.forEach(function (dd, i) { dd.textContent = ciphers[i]; xyraRows[i].textContent = ciphers[i]; });
        setState(stateCurve, "Copied and kept");
        setState(stateXyra, "Copied and kept");
      } else if (t < RECORD + WAIT + DECRYPT) {
        setBeat(2, "Decrypt.");
        yearEl.textContent = "2035";
        var tt = t - RECORD - WAIT;
        curveRows.forEach(function (dd, i) {
          var q = Math.min(1, Math.max(0, (tt - i * 180) / 850));
          dd.textContent = resolved(ciphers[i], dd.getAttribute("data-plain"), q);
          if (q >= 1) dd.classList.add("is-plain");
          /* The sealed copy churns for a moment under the same attack and settles unchanged. */
          xyraRows[i].textContent = q > 0 && q < 1 ? resolved(ciphers[i], ciphers[i], q) : ciphers[i];
        });
        setState(stateCurve, "Exposed", "is-exposed");
        setState(stateXyra, "Still sealed", "is-sealed");
      } else {
        finish();
        replay.hidden = false;
        return;
      }
      rafId = requestAnimationFrame(frame);
    }
    function play() {
      cancelAnimationFrame(rafId);
      reset();
      t0 = performance.now();
      rafId = requestAnimationFrame(frame);
    }
    replay.addEventListener("click", play);

    if (reduceMotion || !("IntersectionObserver" in window)) { reset(); finish(); return; }
    reset();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); play(); } });
    }, { threshold: 0.4 });
    io.observe(root);
  }

  /* Payment ledger: the hashes settle in like a feed and refresh every few seconds, the
     sizes count up, the sealed note keeps a cursor. */
  function liveLedger() {
    var rows = document.getElementById("ledger-rows");
    if (!rows) return;
    var hexes = Array.prototype.slice.call(rows.querySelectorAll("dd[data-live='hex']"));
    var counts = Array.prototype.slice.call(rows.querySelectorAll("dd[data-live='count']"));
    var timer = 0;

    function value() { return "0x" + hex(4) + "…" + hex(4); }
    function format(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
    function scramble(dd, target, ms) {
      var t0 = performance.now();
      (function step(now) {
        var p = Math.min(1, (now - t0) / ms), n = Math.round(target.length * p), out = "";
        for (var i = 0; i < target.length; i++) {
          var fixed = i < n || i < 2 || target[i] === "…";
          out += fixed ? target[i] : HEX[(Math.random() * 16) | 0];
        }
        dd.textContent = out;
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    }
    function count(dd) {
      var to = +dd.getAttribute("data-to");
      var pre = dd.getAttribute("data-prefix") || "", suf = dd.getAttribute("data-suffix") || "";
      var t0 = performance.now(), ms = 900;
      (function step(now) {
        var p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3);
        dd.textContent = pre + format(Math.round(to * e)) + suf;
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    }
    function start() {
      hexes.forEach(function (dd) { scramble(dd, value(), 700); });
      counts.forEach(count);
      timer = setInterval(function () { hexes.forEach(function (dd) { scramble(dd, value(), 500); }); }, 4500);
    }
    function stop() { clearInterval(timer); timer = 0; }

    if (reduceMotion || !("IntersectionObserver" in window)) return;
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { if (!timer) start(); } else stop(); });
    }, { threshold: 0.2 }).observe(rows);
  }

  /* Narrow screens: the section links live in a panel behind the Menu button. */
  function menu() {
    var btn = document.getElementById("menu-btn");
    var el = document.getElementById("header");
    if (!btn || !el) return;
    function set(open) {
      el.classList.toggle("menu-open", open);
      root.classList.toggle("menu-open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.textContent = open ? "Close" : "Menu";
      if (lenis) { if (open) lenis.stop(); else lenis.start(); }
    }
    btn.addEventListener("click", function () { set(!el.classList.contains("menu-open")); });
    el.querySelectorAll(".nav-links a").forEach(function (a) {
      a.addEventListener("click", function () { set(false); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && el.classList.contains("menu-open")) set(false);
    });
    var wide = window.matchMedia("(min-width: 901px)");
    if (wide.addEventListener) wide.addEventListener("change", function (e) { if (e.matches) set(false); });
  }

  /* Ledger tile: a still frame of the same field inside the payment card. */
  function ledgerTile() {
    var canvas = document.getElementById("ledger-field");
    if (!canvas) return;
    var field = makeField(canvas, { spacing: 5, scale: 120, threshold: 0.52 });
    if (!field) return;
    function render() { field.resize(); field.draw(4.2); }
    if ("ResizeObserver" in window) new ResizeObserver(render).observe(canvas);
    else window.addEventListener("resize", render);
    render();
  }

  /* Header: the pill crunches and the wordmark folds down to the mark once the page has
     scrolled a little; it opens back up only near the top, so it never flickers. */
  function header() {
    var el = document.getElementById("header");
    if (!el) return;
    var compact = false;
    function update() {
      var y = window.scrollY;
      if (!compact && y > 120) { compact = true; el.classList.add("compact"); }
      else if (compact && y < 40) { compact = false; el.classList.remove("compact"); }
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  /* Reveal on scroll. */
  function reveals() {
    var els = document.querySelectorAll(".reveal");
    if (!els.length) return;
    if (!("IntersectionObserver" in window) || reduceMotion) {
      els.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.05 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* Active nav item for the section in view. */
  function activeNav() {
    var links = Array.prototype.slice.call(document.querySelectorAll(".nav-links a[href^='#']"));
    if (!links.length) return;
    var sections = links.map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); });
    var ticking = false;

    /* Pinned sections stay in view behind what follows them, so the active item is the
       last section whose top has crossed the upper part of the viewport. */
    function update() {
      ticking = false;
      var line = window.innerHeight * 0.45;
      var current = null;
      for (var i = 0; i < sections.length; i++) {
        if (sections[i] && sections[i].getBoundingClientRect().top <= line) current = sections[i].id;
      }
      links.forEach(function (a) {
        if (a.getAttribute("href").slice(1) === current) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
    }
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    update();
  }

  /* Carousel: one centred slide, neighbours dimmed, click, drag, dots, arrows. */
  function carousel(onChange) {
    var wrap = document.getElementById("carousel");
    var track = document.getElementById("track");
    var dotsEl = document.getElementById("dots");
    if (!wrap || !track || !dotsEl) return;

    var slides = Array.prototype.slice.call(track.children);
    var quoteEl = document.getElementById("caption-quote");
    var nameEl = document.getElementById("caption-name");
    var detailEl = document.getElementById("caption-detail");
    var index = 1;
    var gap = 24;

    slides.forEach(function (s, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "dot";
      b.setAttribute("role", "tab");
      b.setAttribute("aria-label", s.getAttribute("data-name"));
      b.addEventListener("click", function () { go(i); });
      dotsEl.appendChild(b);
      s.addEventListener("click", function () { if (i !== index) go(i); });
    });

    function slideWidth() {
      var w = Math.min(360, wrap.clientWidth * 0.78);
      wrap.style.setProperty("--slide-w", w + "px");
      return w;
    }

    function layout() {
      var w = slideWidth();
      var offset = wrap.clientWidth / 2 - w / 2 - index * (w + gap);
      track.style.transform = "translate3d(" + offset.toFixed(1) + "px,0,0)";
    }

    function go(i) {
      index = (i + slides.length) % slides.length;
      slides.forEach(function (s, k) {
        s.classList.toggle("is-active", k === index);
        s.setAttribute("aria-hidden", k === index ? "false" : "true");
      });
      Array.prototype.forEach.call(dotsEl.children, function (d, k) {
        d.setAttribute("aria-selected", k === index ? "true" : "false");
      });
      var active = slides[index];
      if (quoteEl) quoteEl.textContent = active.getAttribute("data-quote") || "";
      if (nameEl) nameEl.textContent = active.getAttribute("data-name") || "";
      if (detailEl) detailEl.textContent = active.getAttribute("data-meta") || "";
      layout();
      if (onChange && started) onChange();
    }
    var started = false;

    var startX = null;
    wrap.addEventListener("pointerdown", function (e) { startX = e.clientX; });
    wrap.addEventListener("pointerup", function (e) {
      if (startX === null) return;
      var dx = e.clientX - startX;
      startX = null;
      if (dx < -40) go(index + 1);
      else if (dx > 40) go(index - 1);
    });
    wrap.addEventListener("pointercancel", function () { startX = null; });

    wrap.setAttribute("tabindex", "0");
    wrap.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { go(index + 1); e.preventDefault(); }
      if (e.key === "ArrowLeft") { go(index - 1); e.preventDefault(); }
    });

    if ("ResizeObserver" in window) new ResizeObserver(layout).observe(wrap);
    else window.addEventListener("resize", layout);
    go(index);
    started = true;
  }

  /* Contact: white rays converging on the headline. */
  function rays() {
    var canvas = document.getElementById("rays");
    var section = canvas && canvas.parentElement;
    if (!canvas || !section) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var angles = [-168, -150, -118, -62, -30, -12, 14, 36, 66, 104, 124, 152, 176];
    var seeds = angles.map(function (a, i) { return lattice(i * 17 + 3, i * 29 + 7); });
    var width = 0, height = 0, dpr = 1, rafId = 0, running = false;
    var start = performance.now();
    var targetX = 0, targetY = 0, curX = 0, curY = 0;
    var enter = reduceMotion ? 1 : 0;

    /* How far the section has scrolled into view: 0 as its top meets the bottom of the
       viewport, 1 once it is 70% of the way up. */
    function progress() {
      if (reduceMotion) return 1;
      var r = section.getBoundingClientRect();
      var vh = window.innerHeight || 1;
      return Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.7)));
    }

    function resize() {
      var rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      enter = progress();
      draw(0);
    }

    function draw(t) {
      ctx.clearRect(0, 0, width, height);
      var cx = width / 2 + curX * 30;
      var cy = height / 2 + curY * 20;
      var reach = Math.hypot(width, height);
      var inner = Math.min(width, height) * 0.22;
      for (var i = 0; i < angles.length; i++) {
        var drift = Math.sin(t * 0.25 + seeds[i] * 6.28) * 1.5;
        var a = (angles[i] + drift) * Math.PI / 180;
        /* Each ray slides in from the edge toward the centre as the section scrolls in,
           a little later than the one before it. */
        var local = Math.max(0, Math.min(1, (enter - seeds[i] * 0.45) / 0.55));
        local = 1 - Math.pow(1 - local, 3);
        if (local <= 0) continue;
        var rIn = inner + seeds[i] * inner * 0.9;
        var r0 = reach - (reach - rIn) * local;
        var r1 = reach;
        var x0 = cx + Math.cos(a) * r0, y0 = cy + Math.sin(a) * r0;
        var x1 = cx + Math.cos(a) * r1, y1 = cy + Math.sin(a) * r1;
        ctx.lineCap = "round";
        ctx.strokeStyle = "rgba(255,255,255," + (0.12 * local).toFixed(3) + ")";
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255," + ((0.55 + seeds[i] * 0.45) * local).toFixed(2) + ")";
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
    }

    function frame(now) {
      if (!running) return;
      enter = progress();
      curX += (targetX - curX) * 0.05;
      curY += (targetY - curY) * 0.05;
      draw((now - start) / 1000);
      rafId = requestAnimationFrame(frame);
    }
    function play() { if (running || reduceMotion) return; running = true; rafId = requestAnimationFrame(frame); }
    function pause() { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = 0; }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) play(); else pause(); });
      }, { threshold: 0 }).observe(section);
    } else {
      play();
    }

    if (!coarse) {
      section.addEventListener("mousemove", function (e) {
        var rect = section.getBoundingClientRect();
        targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        targetY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      });
      section.addEventListener("mouseleave", function () { targetX = 0; targetY = 0; });
    }

    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener("resize", resize);
    resize();
  }

  /* Spread headlines: the words start gathered in the centre, read as a sentence,
     and move out to their places as the heading rises into view. */
  function spreadWords() {
    var heads = Array.prototype.slice.call(document.querySelectorAll(".spread"));
    if (!heads.length || reduceMotion) return;
    var items = heads.map(function (h) {
      return { el: h, words: Array.prototype.slice.call(h.children), offsets: [], skip: false };
    }).filter(function (it) { return it.words.length > 1; });
    var ticking = false;

    function measure() {
      items.forEach(function (it) {
        it.words.forEach(function (w) { w.style.transform = ""; });
        var hr = it.el.getBoundingClientRect();
        var cx = hr.left + hr.width / 2;
        var tops = [];
        it.offsets = it.words.map(function (w) {
          var r = w.getBoundingClientRect();
          tops.push(Math.round(r.top));
          return cx - (r.left + r.width / 2);
        });
        /* Once the words wrap onto several lines there is nothing to spread. */
        it.skip = tops.some(function (t) { return Math.abs(t - tops[0]) > 4; });
      });
      update();
    }

    function update() {
      ticking = false;
      var vh = window.innerHeight;
      items.forEach(function (it) {
        if (it.skip) return;
        var r = it.el.getBoundingClientRect();
        var p = Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.6)));
        var e = 1 - Math.pow(1 - p, 3);
        it.words.forEach(function (w, i) {
          w.style.transform = "translate3d(" + (it.offsets[i] * (1 - e)).toFixed(1) + "px,0,0)";
        });
      });
    }

    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });

    var timer = 0;
    function queueMeasure() { clearTimeout(timer); timer = setTimeout(measure, 80); }
    if ("ResizeObserver" in window) {
      var ro = new ResizeObserver(queueMeasure);
      items.forEach(function (it) { ro.observe(it.el); });
    } else {
      window.addEventListener("resize", queueMeasure);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    measure();
  }

  /* Smooth scrolling through Lenis when it loaded; anchors go through it too. */
  function smoothScroll() {
    if (window.Lenis && !reduceMotion) {
      lenis = new window.Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true });
      function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
      /* Back and forward between section links scroll to the section too. */
      window.addEventListener("hashchange", function () {
        var t = location.hash.length > 1 && document.querySelector(location.hash);
        if (t) lenis.scrollTo(t, { offset: location.hash === "#top" ? 0 : -96 });
      });
      /* A link straight to a section lands there at once instead of gliding from the top. */
      if (location.hash && location.hash.length > 1) {
        var initial = document.querySelector(location.hash);
        if (initial) lenis.scrollTo(initial, { immediate: true, offset: location.hash === "#top" ? 0 : -96 });
      }
    } else {
      root.style.scrollBehavior = reduceMotion ? "auto" : "smooth";
    }

    document.querySelectorAll("a[href^='#']").forEach(function (a) {
      var href = a.getAttribute("href");
      if (href === "#") {
        a.addEventListener("click", function (e) { e.preventDefault(); });
        return;
      }
      a.addEventListener("click", function (e) {
        var target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        if (lenis) lenis.scrollTo(target, { offset: href === "#top" ? 0 : -96 });
        else target.scrollIntoView();
        if (history.replaceState) history.replaceState(null, "", href);
      });
    });
  }

  hero();
  ledgerTile();
  header();
  reveals();
  spreadWords();
  activeNav();
  carousel(leadMark());
  scene();
  liveLedger();
  rays();
  menu();
  smoothScroll();
})();
