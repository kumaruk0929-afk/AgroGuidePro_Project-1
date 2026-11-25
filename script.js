/* AgroGuide Pro shared page behavior and crop-data features. */

let crops = [];
let modalTrigger = null;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const hectareToAcres = hectares => hectares * 2.47105;
const numberText = (value, digits = 1) => Number(value).toFixed(digits);

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function seasonName(season) {
  const names = {
    kharif: 'Kharif',
    rabi: 'Rabi',
    zaid: 'Zaid',
    annual: 'Annual',
    all: 'All year'
  };
  return names[String(season || '').toLowerCase()] || capitalize(season || 'Not specified');
}

function capitalize(value) {
  const text = String(value || '');
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

function normalizedSoil(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function showEmpty(container, message) {
  if (container) container.innerHTML = `<p class="empty-state">${escapeHtml(message)}</p>`;
}

async function loadCrops() {
  try {
    const response = await fetch('data/crops.json');
    if (!response.ok) throw new Error(`Crop data request failed (${response.status}).`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Crop data must be a JSON array.');
    crops = data;

    renderCropGrid();
    populateCalcSelect();
    populateSoilOptions();
    populateCropFilters();
    loadComparisonDropdowns();
    renderSeasonGrid($('#seasonSelect') ? $('#seasonSelect').value : 'all');
    renderTips();
    applyCalculatorQuery();
  } catch (error) {
    console.error('Unable to load AgroGuide Pro crop data.', error);
    const cropGrid = $('#cropGrid');
    const seasonGrid = $('#seasonGrid');
    const soilResult = $('#soilResult');
    const tipGrid = $('#tipGrid');
    showEmpty(cropGrid, 'Crop data could not be loaded. Open the project with VS Code Live Server and try again.');
    showEmpty(seasonGrid, 'Crop data could not be loaded. Open the project with VS Code Live Server and try again.');
    showEmpty(soilResult, 'Crop data could not be loaded. Open the project with VS Code Live Server and try again.');
    showEmpty(tipGrid, 'Crop data could not be loaded. Open the project with VS Code Live Server and try again.');
    const cropCount = $('#cropCount');
    if (cropCount) cropCount.textContent = 'Crop records are unavailable.';
    const calcCrop = $('#calcCrop');
    if (calcCrop) calcCrop.innerHTML = '<option value="">Crop data unavailable</option>';
    ['compare1', 'compare2'].forEach(id => {
      const select = document.getElementById(id);
      if (select) select.innerHTML = '<option value="">Crop data unavailable</option>';
    });
  }
}

function cropCard(crop) {
  const image = escapeHtml(crop.image || 'images/placeholder.png');
  const id = escapeHtml(crop.id);
  const name = escapeHtml(crop.name);
  const soil = escapeHtml(crop.soil || 'Not specified');
  return `
    <article class="crop-card">
      <img class="crop-photo" src="${image}" alt="${name} growing in a field" loading="lazy">
      <div class="crop-card-content">
        <h2>${name}</h2>
        <div class="crop-card-meta"><span class="badge">${escapeHtml(seasonName(crop.season))}</span><span class="badge">${soil} soil</span></div>
        <p>${escapeHtml(crop.notes || 'Explore the crop profile for more information.')}</p>
        <div class="crop-card-actions">
          <button class="btn" type="button" data-action="details" data-crop-id="${id}">View details</button>
          <a class="btn btn-outline" href="calculator.html?crop=${encodeURIComponent(crop.id)}">Quick Calc</a>
        </div>
      </div>
    </article>`;
}

function renderCropGrid(filteredCrops) {
  const grid = $('#cropGrid');
  if (!grid) return;
  const hasFilters = Boolean($('#cropSearch'));
  const shownCrops = filteredCrops || (hasFilters ? crops : crops.slice(0, 4));
  if (!shownCrops.length) {
    showEmpty(grid, 'No crops match these filters. Try changing your search or clearing the filters.');
  } else {
    grid.innerHTML = shownCrops.map(cropCard).join('');
  }
  const count = $('#cropCount');
  if (count) count.textContent = `Showing ${shownCrops.length} of ${crops.length} crop profiles.`;
}

function populateCropFilters() {
  const seasonSelect = $('#cropSeasonFilter');
  const soilSelect = $('#cropSoilFilter');
  if (!seasonSelect || !soilSelect) return;

  const seasons = Array.from(new Set(crops.map(crop => String(crop.season || '').toLowerCase()).filter(Boolean)));
  const soils = Array.from(new Set(crops.map(crop => String(crop.soil || '').trim()).filter(Boolean)));
  seasons.forEach(season => seasonSelect.add(new Option(seasonName(season), season)));
  soils.forEach(soil => soilSelect.add(new Option(capitalize(soil), normalizedSoil(soil))));
}

function applyCropFilters() {
  const query = ($('#cropSearch')?.value || '').trim().toLowerCase();
  const season = $('#cropSeasonFilter')?.value || 'all';
  const soil = $('#cropSoilFilter')?.value || 'all';
  const filtered = crops.filter(crop => {
    const matchesText = !query || [crop.name, crop.season, crop.soil, crop.notes]
      .some(value => String(value || '').toLowerCase().includes(query));
    const matchesSeason = season === 'all' || String(crop.season || '').toLowerCase() === season;
    const matchesSoil = soil === 'all' || normalizedSoil(crop.soil) === soil;
    return matchesText && matchesSeason && matchesSoil;
  });
  renderCropGrid(filtered);
}

function populateCalcSelect() {
  const select = $('#calcCrop');
  if (!select) return;
  select.innerHTML = '<option value="">-- Select Crop --</option>';
  crops.forEach(crop => select.add(new Option(crop.name, crop.id)));
}

function readArea() {
  const cropId = $('#calcCrop')?.value;
  const enteredArea = Number($('#calcArea')?.value);
  const unit = $('#calcUnit')?.value || 'acre';
  if (!cropId) return { error: 'Please select a crop.' };
  if (!Number.isFinite(enteredArea) || enteredArea <= 0) return { error: 'Enter a land area greater than zero.' };
  const area = unit === 'hectare' ? hectareToAcres(enteredArea) : enteredArea;
  const crop = crops.find(item => item.id === cropId);
  if (!crop) return { error: 'The selected crop could not be found in the crop data.' };
  return { crop, area };
}

function calculateNPKandManpower() {
  const result = $('#calcResult');
  if (!result) return;
  const selection = readArea();
  if (selection.error) {
    result.textContent = selection.error;
    return;
  }
  const { crop, area } = selection;
  result.textContent = [
    `For ${numberText(area, 2)} acre(s) of ${crop.name}:`,
    '',
    `Nitrogen (N): ${numberText(crop.n * area)} kg`,
    `Phosphorus (P): ${numberText(crop.p * area)} kg`,
    `Potassium (K): ${numberText(crop.k * area)} kg`,
    `Estimated manpower required: ${Math.ceil(crop.people * area)} person(s)`,
    `Estimated yield (approx): ${crop.yieldPerAcre || 'N/A'}`
  ].join('\n');
}

function calculateCosts() {
  const result = $('#costResult');
  if (!result) return;
  const selection = readArea();
  if (selection.error) {
    result.textContent = selection.error;
    return;
  }
  const { crop, area } = selection;
  const values = ['costN', 'costP', 'costK', 'labourCost', 'labourDays'].map(id => {
    const field = document.getElementById(id);
    return field && field.value !== '' ? Number(field.value) : 0;
  });
  if (values.some(value => !Number.isFinite(value) || value < 0)) {
    result.textContent = 'Enter zero or a positive number for each cost and working-day field.';
    return;
  }
  const [costN, costP, costK, labourCost, labourDays] = values;
  const n = crop.n * area;
  const p = crop.p * area;
  const k = crop.k * area;
  const costs = [n * costN, p * costP, k * costK];
  const labourTotal = crop.people * area * labourCost * labourDays;
  const currency = amount => `₹ ${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  result.textContent = [
    'Fertilizer requirements',
    `Nitrogen: ${numberText(n)} kg  |  Phosphorus: ${numberText(p)} kg  |  Potassium: ${numberText(k)} kg`,
    '',
    'Estimated cost breakdown',
    `Nitrogen: ${currency(costs[0])}  |  Phosphorus: ${currency(costs[1])}  |  Potassium: ${currency(costs[2])}`,
    `Labour needed: ${Math.ceil(crop.people * area)} persons`,
    `Total labour cost: ${currency(labourTotal)}`,
    `Total estimated farming cost: ${currency(costs.reduce((sum, value) => sum + value, 0) + labourTotal)}`
  ].join('\n');
}

function populateSoilOptions() {
  const select = $('#soilTypeSelect');
  if (!select) return;
  const existing = new Set(Array.from(select.options).map(option => normalizedSoil(option.value)));
  const soils = Array.from(new Set(crops.map(crop => String(crop.soil || '').trim()).filter(Boolean)));
  soils.forEach(soil => {
    const normalized = normalizedSoil(soil);
    if (!existing.has(normalized)) {
      const label = normalized === 'clay' ? 'Clayey' : normalized === 'loam' ? 'Loamy' : capitalize(soil);
      select.add(new Option(label, normalized));
      existing.add(normalized);
    }
  });
}

function checkSoil() {
  const result = $('#soilResult');
  if (!result) return;
  const soil = $('#soilTypeSelect')?.value || '';
  const season = $('#soilSeasonSelect')?.value || '';
  if (!soil || !season) {
    showEmpty(result, 'Select both a soil type and a season to see matching crop profiles.');
    return;
  }
  const suitable = crops.filter(crop => {
    const soilMatch = normalizedSoil(crop.soil) === normalizedSoil(soil);
    const seasonMatch = season === 'all' || String(crop.season || '').toLowerCase() === season.toLowerCase();
    return soilMatch && seasonMatch;
  }).sort((first, second) => Number(second.soilScore || 0) - Number(first.soilScore || 0));
  if (!suitable.length) {
    showEmpty(result, 'No crop profiles match this soil and season in the existing dataset.');
    return;
  }
  result.className = 'grid soil-result-grid';
  result.innerHTML = suitable.map(crop => `
    <article class="crop-card">
      <img class="crop-photo" src="${escapeHtml(crop.image || 'images/placeholder.png')}" alt="${escapeHtml(crop.name)} growing in a field" loading="lazy">
      <div class="crop-card-content">
        <h2>${escapeHtml(crop.name)}</h2>
        <div class="crop-card-meta"><span class="badge">Soil score: ${escapeHtml(crop.soilScore ?? 'N/A')}/10</span><span class="badge">${escapeHtml(seasonName(crop.season))}</span></div>
        <p>${escapeHtml(crop.soil || 'Soil not specified')} soil · NPK ${escapeHtml(crop.n)}/${escapeHtml(crop.p)}/${escapeHtml(crop.k)} kg per acre</p>
        <div class="crop-card-actions"><button class="btn" type="button" data-action="details" data-crop-id="${escapeHtml(crop.id)}">View details</button></div>
      </div>
    </article>`).join('');
}

function renderSeasonGrid(selectedSeason) {
  const grid = $('#seasonGrid');
  if (!grid) return;
  if (!crops.length) return;
  const season = String(selectedSeason || 'all').toLowerCase();
  const filtered = crops.filter(crop => {
    const cropSeason = String(crop.season || '').toLowerCase();
    if (season === 'all') return true;
    if (season === 'all-year') return cropSeason === 'all';
    return cropSeason === season || cropSeason === 'all';
  });
  if (!filtered.length) {
    showEmpty(grid, 'No crop profiles are listed for this season.');
    return;
  }
  grid.innerHTML = filtered.map(crop => {
    const timeline = crop.timeline || {};
    const items = [
      ['Sowing', timeline.sowing],
      ['Irrigation', timeline.irrigation],
      ['Fertilizer', timeline.fertilizer],
      ['Harvest', timeline.harvest]
    ];
    return `
      <article class="season-card">
        <div class="season-card-header">
          <img src="${escapeHtml(crop.image || 'images/placeholder.png')}" alt="${escapeHtml(crop.name)} crop" loading="lazy">
          <div><h2>${escapeHtml(crop.name)}</h2><p>${escapeHtml(seasonName(crop.season))} · ${escapeHtml(crop.soil || 'Soil not specified')} soil</p></div>
        </div>
        <ol class="timeline-list">${items.map(([label, value]) => `<li><strong>${label}</strong><span>${escapeHtml(value || 'Not specified')}</span></li>`).join('')}</ol>
      </article>`;
  }).join('');
}

function loadComparisonDropdowns() {
  ['compare1', 'compare2'].forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;
    select.innerHTML = '<option value="">-- Select Crop --</option>';
    crops.forEach(crop => select.add(new Option(crop.name, crop.id)));
  });
}

function compareCrops() {
  const out = $('#comparisonResult');
  if (!out) return;
  const firstId = $('#compare1')?.value;
  const secondId = $('#compare2')?.value;
  if (!firstId || !secondId) {
    showEmpty(out, 'Please select two crops to compare.');
    return;
  }
  if (firstId === secondId) {
    showEmpty(out, 'Select two different crops to compare their profiles.');
    return;
  }
  const first = crops.find(crop => crop.id === firstId);
  const second = crops.find(crop => crop.id === secondId);
  if (!first || !second) {
    showEmpty(out, 'A selected crop could not be found in the crop data.');
    return;
  }
  const rows = [
    ['Growing season', seasonName(first.season), seasonName(second.season)],
    ['Soil type', first.soil, second.soil],
    ['Soil suitability score', `${first.soilScore ?? 'N/A'}/10`, `${second.soilScore ?? 'N/A'}/10`],
    ['Nitrogen (kg/acre)', first.n, second.n],
    ['Phosphorus (kg/acre)', first.p, second.p],
    ['Potassium (kg/acre)', first.k, second.k],
    ['Estimated yield per acre', first.yieldPerAcre || 'N/A', second.yieldPerAcre || 'N/A'],
    ['Water requirement', first.waterRequirement || 'N/A', second.waterRequirement || 'N/A'],
    ['People per acre', first.people, second.people],
    ['Sowing', first.timeline?.sowing || 'N/A', second.timeline?.sowing || 'N/A'],
    ['Irrigation', first.timeline?.irrigation || 'N/A', second.timeline?.irrigation || 'N/A'],
    ['Fertilizer timing', first.timeline?.fertilizer || 'N/A', second.timeline?.fertilizer || 'N/A'],
    ['Harvest', first.timeline?.harvest || 'N/A', second.timeline?.harvest || 'N/A']
  ];
  out.innerHTML = `
    <div class="comparison-cards">
      <article class="comparison-crop"><img src="${escapeHtml(first.image || 'images/placeholder.png')}" alt="${escapeHtml(first.name)} crop photograph"><h2>${escapeHtml(first.name)}</h2></article>
      <article class="comparison-crop"><img src="${escapeHtml(second.image || 'images/placeholder.png')}" alt="${escapeHtml(second.name)} crop photograph"><h2>${escapeHtml(second.name)}</h2></article>
    </div>
    <div class="comparison-details" role="table" aria-label="Crop profile comparison">
      ${rows.map(([label, firstValue, secondValue]) => `<div class="comparison-row" role="row"><div role="rowheader">${escapeHtml(label)}</div><div role="cell">${escapeHtml(firstValue ?? 'N/A')}</div><div role="cell">${escapeHtml(secondValue ?? 'N/A')}</div></div>`).join('')}
    </div>`;
}

function renderTips() {
  const grid = $('#tipGrid');
  if (!grid) return;
  grid.innerHTML = crops.map((crop, index) => `
    <article class="tip-card">
      <span class="feature-icon" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
      <div><h3>${escapeHtml(crop.name)}</h3><p>${escapeHtml(crop.notes || 'No additional notes in the crop data.')}</p><a href="crops.html">Open crop guide &rarr;</a></div>
    </article>`).join('');
}

function openCropDetails(cropId, trigger) {
  const crop = crops.find(item => item.id === cropId);
  const modal = $('#cropModal');
  const body = $('#modalBody');
  if (!crop || !modal || !body) return;
  const timeline = crop.timeline || {};
  modalTrigger = trigger || document.activeElement;
  body.innerHTML = `
    <img class="modal-crop-photo" src="${escapeHtml(crop.image || 'images/placeholder.png')}" alt="${escapeHtml(crop.name)} crop photograph">
    <h2 class="modal-title" id="modalHeading">${escapeHtml(crop.name)}</h2>
    <p class="modal-lead">${escapeHtml(seasonName(crop.season))} season · ${escapeHtml(crop.soil || 'Soil not specified')} soil</p>
    <div class="modal-stats">
      <div class="modal-stat"><strong>Yield / acre</strong><span>${escapeHtml(crop.yieldPerAcre || 'N/A')}</span></div>
      <div class="modal-stat"><strong>Water</strong><span>${escapeHtml(crop.waterRequirement || 'N/A')}</span></div>
      <div class="modal-stat"><strong>Soil score</strong><span>${escapeHtml(crop.soilScore ?? 'N/A')}/10</span></div>
      <div class="modal-stat"><strong>People / acre</strong><span>${escapeHtml(crop.people ?? 'N/A')}</span></div>
    </div>
    <section class="modal-section"><h3>Fertilizer requirements (kg per acre)</h3><p>Nitrogen: ${escapeHtml(crop.n)} kg · Phosphorus: ${escapeHtml(crop.p)} kg · Potassium: ${escapeHtml(crop.k)} kg</p></section>
    <section class="modal-section"><h3>Pests</h3>${listItems(crop.pests)}</section>
    <section class="modal-section"><h3>Diseases</h3>${listItems(crop.diseases)}</section>
    <section class="modal-section"><h3>Farming timeline</h3>
      <p><strong>Sowing:</strong> ${escapeHtml(timeline.sowing || 'N/A')}</p>
      <p><strong>Irrigation:</strong> ${escapeHtml(timeline.irrigation || 'N/A')}</p>
      <p><strong>Fertilizer:</strong> ${escapeHtml(timeline.fertilizer || 'N/A')}</p>
      <p><strong>Harvest:</strong> ${escapeHtml(timeline.harvest || 'N/A')}</p>
    </section>
    <section class="modal-section"><h3>Notes &amp; tips</h3><p>${escapeHtml(crop.notes || 'No additional notes.')}</p></section>`;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  $('#modalClose')?.focus();
}

function listItems(items) {
  if (!Array.isArray(items) || !items.length) return '<p>Not specified in the crop data.</p>';
  return `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function closeCropDetails() {
  const modal = $('#cropModal');
  if (!modal || !modal.classList.contains('is-open')) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  if (modalTrigger && typeof modalTrigger.focus === 'function') modalTrigger.focus();
}

function applyCalculatorQuery() {
  const select = $('#calcCrop');
  if (!select) return;
  const cropId = new URLSearchParams(window.location.search).get('crop');
  if (!cropId || !crops.some(crop => crop.id === cropId)) return;
  select.value = cropId;
  const notice = $('#quickCalcNotice');
  const crop = crops.find(item => item.id === cropId);
  if (notice) notice.textContent = `Quick Calc: ${crop.name} is selected. Enter an area to calculate fertilizer and manpower estimates.`;
}

function setupNavigation() {
  const toggle = $('.menu-toggle');
  const nav = $('#mainNav');
  if (!toggle || !nav) return;
  const setOpen = isOpen => {
    nav.classList.toggle('is-open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', event => {
    if (event.target.closest('a')) setOpen(false);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  $('#cropSearch')?.addEventListener('input', applyCropFilters);
  $('#cropSeasonFilter')?.addEventListener('change', applyCropFilters);
  $('#cropSoilFilter')?.addEventListener('change', applyCropFilters);
  $('#clearCropFilters')?.addEventListener('click', () => {
    if ($('#cropSearch')) $('#cropSearch').value = '';
    if ($('#cropSeasonFilter')) $('#cropSeasonFilter').value = 'all';
    if ($('#cropSoilFilter')) $('#cropSoilFilter').value = 'all';
    applyCropFilters();
  });
  $('#calcBtn')?.addEventListener('click', calculateNPKandManpower);
  $('#costCalcBtn')?.addEventListener('click', calculateCosts);
  $('#soilCheckBtn')?.addEventListener('click', checkSoil);
  $('#compareBtn')?.addEventListener('click', compareCrops);
  $('#seasonSelect')?.addEventListener('change', event => renderSeasonGrid(event.target.value));
  $('#modalClose')?.addEventListener('click', closeCropDetails);
  $$('.main-nav a[aria-current="page"]').forEach(link => link.setAttribute('aria-current', 'page'));

  document.addEventListener('click', event => {
    const detailsButton = event.target.closest('[data-action="details"]');
    if (detailsButton) openCropDetails(detailsButton.dataset.cropId, detailsButton);
    if (event.target === $('#cropModal')) closeCropDetails();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeCropDetails();
      const nav = $('#mainNav');
      const toggle = $('.menu-toggle');
      if (nav?.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        toggle?.setAttribute('aria-expanded', 'false');
        toggle?.setAttribute('aria-label', 'Open navigation menu');
      }
    }
  });
  const year = $('[data-current-year]');
  if (year) year.textContent = String(new Date().getFullYear());
  loadCrops();
});
