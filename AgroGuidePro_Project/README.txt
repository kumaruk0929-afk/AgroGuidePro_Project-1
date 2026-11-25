AgroGuide Pro - Smart Agriculture Portal

Run locally:
1. Open this project folder in VS Code.
2. Start VS Code Live Server from index.html, or run:
   python -m http.server 8000
3. Visit http://localhost:8000

Pages:
- index.html: home, featured crops and feature overview
- crops.html: crop search, season/soil filters and crop details
- calculator.html: fertilizer, manpower and cost estimates
- soil-checker.html: soil and season recommendations
- season-planner.html: crop timelines from the stored crop data
- crop-comparison.html: side-by-side crop comparison
- farming-tools.html: existing tools and notes from crop records
- about.html: project purpose, features and team

The pages share style.css, script.js and data/crops.json. Crop photographs are
stored in images/. Their source and license information is in
images/image-credits.txt.

The crop data and calculator results are demonstration information, not
location-specific agronomic advice. Confirm farm decisions with local experts.
