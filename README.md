# Colors of Place — Sample Atlas

An evidence-linked prototype for exploring recorded color palettes across five selected places in China. The project compares sampled photographs; it does **not** claim to identify a place's true, representative, or culturally definitive colors.

Live site: <https://charleston1107.github.io/suzhou-in-color/>

## What changed in this redesign

- **Geographic map:** plots all five places from the latitude and longitude stored in data.js.
- **Unified Compare workspace:** replaces separate Compare and Similarity navigation with two explicit tasks.
- **Photograph comparison:** lets users assign any two material-library photographs to A and B, then compares palette similarity, largest difference, shared family, lightness, chroma, and contextual compatibility.
- **Place comparison:** compares all photographs for discovery or applies a shared scene-category lens for a more defensible A/B comparison.
- **Aligned difference chart:** places both samples in the same 12 perceptual color families, shows percentage-point differences, and preserves the original extracted shades.
- **Adobe-inspired theme lenses:** applies the same Representative, Colorful, Bright, Muted, Deep, or Dark lens to both places.
- **Source trace:** selecting a color family reveals the photographs contributing most strongly to that aggregate.
- **Embedded similarity network:** recalculates relationships under the selected category and theme lens, but presents similarity as one result inside place comparison.
- **Cultural-context scaffold:** separates observed visual evidence, possible explanatory factors, and the local/community evidence still required.
- **Multi-label-ready classification:** filtering includes both primaryCategory and secondaryCategories; non-placeholder tags are displayed when available.

## Data boundary

The current preview contains 50 source photographs: 10 each for Jinxi, Bacheng, Hong Kong, Genie Town, and Luoyang. Place coordinates and image-derived dominant colors are present. Photo titles, category assignments, tags, dates, photographers, and photo-level coordinates are still incomplete or provisional.

The four broad categories are navigation lenses rather than mutually exclusive definitions:

1. Natural Landscape and Atmosphere
2. Architecture and Material Surfaces
3. People, Dress, and Embodied Life
4. Objects and Visual Communication

Each photograph can retain one primary category, additional secondary categories, and multiple descriptive tags.

## Comparison method

1. Each photograph retains five extracted hex colors and their proportions.
2. Each hex color is converted to OKLab.
3. The optional Adobe-inspired lens transparently reweights those five swatches:
   - Representative preserves the recorded proportions.
   - Colorful emphasizes higher chroma.
   - Bright emphasizes higher lightness.
   - Muted emphasizes lower chroma.
   - Deep emphasizes chromatic mid-to-dark colors.
   - Dark emphasizes lower lightness.
4. Fixed lightness, chroma, and hue rules assign the weighted shades to one of 12 shared perceptual families.
5. Family weights are averaged across the photographs included by the current scene-category lens.
6. Similarity is computed as 100 × (1 − 0.5 × L1 distance between the two normalized family distributions).

This method makes subtle differences more legible while keeping raw shades and source photographs inspectable. The resulting score describes only the current sample. It does not establish cultural similarity, influence, identity, or representativeness.

## Adobe reference and boundary

The five-swatch format and the Colorful, Bright, Dark, Deep, and Muted vocabulary are inspired by Adobe Color and Adobe Capture:

<https://helpx.adobe.com/uk/indesign/desktop/apply-color/define-and-manage-color-assets/add-and-manage-colors-from-cc-libraries.html>

This prototype does not call an Adobe API and does not claim to reproduce Adobe's proprietary extraction algorithm. The current lenses operate only on the five colors already recorded in data.js; adding a reproducible full-pixel extraction script is the next technical milestone.

## Run locally

This is a static site with no build step. From the repository root, run:

    python3 -m http.server 8000

Then open <http://localhost:8000/>.

Internet access is needed for Leaflet and OpenStreetMap tiles. If map tiles fail, the accessible location list still provides all five place records. The rest of the prototype uses local repository files.

## Files

- index.html — document shell and Leaflet dependency
- styles.css — responsive interface styles
- data.js — places, photographs, categories, palettes, and metadata
- app.js — map, filtering, comparison, source trace, and similarity logic
- images/ — source photograph samples

## Responsible interpretation

- Camera settings, crop, weather, season, restoration, tourism, and photographer choice affect observed color.
- The original full-image extraction script is not yet included, so the stored five-color palettes cannot yet be independently regenerated.
- Category-matched comparison reduces one confound but does not make the sample representative.
- Community review, permission checks, and fuller provenance remain necessary before public cultural claims.
- OpenStreetMap tiles are provided by OpenStreetMap contributors and loaded from the public tile service.
