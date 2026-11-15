(function initDalgeul() {
const root = document.getElementById("dalgeul-post");
if (!root || root.dataset.dalgeulInitialized) return;
root.dataset.dalgeulInitialized = "true";

const menuButtons = [...root.querySelectorAll("[data-menu]")];

menuButtons.forEach((button) => {
  button.addEventListener("click", () => {
    menuButtons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    window.onDalgeulMenu?.(button.dataset.menu);
  });
});

const banner = root.querySelector(".banner");
if (!banner) return;
const track = banner.querySelector(".banner-track");
const bannerTemplate = track.querySelector(".slide");
if (!bannerTemplate || !Array.isArray(window.dalgeulBannerItems) || !window.dalgeulBannerItems.length) return;
track.replaceChildren();

window.dalgeulBannerItems.forEach((item, index) => {
  const slide = bannerTemplate.cloneNode(true);
  slide.setAttribute("aria-label", `${index + 1}번째 배너`);
  if (item.image) {
    const image = document.createElement("img");
    image.className = "slide-image";
    image.src = item.image;
    image.alt = "";
    slide.prepend(image);
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
  button.textContent = button.classList.contains("banner-prev") ? "‹" : "›";
});
const slideNumber = root.querySelector("#current-slide");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const autoplayDelay = 5000;
let activeSlide = 0;
let autoplay;

root.querySelector("#slide-total").textContent = slides.length;

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

root.querySelectorAll(".scroll-row").forEach((row) => enableMouseDrag(row));
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


})();
