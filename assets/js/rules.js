const rulesGroupedList = document.getElementById("rulesGroupedList");
const rulesStatus = document.getElementById("rulesStatus");

const SPORT_ORDER = [
  "Tackle Football",
  "Flag Football",
  "Volleyball",
  "Softball",
  "Baseball",
  "Basketball"
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

function getSportId(sport) {
  return String(sport)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function scrollToRequestedSport() {
  if (!window.location.hash || !rulesGroupedList) return;

  let sectionId;

  try {
    sectionId = decodeURIComponent(window.location.hash.slice(1));
  } catch {
    return;
  }

  const target = document.getElementById(sectionId);

  if (target && rulesGroupedList.contains(target)) {
    requestAnimationFrame(() => {
      target.scrollIntoView({ block: "start" });
    });
  }
}

function isPublished(item) {
  const status = String(item.status || "").toLowerCase();
  return !status || status === "published";
}

function getPrimarySport(item) {
  const sports = normalizeToArray(item.sport);

  const orderedMatch = SPORT_ORDER.find((sport) => sports.includes(sport));
  return orderedMatch || sports[0] || "Other";
}

function groupRulebooksBySport(rulebooks) {
  const groups = new Map();

  rulebooks.forEach((item) => {
    const sport = getPrimarySport(item);

    if (!groups.has(sport)) {
      groups.set(sport, []);
    }

    groups.get(sport).push(item);
  });

  return groups;
}

function sortRulebooks(items) {
  return [...items].sort((a, b) => {
    const aDate = Date.parse(a.dateAdded || "");
    const bDate = Date.parse(b.dateAdded || "");

    // If both records have dates, sort newest first.
    if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) {
      return bDate - aDate;
    }

    // Place dated records above undated records.
    if (!Number.isNaN(aDate)) return -1;
    if (!Number.isNaN(bDate)) return 1;

    // Otherwise, preserve the original JSON order.
    const aIndex = Number.isInteger(a.__originalIndex)
      ? a.__originalIndex
      : 999999;

    const bIndex = Number.isInteger(b.__originalIndex)
      ? b.__originalIndex
      : 999999;

    return aIndex - bIndex;
  });
}

function getSortedSports(groups) {
  const existingSports = [...groups.keys()];

  const orderedSports = SPORT_ORDER.filter((sport) => groups.has(sport));

  const remainingSports = existingSports
    .filter((sport) => !SPORT_ORDER.includes(sport))
    .sort();

  return [...orderedSports, ...remainingSports];
}

function getTagLine(item) {
  const parts = [
    ...normalizeToArray(item.city),
    ...normalizeToArray(item.demographic),
    ...normalizeToArray(item.gender)
  ];

  const cleaned = [...new Set(parts.filter((part) => part && part !== "All"))];

  return cleaned.length ? cleaned.join(" • ") : "";
}

function createRulebookLink(item) {
  const title = escapeHtml(item.title || "Untitled Rulebook");
  const documentUrl = item.document || "";

  if (!documentUrl) {
    return `
      <li class="rulebook-list-item rulebook-list-item-disabled">
        <span>${title}</span>
        <span class="rulebook-missing">No PDF available</span>
      </li>
    `;
  }

  const tagLine = getTagLine(item);

  return `
    <li class="rulebook-list-item">
      <a href="${escapeHtml(documentUrl)}" target="_blank" rel="noopener">
        ${title}
      </a>
      ${
        tagLine
          ? `<span class="rulebook-tags">${escapeHtml(tagLine)}</span>`
          : ""
      }
    </li>
  `;
}

function renderGroupedRulebooks(rulebooks) {
  const publishedRulebooks = rulebooks.filter(isPublished);

  if (!publishedRulebooks.length) {
    rulesStatus.hidden = false;
    rulesStatus.textContent = "No rulebooks are currently available.";
    rulesGroupedList.innerHTML = "";
    return;
  }

  const groups = groupRulebooksBySport(publishedRulebooks);
  const sortedSports = getSortedSports(groups);

  const html = sortedSports
    .map((sport) => {
      const items = sortRulebooks(groups.get(sport));
      const sectionId = getSportId(sport);

      return `
        <section
          id="${escapeHtml(sectionId)}"
          class="rules-sport-section"
        >
          <div class="rules-sport-heading">
            <h2>${escapeHtml(sport)}</h2>
            <span>
              ${items.length}
              ${items.length === 1 ? "resource" : "resources"}
            </span>
          </div>

          <ul class="rulebook-link-list">
            ${items.map(createRulebookLink).join("")}
          </ul>
        </section>
      `;
    })
    .join("");

  rulesStatus.hidden = true;
  rulesGroupedList.innerHTML = html;

  // The requested section now exists, so it is safe to scroll.
  scrollToRequestedSport();
}

async function loadRulebooks() {
  if (!rulesGroupedList || !rulesStatus) return;

  try {
    const response = await fetch("/assets/data/rulebooks.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const records = Array.isArray(data) ? data : data?.rulebooks;

    if (!Array.isArray(records)) {
      throw new Error("The rulebooks data must contain an array.");
    }

    const rulebooks = records.map((item, index) => ({
      ...item,
      __originalIndex: index
    }));

    renderGroupedRulebooks(rulebooks);
  } catch (error) {
    console.error("Unable to load rulebooks:", error);

    rulesStatus.hidden = false;
    rulesStatus.textContent =
      "Unable to load rulebooks. Please check that /assets/data/rulebooks.json exists and is valid JSON.";

    rulesGroupedList.innerHTML = "";
  }
}

// Also handle changes to the requested sport while on this page.
window.addEventListener("hashchange", scrollToRequestedSport);

// Support scripts loaded either before or after DOMContentLoaded.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadRulebooks);
} else {
  loadRulebooks();
}