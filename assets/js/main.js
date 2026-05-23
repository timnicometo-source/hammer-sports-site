async function loadIncludes() {
  const header = document.getElementById("site-header");
  const footer = document.getElementById("site-footer");

  try {
    if (header) {
      const response = await fetch("/includes/header.html");

      if (!response.ok) {
        throw new Error(`Header include failed: ${response.status}`);
      }

      header.innerHTML = await response.text();
    }

    if (footer) {
      const response = await fetch("/includes/footer.html");

      if (!response.ok) {
        throw new Error(`Footer include failed: ${response.status}`);
      }

      footer.innerHTML = await response.text();
    }

    initMobileNav();
    initDropdowns();
    setActiveNavLink();
    setCurrentYear();
  } catch (error) {
    console.error("Include loading error:", error);
  }
}

function initMobileNav() {
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.querySelector(".nav-menu");

  if (!toggle || !menu) return;

  toggle.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
}

function initDropdowns() {
  const dropdowns = document.querySelectorAll(".has-dropdown");

  dropdowns.forEach((dropdown) => {
    const button = dropdown.querySelector(".dropdown-toggle");

    if (!button) return;

    button.addEventListener("click", (event) => {
      event.preventDefault();

      dropdowns.forEach((otherDropdown) => {
        if (otherDropdown !== dropdown) {
          otherDropdown.classList.remove("is-open");
        }
      });

      dropdown.classList.toggle("is-open");
    });
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".has-dropdown")) {
      dropdowns.forEach((dropdown) => dropdown.classList.remove("is-open"));
    }
  });
}

function setActiveNavLink() {
  const currentPath = normalizePath(window.location.pathname);
  const navLinks = document.querySelectorAll(".nav-menu a");

  navLinks.forEach((link) => {
    const linkPath = normalizePath(new URL(link.href).pathname);

    if (linkPath === currentPath) {
      link.classList.add("is-active");
    }
  });
}

function normalizePath(path) {
  if (!path || path === "/index.html") return "/";
  return path.endsWith("/") ? path : `${path}/`;
}

function setCurrentYear() {
  const yearElement = document.getElementById("current-year");

  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
}function initPhotoSlideshows() {
  const slideshows = document.querySelectorAll("[data-photo-slideshow]");

  slideshows.forEach((slideshow) => {
    const slides = Array.from(slideshow.querySelectorAll(".photo-slide"));
    const dots = Array.from(slideshow.querySelectorAll(".photo-dot"));

    if (slides.length <= 1) return;

    let currentIndex = 0;
    let intervalId;

    function showSlide(index) {
      slides[currentIndex].classList.remove("is-active");

      if (dots[currentIndex]) {
        dots[currentIndex].classList.remove("is-active");
      }

      currentIndex = index;

      slides[currentIndex].classList.add("is-active");

      if (dots[currentIndex]) {
        dots[currentIndex].classList.add("is-active");
      }
    }

    function showNextSlide() {
      const nextIndex = (currentIndex + 1) % slides.length;
      showSlide(nextIndex);
    }

    function startSlideshow() {
      intervalId = setInterval(showNextSlide, 4500);
    }

    function resetSlideshow() {
      clearInterval(intervalId);
      startSlideshow();
    }

    dots.forEach((dot, index) => {
      dot.addEventListener("click", () => {
        showSlide(index);
        resetSlideshow();
      });
    });

    startSlideshow();
  });
}
document.addEventListener("DOMContentLoaded", () => {
  loadIncludes();
  initPhotoSlideshows();
});