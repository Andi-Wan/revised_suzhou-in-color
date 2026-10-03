# Colors of Place — Sample Atlas

An evidence-linked prototype for exploring recorded color palettes across five selected places in China. The project compares sampled photographs; it does **not** claim to identify a place's true, representative, or culturally definitive colors.

Live site: <https://charleston1107.github.io/suzhou-in-color/>

## What changed in this redesign

- **Homepage chromatic blend:** adapts the interaction idea from [Aceternity Compare](https://ui.aceternity.com/components/compare) into a task-specific A/B blend. A prominent slider below the image crossfades the two selected source photographs and simultaneously reweights a combined palette, while fixed evidence cards identify the strongest shared family and largest distribution difference. Keyboard control is available through the native range input.
- **Native geographic atlas:** replaces third-party map tiles with an editorial SVG outline of China and positions all five place nodes from the latitude and longitude stored in data.js.
- **Editorial visual system:** uses a dark grid, high-contrast serif headings, compact uppercase labels, fine borders, and restrained palette accents.
- **Unified Compare workspace:** replaces separate Compare and Similarity navigation with two explicit tasks.
- **Direct photograph comparison:** removes the long A/B dropdowns. Users choose an active slot and click any thumbnail in the full, filterable photo library; A/B badges keep the current selection visible.
- **In-page editorial filters:** photograph place, category, and color-treatment filters use dark interface buttons instead of browser-native dropdown menus, keeping open controls visually consistent across operating systems.
- **Stable interaction position:** filters, theme changes, slot changes, and photo choices preserve the current scroll position instead of jumping to the top of the Compare page.
- **Place comparison:** compares all photographs for discovery or applies a shared scene-category lens for a more defensible A/B comparison.
- **Aligned difference chart:** places both samples in the same 12 perceptual color families, shows percentage-point differences, and preserves the original extracted shades.
- **Adobe-inspired theme lenses:** applies the same Representative, Colorful, Bright, Muted, Deep, or Dark lens to both places.
- **Source trace:** selecting a color family reveals the photographs contributing most strongly to that aggregate.
- **Embedded similarity network:** recalculates relationships under the selected category and theme lens, but presents similarity as one result inside place comparison.
- **Cultural-context scaffold:** separates observed visual evidence, possible explanatory factors, and the local/community evidence still required.
- **Multi-label-ready classification:** filtering includes both primaryCategory and secondaryCategories; non-placeholder tags are displayed when available.

## Data boundary

The current preview contains 50 source photographs: 10 each for Jinxi, Bacheng, Hong Kong, Genie Town, and Luoyang. Place coordinates and reproducibly extracted dominant colors are present. Photo titles, category assignments, tags, dates, photographers, and photo-level coordinates are still incomplete or provisional.

The four broad categories are navigation lenses rather than mutually exclusive definitions:

1. Natural Landscape and Atmosphere
2. Architecture and Material Surfaces
3. People, Dress, and Embodied Life
4. Objects and Visual Communication

Each photograph can retain one primary category, additional secondary categories, and multiple descriptive tags.

## Reproducible color extraction

`scripts/extract_palettes.py` rebuilds every displayed palette directly from the JPEG files in `images/`:

1. Apply EXIF orientation, decode the repository JPEG RGB values as sRGB, and resize proportionally to a maximum of 220 × 220 pixels. The current files contain no embedded ICC profiles; that assumption is recorded as a method boundary.
2. Convert pixels to CIELAB under D65.
3. Run deterministic K-means++ with `k=5`, a photo-specific seed derived from its stable ID, at most 30,000 sampled pixels, and at most 40 iterations.
4. Record each cluster's pixel proportion and display the actual source-image pixel nearest its CIELAB centroid.
5. Give every photograph equal total weight and run weighted CIELAB K-means to create each five-color place summary.
6. Record parameters and every source image SHA-256 in `data/extraction-manifest.json`.

K-means color quantization is informed by Celebi (2011). The method is deterministic and reproducible, but `k=5` remains a design choice: compression can hide small accents or split related shades.

## Comparison method

1. Each photograph retains five stored dominant hex colors and their proportions.
2. For the similarity calculation, sRGB hex values are converted to CIELAB under D65.
3. The optional Adobe-inspired lens transparently reweights those five swatches:
   - Representative preserves the recorded proportions.
   - Colorful emphasizes higher chroma.
   - Bright emphasizes higher lightness.
   - Muted emphasizes lower chroma.
   - Deep emphasizes chromatic mid-to-dark colors.
   - Dark emphasizes lower lightness.
4. A single photograph keeps its five recorded swatches. For a multi-photo place or category view, deterministic weighted K-means reduces all included source swatches to five CIELAB cluster centers.
5. The two five-color palettes are matched one-to-one by an exact bitmask dynamic-programming solver that minimizes total CIEDE2000 (ΔE00) difference. For N=5 it solves the same binary assignment objective for which Westland et al. use the Hungarian algorithm; the code does not claim to implement the Hungarian procedure itself.
6. The matched ΔE00 values are averaged using the mean proportion of each paired color.
7. The interface reports the weighted matched ΔE00 and a transparent display index: `max(0, min(100, 100 − ΔE00))`.
8. Separately, fixed OKLab rules group source shades into 12 named color families for the mirrored explanation chart and source trace. These bins explain differences; they no longer determine the similarity score.

The optimal binary matching and use of CIEDE2000 are informed by Westland et al. (2024). The proportion weighting, multi-photo K-means summary, and 0–100 display transform are transparent project extensions and have not yet been validated through a perceptual user study. Colorgorical (Gramazio et al., 2017) supports the broader use of perceptually grounded color difference in visualization palette work, but this project does not claim to implement the Colorgorical palette-generation algorithm.

This method makes subtle differences more legible while keeping raw shades and source photographs inspectable. The resulting index describes only the current sampled palettes. It does not establish cultural similarity, influence, identity, or representativeness.

## Research basis

- M. Emre Celebi. 2011. “Improving the performance of k-means for color quantization.” *Image and Vision Computing* 29(4), 260–271. <https://doi.org/10.1016/j.imavis.2010.10.002>
- Stephen Westland, Graham Finlayson, Peihua Lai, Qianqian Pan, Jie Yang, and Yun Chen. 2024. “A computational method for predicting color palette discriminability.” *Color Research & Application* 49(5), 465–473. <https://doi.org/10.1002/col.22927>
- Connor C. Gramazio, David H. Laidlaw, and Karen B. Schloss. 2017. “Colorgorical: Creating discriminable and preferable color palettes for information visualization.” *IEEE Transactions on Visualization and Computer Graphics* 23(1), 521–530. <https://doi.org/10.1109/TVCG.2016.2598918>
- Gaurav Sharma, Wencheng Wu, and Edul N. Dalal. 2005. “The CIEDE2000 color-difference formula: Implementation notes, supplementary test data, and mathematical observations.” *Color Research & Application* 30(1), 21–30. <https://doi.org/10.1002/col.20070>

## Adobe reference and boundary

The five-swatch format and the Colorful, Bright, Dark, Deep, and Muted vocabulary are inspired by Adobe Color and Adobe Capture:

<https://helpx.adobe.com/uk/indesign/desktop/apply-color/define-and-manage-color-assets/add-and-manage-colors-from-cc-libraries.html>

This prototype does not call an Adobe API and does not claim to reproduce Adobe's proprietary extraction algorithm. Adobe informs the five-swatch format and theme vocabulary only; the implemented extractor is the independently documented CIELAB K-means pipeline above.

## Run locally

This is a static site with no build step. From the repository root, run:

    python3 -m http.server 8000

Then open <http://localhost:8000/>.

To verify the CIEDE2000 implementation against a published Sharma et al. reference pair and test five-color summaries, self-comparison, and symmetry:

    node tests/color-method.test.js

To install the extraction dependencies, regenerate every palette, and verify that committed outputs are reproducible:

    python3 -m pip install -r requirements.txt
    python3 scripts/extract_palettes.py --write
    python3 scripts/extract_palettes.py --check

The geographic view is rendered locally as SVG and does not require Leaflet or map tiles. Its simplified 1:110m outline is derived from Natural Earth public-domain geometry; it is a spatial-orientation scaffold rather than an official boundary reference. Place nodes are projected from the WGS84 coordinates in `data.js`, while the accessible location list exposes the same records in text.

## Files

- index.html — static document shell
- styles.css — responsive interface styles
- data.js — places, photographs, categories, palettes, and metadata
- data/extraction-manifest.json — extraction parameters and source-image hashes
- scripts/extract_palettes.py — deterministic full-image palette extraction and data generation
- app.js — map, filtering, comparison, source trace, and similarity logic
- images/ — source photograph samples

## Responsible interpretation

- Camera settings, crop, weather, season, restoration, tourism, and photographer choice affect observed color.
- Five-color K-means is a lossy summary and may omit small but meaningful accents.
- Category-matched comparison reduces one confound but does not make the sample representative.
- Community review, permission checks, and fuller provenance remain necessary before public cultural claims.
- The homepage blend is a visual inspection aid, not a synthesized place or before/after claim; the paired photographs may differ in scene category, weather, framing, and capture conditions. Its slider changes only the exploratory overlay and weighted palette—not the underlying similarity score.
- The simplified outline is for orientation and should not be reused as an official administrative-boundary map.
