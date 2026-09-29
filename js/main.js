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

    // Distance scrolled (from the hero's top) at which the mission box is
    // centered in the window, i.e. where the scroll sticks. 0 off desktop.
    function desktopStickScroll() {
      const box = heroLeft.querySelector(".mission-box");
      if (!box || !window.matchMedia("(min-width: 901px)").matches) return 0;
      const headerH = header ? header.offsetHeight : 0;
      const target = headerH + (window.innerHeight - headerH) / 2;
      const boxCenter = box.getBoundingClientRect().top + box.offsetHeight / 2;
      return boxCenter - hero.getBoundingClientRect().top - target;
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

    // Desktop: size the space under the mission box so that, with the next
    // section's band at the bottom of the window, the box sits the same
    // distance from the header as from the band.
    const missionBox = heroLeft.querySelector(".mission-box");
    const desktop = window.matchMedia("(min-width: 901px)");

    function balanceMissionSpacing() {
      if (!missionBox || !desktop.matches) {
        heroLeft.style.removeProperty("--mission-space-below");
        return;
      }
      const headerH = header ? header.offsetHeight : 0;
      const space = (window.innerHeight - headerH - missionBox.offsetHeight) / 2;
      heroLeft.style.setProperty("--mission-space-below", `${Math.max(72, Math.round(space))}px`);
    }

    balanceMissionSpacing();
    window.addEventListener("resize", balanceMissionSpacing);

    // Desktop: make the wheel "stick" for a moment when the mission box
    // reaches the middle of the window, before the green section comes in.
    // Scrolling stops exactly at the centered position and only continues
    // once the visitor has scrolled STICK_DISTANCE more pixels.
    const STICK_DISTANCE = 400;
    const GESTURE_GAP = 140; // ms of quiet that ends a swipe (and its momentum)
    const REARM_DISTANCE = 240;
    let stuck = false;
    let stuckAmount = 0;
    const LOCK_MS = 900; // momentum from the landing swipe is over by then
    let stuckAt = 0;
    let lastWheel = 0;
    let freshGesture = false;
    let spent = false; // already stuck once; re-arms after moving away

    function offCenter() {
      const headerH = header ? header.offsetHeight : 0;
      const target = headerH + (window.innerHeight - headerH) / 2;
      const rect = missionBox.getBoundingClientRect();
      return rect.top + rect.height / 2 - target; // >0: box is below center
    }

    function land(now) {
      window.scrollBy({ top: offCenter(), behavior: "instant" });
      stuck = true;
      freshGesture = false;
      stuckAt = now;
      stuckAmount = 0;
    }

    if (missionBox && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // A fast swipe can scroll past the center before the wheel handler
      // sees it (the browser scrolls off the main thread), so also catch
      // the crossing after the fact and pull the page back to the center.
      let lastOff = null;
      window.addEventListener("scroll", () => {
        if (!desktop.matches) { lastOff = null; return; }
        const off = offCenter();
        const prev = lastOff;
        lastOff = off;
        if (prev === null || stuck) return;
        if (spent && Math.abs(off) > REARM_DISTANCE) spent = false;
        if (spent) return;
        const wheeling = performance.now() - lastWheel < 300;
        const crossed = (prev > 0 && off <= 0) || (prev < 0 && off >= 0);
        if (wheeling && crossed) land(performance.now());
      }, { passive: true });

      window.addEventListener("wheel", (e) => {
        if (!desktop.matches || e.ctrlKey || e.deltaY === 0) return;
        const off = offCenter();

        // Scrolled away by other means (scrollbar, keys, jump link): let go
        // so the wheel is never swallowed away from the center.
        if (stuck && Math.abs(off) > 60) {
          stuck = false;
          spent = false;
        }

        const now = performance.now();
        const gap = now - lastWheel;
        lastWheel = now;

        if (spent && Math.abs(off) > REARM_DISTANCE) spent = false;
        if (spent && !stuck) return;

        if (stuck) {
          e.preventDefault();
          // The swipe that landed here (and its momentum tail) is swallowed
          // whole; only a new gesture after a pause can push past.
          if (gap > GESTURE_GAP || now - stuckAt > LOCK_MS) freshGesture = true;
          if (!freshGesture) return;
          if (gap > 400) stuckAmount = 0; // must keep pushing, not tap
          stuckAmount += Math.abs(e.deltaY);
          if (stuckAmount >= STICK_DISTANCE) {
            stuck = false;
            spent = true;
          }
          return;
        }

        // Would this wheel step carry the box across the center line?
        const crossing = (e.deltaY > 0 && off > 0 && off - e.deltaY <= 0)
          || (e.deltaY < 0 && off < 0 && off - e.deltaY >= 0);
        if (crossing) {
          e.preventDefault();
          land(now);
        }
      }, { passive: false });
    }
  }
})();
