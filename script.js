/* ==========================================================================
   AgroGuide Pro - script.js
   All-in-one client-side script for:
   - loading crop data (data/crops.json)
   - rendering crop grid
   - crop details modal (pests, diseases, timeline, notes)
   - NPK & manpower calculator
   - Fertilizer cost & labour estimator
   - Season planner
   - Soil suitability checker
   - Crop comparison tool
   ========================================================================== */

let crops = [];

// -------------------------------
// Utility helpers
// -------------------------------
const toFixedNum = (v, d = 1) => Number.parseFloat(v).toFixed(d);
const hectareToAcres = (h) => h * 2.47105;

// -------------------------------
// Load crops.json and initialize
// -------------------------------
async function loadCrops() {
  try {
    const res = await fetch('data/crops.json');
    crops = await res.json();

    renderCropGrid();
    populateCalcSelect();
    renderSeasonGrid('all');
    populateSoilOptions();         // populates soil selector if dynamic needed
    loadComparisonDropdowns();
  } catch (err) {
    console.error('Error loading crops.json', err);
    document.getElementById('cropGrid').innerHTML = '<p style="color:#c00">Failed to load crop data.</p>';
  }
}

// -------------------------------
// Render crop cards on homepage
// -------------------------------
function renderCropGrid() {
  const grid = document.getElementById('cropGrid');
  grid.innerHTML = '';

  crops.forEach(crop => {
    const card = document.createElement('div');
    card.className = 'card crop-card';

    // Use fallback image if crop.image missing
    const imgSrc = crop.image || 'images/placeholder.jpg';

    card.innerHTML = `
      <img src="${imgSrc}" alt="${crop.name}">
      <h3>${crop.name}</h3>
      <p><strong>Season:</strong> ${capitalize(crop.season)}</p>
      <p><strong>Soil:</strong> ${crop.soil}</p>
      <div style="margin-top:10px; display:flex; gap:8px;">
        <button class="btn" onclick="openCropDetails('${crop.id}')">View Details</button>
        <button class="btn btn-outline" onclick="quickCalc('${crop.id}')">Quick Calc</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

// Quick calc helper: open calculator preselected with crop
function quickCalc(cropId){
const select = document.getElementById('calcCrop');
  select.value = cropId;
  // scroll to calculator
  document.getElementById('calculator').scrollIntoView({behavior:'smooth'});
}

// -------------------------------
// Populate Calculator dropdown
// -------------------------------
function populateCalcSelect() {
  const sel = document.getElementById('calcCrop');
  sel.innerHTML = ''; // clear
  const emptyOpt = document.createElement('option');
  emptyOpt.value = '';
  emptyOpt.textContent = '-- Select Crop --';
  sel.appendChild(emptyOpt);

  crops.forEach(crop => {
    const opt = document.createElement('option');
    opt.value = crop.id;
    opt.textContent = crop.name;
    sel.appendChild(opt);
  });
}

// -------------------------------
// Main NPK & manpower calculator
// -------------------------------
function calculateNPKandManpower() {
  const cropId = document.getElementById('calcCrop').value;
  let area = parseFloat(document.getElementById('calcArea').value);
  const unit = document.getElementById('calcUnit').value;
  const resultBox = document.getElementById('calcResult');

  if (!cropId) { alert('Please select a crop'); return; }
  if (!area || area <= 0) { alert('Enter valid land area'); return; }

  if (unit === 'hectare') area = hectareToAcres(area);

  const crop = crops.find(c => c.id === cropId);
  if (!crop) { resultBox.textContent = 'Selected crop not found.'; return; }

  const N = crop.n * area;
  const P = crop.p * area;
  const K = crop.k * area;
  const people = Math.ceil(crop.people * area);
  const estYield = crop.yieldPerAcre || "N/A";

  resultBox.textContent = `
For ${toFixedNum(area,2)} acre(s) of ${crop.name}:

Nitrogen (N): ${toFixedNum(N,1)} kg
Phosphorus (P): ${toFixedNum(P,1)} kg
Potassium (K): ${toFixedNum(K,1)} kg
Estimated manpower required: ${people} person(s)
Estimated yield (approx): ${estYield}
`.trim();
}

// -------------------------------
// Fertilizer cost & labour estimator
// -------------------------------
function calculateCosts() {
  const cropId = document.getElementById('calcCrop').value;
  let area = parseFloat(document.getElementById('calcArea').value);
  const unit = document.getElementById('calcUnit').value;

  const costN = parseFloat(document.getElementById('costN').value) || 0;
  const costP = parseFloat(document.getElementById('costP').value) || 0;
  const costK = parseFloat(document.getElementById('costK').value) || 0;
  const labourCost = parseFloat(document.getElementById('labourCost').value) || 0;
  const labourDays = parseFloat(document.getElementById('labourDays').value) || 0;

  const box = document.getElementById('costResult');

  if (!cropId) { box.innerHTML = '<p style="color:#c00;">Select a crop first (left panel).</p>'; return; }
  if (!area || area <= 0) { box.innerHTML = '<p style="color:#c00;">Enter valid area.</p>'; return; }
  if (unit === 'hectare') area = hectareToAcres(area);

  const crop = crops.find(c => c.id === cropId);
const nTotal = crop.n * area;
  const pTotal = crop.p * area;
  const kTotal = crop.k * area;

  const totalCostN = nTotal * costN;
  const totalCostP = pTotal * costP;
  const totalCostK = kTotal * costK;

  const labourTotal = (crop.people * area) * labourCost * labourDays;

  const finalCost = totalCostN + totalCostP + totalCostK + labourTotal;

  box.innerHTML = `
<h4>Fertilizer Requirements</h4>
<p>Nitrogen (N): <b>${toFixedNum(nTotal,1)} kg</b></p>
<p>Phosphorus (P): <b>${toFixedNum(pTotal,1)} kg</b></p>
<p>Potassium (K): <b>${toFixedNum(kTotal,1)} kg</b></p>

<h4>Cost Breakdown</h4>
<p>Nitrogen Cost: ₹ ${toFixedNum(totalCostN,2)}</p>
<p>Phosphorus Cost: ₹ ${toFixedNum(totalCostP,2)}</p>
<p>Potassium Cost: ₹ ${toFixedNum(totalCostK,2)}</p>

<h4>Labour</h4>
<p>Labour needed (approx): <b>${Math.ceil(crop.people * area)}</b> persons</p>
<p>Total Labour Cost: ₹ ${toFixedNum(labourTotal,2)}</p>
<h3>Total Estimated Farming Cost: ₹ ${toFixedNum(finalCost,2)}</h3>
`.trim();
}

// -------------------------------
// Season planner rendering
// -------------------------------
function renderSeasonGrid(season) {
  const grid = document.getElementById('seasonGrid');
  grid.innerHTML = '';

  const filtered = (season === 'all' || !season)
    ? crops
    : crops.filter(c => c.season && c.season.toLowerCase() === season.toLowerCase());

  if (filtered.length === 0) {
    grid.innerHTML = '<p>No crops found for this season.</p>';
    return;
  }

  filtered.forEach(crop => {
    const div = document.createElement('div');
    div.className = 'card crop-card';
    const imgSrc = crop.image || 'images/placeholder.jpg';
    div.innerHTML = `
      <img src="${imgSrc}" alt="${crop.name}">
<h4>${crop.name}</h4>
      <p><strong>Soil:</strong> ${crop.soil}</p>
      <p><strong>NPK/acre:</strong> N:${crop.n} P:${crop.p} K:${crop.k}</p>
      <button class="btn" onclick="openCropDetails('${crop.id}')">View Details</button>
    `;
    grid.appendChild(div);
  });
}

// -------------------------------
// Soil suitability checker
// -------------------------------
function checkSoil() {
  const soilType = document.getElementById('soilTypeSelect').value;
  const season = document.getElementById('soilSeasonSelect').value;
  const resultDiv = document.getElementById('soilResult');

  if (!soilType || !season) {
    resultDiv.innerHTML = '<p style="color:#c00;">Please select both soil type and season.</p>';
    return;
  }

  const suitable = crops.filter(c => c.soil && c.soil.toLowerCase() === soilType.toLowerCase() && c.season
&& c.season.toLowerCase() === season.toLowerCase());

  if (suitable.length === 0) {
    resultDiv.innerHTML = '<p>No suitable crops found for this combination.</p>';
return;
  }

  resultDiv.innerHTML = suitable.map(c => `
    <div class="card crop-card">
      <img src="${c.image || 'images/placeholder.jpg'}" alt="${c.name}">
      <h3>${c.name}</h3>
      <p><strong>Soil Score:</strong> ${c.soilScore || 'N/A'}/10</p>
      <p><strong>NPK/acre:</strong> ${c.n}/${c.p}/${c.k}</p>
      <button class="btn" onclick="openCropDetails('${c.id}')">View Details</button>
    </div>
  `).join('');
}

// -------------------------------
// Crop Comparison Tool
// -------------------------------
function loadComparisonDropdowns() {
  const c1 = document.getElementById('compare1');
  const c2 = document.getElementById('compare2');

  if(!c1 || !c2) return;

  c1.innerHTML = '<option value="">-- Select Crop --</option>';
  c2.innerHTML = '<option value="">-- Select Crop --</option>';

  crops.forEach(crop => {
const op1 = document.createElement('option');
    op1.value = crop.id;
    op1.textContent = crop.name;

    const op2 = document.createElement('option');
    op2.value = crop.id;
    op2.textContent = crop.name;

    c1.appendChild(op1);
    c2.appendChild(op2);
  });
}

function compareCrops() {
  const id1 = document.getElementById('compare1').value;
  const id2 = document.getElementById('compare2').value;
  const out = document.getElementById('comparisonResult');

  if (!id1 || !id2) {
    out.innerHTML = '<p style="color:#c00;">Please select two crops to compare.</p>'; return;
  }
  if (id1 === id2) {
    out.innerHTML = '<p style="color:#c00;">Select two different crops.</p>'; return;
  }

  const c1 = crops.find(c => c.id === id1);
  const c2 = crops.find(c => c.id === id2);
out.innerHTML = `
    <table class="compare-table">
      <tr><th>Feature</th><th>${c1.name}</th><th>${c2.name}</th></tr>
      <tr><td>N (kg/acre)</td><td>${c1.n}</td><td>${c2.n}</td></tr>
      <tr><td>P (kg/acre)</td><td>${c1.p}</td><td>${c2.p}</td></tr>
      <tr><td>K (kg/acre)</td><td>${c1.k}</td><td>${c2.k}</td></tr>
      <tr><td>Yield (per acre)</td><td>${c1.yieldPerAcre || 'N/A'}</td><td>${c2.yieldPerAcre ||
'N/A'}</td></tr>
      <tr><td>Water Requirement</td><td>${c1.waterRequirement || 'N/A'}</td><td>${c2.waterRequirement
|| 'N/A'}</td></tr>
      <tr><td>Soil Type</td><td>${c1.soil}</td><td>${c2.soil}</td></tr>
      <tr><td>People (per acre)</td><td>${c1.people}</td><td>${c2.people}</td></tr>
    </table>
  `;
}

// -------------------------------
// Modal: open / close crop details
// -------------------------------
function openCropDetails(cropId) {
  const crop = crops.find(c => c.id === cropId);
  if (!crop) {
    alert('Crop data not found.');
    return;
  }

  const modal = document.getElementById('cropModal');
const body = document.getElementById('modalBody');

  body.innerHTML = `
    <img src="${crop.image || 'images/placeholder.jpg'}" alt="${crop.name}">
    <h2>${crop.name}</h2>
    <p><strong>Season:</strong> ${capitalize(crop.season)}</p>
    <p><strong>Soil:</strong> ${crop.soil}</p>

    <div class="modal-section">
      <h3>Pests</h3>
      <ul>${(crop.pests || []).map(p => `<li>${p}</li>`).join('')}</ul>
    </div>

    <div class="modal-section">
      <h3>Diseases</h3>
      <ul>${(crop.diseases || []).map(d => `<li>${d}</li>`).join('')}</ul>
    </div>

    <div class="modal-section">
      <h3>Farming Timeline</h3>
      <p><strong>Sowing:</strong> ${crop.timeline?.sowing || 'N/A'}</p>
      <p><strong>Irrigation:</strong> ${crop.timeline?.irrigation || 'N/A'}</p>
      <p><strong>Fertilizer:</strong> ${crop.timeline?.fertilizer || 'N/A'}</p>
      <p><strong>Harvest:</strong> ${crop.timeline?.harvest || 'N/A'}</p>
    </div>

    <div class="modal-section">
<h3>Water Requirement</h3>
      <p>${crop.waterRequirement || 'N/A'}</p>
    </div>

    <div class="modal-section">
      <h3>Soil Suitability Score</h3>
      <p>${crop.soilScore || 'N/A'}/10</p>
    </div>

    <div class="modal-section">
      <h3>Notes & Tips</h3>
      <p>${crop.notes || 'No additional notes.'}</p>
    </div>
  `;

  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden', 'false');
}

function closeCropDetails() {
  const modal = document.getElementById('cropModal');
  if (!modal) return;
  modal.style.display = 'none';
  modal.setAttribute('aria-hidden', 'true');
}

// Close modal when clicking outside content
window.addEventListener('click', (e) => {
  const modal = document.getElementById('cropModal');
  if (!modal) return;
  if (e.target === modal) closeCropDetails();
});

// -------------------------------
// Small helpers
// -------------------------------
function capitalize(s){
  if(!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function populateSoilOptions() {
  // If you want to dynamically populate soil types in the selector
  // from crop data, you could do that here. For now the HTML has options.
}

// -------------------------------
// Event listeners - wire UI to functions
// -------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Button hooks
  const calcBtn = document.getElementById('calcBtn');
  if (calcBtn) calcBtn.addEventListener('click', calculateNPKandManpower);
const costBtn = document.getElementById('costCalcBtn');
  if (costBtn) costBtn.addEventListener('click', calculateCosts);

  const soilCheckBtn = document.getElementById('soilCheckBtn');
  if (soilCheckBtn) soilCheckBtn.addEventListener('click', checkSoil);

  const compareBtn = document.getElementById('compareBtn');
  if (compareBtn) compareBtn.addEventListener('click', compareCrops);

  const seasonSelect = document.getElementById('seasonSelect');
  if (seasonSelect) seasonSelect.addEventListener('change', (e) => renderSeasonGrid(e.target.value));

  // load data
  loadCrops();
});
