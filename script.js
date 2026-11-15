const menuButtons = [...document.querySelectorAll("[data-menu]")];

menuButtons.forEach((button) => {
  button.addEventListener("click", () => {
    menuButtons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    window.onDalgeulMenu?.(button.dataset.menu);
  });
});

const tabs = [...document.querySelectorAll('[role="tab"]')];
const requiredPanel = document.getElementById("panel-0");
const faqPanels = document.createElement("div");
faqPanels.className = "faq-panels";
requiredPanel.before(faqPanels);
faqPanels.append(...document.querySelectorAll(".faq-panel"));

// Use the taller of 필수사항 and 기타사항 with all answers open.
[requiredPanel, document.getElementById("panel-4")].forEach((panel) => {
  const reference = document.createElement("div");
  reference.className = "faq-height-reference";
  reference.inert = true;
  reference.setAttribute("aria-hidden", "true");
  reference.append(...Array.from(panel.children, (row) => row.cloneNode(true)));
  reference.querySelectorAll("details").forEach((row) => { row.open = true; });
  faqPanels.append(reference);
});

function selectTab(selected, focus = false) {
  tabs.forEach((tab) => {
    const active = tab === selected;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
    tab.querySelector("img").src = `assets/${active ? tab.dataset.activeIcon : tab.dataset.icon}.svg`;
    document.getElementById(tab.getAttribute("aria-controls")).hidden = !active;
  });

  if (focus) selected.focus({ preventScroll: true });
  selected.scrollIntoView({ block: "nearest", inline: "nearest" });
}

tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectTab(tab));
  tab.addEventListener("keydown", (event) => {
    const next = {
      ArrowLeft: (index - 1 + tabs.length) % tabs.length,
      ArrowRight: (index + 1) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    }[event.key];

    if (next === undefined) return;
    event.preventDefault();
    selectTab(tabs[next], true);
  });
});

const banner = document.querySelector(".banner");
const track = banner.querySelector(".banner-track");
const bannerTemplate = document.getElementById("banner-template");

bannerItems.forEach((item, index) => {
  const slide = bannerTemplate.content.firstElementChild.cloneNode(true);
  slide.setAttribute("aria-label", `${index + 1}번째 배너`);
  const image = slide.querySelector(".slide-image");
  if (item.image) {
    image.src = item.image;
    image.hidden = false;
  }
  slide.querySelector(".slide-title").textContent = item.title;
  slide.querySelector(".slide-copy p").textContent = item.description;

  const visit = slide.querySelector(".visit");
  visit.dataset.visit = item.id;
  visit.addEventListener("click", () => {
    if (typeof window.onDalgeulVisit === "function") {
      window.onDalgeulVisit(item.id, item.link);
    } else if (item.link) {
      window.location.assign(item.link);
    }
  });
  track.append(slide);
});

const slides = [...track.children];
banner.hidden = slides.length === 0;
banner.querySelectorAll(".banner-controls button").forEach((button) => {
  button.disabled = slides.length < 2;
});
const slideNumber = document.getElementById("current-slide");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const autoplayDelay = 5000;
let activeSlide = 0;
let autoplay;

document.getElementById("slide-total").textContent = slides.length;

function refreshSlide() {
  activeSlide = Math.min(slides.length - 1, Math.round(track.scrollLeft / track.clientWidth));
  slideNumber.textContent = activeSlide + 1;
}

function moveSlide(direction) {
  if (slides.length < 2) return;
  const next = (activeSlide + direction + slides.length) % slides.length;
  const wraps = Math.abs(next - activeSlide) > 1;
  track.scrollTo({
    left: next * track.clientWidth,
    behavior: wraps || reducedMotion.matches ? "instant" : "smooth",
  });
}

function restartAutoplay() {
  clearTimeout(autoplay);

  if (slides.length < 2 || document.hidden || reducedMotion.matches || banner.matches(":hover, :focus-within")) return;
  autoplay = setTimeout(() => {
    moveSlide(1);
    restartAutoplay();
  }, autoplayDelay);
}

banner.querySelector(".banner-prev").addEventListener("click", () => moveSlide(-1));
banner.querySelector(".banner-next").addEventListener("click", () => moveSlide(1));
banner.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  moveSlide(event.key === "ArrowLeft" ? -1 : 1);
});

track.addEventListener("scroll", () => {
  refreshSlide();
  restartAutoplay();
}, { passive: true });

["mouseenter", "mouseleave", "focusin", "focusout"].forEach((event) => {
  banner.addEventListener(event, () => requestAnimationFrame(restartAutoplay));
});

document.addEventListener("visibilitychange", restartAutoplay);
reducedMotion.addEventListener("change", restartAutoplay);

function enableMouseDrag(scroller, onRelease) {
  let start;
  let suppressClick = false;

  scroller.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    suppressClick = false;
    start = { x: event.clientX, scroll: scroller.scrollLeft, id: event.pointerId };
  });

  scroller.addEventListener("pointermove", (event) => {
    if (!start || event.pointerId !== start.id || !event.buttons) return;
    const distance = event.clientX - start.x;
    if (!suppressClick && Math.abs(distance) < 6) return;

    if (!suppressClick) {
      suppressClick = true;
      scroller.setPointerCapture(event.pointerId);
      scroller.classList.add("is-dragging");
    }
    scroller.scrollLeft = start.scroll - distance;
  });

  function finish(event) {
    if (!start || event.pointerId !== start.id) return;
    const drag = start;
    start = undefined;

    if (!suppressClick) return;
    scroller.classList.remove("is-dragging");
    onRelease?.(drag, event.clientX - drag.x);
  }

  window.addEventListener("pointerup", finish);
  window.addEventListener("pointercancel", finish);

  scroller.addEventListener("click", (event) => {
    if (!suppressClick || event.detail === 0) return;
    suppressClick = false;
    event.preventDefault();
    event.stopPropagation();
  }, true);
}

document.querySelectorAll(".scroll-row").forEach((row) => enableMouseDrag(row));
if (slides.length > 1) enableMouseDrag(track, (start, distance) => {
  const initial = Math.round(start.scroll / track.clientWidth);
  const direction = Math.abs(distance) < 32 ? 0 : -Math.sign(distance);
  const next = (initial + direction + slides.length) % slides.length;
  track.scrollTo({
    left: next * track.clientWidth,
    behavior: Math.abs(next - initial) > 1 || reducedMotion.matches ? "instant" : "smooth",
  });
});

restartAutoplay();

