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
    // Reach the final frame right as the mission heading + copy have fully
    // scrolled into view below the header, so the beads finish settling
    // exactly when the reader can see the whole "about" block at once.
    const SCRUB_SPEED = 2;

    const missionBox = heroLeft.querySelector(".mission-box");
    const missionAnchor = heroLeft.querySelector(".mission-anchor");
    const missionRunway = heroLeft.querySelector(".mission-runway");
    const desktop = window.matchMedia("(min-width: 901px)");

    // Window offset that centers the mission box under the header; the box
    // pins here while the page scrolls through its runway.
    function missionStickTop() {
      const headerH = header ? header.offsetHeight : 0;
      return headerH + (window.innerHeight - headerH - missionBox.offsetHeight) / 2;
    }

    // Distance scrolled (from the hero's top) at which the box pins, i.e.
    // where the scroll sticks. Measured from the anchor, which stays in
    // normal flow while the sticky box is frozen. 0 off desktop.
    function desktopStickScroll() {
      if (!missionBox || !missionAnchor || !desktop.matches) return 0;
      return missionAnchor.getBoundingClientRect().top - hero.getBoundingClientRect().top - missionStickTop();
    }

    function updateFrame() {
      ticking = false;
      let progress;
      const stickY = desktopStickScroll();
      if (stickY > 0) {
        // Desktop: land on the final frame exactly where the scroll sticks.
        progress = Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / stickY));
      } else {
        const scrollable = heroLeft.offsetHeight;
        const rawProgress = scrollable > 0
          ? Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / scrollable))
          : 0;
        progress = Math.min(1, rawProgress * SCRUB_SPEED);
      }
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

    window.addEventListener("resize", () => { draw(currentFrame); updateFrame(); });

    // Desktop: pin the box centered under the header during the stick, and
    // size the space under it so that, once the hold ends and the next
    // section's band reaches the bottom of the window, the box sits the same
    // distance from the header as from the band.
    function balanceMissionSpacing() {
      if (!missionBox || !desktop.matches) {
        heroLeft.style.removeProperty("--mission-space-below");
        heroLeft.style.removeProperty("--mission-stick-top");
        return;
      }
      const headerH = header ? header.offsetHeight : 0;
      const space = (window.innerHeight - headerH - missionBox.offsetHeight) / 2;
      heroLeft.style.setProperty("--mission-space-below", `${Math.max(72, Math.round(space))}px`);
      heroLeft.style.setProperty("--mission-stick-top", `${Math.round(missionStickTop())}px`);
      updateFrame();
    }

    balanceMissionSpacing();
    window.addEventListener("resize", balanceMissionSpacing);
    // Web fonts and late layout change the box's height after first paint.
    window.addEventListener("load", balanceMissionSpacing);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(balanceMissionSpacing);
    if (window.ResizeObserver && missionBox) new ResizeObserver(balanceMissionSpacing).observe(missionBox);

    // Desktop: catch a swipe at the stick. CSS pins the box through the
    // runway; this stops a fling from carrying on through it. Trackpad
    // momentum can't be cancelled with preventDefault (browsers only honor
    // that on a gesture's first wheel event), so instead the page is put
    // back at the edge of the hold and scrolling is switched off until the
    // swipe's momentum dies out. The box is pinned the whole time, so the
    // correction is invisible. A new swipe then scrolls through the hold.
    const QUIET_MS = 160;  // no wheel events for this long = swipe is over
    const MIN_LOCK_MS = 450;
    const MAX_LOCK_MS = 2500;
    let lastScrollY = window.scrollY;
    let lastWheel = 0;
    let lockedAt = 0;
    let lockTimer = 0;

    function holdRange() {
      const start = window.scrollY + hero.getBoundingClientRect().top + desktopStickScroll();
      return { start, end: start + (missionRunway ? missionRunway.offsetHeight : 0) };
    }

    function unlock() {
      lockedAt = 0;
      clearTimeout(lockTimer);
      document.body.classList.remove("scroll-held");
    }

    function checkUnlock() {
      const now = performance.now();
      const held = now - lockedAt;
      if (held >= MAX_LOCK_MS || (held >= MIN_LOCK_MS && now - lastWheel >= QUIET_MS)) {
        unlock();
      } else {
        lockTimer = setTimeout(checkUnlock, 50);
      }
    }

    function lockAt(y) {
      window.scrollTo({ top: y, behavior: "instant" });
      lockedAt = performance.now();
      document.body.classList.add("scroll-held");
      clearTimeout(lockTimer);
      lockTimer = setTimeout(checkUnlock, 50);
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (missionBox && missionAnchor && missionRunway) {
      window.addEventListener("wheel", () => {
        lastWheel = performance.now();
      }, { passive: true });

      window.addEventListener("scroll", () => {
        const y = window.scrollY;
        const prev = lastScrollY;
        lastScrollY = y;
        // Only wheel/trackpad swipes are caught, never scrollbar drags,
        // keyboard or link jumps.
        if (lockedAt || !desktop.matches || reducedMotion.matches) return;
        if (performance.now() - lastWheel > 250) return;
        const { start, end } = holdRange();
        if (end - start < 1) return;
        if (prev < start - 1 && y > start) lockAt(start);     // coming down
        else if (prev > end + 1 && y < end) lockAt(end);      // coming back up
      }, { passive: true });
    }
  }
})();
