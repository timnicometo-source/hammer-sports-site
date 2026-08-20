const videoGrid = document.getElementById("videoGrid");
const resultsSummary = document.getElementById("resultsSummary");
const filterRow = document.getElementById("filterRow");

const videoModal = document.getElementById("videoModal");
const modalClose = document.getElementById("modalClose");
const modalMedia = document.getElementById("modalMedia");
const modalMeta = document.getElementById("modalMeta");
const modalTitle = document.getElementById("modalTitle");
const modalDescription = document.getElementById("modalDescription");

const cardTemplate = document.getElementById("videoCardTemplate");

let allVideos = [];

// Default to showing everything.
let activeFilterType = "all";
let activeFilterValue = "all";


/* =========================================================
   HTML ESCAPING
========================================================= */

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}


/* =========================================================
   DATE HELPERS
========================================================= */

function getVideoDate(video) {
  return video.publishedDate || video.date || "";
}


function formatDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}


/* =========================================================
   VIDEO URL HELPERS
========================================================= */

function getVideoUrl(video) {
  return (
    video.video ||
    video.url ||
    video.videoUrl ||
    video.youtubeUrl ||
    video.link ||
    video.embedUrl ||
    ""
  );
}


function getEmbedUrl(url) {
  if (!url) return "";

  try {
    const parsedUrl = new URL(url, window.location.origin);

    // Standard YouTube watch URL
    if (
      parsedUrl.hostname.includes("youtube.com") &&
      parsedUrl.searchParams.get("v")
    ) {
      return `https://www.youtube.com/embed/${parsedUrl.searchParams.get("v")}`;
    }

    // YouTube shortened URL
    if (parsedUrl.hostname.includes("youtu.be")) {
      const videoId = parsedUrl.pathname
        .replace("/", "")
        .split("?")[0];

      return videoId
        ? `https://www.youtube.com/embed/${videoId}`
        : url;
    }

    // Already an embed URL
    if (
      parsedUrl.hostname.includes("youtube.com") &&
      parsedUrl.pathname.includes("/embed/")
    ) {
      return parsedUrl.href;
    }

  } catch (error) {
    console.warn("Invalid video URL:", url);
  }

  return url;
}


/* =========================================================
   ARRAY / TAG HELPERS
========================================================= */

function normalizeToArray(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .flatMap((item) => String(item).split(","))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}


function getMetaLine(video) {
  const rawTags = [
    ...normalizeToArray(video.category),
    ...normalizeToArray(video.series)
  ];

  const cleanedTags = [...new Set(rawTags)];

  return cleanedTags.length
    ? `Tags: ${cleanedTags.join(" • ")}`
    : "";
}


/* =========================================================
   FILTER MATCHING
========================================================= */

function matchesFilterValue(value, filterValue) {
  if (!value) return false;

  if (Array.isArray(value)) {
    return value.some(
      (item) => String(item).trim() === filterValue
    );
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .includes(filterValue);
}


/* =========================================================
   BUILD CATEGORY FILTER BUTTONS
========================================================= */

function buildCategoryFilters() {
  if (!filterRow) return;

  // Start fresh with All Videos.
  filterRow.innerHTML = "";

  const allButton = document.createElement("button");

  allButton.className = "filter-btn";
  allButton.type = "button";
  allButton.dataset.filterType = "all";
  allButton.dataset.filterValue = "all";
  allButton.textContent = "All Videos";

  filterRow.appendChild(allButton);


  // Pull every unique category directly from videos.json.
  const categories = [
    ...new Set(
      allVideos.flatMap((video) =>
        normalizeToArray(video.category)
      )
    )
  ];


  // Sort alphabetically.
  categories.sort((a, b) =>
    a.localeCompare(b, undefined, {
      sensitivity: "base"
    })
  );


  // Create one button for every category.
  categories.forEach((category) => {

    const button = document.createElement("button");

    button.className = "filter-btn";
    button.type = "button";

    button.dataset.filterType = "category";
    button.dataset.filterValue = category;

    button.textContent = category;

    filterRow.appendChild(button);
  });
}


/* =========================================================
   MODAL VIDEO PLAYER
========================================================= */

function buildModalMedia(video) {
  const rawVideoUrl = getVideoUrl(video);

  const sourceType = (
    video.sourceType || ""
  ).toLowerCase();


  if (
    !rawVideoUrl ||
    rawVideoUrl === "#"
  ) {
    return `
      <div class="video-modal__empty">
        No video URL has been added for this card yet.
      </div>
    `;
  }


  // MP4 files
  //
  // This checks BOTH sourceType and the URL itself.
  // Therefore a sourceType such as "Zoom Recording"
  // still works when the URL ends in .mp4.
  if (
    sourceType === "mp4" ||
    /\.mp4($|\?)/i.test(rawVideoUrl)
  ) {
    return `
      <div class="video-modal__embed-wrap">
        <video
          controls
          playsinline
          preload="metadata"
          poster="${escapeHtml(video.thumbnail || "")}"
        >
          <source
            src="${escapeHtml(rawVideoUrl)}"
            type="video/mp4"
          >
          Your browser does not support the video tag.
        </video>
      </div>
    `;
  }


  // Everything else is treated as an embedded video.
  const embedUrl = getEmbedUrl(rawVideoUrl);

  return `
    <div class="video-modal__embed-wrap">
      <iframe
        src="${escapeHtml(embedUrl)}"
        title="${escapeHtml(video.title || "Video")}"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
    </div>
  `;
}


function openModal(video) {
  const metaText = getMetaLine(video);
  const formattedDate = formatDate(
    getVideoDate(video)
  );

  modalMedia.innerHTML =
    buildModalMedia(video);

  modalMeta.textContent = [
    metaText,
    formattedDate
  ]
    .filter(Boolean)
    .join(" • ");

  modalTitle.textContent =
    video.title || "Video";

  modalDescription.textContent =
    video.description || "";

  videoModal.classList.add("is-open");

  videoModal.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add(
    "modal-open"
  );
}


function closeModal() {
  videoModal.classList.remove(
    "is-open"
  );

  videoModal.setAttribute(
    "aria-hidden",
    "true"
  );

  modalMedia.innerHTML = "";

  document.body.classList.remove(
    "modal-open"
  );
}


/* =========================================================
   CREATE VIDEO CARD
========================================================= */

function createVideoCard(video) {
  const fragment =
    cardTemplate.content.cloneNode(true);

  const thumb =
    fragment.querySelector(
      ".video-card__thumb"
    );

  const hoverThumb =
    fragment.querySelector(
      ".video-card__hover-thumb"
    );

  const titleStatic =
    fragment.querySelector(
      ".video-card__title-static"
    );

  const hoverTitle =
    fragment.querySelector(
      ".video-card__hover-title"
    );

  const hoverMeta =
    fragment.querySelector(
      ".video-card__hover-meta"
    );

  const hoverDate =
    fragment.querySelector(
      ".video-card__hover-date"
    );

  const hoverDesc =
    fragment.querySelector(
      ".video-card__hover-desc"
    );

  const hoverPlay =
    fragment.querySelector(
      ".video-card__hover-actions .video-card__play"
    );


  const safeTitle =
    video.title || "Untitled Video";

  const safeDescription =
    video.description || "";

  const metaLine =
    getMetaLine(video);

  const formattedDate =
    formatDate(getVideoDate(video));

  const fallbackThumbnail =
    "/assets/images/video-catalog/hammer-video-placeholder.png";

  const thumbnail =
    video.thumbnail || fallbackThumbnail;


  if (thumb) {
    thumb.src = thumbnail;
    thumb.alt = safeTitle;
  }


  if (hoverThumb) {
    hoverThumb.src = thumbnail;
    hoverThumb.alt = safeTitle;
  }


  if (titleStatic) {
    titleStatic.textContent =
      safeTitle;
  }


  if (hoverTitle) {
    hoverTitle.textContent =
      safeTitle;
  }


  if (hoverMeta) {
    hoverMeta.textContent =
      metaLine;

    hoverMeta.style.display =
      metaLine ? "" : "none";
  }


  if (hoverDate) {
    hoverDate.textContent =
      formattedDate;

    hoverDate.style.display =
      formattedDate ? "" : "none";
  }


  if (hoverDesc) {
    hoverDesc.textContent =
      safeDescription;

    hoverDesc.style.display =
      safeDescription ? "" : "none";
  }


  if (hoverPlay) {
    hoverPlay.addEventListener(
      "click",
      (event) => {

        event.preventDefault();
        event.stopPropagation();

        openModal(video);

        hoverPlay.blur();
      }
    );
  }


  return fragment;
}


/* =========================================================
   FILTER VIDEOS
========================================================= */

function getFilteredVideos() {

  if (
    activeFilterType === "all" ||
    activeFilterValue === "all"
  ) {
    return allVideos;
  }


  return allVideos.filter(
    (video) => {

      return matchesFilterValue(
        video[activeFilterType],
        activeFilterValue
      );

    }
  );
}


/* =========================================================
   UPDATE RESULTS SUMMARY
========================================================= */

function updateSummary(count) {

  if (count === 0) {
    resultsSummary.textContent =
      "No videos found for this filter.";

    return;
  }


  if (activeFilterType === "all") {

    resultsSummary.textContent =
      `${count} video${count === 1 ? "" : "s"} available.`;

    return;
  }


  resultsSummary.textContent =
    `${count} video${count === 1 ? "" : "s"} found for ${activeFilterValue}.`;
}


/* =========================================================
   RENDER VIDEOS
========================================================= */

function renderVideos() {

  const filteredVideos =
    getFilteredVideos();


  videoGrid.innerHTML = "";


  if (!filteredVideos.length) {
    updateSummary(0);
    return;
  }


  const fragment =
    document.createDocumentFragment();


  filteredVideos.forEach(
    (video) => {

      fragment.appendChild(
        createVideoCard(video)
      );

    }
  );


  videoGrid.appendChild(fragment);

  updateSummary(
    filteredVideos.length
  );
}


/* =========================================================
   ACTIVATE FILTER
========================================================= */

function setActiveFilter(button) {

  const buttons =
    filterRow.querySelectorAll(
      ".filter-btn"
    );


  buttons.forEach(
    (btn) =>
      btn.classList.remove(
        "is-active"
      )
  );


  button.classList.add(
    "is-active"
  );


  activeFilterType =
    button.dataset.filterType;

  activeFilterValue =
    button.dataset.filterValue;


  renderVideos();
}


/* =========================================================
   URL FILTERING
========================================================= */

function getInitialFilterFromUrl() {

  const params =
    new URLSearchParams(
      window.location.search
    );


  const category =
    params.get("category");

  const series =
    params.get("series");


  if (category) {

    return {
      type: "category",
      value: category.trim()
    };

  }


  if (series) {

    return {
      type: "series",
      value: series.trim()
    };

  }


  // Normal page load:
  // show every video.
  return {
    type: "all",
    value: "all"
  };
}


/* =========================================================
   FIND FILTER BUTTON
========================================================= */

function findFilterButton(
  filterType,
  filterValue
) {

  if (!filterRow) return null;


  const buttons =
    filterRow.querySelectorAll(
      ".filter-btn"
    );


  return [...buttons].find(
    (button) =>

      button.dataset.filterType ===
        filterType &&

      button.dataset.filterValue ===
        filterValue

  ) || null;
}


/* =========================================================
   LOAD VIDEOS.JSON
========================================================= */

async function loadVideos() {

  try {

    const response = await fetch(
      "/assets/data/videos.json",
      {
        cache: "no-store"
      }
    );


    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status}`
      );

    }


    const data =
      await response.json();


    if (Array.isArray(data)) {

      allVideos = data;

    } else if (
      Array.isArray(data.videos)
    ) {

      allVideos = data.videos;

    } else {

      throw new Error(
        "Invalid JSON format"
      );

    }


    /*
      Build category buttons AFTER
      videos.json has loaded.
    */
    buildCategoryFilters();


    /*
      Determine whether the URL requested
      a specific category or series.
    */
    const initialFilter =
      getInitialFilterFromUrl();


    activeFilterType =
      initialFilter.type;

    activeFilterValue =
      initialFilter.value;


    if (filterRow) {

      /*
        Find the requested button.
      */
      const matchingButton =
        findFilterButton(
          initialFilter.type,
          initialFilter.value
        );


      /*
        If the requested filter does not
        exist, default to All Videos.
      */
      const fallbackButton =
        findFilterButton(
          "all",
          "all"
        );


      const buttonToActivate =
        matchingButton ||
        fallbackButton;


      if (buttonToActivate) {

        const buttons =
          filterRow.querySelectorAll(
            ".filter-btn"
          );


        buttons.forEach(
          (btn) =>
            btn.classList.remove(
              "is-active"
            )
        );


        buttonToActivate.classList.add(
          "is-active"
        );


        activeFilterType =
          buttonToActivate.dataset.filterType;

        activeFilterValue =
          buttonToActivate.dataset.filterValue;

      }

    }


    renderVideos();


  } catch (error) {

    console.error(
      "Video catalog load error:",
      error
    );


    resultsSummary.textContent =
      "Unable to load videos.";


    videoGrid.innerHTML = "";

  }
}


/* =========================================================
   FILTER BUTTON EVENTS
========================================================= */

if (filterRow) {

  filterRow.addEventListener(
    "click",
    (event) => {

      const button =
        event.target.closest(
          ".filter-btn"
        );


      if (!button) return;


      setActiveFilter(
        button
      );

    }
  );

}


/* =========================================================
   MODAL CLOSE BUTTON
========================================================= */

if (modalClose) {

  modalClose.addEventListener(
    "click",
    closeModal
  );

}


/* =========================================================
   MODAL BACKDROP
========================================================= */

if (videoModal) {

  videoModal.addEventListener(
    "click",
    (event) => {

      if (
        event.target.matches(
          "[data-close-modal='true']"
        )
      ) {

        closeModal();

      }

    }
  );

}


/* =========================================================
   ESCAPE KEY CLOSES MODAL
========================================================= */

document.addEventListener(
  "keydown",
  (event) => {

    if (
      event.key === "Escape" &&
      videoModal.classList.contains(
        "is-open"
      )
    ) {

      closeModal();

    }

  }
);


/* =========================================================
   START CATALOG
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  loadVideos
);