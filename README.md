# CLab — Virtual Chemistry Laboratory

**SRM Institute of Science and Technology**

CLab is a browser-based virtual chemistry laboratory for first-year chemistry students. It replaces a static lab manual with a live interface that reads real chemical data from open scientific databases, lets students explore the periodic table and 3D molecular structures, and guides them through a short course that ends in a graded quiz and a printable certificate.

**Live site:** `https://clabist.<your-subdomain>.workers.dev`

---

## What it does

### Explore elements
An interactive periodic table with all 118 elements, colour-coded by family — alkali metals, halogens, noble gases, lanthanides, and so on. Click any element to see its atomic mass, electron configuration, oxidation states, density, melting and boiling points, plus a Wikipedia summary and bars comparing its electronegativity, atomic radius, and ionization energy against the rest of the table.

### Search compounds
Look up any molecule by name (`aspirin`), CID (`CID:2244`), molecular formula (`C9H8O4`), or SMILES string (`CC(=O)OC1=CC=CC=C1C(=O)O`). Each result shows the 2D structure drawing, an interactive 3D conformer you can rotate and zoom, the IUPAC name, synonyms, CAS number, a Lipinski rule-of-five breakdown, and a downloadable SDF file.

### Learn the course
Five short videos cover the periodic table layout, periodic trends, SMILES notation, Lipinski's rule of five, and 3D molecular models. Each video ticks itself as watched when it finishes, and a progress bar fills as you go.

### Take the quiz
Once all five videos are watched, a ten-question quiz unlocks. Questions mix chemistry concepts with live data drawn from the periodic table and real compound records, so every attempt is different. Score 60% or more to pass.

### Get a certificate
After passing, enter your name, roll number, and registration number to generate a printable certificate. It's styled for A4 landscape, so saving as PDF from the browser gives you a clean document with a double-rule border and a signature block. Every certificate carries an ID that can be verified against the site.

---

## Who it's for

- **Chemistry students** — a hands-on way to explore periodic trends and molecular structure beyond what a textbook shows.
- **Teachers** — a ready-made lab activity with a built-in assessment and certificate for classroom use.
- **Anyone curious** — the compound search and 3D viewer work standalone if you just want to look up a molecule.

---

## Technologies

- **Front end:** hand-written HTML, CSS, and JavaScript — no framework, no build step.
- **3D molecular visualization:** 3Dmol.js.
- **Hosting:** Cloudflare Workers with static assets.
- **Data:** PubChem (NCBI), Wikipedia, and YouTube, all read live on each request.

---

## Developers

**Mithran** and **Abinesh**
Students, SRM Institute of Science and Technology

**Faculty guide:** R. Subramanian, Assistant Professor, Chemistry, SRM IST

---

## License

© 2026 CLab by Mithran and Abinesh, SRM IST. All rights reserved.

Chemical data belongs to its respective sources — PubChem (public domain, NCBI), Wikipedia (CC BY-SA 4.0, attribution preserved in the interface), and YouTube (embedding only).
