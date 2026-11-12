document.addEventListener("DOMContentLoaded", () => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // PHOTO SLOTS: if a photo file is missing, show a tinted placeholder naming the file to add
  function watchImage(img) {
    const box = img.closest(".ph");
    if (!box) return;
    const miss = () => { box.classList.add("missing"); box.dataset.slot = "Add photo: " + img.getAttribute("src"); };
    img.addEventListener("error", miss);
    if (img.complete && img.naturalWidth === 0) miss();
  }
  $$(".ph img").forEach(watchImage);

  // MOBILE NAV + HEADER
  const header = $(".header"), menu = $(".menu-toggle"), nav = $(".nav");
  if (menu && nav) {
    menu.addEventListener("click", () => menu.setAttribute("aria-expanded", nav.classList.toggle("open")));
    $$("a", nav).forEach(a => a.addEventListener("click", () => { nav.classList.remove("open"); menu.setAttribute("aria-expanded", "false"); }));
  }
  const toTop = document.createElement("button");
  toTop.className = "to-top"; toTop.setAttribute("aria-label", "Back to top"); toTop.textContent = "↑";
  toTop.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));
  document.body.appendChild(toTop);
  const onScroll = () => {
    header && header.classList.toggle("scrolled", scrollY > 30);
    toTop.classList.toggle("show", scrollY > 600);
  };
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  // SLIDING CAROUSELS (.slider > .track, optional .controls with prev/next/.dots, .progress)
  function slider(root, delay) {
    const track = $(".track", root), slides = [...track.children];
    const prev = $(".prev", root), next = $(".next", root), dotsBox = $(".dots", root), bar = $(".progress", root);
    let i = 0, timer, startX = null;
    const per = () => root.dataset.per === "auto" ? (innerWidth > 900 ? 3 : innerWidth > 600 ? 2 : 1) : 1;
    const max = () => Math.max(0, slides.length - per());
    function dots() {
      if (!dotsBox) return;
      dotsBox.innerHTML = "";
      for (let n = 0; n <= max(); n++) {
        const d = document.createElement("button");
        d.type = "button"; d.setAttribute("aria-label", "Go to slide " + (n + 1));
        d.addEventListener("click", () => { go(n); play(); });
        dotsBox.appendChild(d);
      }
    }
    function go(n) {
      i = n > max() ? 0 : n < 0 ? max() : n;
      root.style.setProperty("--per", per());
      track.style.transform = `translateX(-${(i * 100) / per()}%)`;
      slides.forEach((s, k) => { s.classList.toggle("active", k >= i && k < i + per()); s.setAttribute("aria-hidden", !(k >= i && k < i + per())); });
      if (dotsBox) [...dotsBox.children].forEach((d, k) => d.classList.toggle("active", k === i));
      if (bar && delay) { bar.classList.remove("run"); void bar.offsetWidth; bar.classList.add("run"); }
    }
    function play() {
      clearInterval(timer);
      if (!delay || reduce) return;
      timer = setInterval(() => go(i + 1), delay);
      if (bar) { bar.classList.remove("run"); void bar.offsetWidth; bar.classList.add("run"); }
    }
    prev && prev.addEventListener("click", () => { go(i - 1); play(); });
    next && next.addEventListener("click", () => { go(i + 1); play(); });
    root.addEventListener("mouseenter", () => { clearInterval(timer); bar && bar.classList.remove("run"); });
    root.addEventListener("mouseleave", play);
    root.addEventListener("touchstart", e => { startX = e.touches[0].clientX; }, { passive: true });
    root.addEventListener("touchend", e => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX; startX = null;
      if (Math.abs(dx) > 45) { go(i + (dx < 0 ? 1 : -1)); play(); }
    });
    root.addEventListener("keydown", e => {
      if (e.key === "ArrowRight") { go(i + 1); play(); }
      if (e.key === "ArrowLeft") { go(i - 1); play(); }
    });
    addEventListener("resize", () => { dots(); go(Math.min(i, max())); });
    dots(); go(0); play();
  }
  $$(".slider").forEach(s => slider(s, Number(s.dataset.autoplay) || 0));

  // PAGE BANNER PHOTOS: add assets/images/banner-<page>.jpg and it appears automatically
  const page = (location.pathname.split("/").pop() || "index.html").replace(".html", "");
  const banner = $(".page-banner");
  if (banner && page !== "index") {
    const src = `assets/images/banner-${page}.jpg`, probe = new Image();
    probe.onload = () => {
      const div = document.createElement("div");
      div.className = "banner-photo";
      div.innerHTML = `<img src="${src}" alt="" loading="lazy">`;
      banner.appendChild(div);
    };
    probe.src = src;
  }

  // SECTION HEADINGS FADE IN ONCE
  if ("IntersectionObserver" in window && !reduce) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .2 });
    $$(".section-heading, .intro-grid > div, .full-program").forEach(el => { el.classList.add("reveal"); io.observe(el); });
  }

  // GALLERY FILTERS + VIEWER
  const filters = $$(".filter-btn"), items = $$(".gallery-item");
  filters.forEach(b => b.addEventListener("click", () => {
    filters.forEach(x => x.classList.remove("active")); b.classList.add("active");
    items.forEach(it => { it.hidden = !(b.dataset.filter === "all" || it.dataset.category === b.dataset.filter); });
  }));
  const viewer = $("#imageViewer"), vImg = $("#viewerImage");
  if (viewer && vImg) {
    const close = () => { viewer.classList.remove("open"); document.body.style.overflow = ""; vImg.src = ""; };
    items.forEach(it => it.addEventListener("click", () => {
      const img = $("img", it);
      vImg.src = img.src; vImg.alt = img.alt;
      viewer.classList.add("open"); document.body.style.overflow = "hidden";
    }));
    $(".viewer-close", viewer).addEventListener("click", close);
    viewer.addEventListener("click", e => { if (e.target === viewer) close(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  }

  // CONTACT FORM (opens the visitor's email app)
  const form = $("#contactForm");
  if (form) {
    form.addEventListener("submit", e => {
      e.preventDefault();
      const f = new FormData(form);
      const to = "herabilityinitiative@gmail.com"; // replace with the official email
      const subject = encodeURIComponent("Website enquiry: " + f.get("subject"));
      const body = encodeURIComponent(`Name: ${f.get("name")}\nEmail: ${f.get("email")}\nSubject: ${f.get("subject")}\n\nMessage:\n${f.get("message")}`);
      location.href = `mailto:${to}?subject=${subject}&body=${body}`;
    });
  }

  $$(".year").forEach(el => { el.textContent = new Date().getFullYear(); });
});

document.addEventListener("DOMContentLoaded", () => {
  // PROGRAM SEARCH
  const search = document.querySelector("#programSearch");
  const programCards = [...document.querySelectorAll(".searchable-program")];
  const searchStatus = document.querySelector("#programSearchStatus");
  const noPrograms = document.querySelector("#noPrograms");

  if (search && programCards.length) {
    search.addEventListener("input", () => {
      const query = search.value.trim().toLowerCase();
      let visible = 0;

      programCards.forEach(card => {
        const text = (
          card.innerText + " " + (card.dataset.search || "")
        ).toLowerCase();

        const match = text.includes(query);
        card.hidden = !match;
        if (match) visible++;
      });

      if (searchStatus) {
        searchStatus.textContent = query
          ? `Showing ${visible} of ${programCards.length} program areas`
          : `Showing all ${programCards.length} program areas`;
      }

      if (noPrograms) noPrograms.hidden = visible !== 0;
    });
  }

  // EXPAND / COLLAPSE PROGRAM DETAILS
  document.querySelectorAll(".program-expand").forEach(button => {
    button.addEventListener("click", () => {
      const details = button.nextElementSibling;
      if (!details) return;

      const isOpen = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!isOpen));
      details.hidden = isOpen;

      const symbol = button.querySelector(".expand-symbol");
      if (symbol) symbol.textContent = isOpen ? "+" : "−";
    });
  });

  // COPY M-PESA DETAILS
  const feedback = document.querySelector("#copyFeedback");

  document.querySelectorAll("[data-copy]").forEach(button => {
    button.addEventListener("click", async () => {
      const value = button.dataset.copy;
      if (!value) return;

      try {
        await navigator.clipboard.writeText(value);
        button.textContent = "Copied!";
        if (feedback) feedback.textContent = `${value} copied to clipboard.`;
      } catch {
        // Fallback for browsers that do not support Clipboard API.
        const field = document.createElement("textarea");
        field.value = value;
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();

        try {
          document.execCommand("copy");
          button.textContent = "Copied!";
          if (feedback) feedback.textContent = `${value} copied to clipboard.`;
        } catch {
          if (feedback) feedback.textContent = `Please copy manually: ${value}`;
        }

        field.remove();
      }

      window.setTimeout(() => {
        button.textContent = "Copy";
      }, 1800);
    });
  });

  // PRESELECT CONTACT SUBJECT FROM GET-INVOLVED LINKS
  const subject = document.querySelector("#subject");
  const params = new URLSearchParams(window.location.search);
  const requestedSubject = params.get("subject");

  if (subject && requestedSubject) {
    const option = [...subject.options].find(
      item => item.text.toLowerCase() === requestedSubject.toLowerCase()
    );

    if (option) subject.value = option.value;
  }

  // ACCESSIBLE DETAILS ACCORDION: keep multiple cards independently expandable.
  document.querySelectorAll(".interactive-card").forEach(card => {
    card.addEventListener("toggle", () => {
      const hint = card.querySelector(".card-hint");
      if (!hint) return;
      hint.textContent = card.open
        ? "Close −"
        : (card.closest(".values-section") ? "Explore +" : "Learn more +");
    });
  });
});
