(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia("(pointer: coarse)").matches;

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

  /* Dotted field: a grid of jittered points, lit where the noise runs high. */
  function makeField(canvas, opts) {
    var ctx = canvas.getContext("2d");
    if (!ctx) return null;

    var spacing = opts.spacing || 6;
    var scale = opts.scale || 230;
    var threshold = opts.threshold || 0.5;
    var width = 0, height = 0, dpr = 1;
    var xs = new Float32Array(0), ys = new Float32Array(0), count = 0;
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
    }

    function draw(t) {
      ctx.clearRect(0, 0, width, height);
      var inv = 1 / scale;
      var hole = opts.hole;
      var hx = width * 0.5, hy = height * 0.52;
      var hrx = Math.max(300, width * 0.34), hry = Math.max(180, height * 0.3);
      var ox = offsetX * inv, oy = offsetY * inv;
      var dim = "rgba(232,228,220,";
      var bright = "rgba(255,255,255,";
      for (var i = 0; i < count; i++) {
        var v = marble(xs[i] * inv + ox, ys[i] * inv + oy, t);
        if (v <= threshold) continue;
        var a = (v - threshold) * 5.5;
        if (a > 1) a = 1;
        if (hole) {
          /* Thin the field out behind the headline so the type stays readable. */
          var dx = (xs[i] - hx) / hrx, dy = (ys[i] - hy) / hry;
          var d = dx * dx + dy * dy;
          if (d < 1) { a *= d * d; if (a < 0.04) continue; }
        }
        var size = 1.5 + a * 1.4;
        ctx.fillStyle = (a > 0.82 ? bright : dim) + (0.22 + a * 0.6).toFixed(2) + ")";
        ctx.fillRect(xs[i] - size * 0.5, ys[i] - size * 0.5, size, size);
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

    var field = makeField(canvas, { spacing: coarse ? 7 : 6, scale: 240, threshold: 0.5, hole: true });
    if (!field) return;

    var running = false, rafId = 0, tick = 0;
    var start = performance.now();
    var targetX = 0, targetY = 0, curX = 0, curY = 0;
    var progress = 0;

    function frame(now) {
      if (!running) return;
      tick++;
      if (tick % 2 === 0) {
        curX += (targetX - curX) * 0.05;
        curY += (targetY - curY) * 0.05;
        field.setOffset(curX * 40, curY * 30);
        field.draw((now - start) / 1000);
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
      field.draw(reduceMotion ? 0 : (performance.now() - start) / 1000);
    }
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener("resize", resize);
    resize();

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    play();
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

  /* Header: wordmark collapses to the glyph once the hero is gone. */
  function header() {
    var el = document.getElementById("header");
    var heroEl = document.getElementById("top");
    if (!el || !heroEl) return;
    function update() {
      var past = window.scrollY > (heroEl.offsetHeight || 600) * 0.6;
      el.classList.toggle("compact", past);
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
  function carousel() {
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
    }

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
    var enter = reduceMotion ? 1 : 0, enterStart = 0, entered = reduceMotion;

    function resize() {
      var rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
        /* Each ray starts a little later than the last and eases out to the edge. */
        var local = Math.max(0, Math.min(1, (enter - seeds[i] * 0.4) / 0.6));
        local = 1 - Math.pow(1 - local, 3);
        if (local <= 0) continue;
        var r0 = inner + seeds[i] * inner * 0.9;
        var r1 = r0 + (reach - r0) * local;
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
      if (entered && enter < 1) enter = Math.min(1, (now - enterStart) / 1600);
      curX += (targetX - curX) * 0.05;
      curY += (targetY - curY) * 0.05;
      draw((now - start) / 1000);
      rafId = requestAnimationFrame(frame);
    }
    function play() { if (running || reduceMotion) return; running = true; rafId = requestAnimationFrame(frame); }
    function pause() { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = 0; }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) { pause(); return; }
          if (!entered && e.intersectionRatio >= 0.2) { entered = true; enterStart = performance.now(); }
          play();
        });
      }, { threshold: [0, 0.2] }).observe(section);
    } else {
      entered = true; enterStart = performance.now();
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
    var lenis = null;
    if (window.Lenis && !reduceMotion) {
      lenis = new window.Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true });
      function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
      /* Back and forward between section links scroll to the section too. */
      window.addEventListener("hashchange", function () {
        var t = location.hash.length > 1 && document.querySelector(location.hash);
        if (t) lenis.scrollTo(t, { offset: location.hash === "#top" ? 0 : -64 });
      });
      /* A link straight to a section lands there at once instead of gliding from the top. */
      if (location.hash && location.hash.length > 1) {
        var initial = document.querySelector(location.hash);
        if (initial) lenis.scrollTo(initial, { immediate: true, offset: location.hash === "#top" ? 0 : -64 });
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
        if (lenis) lenis.scrollTo(target, { offset: href === "#top" ? 0 : -64 });
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
  carousel();
  rays();
  smoothScroll();
})();
