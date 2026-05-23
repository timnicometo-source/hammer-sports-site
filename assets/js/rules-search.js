const searchForm = document.getElementById("rulebookSearchForm");
const keywordInput = document.getElementById("keywordInput");
const sportSelect = document.getElementById("sportSelect");
const citySelect = document.getElementById("citySelect");
const demographicSelect = document.getElementById("demographicSelect");
const genderSelect = document.getElementById("genderSelect");
const clearSearchBtn = document.getElementById("clearSearchBtn");
const searchResultsSummary = document.getElementById("searchResultsSummary");
const searchResultsList = document.getElementById("searchResultsList");
const noSearchResults = document.getElementById("noSearchResults");

let allRulebooks = [];

const FIELD_CONFIG = [
  {
    select: sportSelect,
    field: "sport",
    defaultLabel: "All Sports"
  },
  {
    select: citySelect,
    field: "city",
    defaultLabel: "All Cities / Areas"
  },
  {
    select: demographicSelect,
    field: "demographic",
    defaultLabel: "All Demographics"
  },
  {
    select: genderSelect,
    field: "gender",
    defaultLabel: "All Genders"
  }
];

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

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isPublished(item) {
  const status = String(item.status || "").toLowerCase();
  return !status || status === "published";
}

function uniqueSortedValues(items, field) {
  const values = new Set();

  items.forEach((item) => {
    normalizeToArray(item[field]).forEach((value) => {
      if (!value) return;

      // Keep All/Both in data matching, but do not show them as useful dropdown choices.
      if (value === "All" || value === "Both") return;

      values.add(value);
    });
  });

  return [...values].sort((a, b) => a.localeCompare(b));
}

function populateSelect(select, values, defaultLabel) {
  select.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = defaultLabel;
  select.appendChild(defaultOption);

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function populateFilters(items) {
  FIELD_CONFIG.forEach(({ select, field, defaultLabel }) => {
    populateSelect(select, uniqueSortedValues(items, field), defaultLabel);
  });
}

function fieldMatches(item, field, selectedValue) {
  if (!selectedValue) return true;

  const values = normalizeToArray(item[field]);

  return (
    values.includes(selectedValue) ||
    values.includes("All") ||
    values.includes("Both")
  );
}

function keywordMatches(item, keyword) {
  if (!keyword) return true;

  const searchValue = keyword.toLowerCase();

  const searchableText = [
    item.title,
    item.description,
    item.filename,
    item.originalFilename,
    normalizeToArray(item.sport).join(" "),
    normalizeToArray(item.city).join(" "),
    normalizeToArray(item.demographic).join(" "),
    normalizeToArray(item.gender).join(" ")
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchableText.includes(searchValue);
}

function getSelectedFilters() {
  return {
    keyword: keywordInput.value.trim(),
    sport: sportSelect.value,
    city: citySelect.value,
    demographic: demographicSelect.value,
    gender: genderSelect.value
  };
}

function filterRulebooks() {
  const filters = getSelectedFilters();

  return allRulebooks.filter((item) => {
    return (
      isPublished(item) &&
      keywordMatches(item, filters.keyword) &&
      fieldMatches(item, "sport", filters.sport) &&
      fieldMatches(item, "city", filters.city) &&
      fieldMatches(item, "demographic", filters.demographic) &&
      fieldMatches(item, "gender", filters.gender)
    );
  });
}

function getTagLine(item) {
  const parts = [
    ...normalizeToArray(item.sport),
    ...normalizeToArray(item.city),
    ...normalizeToArray(item.demographic),
    ...normalizeToArray(item.gender)
  ];

  const cleaned = [...new Set(parts.filter((part) => part && part !== "All"))];

  return cleaned.length ? cleaned.join(" • ") : "";
}

function createResultCard(item) {
  const title = escapeHtml(item.title || "Untitled Rulebook");
  const description = item.description ? escapeHtml(item.description) : "";
  const tagLine = getTagLine(item);
  const documentUrl = item.document || "";

  return `
    <article class="rulebook-result-card">
      <div>
        <p class="rulebook-result-tags">${escapeHtml(tagLine)}</p>
        <h2>${title}</h2>
        ${description ? `<p>${description}</p>` : ""}
      </div>

      <div class="rulebook-result-actions">
        ${
          documentUrl
            ? `<a class="btn btn-primary" href="${escapeHtml(documentUrl)}" target="_blank" rel="noopener">Download PDF</a>`
            : `<span class="btn btn-secondary rulebook-disabled-btn">No PDF</span>`
        }
      </div>
    </article>
  `;
}

function updateSummary(count) {
  if (count === 0) {
    searchResultsSummary.textContent = "No rulebooks found.";
    return;
  }

  searchResultsSummary.textContent = `${count} rulebook${count === 1 ? "" : "s"} found.`;
}

function renderResults(results) {
  updateSummary(results.length);

  if (!results.length) {
    searchResultsList.innerHTML = "";
    noSearchResults.hidden = false;
    return;
  }

  noSearchResults.hidden = true;

  const sortedResults = [...results].sort((a, b) => {
    return String(a.title || "").localeCompare(String(b.title || ""));
  });

  searchResultsList.innerHTML = sortedResults.map(createResultCard).join("");
}

function runSearch() {
  renderResults(filterRulebooks());
}

function clearSearch() {
  keywordInput.value = "";
  sportSelect.value = "";
  citySelect.value = "";
  demographicSelect.value = "";
  genderSelect.value = "";

  searchResultsSummary.textContent = "Select filters above, then search.";
  searchResultsList.innerHTML = "";
  noSearchResults.hidden = true;
}

async function loadRulebooks() {
  try {
    const response = await fetch("/assets/data/rulebooks.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    allRulebooks = Array.isArray(data) ? data : data.rulebooks || [];

    populateFilters(allRulebooks.filter(isPublished));

    // Show all published rulebooks by default so the page feels useful immediately.
    renderResults(allRulebooks.filter(isPublished));
  } catch (error) {
    console.error("Rulebook search load error:", error);

    searchResultsSummary.textContent =
      "Unable to load rulebooks. Please check that /assets/data/rulebooks.json exists and is valid JSON.";

    searchResultsList.innerHTML = "";
    noSearchResults.hidden = true;
  }
}

if (searchForm) {
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    runSearch();
  });
}

if (clearSearchBtn) {
  clearSearchBtn.addEventListener("click", clearSearch);
}

document.addEventListener("DOMContentLoaded", loadRulebooks);