let crops = [];
let modalReturnFocus = null;

const byId = (id) => document.getElementById(id);
const toFixedNum = (value, digits = 1) => Number.parseFloat(value).toFixed(digits);
const hectareToAcres = (hectares) => hectares * 2.47105;

function capitalize(value) {
  if (!value) return "Not specified";
  return String(value)
    .split(/[\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function showEmptyState(container, message) {
  if (!container) return;
  container.innerHTML = `<p class="empty-state">${message}</p>`;
}

function bindCropImages(container) {
  if (!container) return;

  container.querySelectorAll("img[data-crop-id]").forEach((image) => {
    const crop = crops.find((item) => item.id === image.dataset.cropId);
    if (!crop) return;

    image.alt = `${crop.name} photograph`;
    image.addEventListener("error", () => {
      if (image.dataset.fallbackApplied === "true") return;
      image.dataset.fallbackApplied = "true";
      image.src = "images/placeholder.png";
    }, { once: true });
    image.src = crop.image || `images/${crop.id}.jpg`;
  });
}

async function loadCrops() {
  try {
    const response = await fetch("data/crops.json");
    if (!response.ok) {
      throw new Error(`Crop data request failed with status ${response.status}`);
    }

    const cropData = await response.json();
    if (!Array.isArray(cropData)) {
      throw new TypeError("Crop data must be a JSON array.");
    }

    crops = cropData;
    populateCalcSelect();
    populateSoilOptions();
    populateCropFilters();
    loadComparisonDropdowns();
    renderCropGrid();
    renderFeaturedCrops();
    renderSeasonGrid(byId("seasonSelect")?.value || "all");
    renderPracticalNotes();
    applyQuickCalcCrop();
  } catch (error) {
    console.error("Unable to load AgroGuide Pro crop data.", error);
    ["cropGrid", "featuredCropGrid", "seasonGrid", "soilResult", "tipGrid"].forEach((id) => {
      showEmptyState(byId(id), "Crop information could not be loaded. Please run the site with VS Code Live Server or a local web server.");
    });
  }
}

function createCropCard(crop) {
  return `
    <article class="crop-card">
      <img class="crop-photo" data-crop-id="${crop.id}" alt="${crop.name} photograph" loading="lazy">
      <div class="crop-card-body">
        <span class="crop-chip">${capitalize(crop.season)}</span>
        <h3>${crop.name}</h3>
        <p><strong>Season:</strong> ${capitalize(crop.season)}</p>
        <p><strong>Soil:</strong> ${capitalize(crop.soil)}</p>
        <div class="crop-actions">
          <button class="btn btn-small" type="button" data-action="details" data-crop-id="${crop.id}">View details</button>
          <button class="btn btn-small btn-secondary" type="button" data-action="quick-calc" data-crop-id="${crop.id}">Quick Calc</button>
        </div>
      </div>
    </article>
  `;
}

function renderCropGrid() {
  const grid = byId("cropGrid");
  if (!grid) return;

  const query = (byId("cropSearch")?.value || "").trim().toLowerCase();
  const season = byId("cropSeasonFilter")?.value || "all";
  const soil = byId("cropSoilFilter")?.value || "all";
  const filtered = crops.filter((crop) => {
    const searchable = [crop.name, crop.season, crop.soil].join(" ").toLowerCase();
    return (!query || searchable.includes(query))
      && (season === "all" || crop.season === season)
      && (soil === "all" || crop.soil === soil);
  });

  if (filtered.length === 0) {
    showEmptyState(grid, "No crops match those filters. Try another search or clear the filters.");
  } else {
    grid.innerHTML = filtered.map(createCropCard).join("");
    bindCropImages(grid);
  }

  const count = byId("cropCount");
  if (count) {
    count.textContent = `Showing ${filtered.length} of ${crops.length} crops.`;
  }
}

function renderFeaturedCrops() {
  const grid = byId("featuredCropGrid");
  if (!grid) return;

  const featured = crops.slice(0, 4);
  grid.innerHTML = featured.map(createCropCard).join("");
  bindCropImages(grid);
}

function quickCalc(cropId) {
  const crop = crops.find((item) => item.id === cropId);
  if (!crop) return;

  const cropSelect = byId("calcCrop");
  if (!cropSelect) {
    window.location.href = `calculator.html?crop=${encodeURIComponent(cropId)}`;
    return;
  }

  cropSelect.value = cropId;
  const notice = byId("quickCalcNotice");
  if (notice) notice.textContent = `${crop.name} is selected. Enter your land area to calculate its NPK and manpower estimates.`;
  byId("calcArea")?.focus({ preventScroll: true });
  byId("calcCrop")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function populateCalcSelect() {
  const select = byId("calcCrop");
  if (!select) return;

  select.replaceChildren(new Option("-- Select crop --", ""));
  crops.forEach((crop) => select.add(new Option(crop.name, crop.id)));
}

function populateSoilOptions() {
  const select = byId("soilTypeSelect");
  if (!select) return;

  select.replaceChildren(new Option("Select soil type", ""));
  const soilTypes = [...new Set(crops.map((crop) => crop.soil).filter(Boolean))];
  soilTypes.forEach((soil) => select.add(new Option(capitalize(soil), soil)));
}

function populateCropFilters() {
  const seasonSelect = byId("cropSeasonFilter");
  if (seasonSelect) {
    const currentValue = seasonSelect.value || "all";
    seasonSelect.replaceChildren(new Option("All seasons", "all"));
    [...new Set(crops.map((crop) => crop.season).filter(Boolean))].forEach((season) => {
      seasonSelect.add(new Option(capitalize(season), season));
    });
    seasonSelect.value = currentValue;
  }

  const soilSelect = byId("cropSoilFilter");
  if (soilSelect) {
    const currentValue = soilSelect.value || "all";
    soilSelect.replaceChildren(new Option("All soil types", "all"));
    [...new Set(crops.map((crop) => crop.soil).filter(Boolean))].forEach((soil) => {
      soilSelect.add(new Option(capitalize(soil), soil));
    });
    soilSelect.value = currentValue;
  }
}

function applyQuickCalcCrop() {
  const cropId = new URLSearchParams(window.location.search).get("crop");
  const select = byId("calcCrop");
  if (!cropId || !select || !crops.some((crop) => crop.id === cropId)) return;

  select.value = cropId;
  const crop = crops.find((item) => item.id === cropId);
  const notice = byId("quickCalcNotice");
  if (notice) notice.textContent = `${crop.name} is selected. Enter your land area to calculate its NPK and manpower estimates.`;
}

function calculateNPKandManpower() {
  const cropId = byId("calcCrop")?.value;
  const areaInput = Number.parseFloat(byId("calcArea")?.value);
  const unit = byId("calcUnit")?.value;
  const result = byId("calcResult");
  if (!result) return;

  if (!cropId) {
    result.textContent = "Please select a crop.";
    return;
  }
  if (!Number.isFinite(areaInput) || areaInput <= 0) {
    result.textContent = "Enter a valid land area greater than zero.";
    return;
  }

  const crop = crops.find((item) => item.id === cropId);
  if (!crop) {
    result.textContent = "Selected crop was not found in the crop data.";
    return;
  }

  const area = unit === "hectare" ? hectareToAcres(areaInput) : areaInput;
  const nitrogen = crop.n * area;
  const phosphorus = crop.p * area;
  const potassium = crop.k * area;
  const people = Math.ceil(crop.people * area);

  result.innerHTML = `
    <h3>${crop.name} estimate for ${toFixedNum(area, 2)} acre(s)</h3>
    <p><strong>Nitrogen (N):</strong> ${toFixedNum(nitrogen, 1)} kg</p>
    <p><strong>Phosphorus (P):</strong> ${toFixedNum(phosphorus, 1)} kg</p>
    <p><strong>Potassium (K):</strong> ${toFixedNum(potassium, 1)} kg</p>
    <p><strong>Estimated manpower:</strong> ${people} person(s)</p>
    <p><strong>Estimated yield (approx.):</strong> ${crop.yieldPerAcre || "N/A"}</p>
  `;
}

function calculateCosts() {
  const cropId = byId("calcCrop")?.value;
  const areaInput = Number.parseFloat(byId("calcArea")?.value);
  const unit = byId("calcUnit")?.value;
  const result = byId("costResult");
  if (!result) return;

  if (!cropId) {
    result.textContent = "Select a crop first.";
    return;
  }
  if (!Number.isFinite(areaInput) || areaInput <= 0) {
    result.textContent = "Enter a valid land area greater than zero.";
    return;
  }

  const costInputs = ["costN", "costP", "costK", "labourCost", "labourDays"];
  const enteredValues = costInputs.map((id) => {
    const value = byId(id)?.value;
    return value === "" || value == null ? 0 : Number.parseFloat(value);
  });
  if (enteredValues.some((value) => !Number.isFinite(value) || value < 0)) {
    result.textContent = "Enter valid zero-or-higher costs and working days.";
    return;
  }

  const crop = crops.find((item) => item.id === cropId);
  if (!crop) {
    result.textContent = "Selected crop was not found in the crop data.";
    return;
  }

  const area = unit === "hectare" ? hectareToAcres(areaInput) : areaInput;
  const [costN, costP, costK, labourCost, labourDays] = enteredValues;
  const nitrogen = crop.n * area;
  const phosphorus = crop.p * area;
  const potassium = crop.k * area;
  const nitrogenCost = nitrogen * costN;
  const phosphorusCost = phosphorus * costP;
  const potassiumCost = potassium * costK;
  const labourTotal = crop.people * area * labourCost * labourDays;
  const totalCost = nitrogenCost + phosphorusCost + potassiumCost + labourTotal;

  result.innerHTML = `
    <h3>${crop.name} cost estimate</h3>
    <p><strong>Nitrogen:</strong> ${toFixedNum(nitrogen, 1)} kg — ₹ ${toFixedNum(nitrogenCost, 2)}</p>
    <p><strong>Phosphorus:</strong> ${toFixedNum(phosphorus, 1)} kg — ₹ ${toFixedNum(phosphorusCost, 2)}</p>
    <p><strong>Potassium:</strong> ${toFixedNum(potassium, 1)} kg — ₹ ${toFixedNum(potassiumCost, 2)}</p>
    <p><strong>Estimated labour:</strong> ${Math.ceil(crop.people * area)} person(s); ₹ ${toFixedNum(labourTotal, 2)}</p>
    <h3>Total estimated farming cost: ₹ ${toFixedNum(totalCost, 2)}</h3>
  `;
}

function seasonMatches(crop, selectedSeason) {
  if (!selectedSeason || selectedSeason === "all") return true;
  if (selectedSeason === "all-year") return crop.season === "all";
  if (["kharif", "rabi", "zaid"].includes(selectedSeason)) {
    return crop.season === selectedSeason || crop.season === "all";
  }
  return crop.season === selectedSeason;
}

function renderSeasonGrid(selectedSeason) {
  const grid = byId("seasonGrid");
  if (!grid) return;

  const filtered = crops.filter((crop) => seasonMatches(crop, selectedSeason));
  if (filtered.length === 0) {
    showEmptyState(grid, "No crop profiles are listed for this season in the current dataset.");
    return;
  }

  grid.innerHTML = filtered.map((crop) => `
    <article class="season-card">
      <img class="season-photo" data-crop-id="${crop.id}" alt="${crop.name} photograph" loading="lazy">
      <div class="season-card-top">
        <h3>${crop.name}</h3>
        <span class="season-chip">${capitalize(crop.season)}</span>
      </div>
      <div class="timeline-track">
        <div class="timeline-step"><strong>Sowing</strong><span>${crop.timeline?.sowing || "N/A"}</span></div>
        <div class="timeline-step"><strong>Irrigation</strong><span>${crop.timeline?.irrigation || "N/A"}</span></div>
        <div class="timeline-step"><strong>Fertilizer</strong><span>${crop.timeline?.fertilizer || "N/A"}</span></div>
        <div class="timeline-step"><strong>Harvest</strong><span>${crop.timeline?.harvest || "N/A"}</span></div>
      </div>
      <div class="season-card-footer">
        <span>${capitalize(crop.soil)} soil</span>
        <button class="btn btn-small btn-secondary" type="button" data-action="details" data-crop-id="${crop.id}">Crop details</button>
      </div>
    </article>
  `).join("");
  bindCropImages(grid);
}

function checkSoil() {
  const soilType = byId("soilTypeSelect")?.value;
  const season = byId("soilSeasonSelect")?.value;
  const result = byId("soilResult");
  if (!result) return;

  if (!soilType || !season) {
    showEmptyState(result, "Select both a soil type and a season to see crop recommendations.");
    return;
  }

  const suitable = crops.filter((crop) => crop.soil === soilType && seasonMatches(crop, season));
  if (suitable.length === 0) {
    showEmptyState(result, "No crop profiles match this soil and season combination in the current dataset.");
    return;
  }

  result.innerHTML = suitable.map((crop) => `
    <article class="crop-card">
      <img class="crop-photo" data-crop-id="${crop.id}" alt="${crop.name} photograph" loading="lazy">
      <div class="crop-card-body">
        <span class="crop-chip">${capitalize(crop.season)}</span>
        <h3>${crop.name}</h3>
        <p><strong>Soil:</strong> ${capitalize(crop.soil)}</p>
        <p><strong>Suitability score:</strong> ${crop.soilScore ?? "N/A"}/10</p>
        <div class="crop-actions">
          <button class="btn btn-small" type="button" data-action="details" data-crop-id="${crop.id}">View details</button>
        </div>
      </div>
    </article>
  `).join("");
  bindCropImages(result);
}

function loadComparisonDropdowns() {
  const first = byId("compare1");
  const second = byId("compare2");
  if (!first || !second) return;

  [first, second].forEach((select) => {
    select.replaceChildren(new Option("-- Select crop --", ""));
    crops.forEach((crop) => select.add(new Option(crop.name, crop.id)));
  });
}

function compareCrops() {
  const firstId = byId("compare1")?.value;
  const secondId = byId("compare2")?.value;
  const output = byId("comparisonResult");
  if (!output) return;

  if (!firstId || !secondId) {
    showEmptyState(output, "Select two crops to compare.");
    return;
  }
  if (firstId === secondId) {
    showEmptyState(output, "Choose two different crops for a comparison.");
    return;
  }

  const first = crops.find((crop) => crop.id === firstId);
  const second = crops.find((crop) => crop.id === secondId);
  if (!first || !second) {
    showEmptyState(output, "One of the selected crops was not found in the crop data.");
    return;
  }

  const metrics = [
    ["Season", capitalize(first.season), capitalize(second.season)],
    ["Soil type", capitalize(first.soil), capitalize(second.soil)],
    ["Nitrogen (kg/acre)", first.n, second.n],
    ["Phosphorus (kg/acre)", first.p, second.p],
    ["Potassium (kg/acre)", first.k, second.k],
    ["Yield per acre", first.yieldPerAcre || "N/A", second.yieldPerAcre || "N/A"],
    ["Water requirement", first.waterRequirement || "N/A", second.waterRequirement || "N/A"],
    ["Manpower per acre", first.people, second.people]
  ];

  output.innerHTML = `
    <div class="comparison-layout">
      ${[first, second].map((crop) => `
        <article class="comparison-card">
          <img data-crop-id="${crop.id}" alt="${crop.name} photograph" loading="lazy">
          <span class="season-chip">${capitalize(crop.season)}</span>
          <h3>${crop.name}</h3>
          <p>${capitalize(crop.soil)} soil · ${crop.waterRequirement || "Water requirement not specified"}</p>
        </article>
      `).join("")}
    </div>
    <div class="comparison-metrics" aria-label="Crop comparison values">
      ${metrics.map(([label, firstValue, secondValue]) => `
        <div class="comparison-metric">
          <strong>${label}</strong>
          <span>${firstValue} <span aria-hidden="true">/</span> ${secondValue}</span>
        </div>
      `).join("")}
    </div>
  `;
  bindCropImages(output);
}

function renderPracticalNotes() {
  const grid = byId("tipGrid");
  if (!grid) return;

  grid.innerHTML = crops.map((crop) => `
    <article class="tip-card">
      <h3>${crop.name}</h3>
      <p>${crop.notes || "No additional notes are recorded for this crop."}</p>
      <button class="btn btn-small btn-secondary" type="button" data-action="details" data-crop-id="${crop.id}">Open crop details</button>
    </article>
  `).join("");
}

function openCropDetails(cropId) {
  const crop = crops.find((item) => item.id === cropId);
  const modal = byId("cropModal");
  const body = byId("modalBody");
  if (!crop || !modal || !body) return;

  body.innerHTML = `
    <img class="modal-crop-photo" data-crop-id="${crop.id}" alt="${crop.name} photograph">
    <div class="modal-crop-heading">
      <p class="eyebrow">Crop profile</p>
      <h2 id="modalHeading">${crop.name}</h2>
      <p><strong>Season:</strong> ${capitalize(crop.season)}</p>
      <p><strong>Soil:</strong> ${capitalize(crop.soil)}</p>
    </div>
    <div class="modal-detail-grid">
      <section class="modal-section">
        <h3>Fertilizer &amp; manpower</h3>
        <p>N: ${crop.n} kg/acre · P: ${crop.p} kg/acre · K: ${crop.k} kg/acre<br>People: ${crop.people} per acre</p>
      </section>
      <section class="modal-section">
        <h3>Yield &amp; water</h3>
        <p>Estimated yield: ${crop.yieldPerAcre || "N/A"}<br>Water: ${crop.waterRequirement || "N/A"}</p>
      </section>
      <section class="modal-section">
        <h3>Pests</h3>
        <ul>${(crop.pests || []).map((pest) => `<li>${pest}</li>`).join("") || "<li>None listed</li>"}</ul>
      </section>
      <section class="modal-section">
        <h3>Diseases</h3>
        <ul>${(crop.diseases || []).map((disease) => `<li>${disease}</li>`).join("") || "<li>None listed</li>"}</ul>
      </section>
      <section class="modal-section modal-section-wide">
        <h3>Farming timeline</h3>
        <p><strong>Sowing:</strong> ${crop.timeline?.sowing || "N/A"}<br>
        <strong>Irrigation:</strong> ${crop.timeline?.irrigation || "N/A"}<br>
        <strong>Fertilizer:</strong> ${crop.timeline?.fertilizer || "N/A"}<br>
        <strong>Harvest:</strong> ${crop.timeline?.harvest || "N/A"}</p>
      </section>
      <section class="modal-section">
        <h3>Soil suitability score</h3>
        <p>${crop.soilScore ?? "N/A"}/10</p>
      </section>
      <section class="modal-section">
        <h3>Notes &amp; tips</h3>
        <p>${crop.notes || "No additional notes are recorded."}</p>
      </section>
    </div>
  `;

  bindCropImages(body);
  modalReturnFocus = document.activeElement;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  byId("modalClose")?.focus();
}

function closeCropDetails() {
  const modal = byId("cropModal");
  if (!modal) return;

  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  if (modalReturnFocus instanceof HTMLElement) modalReturnFocus.focus();
}

function initializeNavigation() {
  const menuButton = document.querySelector(".menu-toggle");
  const nav = byId("mainNav");
  if (!menuButton || !nav) return;

  const closeMenu = () => {
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open navigation menu");
    nav.classList.remove("is-open");
  };

  menuButton.addEventListener("click", () => {
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "Open navigation menu" : "Close navigation menu");
    nav.classList.toggle("is-open", !isOpen);
  });
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });
  document.addEventListener("click", (event) => {
    if (!nav.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 1050) closeMenu();
  });
}

function initializeEvents() {
  byId("calcBtn")?.addEventListener("click", calculateNPKandManpower);
  byId("costCalcBtn")?.addEventListener("click", calculateCosts);
  byId("soilCheckBtn")?.addEventListener("click", checkSoil);
  byId("compareBtn")?.addEventListener("click", compareCrops);
  byId("seasonSelect")?.addEventListener("change", (event) => renderSeasonGrid(event.target.value));
  byId("cropSearch")?.addEventListener("input", renderCropGrid);
  byId("cropSeasonFilter")?.addEventListener("change", renderCropGrid);
  byId("cropSoilFilter")?.addEventListener("change", renderCropGrid);
  byId("clearCropFilters")?.addEventListener("click", () => {
    if (byId("cropSearch")) byId("cropSearch").value = "";
    if (byId("cropSeasonFilter")) byId("cropSeasonFilter").value = "all";
    if (byId("cropSoilFilter")) byId("cropSoilFilter").value = "all";
    renderCropGrid();
  });
  byId("modalClose")?.addEventListener("click", closeCropDetails);
  byId("cropModal")?.addEventListener("click", (event) => {
    if (event.target === byId("cropModal")) closeCropDetails();
  });

  document.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;

    const cropId = actionButton.dataset.cropId;
    if (actionButton.dataset.action === "details") openCropDetails(cropId);
    if (actionButton.dataset.action === "quick-calc") quickCalc(cropId);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && byId("cropModal")?.classList.contains("is-open")) {
      closeCropDetails();
    }
  });

  document.querySelectorAll("[data-current-year]").forEach((year) => {
    year.textContent = String(new Date().getFullYear());
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initializeNavigation();
  initializeEvents();
  loadCrops();
});
