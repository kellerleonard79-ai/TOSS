(function () {
  // ---- Donation progress -------------------------------------------------
  // Update these two numbers as donations come in. Everything else
  // (bar width, percentage, dollar labels) recalculates from them.
  const CAMPAIGN = {
    raised: 2250,
    goal: 3000,
  };

  const fill = document.querySelector("[data-progress-fill]");
  if (fill) {
    const percent = Math.max(0, Math.min(100, Math.round((CAMPAIGN.raised / CAMPAIGN.goal) * 100)));
    const money = (n) => "$" + n.toLocaleString("en-US");

    fill.style.setProperty("--progress", percent + "%");

    const raisedEl = document.querySelector("[data-raised-text]");
    const goalEl = document.querySelector("[data-goal-text]");
    const percentEl = document.querySelector("[data-percent-text]");
    if (raisedEl) raisedEl.textContent = money(CAMPAIGN.raised);
    if (goalEl) goalEl.textContent = money(CAMPAIGN.goal);
    if (percentEl) percentEl.textContent = percent + "%";
  }

  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav__toggle");
  const links = document.querySelector(".nav__links");

  // Mobile menu
  function setMenu(open) {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    links.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
  }

  if (toggle && links) {
    toggle.addEventListener("click", () => {
      setMenu(toggle.getAttribute("aria-expanded") !== "true");
    });

    links.addEventListener("click", (e) => {
      if (e.target.closest("a")) setMenu(false);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setMenu(false);
        toggle.focus();
      }
    });

    window.matchMedia("(min-width: 768px)").addEventListener("change", (e) => {
      if (e.matches) setMenu(false);
    });
  }

  // Header hairline once the page scrolls
  function onScroll() {
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  }

  if (header) {
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // Footer year
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  // ---- Hero: scroll-scrubbed bead video ----------------------------------
  const hero = document.getElementById("hero");
  const canvas = document.getElementById("hero-canvas");
  const heroLeft = document.querySelector(".hero-scrub__left");
  const heroRight = document.querySelector(".hero-scrub__right");

  if (hero && canvas && heroLeft && heroRight) {
    const FRAME_COUNT = 80;
    const framePath = (i) => `images/frames/frame_${String(i).padStart(3, "0")}.jpg`;

    const ctx = canvas.getContext("2d");
    const frames = [];
    let currentFrame = 0;
    let ticking = false;

    function draw(index) {
      const img = frames[index];
      if (!img || !img.complete || !img.naturalWidth) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }

    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.src = framePath(i + 1);
      if (i === 0) img.onload = () => draw(0);
      frames.push(img);
    }

    // Spread the frames across the entire mission column's height (not
    // just the shorter window the video is actually stuck for), so the
    // beads keep settling all the way to the bottom of the about section
    // instead of freezing on the last frame partway through.
    function updateFrame() {
      ticking = false;
      const scrollable = heroLeft.offsetHeight;
      const progress = scrollable > 0
        ? Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / scrollable))
        : 0;
      const index = Math.min(FRAME_COUNT - 1, Math.round(progress * (FRAME_COUNT - 1)));
      if (index !== currentFrame) {
        currentFrame = index;
        draw(index);
      }
    }

    window.addEventListener("scroll", () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateFrame);
      }
    }, { passive: true });

    window.addEventListener("resize", () => draw(currentFrame));
  }
})();
