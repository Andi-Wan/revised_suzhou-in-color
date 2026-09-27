"use strict";

const D = window.ATLAS_DATA;
const app = document.getElementById("app");

let mapInstance = null;
let state = {
  view: "atlas",
  place: null,
  category: null,
  photo: null,
  compare: ["jinxi", "bacheng"],
  compareTask: "photos",
  compareLens: "all",
  compareFamily: null,
  photoCompare: ["jinxi-01", "bacheng-01"],
  activePhotoSlot: 0,
  libraryPlace: "all",
  libraryCategory: "all",
  sim: "jinxi",
  simLens: "all",
  themeMode: "representative"
};

const FAMILY_ORDER = [
  "near-black", "dark-neutral", "light-neutral", "white",
  "red", "orange", "yellow", "green", "cyan", "blue", "purple", "magenta"
];

const FAMILIES = {
  "near-black": { label: "Near black", color: "#171918" },
  "dark-neutral": { label: "Dark neutral", color: "#4b4d49" },
  "light-neutral": { label: "Light neutral", color: "#a9aaa4" },
  "white": { label: "Near white", color: "#ecece7" },
  "red": { label: "Red / rose", color: "#a54c4b" },
  "orange": { label: "Orange / brown", color: "#a66a42" },
  "yellow": { label: "Yellow / ochre", color: "#b09645" },
  "green": { label: "Green", color: "#5f815d" },
  "cyan": { label: "Cyan / teal", color: "#4f8583" },
  "blue": { label: "Blue", color: "#52749a" },
  "purple": { label: "Purple", color: "#75618e" },
  "magenta": { label: "Magenta", color: "#965c7f" }
};

const THEME_MODES = {
  representative: {
    label: "Representative",
    description: "Preserves the recorded proportions of the five extracted swatches."
  },
  colorful: {
    label: "Colorful",
    description: "Emphasizes swatches with higher OKLab chroma."
  },
  bright: {
    label: "Bright",
    description: "Emphasizes swatches with higher OKLab lightness."
  },
  muted: {
    label: "Muted",
    description: "Emphasizes lower-chroma swatches."
  },
  deep: {
    label: "Deep",
    description: "Emphasizes chromatic swatches in the middle-to-lower lightness range."
  },
  dark: {
    label: "Dark",
    description: "Emphasizes swatches with lower OKLab lightness."
  }
};

const RELATION_POSITIONS = {
  jinxi: [450, 110],
  bacheng: [175, 215],
  hongkong: [725, 215],
  genie: [255, 430],
  luoyang: [645, 430]
};

function escapeHTML(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
  });
}

function placeById(id) {
  return D.places.find(function (place) { return place.id === id; });
}

function categoryById(id) {
  return D.categories.find(function (category) { return category.id === id; });
}

function photoById(id) {
  return D.photos.find(function (photo) { return photo.id === id; });
}

function photosFor(placeId, lens) {
  return D.photos.filter(function (photo) {
    const categories = [photo.primaryCategory].concat(photo.secondaryCategories || []);
    return photo.placeId === placeId && (lens === "all" || categories.includes(lens));
  });
}

function usableTags(photo) {
  return (photo.tags || []).filter(function (tag) {
    return tag && tag.toLowerCase() !== "demo metadata";
  });
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return {
    r: parseInt(value.slice(0, 2), 16) / 255,
    g: parseInt(value.slice(2, 4), 16) / 255,
    b: parseInt(value.slice(4, 6), 16) / 255
  };
}

function toLinear(value) {
  return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
}

function hexToOklab(hex) {
  const rgb = hexToRgb(hex);
  const r = toLinear(rgb.r);
  const g = toLinear(rgb.g);
  const b = toLinear(rgb.b);
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const lRoot = Math.cbrt(l);
  const mRoot = Math.cbrt(m);
  const sRoot = Math.cbrt(s);
  return {
    L: 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot,
    a: 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot,
    b: 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot
  };
}

function colorFamily(hex) {
  const lab = hexToOklab(hex);
  const chroma = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  let hue = Math.atan2(lab.b, lab.a) * 180 / Math.PI;
  if (hue < 0) hue += 360;
  if (lab.L < 0.22) return "near-black";
  if (chroma < 0.035) {
    if (lab.L > 0.91) return "white";
    return lab.L < 0.61 ? "dark-neutral" : "light-neutral";
  }
  if (hue < 20 || hue >= 345) return "red";
  if (hue < 55) return "orange";
  if (hue < 100) return "yellow";
  if (hue < 155) return "green";
  if (hue < 205) return "cyan";
  if (hue < 265) return "blue";
  if (hue < 320) return "purple";
  return "magenta";
}

function themeWeight(hex, mode) {
  if (mode === "representative") return 1;
  const lab = hexToOklab(hex);
  const chroma = Math.min(1, Math.sqrt(lab.a * lab.a + lab.b * lab.b) / 0.26);
  if (mode === "colorful") return 0.08 + Math.pow(chroma, 1.6);
  if (mode === "bright") return 0.08 + Math.pow(lab.L, 1.8);
  if (mode === "muted") return 0.08 + Math.pow(1 - chroma, 1.7);
  if (mode === "deep") {
    const depth = Math.max(0, 1 - Math.abs(lab.L - 0.43) / 0.43);
    return 0.08 + depth * (0.35 + chroma);
  }
  if (mode === "dark") return 0.08 + Math.pow(1 - lab.L, 1.8);
  return 1;
}

function themedEntries(photo, mode) {
  const weighted = (photo.dominantColors || []).map(function (entry) {
    return {
      hex: entry.hex,
      sourceProportion: Number(entry.proportion || 0),
      weighted: Number(entry.proportion || 0) * themeWeight(entry.hex, mode)
    };
  });
  const total = weighted.reduce(function (sum, entry) { return sum + entry.weighted; }, 0) || 1;
  return weighted.map(function (entry) {
    return {
      hex: entry.hex,
      sourceProportion: entry.sourceProportion,
      proportion: entry.weighted / total
    };
  }).sort(function (a, b) { return b.proportion - a.proportion; });
}

function themeOptions(selected) {
  return Object.keys(THEME_MODES).map(function (id) {
    return '<option value="' + id + '"' + (id === selected ? " selected" : "") + ">" +
      escapeHTML(THEME_MODES[id].label) + "</option>";
  }).join("");
}

function aggregatePhotoSet(photos, mode) {
  const values = {};
  const shades = {};
  FAMILY_ORDER.forEach(function (id) {
    values[id] = 0;
    shades[id] = [];
  });

  photos.forEach(function (photo) {
    themedEntries(photo, mode || "representative").forEach(function (entry) {
      const family = colorFamily(entry.hex);
      values[family] += Number(entry.proportion || 0);
      shades[family].push({
        hex: entry.hex,
        weight: Number(entry.proportion || 0),
        sourceWeight: Number(entry.sourceProportion || 0),
        photoId: photo.id
      });
    });
  });

  const divisor = Math.max(photos.length, 1);
  FAMILY_ORDER.forEach(function (id) {
    values[id] /= divisor;
    shades[id].sort(function (a, b) { return b.weight - a.weight; });
  });

  return { values: values, shades: shades, photos: photos, mode: mode || "representative" };
}

function aggregate(placeId, lens, mode) {
  return aggregatePhotoSet(photosFor(placeId, lens), mode);
}

function similarityScore(first, second) {
  let distance = 0;
  FAMILY_ORDER.forEach(function (id) {
    distance += Math.abs(first.values[id] - second.values[id]);
  });
  return Math.max(0, Math.round((1 - distance / 2) * 100));
}

function lensLabel(lens) {
  return lens === "all" ? "All sampled photographs" : categoryById(lens).name;
}

function lensOptions(selected) {
  const options = [{ id: "all", name: "All sampled photographs" }].concat(
    D.categories.map(function (category) { return { id: category.id, name: category.name }; })
  );
  return options.map(function (option) {
    return '<option value="' + option.id + '"' + (option.id === selected ? " selected" : "") + ">" +
      escapeHTML(option.name) + "</option>";
  }).join("");
}

function nav() {
  const items = [
    ["atlas", "Map"],
    ["compare", "Compare"],
    ["about", "Method"]
  ];
  return '<header class="site-header"><a class="brand" href="#" data-nav="atlas" aria-label="Colors of Place home">' +
    '<span class="brand-mark" aria-hidden="true"></span><span>Colors of Place</span></a>' +
    '<nav aria-label="Primary navigation">' +
    items.map(function (item) {
      return '<button class="nav-button' + (state.view === item[0] ? " is-active" : "") +
        '" data-nav="' + item[0] + '">' + item[1] + "</button>";
    }).join("") +
    '</nav><span class="prototype-label">Sample atlas · v2</span></header>';
}

function footer() {
  return '<footer><p>Five selected places · 50 sampled photographs · prototype metadata remains incomplete.</p>' +
    '<p>Similarity describes this sample only—not cultural identity, influence, or representativeness.</p></footer>';
}

function hero(kicker, title, text) {
  return '<section class="page-hero"><p class="kicker">' + escapeHTML(kicker) + '</p><h1>' +
    escapeHTML(title) + '</h1><p class="lede">' + escapeHTML(text) + "</p></section>";
}

function placeSelect(id, selected, label) {
  return '<label class="control"><span>' + escapeHTML(label) + '</span><select id="' + id + '">' +
    D.places.map(function (place) {
      return '<option value="' + place.id + '"' + (place.id === selected ? " selected" : "") + ">" +
        escapeHTML(place.name + " · " + place.nameZh) + "</option>";
    }).join("") + "</select></label>";
}

function atlasView() {
  return hero(
    "Spatial view",
    "Where were these colors recorded?",
    "Explore the five geographic samples before comparing them. Map position encodes latitude and longitude; it does not encode palette similarity."
  ) +
  '<section class="map-layout">' +
    '<div class="map-card"><div id="geo-map" class="geo-map" role="region" aria-label="Interactive map of five sampled places"></div>' +
      '<div id="map-fallback" class="map-fallback" hidden>Map tiles are unavailable. Use the location list to open each sample.</div></div>' +
    '<aside class="map-aside"><p class="eyebrow">Data boundary</p><h2>5 places, 50 photographs</h2>' +
      '<p>This is a selected photographic sample, not a national color census. Coordinates locate each place; individual photo coordinates are still incomplete.</p>' +
      '<div class="place-list">' +
      D.places.map(function (place) {
        return '<button class="place-list-item" data-place="' + place.id + '">' +
          '<span><strong>' + escapeHTML(place.name) + '</strong><small>' + escapeHTML(place.nameZh + " · " + place.region) + '</small></span>' +
          '<span class="coordinates">' + place.coordinates[0].toFixed(3) + "°, " + place.coordinates[1].toFixed(3) + "°</span></button>";
      }).join("") +
      '</div></aside></section>' +
    '<section class="view-bridge"><div><p class="eyebrow">Next question</p><h2>Geographic distance is not color similarity.</h2>' +
      '<p>Use the comparison view for matched evidence, or the relationship view to inspect sample-based palette similarity.</p></div>' +
      '<div class="button-row"><button class="primary-button" data-open-compare="places">Compare places</button>' +
      '<button class="secondary-button" data-open-compare="photos">Compare photographs</button></div></section>';
}

function initMap() {
  const fallback = document.getElementById("map-fallback");
  if (!document.getElementById("geo-map")) return;
  if (!window.L) {
    if (fallback) fallback.hidden = false;
    return;
  }
  if (mapInstance) mapInstance.remove();
  mapInstance = window.L.map("geo-map", { scrollWheelZoom: false, minZoom: 3 }).setView([30.7, 109.5], 4);
  window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
  }).addTo(mapInstance);
  const bounds = [];
  D.places.forEach(function (place) {
    const marker = window.L.circleMarker(place.coordinates, {
      radius: 10,
      color: "#111211",
      weight: 3,
      fillColor: "#e8d8aa",
      fillOpacity: 1
    }).addTo(mapInstance);
    marker.bindTooltip('<strong>' + escapeHTML(place.name) + '</strong><br>' + escapeHTML(place.nameZh + " · " + place.photoCount + " photos"));
    marker.on("click", function () {
      state.place = place.id;
      state.view = "place";
      render();
    });
    bounds.push(place.coordinates);
  });
  mapInstance.fitBounds(bounds, { padding: [42, 42], maxZoom: 5 });
}

function comparisonRows(first, second) {
  return FAMILY_ORDER.map(function (id) {
    const a = first.values[id] || 0;
    const b = second.values[id] || 0;
    return { id: id, a: a, b: b, gap: Math.abs(a - b), max: Math.max(a, b) };
  }).filter(function (row) { return row.max >= 0.006; })
    .sort(function (a, b) { return b.max - a.max; });
}

function compareTaskSwitch() {
  return '<section class="compare-task-switch" aria-label="Choose comparison task">' +
    '<button data-compare-task="photos" class="' + (state.compareTask === "photos" ? "is-active" : "") + '">' +
      '<span>01</span><strong>Compare two photographs</strong><small>Choose any two records from the material library.</small></button>' +
    '<button data-compare-task="places" class="' + (state.compareTask === "places" ? "is-active" : "") + '">' +
      '<span>02</span><strong>Compare two places</strong><small>Aggregate matched samples and inspect contextual limits.</small></button>' +
  '</section>';
}

function compareView() {
  return hero(
    "One workspace · two comparison tasks",
    "Compare evidence at the right scale.",
    "Move from individual photographs to place-level samples without treating color similarity as cultural equivalence."
  ) + compareTaskSwitch() +
    (state.compareTask === "photos" ? photoCompareView() : placeCompareView());
}

function photoOptions(selected) {
  return D.places.map(function (place) {
    return '<optgroup label="' + escapeHTML(place.name + " · " + place.nameZh) + '">' +
      photosFor(place.id, "all").map(function (photo) {
        const category = categoryById(photo.primaryCategory);
        return '<option value="' + photo.id + '"' + (photo.id === selected ? " selected" : "") + ">" +
          escapeHTML(photo.title + " · " + category.name) + '</option>';
      }).join("") + '</optgroup>';
  }).join("");
}

function paletteMetrics(photo, mode) {
  return themedEntries(photo, mode).reduce(function (metrics, entry) {
    const lab = hexToOklab(entry.hex);
    const chroma = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
    metrics.lightness += lab.L * entry.proportion;
    metrics.chroma += chroma * entry.proportion;
    return metrics;
  }, { lightness: 0, chroma: 0 });
}

function photoSelectionCard(photo, slot) {
  const place = placeById(photo.placeId);
  const category = categoryById(photo.primaryCategory);
  const theme = themedEntries(photo, state.themeMode);
  return '<article class="selected-photo-card">' +
    '<div class="selected-photo-label"><span>' + slot + '</span><div><strong>' + escapeHTML(photo.title) + '</strong>' +
      '<small>' + escapeHTML(place.name + " · " + category.name) + '</small></div></div>' +
    '<img src="' + photo.src + '" alt="' + escapeHTML(photo.title) + '">' +
    '<div class="selected-photo-palette">' + theme.map(function (entry) {
      return '<span style="background:' + entry.hex + ';flex:' + entry.proportion + '" title="' +
        entry.hex + ' · ' + Math.round(entry.proportion * 100) + '%"></span>';
    }).join("") + '</div>' +
    '<dl><div><dt>Place</dt><dd>' + escapeHTML(place.name + " · " + place.nameZh) + '</dd></div>' +
      '<div><dt>Category</dt><dd>' + escapeHTML(category.name) + '</dd></div>' +
      '<div><dt>Date</dt><dd>' + escapeHTML(photo.date) + '</dd></div></dl>' +
  '</article>';
}

function photoCompareView() {
  const firstPhoto = photoById(state.photoCompare[0]) || D.photos[0];
  const secondPhoto = photoById(state.photoCompare[1]) || D.photos[1];
  const first = aggregatePhotoSet([firstPhoto], state.themeMode);
  const second = aggregatePhotoSet([secondPhoto], state.themeMode);
  const rows = comparisonRows(first, second);
  const score = similarityScore(first, second);
  const gaps = rows.slice().sort(function (a, b) { return b.gap - a.gap; });
  const largestGap = gaps[0];
  const strongestShared = rows.slice().sort(function (a, b) {
    return Math.min(b.a, b.b) - Math.min(a.a, a.b);
  })[0];
  const firstMetrics = paletteMetrics(firstPhoto, state.themeMode);
  const secondMetrics = paletteMetrics(secondPhoto, state.themeMode);
  const sameCategory = firstPhoto.primaryCategory === secondPhoto.primaryCategory;
  const samePlace = firstPhoto.placeId === secondPhoto.placeId;
  const filteredLibrary = D.photos.filter(function (photo) {
    const categoryIds = [photo.primaryCategory].concat(photo.secondaryCategories || []);
    return (state.libraryPlace === "all" || photo.placeId === state.libraryPlace) &&
      (state.libraryCategory === "all" || categoryIds.includes(state.libraryCategory));
  });

  return '<section class="photo-picker-controls">' +
    '<label class="control"><span>Photograph A</span><select id="photo-a">' + photoOptions(firstPhoto.id) + '</select></label>' +
    '<label class="control"><span>Photograph B</span><select id="photo-b">' + photoOptions(secondPhoto.id) + '</select></label>' +
    '<label class="control"><span>Adobe-inspired theme</span><select id="theme-mode">' + themeOptions(state.themeMode) + '</select></label>' +
  '</section>' +
  '<section class="theme-explainer"><span class="theme-badge">' + escapeHTML(THEME_MODES[state.themeMode].label) + '</span>' +
    '<p><strong>Same analytical rule:</strong> ' + escapeHTML(THEME_MODES[state.themeMode].description) +
    ' The comparison preserves both source photographs and their original five swatches.</p></section>' +
  '<section class="selected-photo-grid">' +
    photoSelectionCard(firstPhoto, "A") + photoSelectionCard(secondPhoto, "B") +
  '</section>' +
  '<section class="photo-insights">' +
    '<article><span class="insight-value">' + score + '</span><div><strong>Palette similarity</strong><small>Current two photographs only</small></div></article>' +
    '<article><span class="family-chip" style="background:' + (largestGap ? FAMILIES[largestGap.id].color : "#777") + '"></span><div><strong>' +
      (largestGap ? escapeHTML(FAMILIES[largestGap.id].label) : "No difference") + '</strong><small>Largest difference' +
      (largestGap ? " · " + Math.round(largestGap.gap * 100) + " pp" : "") + '</small></div></article>' +
    '<article><span class="family-chip" style="background:' + (strongestShared ? FAMILIES[strongestShared.id].color : "#777") + '"></span><div><strong>' +
      (strongestShared ? escapeHTML(FAMILIES[strongestShared.id].label) : "No shared family") + '</strong><small>Strongest shared color family</small></div></article>' +
    '<article><span class="context-icon">' + (sameCategory ? "✓" : "!") + '</span><div><strong>' +
      (sameCategory ? "Category matched" : "Different categories") + '</strong><small>' +
      (samePlace ? "Same place" : "Different places") + ' · interpret context before color</small></div></article>' +
  '</section>' +
  '<section class="metric-pair"><div><p class="eyebrow">Perceptual summary</p><h2>Lightness and chroma</h2></div>' +
    '<div class="metric-table"><div><span>Average lightness</span><b>A ' + Math.round(firstMetrics.lightness * 100) +
      '</b><b>B ' + Math.round(secondMetrics.lightness * 100) + '</b></div>' +
      '<div><span>Average chroma</span><b>A ' + firstMetrics.chroma.toFixed(3) +
      '</b><b>B ' + secondMetrics.chroma.toFixed(3) + '</b></div></div></section>' +
  mirroredChart(
    rows,
    { name: "A · " + placeById(firstPhoto.placeId).name },
    { name: "B · " + placeById(secondPhoto.placeId).name },
    first,
    second
  ) +
  '<section class="material-library"><div class="section-heading"><div><p class="eyebrow">Material library</p><h2>Assign any photograph to A or B</h2></div>' +
    '<p>Choose the active slot, filter the library, then select a thumbnail.</p></div>' +
    '<div class="library-toolbar"><div class="slot-picker" role="group" aria-label="Active comparison slot">' +
      '<button data-photo-slot="0" class="' + (state.activePhotoSlot === 0 ? "is-active" : "") + '">Replace A</button>' +
      '<button data-photo-slot="1" class="' + (state.activePhotoSlot === 1 ? "is-active" : "") + '">Replace B</button></div>' +
      '<label class="control"><span>Place</span><select id="library-place"><option value="all">All places</option>' +
        D.places.map(function (place) {
          return '<option value="' + place.id + '"' + (state.libraryPlace === place.id ? " selected" : "") + ">" +
            escapeHTML(place.name) + '</option>';
        }).join("") + '</select></label>' +
      '<label class="control"><span>Category</span><select id="library-category">' + lensOptions(state.libraryCategory) + '</select></label></div>' +
    '<div class="library-grid">' + filteredLibrary.map(function (photo) {
      const place = placeById(photo.placeId);
      const selected = state.photoCompare.includes(photo.id);
      return '<button class="library-photo' + (selected ? " is-selected" : "") + '" data-library-photo="' + photo.id + '">' +
        '<img src="' + photo.src + '" alt="' + escapeHTML(photo.title) + '"><span><strong>' +
        escapeHTML(place.name) + '</strong><small>' + escapeHTML(categoryById(photo.primaryCategory).name) +
        '</small></span></button>';
    }).join("") + '</div></section>';
}

function placeCompareView() {
  const leftPlace = placeById(state.compare[0]);
  const rightPlace = placeById(state.compare[1]);
  const left = aggregate(leftPlace.id, state.compareLens, state.themeMode);
  const right = aggregate(rightPlace.id, state.compareLens, state.themeMode);
  const rows = comparisonRows(left, right);
  const score = similarityScore(left, right);
  const largestGap = rows.slice().sort(function (a, b) { return b.gap - a.gap; })[0];
  if (!state.compareFamily || !rows.some(function (row) { return row.id === state.compareFamily; })) {
    state.compareFamily = largestGap ? largestGap.id : null;
  }

  return '<section class="controls-panel">' +
    placeSelect("compare-a", leftPlace.id, "Place A") +
    placeSelect("compare-b", rightPlace.id, "Place B") +
    '<label class="control control-wide"><span>Comparison lens</span><select id="compare-lens">' +
      lensOptions(state.compareLens) + '</select></label>' +
    '<label class="control"><span>Adobe-inspired theme</span><select id="theme-mode">' +
      themeOptions(state.themeMode) + '</select></label>' +
    '<button class="swap-button" id="swap-places" aria-label="Swap place A and place B">Swap A ↔ B</button>' +
  '</section>' +
  '<section class="theme-explainer"><span class="theme-badge">' + escapeHTML(THEME_MODES[state.themeMode].label) + '</span>' +
    '<p><strong>Theme lens:</strong> ' + escapeHTML(THEME_MODES[state.themeMode].description) +
    ' Both places use the same rule. This is an independent, transparent interpretation of Adobe Color moods—not Adobe’s proprietary extractor.</p></section>' +
  '<section class="comparison-summary">' +
    '<div><p class="eyebrow">Current evidence lens</p><h2>' + escapeHTML(lensLabel(state.compareLens)) + '</h2>' +
      '<p>' + left.photos.length + ' photos from ' + escapeHTML(leftPlace.name) + ' and ' + right.photos.length +
      ' from ' + escapeHTML(rightPlace.name) + ' are included.</p></div>' +
    '<div class="score-card"><span class="score-number">' + score + '</span><span>sample similarity / 100</span></div>' +
    '<div class="summary-caution"><strong>Interpret carefully</strong><span>This score compares the current sampled color distributions. It does not measure cultural similarity.</span></div>' +
  '</section>' +
  (left.photos.length && right.photos.length ? mirroredChart(rows, leftPlace, rightPlace, left, right) :
    '<section class="empty-state"><h2>No matched photographs</h2><p>One place has no photos under this lens. Choose another category or return to all photographs.</p></section>') +
  sourceEvidence(leftPlace, rightPlace, left, right, state.compareFamily) +
  culturalComparison(leftPlace, rightPlace) +
  embeddedSimilarity(leftPlace);
}

function mirroredChart(rows, leftPlace, rightPlace, left, right) {
  const maxValue = Math.max.apply(null, rows.map(function (row) { return row.max; }).concat([0.01]));
  return '<section class="chart-card" aria-labelledby="distribution-title">' +
    '<div class="chart-heading"><div><p class="eyebrow">Shared perceptual bins</p><h2 id="distribution-title">Where the sampled palettes align—and diverge</h2>' +
      '<p>Bars apply the “' + escapeHTML(THEME_MODES[state.themeMode].label) +
      '” lens to the recorded five-color palettes, then aggregate the shades into fixed OKLab families. Select a row to inspect the sources.</p></div>' +
      '<div class="chart-key"><span><i class="key-a"></i>' + escapeHTML(leftPlace.name) + '</span><span><i class="key-b"></i>' + escapeHTML(rightPlace.name) + '</span></div></div>' +
    '<div class="mirror-head"><span>' + escapeHTML(leftPlace.name) + '</span><span>Color family</span><span>' + escapeHTML(rightPlace.name) + '</span></div>' +
    '<div class="mirror-chart">' +
    rows.map(function (row) {
      const leftWidth = Math.max(1.5, row.a / maxValue * 100);
      const rightWidth = Math.max(1.5, row.b / maxValue * 100);
      const selected = row.id === state.compareFamily;
      return '<button class="mirror-row' + (selected ? " is-selected" : "") + '" data-family="' + row.id + '" aria-pressed="' + selected + '">' +
        '<span class="mirror-side left"><span class="bar bar-a" style="width:' + leftWidth.toFixed(1) + '%"></span><b>' + Math.round(row.a * 100) + '%</b></span>' +
        '<span class="family-label"><i style="background:' + FAMILIES[row.id].color + '"></i><strong>' + escapeHTML(FAMILIES[row.id].label) + '</strong><small>Δ ' + Math.round(row.gap * 100) + ' pp</small></span>' +
        '<span class="mirror-side right"><span class="bar bar-b" style="width:' + rightWidth.toFixed(1) + '%"></span><b>' + Math.round(row.b * 100) + '%</b></span>' +
      '</button>';
    }).join("") +
    '</div><p class="method-note">Percentages are averages across the photographs included under the current lens. “pp” means percentage-point difference.</p></section>';
}

function photoFamilyWeight(photo, family, mode) {
  return themedEntries(photo, mode || "representative").reduce(function (sum, entry) {
    return sum + (colorFamily(entry.hex) === family ? Number(entry.proportion || 0) : 0);
  }, 0);
}

function evidenceColumn(place, aggregateData, family) {
  const ranked = aggregateData.photos.map(function (photo) {
    return { photo: photo, weight: photoFamilyWeight(photo, family, aggregateData.mode) };
  }).filter(function (item) { return item.weight > 0; })
    .sort(function (a, b) { return b.weight - a.weight; }).slice(0, 3);
  const raw = aggregateData.shades[family].slice(0, 8);
  return '<div class="evidence-column"><div class="evidence-title"><h3>' + escapeHTML(place.name) + '</h3>' +
    '<span>' + aggregateData.photos.length + ' included photos</span></div>' +
    '<div class="raw-shades" aria-label="Original extracted shades">' +
      raw.map(function (entry) {
        return '<span style="background:' + entry.hex + '" title="' + entry.hex + '"></span>';
      }).join("") + '</div>' +
    (ranked.length ? '<div class="evidence-grid">' + ranked.map(function (item) {
      return '<button class="evidence-photo" data-photo="' + item.photo.id + '">' +
        '<img src="' + item.photo.src + '" alt="' + escapeHTML(item.photo.title) + '">' +
        '<span><strong>' + escapeHTML(item.photo.title) + '</strong><small>' + Math.round(item.weight * 100) +
        '% of this photo’s themed palette</small></span></button>';
    }).join("") + '</div>' : '<p class="empty-copy">No extracted shade in this family.</p>') +
    '</div>';
}

function sourceEvidence(leftPlace, rightPlace, left, right, family) {
  if (!family || !left.photos.length || !right.photos.length) return "";
  return '<section class="source-evidence"><div class="chart-heading"><div><p class="eyebrow">Source trace</p><h2>' +
    escapeHTML(FAMILIES[family].label) + ': inspect the photographs behind the aggregate</h2>' +
    '<p>These thumbnails contribute most strongly under the current theme lens. Raw extracted shades remain visible rather than being replaced by the family label.</p></div></div>' +
    '<div class="evidence-columns">' +
      evidenceColumn(leftPlace, left, family) +
      evidenceColumn(rightPlace, right, family) +
    '</div></section>';
}

function dominantFamilySummary(aggregateData) {
  const ranked = FAMILY_ORDER.map(function (id) {
    return { id: id, value: aggregateData.values[id] || 0 };
  }).sort(function (a, b) { return b.value - a.value; });
  return ranked[0] && ranked[0].value > 0 ? ranked[0] : null;
}

function culturalComparison(leftPlace, rightPlace) {
  const rows = D.categories.map(function (category) {
    const left = aggregate(leftPlace.id, category.id, state.themeMode);
    const right = aggregate(rightPlace.id, category.id, state.themeMode);
    return {
      category: category,
      left: left,
      right: right,
      leftTop: dominantFamilySummary(left),
      rightTop: dominantFamilySummary(right),
      score: left.photos.length && right.photos.length ? similarityScore(left, right) : null
    };
  });

  return '<section class="culture-panel"><div class="section-heading"><div><p class="eyebrow">Cultural-context scaffold</p>' +
    '<h2>Compare visual evidence without turning color into cultural identity</h2></div>' +
    '<p>The categories organize possible material and social contexts. They do not explain why a color appears.</p></div>' +
    '<div class="culture-matrix"><div class="culture-head"><span>Context</span><span>' +
      escapeHTML(leftPlace.name) + '</span><span>' + escapeHTML(rightPlace.name) + '</span><span>Sample relation</span></div>' +
    rows.map(function (row) {
      return '<div class="culture-row"><span><strong>' + escapeHTML(row.category.name) + '</strong><small>' +
        escapeHTML(row.category.nameZh) + '</small></span>' +
        '<span>' + (row.leftTop ? '<i style="background:' + FAMILIES[row.leftTop.id].color + '"></i><strong>' +
          escapeHTML(FAMILIES[row.leftTop.id].label) + '</strong><small>' + row.left.photos.length + ' photos</small>' : '<small>No sample</small>') + '</span>' +
        '<span>' + (row.rightTop ? '<i style="background:' + FAMILIES[row.rightTop.id].color + '"></i><strong>' +
          escapeHTML(FAMILIES[row.rightTop.id].label) + '</strong><small>' + row.right.photos.length + ' photos</small>' : '<small>No sample</small>') + '</span>' +
        '<span><strong>' + (row.score === null ? "Not comparable" : row.score + " / 100") + '</strong>' +
          '<small>' + (row.score === null ? "Missing matched evidence" : "Color similarity in this category") + '</small></span></div>';
    }).join("") + '</div>' +
    '<div class="interpretation-boundary">' +
      '<article><span>Observed</span><p>Color families, proportions, photographs, categories, and available capture metadata.</p></article>' +
      '<article><span>Possible factors</span><p>Materials, ecology, weather, restoration, tourism, clothing, activity, and photographic choices.</p></article>' +
      '<article><span>Still required</span><p>Local accounts, verified tags, repeated observations, permissions, and the right to challenge our interpretation.</p></article>' +
    '</div></section>';
}

function embeddedSimilarity(focusPlace) {
  const relationships = relationshipData(focusPlace, state.compareLens, state.themeMode);
  return '<section class="embedded-network"><div class="section-heading"><div><p class="eyebrow">Across all five places</p>' +
    '<h2>Similarity is one result inside comparison</h2></div><p>The selected Place A becomes the network focus. Position is relational, while edge labels encode sample similarity.</p></div>' +
    '<div class="network-layout"><div class="network-card">' + relationSvg(focusPlace, relationships) +
      '<p class="method-note">Current lens: ' + escapeHTML(lensLabel(state.compareLens)) + ' · ' +
      escapeHTML(THEME_MODES[state.themeMode].label) + '. Edges do not imply cultural influence.</p></div>' +
      '<aside class="rank-panel"><p class="eyebrow">Closest sampled palettes</p><h2>' + escapeHTML(focusPlace.name) + '</h2>' +
      '<ol class="rank-list">' + relationships.map(function (item, index) {
        return '<li><button data-sim-place="' + item.place.id + '"><span><b>' + (index + 1) + '</b><strong>' +
          escapeHTML(item.place.name) + '</strong><small>' + escapeHTML(item.place.region) +
          '</small></span><em>' + item.score + '</em></button></li>';
      }).join("") + '</ol></aside></div></section>';
}

function relationshipData(selected, lens, mode) {
  const source = aggregate(selected.id, lens, mode);
  return D.places.filter(function (place) { return place.id !== selected.id; })
    .map(function (place) {
      return { place: place, score: similarityScore(source, aggregate(place.id, lens, mode)) };
    }).sort(function (a, b) { return b.score - a.score; });
}

function similarityView() {
  const selected = placeById(state.sim);
  const relationships = relationshipData(selected, state.simLens, state.themeMode);
  const sourceCount = photosFor(selected.id, state.simLens).length;
  return hero(
    "Relationship view",
    "Which sampled palettes are similar?",
    "This network uses color-distribution similarity, not geography. Change the lens to compare equivalent photo contexts."
  ) +
  '<section class="controls-panel compact">' +
    placeSelect("similarity-place", selected.id, "Focus place") +
    '<label class="control control-wide"><span>Similarity lens</span><select id="similarity-lens">' +
      lensOptions(state.simLens) + '</select></label>' +
    '<label class="control"><span>Adobe-inspired theme</span><select id="theme-mode">' +
      themeOptions(state.themeMode) + '</select></label>' +
  '</section>' +
  '<section class="theme-explainer"><span class="theme-badge">' + escapeHTML(THEME_MODES[state.themeMode].label) + '</span>' +
    '<p>' + escapeHTML(THEME_MODES[state.themeMode].description) +
    ' Every edge is recalculated with this same transparent rule.</p></section>' +
  '<section class="network-layout"><div class="network-card">' +
    relationSvg(selected, relationships) +
    '<p class="method-note">Node position is an editorial network layout. Edge labels encode similarity of the current sampled distributions; they do not imply cultural influence.</p>' +
  '</div><aside class="rank-panel"><p class="eyebrow">Ranked relationships</p><h2>' + escapeHTML(selected.name) + '</h2>' +
    '<p>' + sourceCount + ' photos under “' + escapeHTML(lensLabel(state.simLens)) + '”.</p>' +
    '<ol class="rank-list">' + relationships.map(function (item, index) {
      return '<li><button data-sim-place="' + item.place.id + '"><span><b>' + (index + 1) + '</b><strong>' +
        escapeHTML(item.place.name) + '</strong><small>' + escapeHTML(item.place.region) + '</small></span><em>' + item.score + '</em></button></li>';
    }).join("") + '</ol></aside></section>' +
    '<section class="view-bridge"><div><p class="eyebrow">Validation safeguard</p><h2>Match the context before interpreting the score.</h2>' +
      '<p>An overall score can be driven by a different mix of architecture, landscape, people, or objects. Category-matched lenses make that limitation inspectable.</p></div>' +
      '<button class="primary-button" data-nav="compare">Open direct comparison</button></section>';
}

function relationSvg(selected, relationships) {
  const center = RELATION_POSITIONS[selected.id];
  const scores = {};
  relationships.forEach(function (item) { scores[item.place.id] = item.score; });
  const edges = relationships.map(function (item) {
    const point = RELATION_POSITIONS[item.place.id];
    const midX = (center[0] + point[0]) / 2;
    const midY = (center[1] + point[1]) / 2;
    const opacity = 0.25 + item.score / 150;
    const width = 1.5 + item.score / 25;
    return '<g><line x1="' + center[0] + '" y1="' + center[1] + '" x2="' + point[0] + '" y2="' + point[1] +
      '" stroke="rgba(232,216,170,' + opacity.toFixed(2) + ')" stroke-width="' + width.toFixed(1) + '"></line>' +
      '<rect x="' + (midX - 24) + '" y="' + (midY - 14) + '" width="48" height="25" rx="12" class="edge-label-bg"></rect>' +
      '<text x="' + midX + '" y="' + (midY + 4) + '" text-anchor="middle" class="edge-label">' + item.score + '</text></g>';
  }).join("");
  const nodes = D.places.map(function (place) {
    const point = RELATION_POSITIONS[place.id];
    const active = place.id === selected.id;
    return '<g class="network-node' + (active ? " is-active" : "") + '" data-sim-place="' + place.id + '" tabindex="0" role="button" aria-label="Focus ' + escapeHTML(place.name) + '">' +
      '<circle cx="' + point[0] + '" cy="' + point[1] + '" r="' + (active ? 47 : 36) + '"></circle>' +
      '<text x="' + point[0] + '" y="' + (point[1] - 2) + '" text-anchor="middle">' + escapeHTML(place.name) + '</text>' +
      '<text x="' + point[0] + '" y="' + (point[1] + 17) + '" text-anchor="middle" class="node-zh">' + escapeHTML(place.nameZh) + '</text></g>';
  }).join("");
  return '<svg class="relation-svg" viewBox="0 0 900 540" role="img" aria-label="Palette similarity network focused on ' + escapeHTML(selected.name) + '">' +
    edges + nodes + '</svg>';
}

function placeView() {
  const place = placeById(state.place);
  const photos = photosFor(place.id, "all");
  return '<button class="text-back" data-nav="atlas">← Back to map</button>' +
    '<section class="place-hero"><img src="' + place.representativeImage + '" alt="Sample photograph from ' + escapeHTML(place.name) + '">' +
      '<div><p class="kicker">' + escapeHTML(place.region) + '</p><h1>' + escapeHTML(place.name) + ' <span>' + escapeHTML(place.nameZh) + '</span></h1>' +
      '<p>' + escapeHTML(place.description) + '</p><dl class="metadata-list"><div><dt>Coordinates</dt><dd>' +
      place.coordinates[0].toFixed(3) + '°, ' + place.coordinates[1].toFixed(3) + '°</dd></div><div><dt>Sample</dt><dd>' +
      photos.length + ' photographs</dd></div></dl></div></section>' +
    '<section class="palette-overview"><div><p class="eyebrow">Recorded overall palette</p><h2>Extracted from this selected sample</h2>' +
      '<p>Use this summary for discovery. Category-matched comparison is more appropriate when photo content differs.</p></div>' +
      '<div class="place-palette">' + place.recordedPalette.map(function (entry) {
        return '<span style="background:' + entry.hex + ';flex:' + entry.proportion + '" title="' + entry.hex + ' · ' + Math.round(entry.proportion * 100) + '%"></span>';
      }).join("") + '</div></section>' +
    '<section class="category-section"><div class="section-heading"><div><p class="eyebrow">Browse by context</p><h2>Broad lenses, not exclusive boxes</h2></div>' +
      '<p>A photograph may have one primary category plus secondary categories and tags. Current secondary metadata is still being curated.</p></div>' +
      '<div class="category-grid">' + D.categories.map(function (category) {
        const count = photosFor(place.id, category.id).length;
        const sample = photosFor(place.id, category.id)[0];
        return '<button class="category-card" data-category="' + category.id + '"' + (!count ? " disabled" : "") + '>' +
          (sample ? '<img src="' + sample.src + '" alt="">' : '<span class="image-placeholder"></span>') +
          '<span class="category-number">' + category.code + '</span><strong>' + escapeHTML(category.name) + '</strong>' +
          '<small>' + escapeHTML(category.nameZh) + ' · ' + count + ' photos</small></button>';
      }).join("") + '</div></section>';
}

function categoryView() {
  const place = placeById(state.place);
  const category = categoryById(state.category);
  const photos = photosFor(place.id, category.id);
  return '<button class="text-back" data-place="' + place.id + '">← Back to ' + escapeHTML(place.name) + '</button>' +
    hero(category.code + " · " + category.nameZh, category.name, "This lens includes photographs where the category is primary or secondary.") +
    '<section class="photo-grid">' + photos.map(function (photo) {
      const tags = usableTags(photo);
      return '<button class="photo-card" data-photo="' + photo.id + '"><img src="' + photo.src + '" alt="' + escapeHTML(photo.title) + '">' +
        '<span class="photo-card-copy"><strong>' + escapeHTML(photo.title) + '</strong><small>' + escapeHTML(photo.date) + '</small>' +
        (tags.length ? '<span class="tag-row">' + tags.map(function (tag) { return '<i>' + escapeHTML(tag) + '</i>'; }).join("") + '</span>' : '') +
        '</span><span class="mini-palette">' + photo.dominantColors.map(function (entry) {
          return '<i style="background:' + entry.hex + ';flex:' + entry.proportion + '"></i>';
        }).join("") + '</span></button>';
    }).join("") + '</section>';
}

function photoView() {
  const photo = photoById(state.photo);
  const place = placeById(photo.placeId);
  const category = categoryById(photo.primaryCategory);
  const tags = usableTags(photo);
  const theme = themedEntries(photo, state.themeMode);
  const categories = [photo.primaryCategory].concat(photo.secondaryCategories || []).map(categoryById).filter(Boolean);
  return '<button class="text-back" data-category="' + category.id + '">← Back to ' + escapeHTML(category.name) + '</button>' +
    '<section class="photo-detail"><div class="photo-stage"><img src="' + photo.src + '" alt="' + escapeHTML(photo.title) + '"></div>' +
      '<aside><p class="kicker">' + escapeHTML(place.name + " · " + place.nameZh) + '</p><h1>' + escapeHTML(photo.title) + '</h1>' +
      '<dl class="metadata-list"><div><dt>Date</dt><dd>' + escapeHTML(photo.date) + '</dd></div><div><dt>Photographer</dt><dd>' +
      escapeHTML(photo.photographer) + '</dd></div><div><dt>Categories</dt><dd>' + categories.map(function (item) {
        return escapeHTML(item.name);
      }).join(", ") + '</dd></div><div><dt>Coordinates</dt><dd>' +
      (photo.coordinates ? escapeHTML(photo.coordinates.join(", ")) : "Not recorded") + '</dd></div></dl>' +
      '<label class="control photo-theme-control"><span>Adobe-inspired theme</span><select id="theme-mode">' +
        themeOptions(state.themeMode) + '</select></label>' +
      '<div class="photo-theme-strip" aria-label="' + escapeHTML(THEME_MODES[state.themeMode].label) + ' five-color theme">' +
        theme.map(function (entry) {
          return '<span style="background:' + entry.hex + ';flex:' + entry.proportion + '" title="' +
            entry.hex + ' · ' + Math.round(entry.proportion * 100) + '% themed weight"></span>';
        }).join("") + '</div>' +
      '<p class="photo-theme-note"><strong>' + escapeHTML(THEME_MODES[state.themeMode].label) + ':</strong> ' +
        escapeHTML(THEME_MODES[state.themeMode].description) +
        ' The swatches are preserved; only their analytical emphasis changes.</p>' +
      '<div class="detail-palette"><h2>Five recorded swatches</h2>' + theme.map(function (entry) {
        return '<div><span style="background:' + entry.hex + '"></span><code>' + entry.hex + '</code>' +
          '<small>source ' + Math.round(entry.sourceProportion * 100) + '%</small><b>lens ' +
          Math.round(entry.proportion * 100) + '%</b></div>';
      }).join("") + '</div>' +
      (tags.length ? '<div class="tags"><h2>Tags</h2>' + tags.map(function (tag) { return '<span>' + escapeHTML(tag) + '</span>'; }).join("") + '</div>' : '') +
      '<p class="boundary-note">' + escapeHTML(photo.notes) + '</p></aside></section>';
}

function methodView() {
  return hero(
    "Method and evidence boundary",
    "A comparison tool, not a color census.",
    "The redesign separates geographic location, contextual comparison, and palette relationships so each view answers a different question."
  ) +
  '<section class="method-grid">' +
    '<article><span>01</span><h2>Map</h2><p>Answers where photographs were recorded. Marker position comes from place-level latitude and longitude.</p></article>' +
    '<article><span>02</span><h2>Photo comparison</h2><p>Lets users choose any two library records and inspect image-level similarity, difference, lightness, chroma, and context.</p></article>' +
    '<article><span>03</span><h2>Place comparison</h2><p>Aggregates matched samples and separates observed colors from possible cultural and material explanations.</p></article>' +
    '<article><span>04</span><h2>Relationship evidence</h2><p>Places similarity, source trace, and the all-place network inside the comparison task rather than treating them as separate destinations.</p></article>' +
  '</section>' +
  '<section class="adobe-reference"><div><p class="eyebrow">Adobe-inspired, independently implemented</p>' +
    '<h2>Five swatches, six inspectable theme lenses</h2></div><div><p>Adobe Capture and Adobe Color inspired the five-color format and the Colorful, Bright, Dark, Deep, and Muted vocabulary. This prototype does not call an Adobe API or claim to reproduce Adobe’s proprietary extraction algorithm.</p>' +
    '<p>Instead, it preserves each recorded five-color palette and uses disclosed OKLab lightness and chroma rules to reweight the same swatches. “Representative” leaves the original proportions unchanged.</p>' +
    '<p><a href="https://helpx.adobe.com/uk/indesign/desktop/apply-color/define-and-manage-color-assets/add-and-manage-colors-from-cc-libraries.html" target="_blank" rel="noopener noreferrer">Adobe Color Theme documentation ↗</a></p></div></section>' +
  '<section class="pipeline"><p class="eyebrow">Transparent pipeline</p><h2>Photograph → five recorded swatches → theme lens → perceptual families → comparison</h2>' +
    '<ol><li><strong>Source</strong><span>Selected photographs and available metadata</span></li>' +
    '<li><strong>Recorded palette</strong><span>Five dominant colors and source proportions per photograph</span></li>' +
    '<li><strong>Theme lens</strong><span>Disclosed OKLab lightness/chroma weighting; identical for both places</span></li>' +
    '<li><strong>Grouping</strong><span>Fixed OKLab rules assign shades to 12 shared families</span></li>' +
    '<li><strong>Aggregation</strong><span>Family weights are averaged across included photographs</span></li>' +
    '<li><strong>Similarity</strong><span>100 × (1 − half the L1 distance between distributions)</span></li></ol></section>' +
  '<section class="limitations"><div><p class="eyebrow">Known limitations</p><h2>What this prototype cannot establish</h2></div>' +
    '<ul><li>The sample is small and unevenly documented.</li><li>The original full-pixel extraction script is not yet included; current theme lenses operate on the five stored swatches.</li>' +
    '<li>Categories and several metadata fields remain provisional.</li>' +
    '<li>Camera settings, crop, light, season, restoration, tourism, and photographer choice affect color.</li>' +
    '<li>Similarity does not establish shared identity, influence, or representativeness.</li>' +
    '<li>Community interpretation and permission review are still required before public claims.</li></ul></section>';
}

function render() {
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }
  let content = "";
  if (state.view === "atlas") content = atlasView();
  if (state.view === "compare") content = compareView();
  if (state.view === "place") content = placeView();
  if (state.view === "category") content = categoryView();
  if (state.view === "photo") content = photoView();
  if (state.view === "about") content = methodView();
  app.innerHTML = nav() + '<main>' + content + '</main>' + footer();
  bind();
  if (state.view === "atlas") window.setTimeout(initMap, 0);
  window.scrollTo({ top: 0, behavior: "auto" });
}

function bind() {
  document.querySelectorAll("[data-nav]").forEach(function (element) {
    element.addEventListener("click", function (event) {
      event.preventDefault();
      state.view = element.dataset.nav;
      render();
    });
  });
  document.querySelectorAll("[data-open-compare]").forEach(function (element) {
    element.addEventListener("click", function () {
      state.compareTask = element.dataset.openCompare;
      state.view = "compare";
      render();
    });
  });
  document.querySelectorAll("[data-compare-task]").forEach(function (element) {
    element.addEventListener("click", function () {
      state.compareTask = element.dataset.compareTask;
      state.compareFamily = null;
      render();
    });
  });
  document.querySelectorAll("[data-place]").forEach(function (element) {
    element.addEventListener("click", function () {
      state.place = element.dataset.place;
      state.view = "place";
      render();
    });
  });
  document.querySelectorAll("[data-category]").forEach(function (element) {
    element.addEventListener("click", function () {
      state.category = element.dataset.category;
      state.view = "category";
      render();
    });
  });
  document.querySelectorAll("[data-photo]").forEach(function (element) {
    element.addEventListener("click", function () {
      const photo = photoById(element.dataset.photo);
      state.photo = photo.id;
      state.place = photo.placeId;
      state.category = photo.primaryCategory;
      state.view = "photo";
      render();
    });
  });
  document.querySelectorAll("[data-family]").forEach(function (element) {
    element.addEventListener("click", function () {
      state.compareFamily = element.dataset.family;
      render();
    });
  });
  document.querySelectorAll("[data-sim-place]").forEach(function (element) {
    const activate = function () {
      if (state.view === "compare" && state.compareTask === "places") {
        state.compare[0] = element.dataset.simPlace;
        state.compareFamily = null;
      } else {
        state.sim = element.dataset.simPlace;
      }
      render();
    };
    element.addEventListener("click", activate);
    element.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate();
      }
    });
  });
  document.querySelectorAll("[data-photo-slot]").forEach(function (element) {
    element.addEventListener("click", function () {
      state.activePhotoSlot = Number(element.dataset.photoSlot);
      render();
    });
  });
  document.querySelectorAll("[data-library-photo]").forEach(function (element) {
    element.addEventListener("click", function () {
      state.photoCompare[state.activePhotoSlot] = element.dataset.libraryPhoto;
      state.activePhotoSlot = state.activePhotoSlot === 0 ? 1 : 0;
      state.compareFamily = null;
      render();
    });
  });
  const compareA = document.getElementById("compare-a");
  const compareB = document.getElementById("compare-b");
  const photoA = document.getElementById("photo-a");
  const photoB = document.getElementById("photo-b");
  const compareLens = document.getElementById("compare-lens");
  const libraryPlace = document.getElementById("library-place");
  const libraryCategory = document.getElementById("library-category");
  const similarityPlace = document.getElementById("similarity-place");
  const similarityLens = document.getElementById("similarity-lens");
  const themeMode = document.getElementById("theme-mode");
  const swap = document.getElementById("swap-places");
  if (compareA) compareA.addEventListener("change", function () { state.compare[0] = compareA.value; state.compareFamily = null; render(); });
  if (compareB) compareB.addEventListener("change", function () { state.compare[1] = compareB.value; state.compareFamily = null; render(); });
  if (photoA) photoA.addEventListener("change", function () { state.photoCompare[0] = photoA.value; state.compareFamily = null; render(); });
  if (photoB) photoB.addEventListener("change", function () { state.photoCompare[1] = photoB.value; state.compareFamily = null; render(); });
  if (compareLens) compareLens.addEventListener("change", function () { state.compareLens = compareLens.value; state.compareFamily = null; render(); });
  if (libraryPlace) libraryPlace.addEventListener("change", function () { state.libraryPlace = libraryPlace.value; render(); });
  if (libraryCategory) libraryCategory.addEventListener("change", function () { state.libraryCategory = libraryCategory.value; render(); });
  if (similarityPlace) similarityPlace.addEventListener("change", function () { state.sim = similarityPlace.value; render(); });
  if (similarityLens) similarityLens.addEventListener("change", function () { state.simLens = similarityLens.value; render(); });
  if (themeMode) themeMode.addEventListener("change", function () {
    state.themeMode = themeMode.value;
    state.compareFamily = null;
    render();
  });
  if (swap) swap.addEventListener("click", function () { state.compare.reverse(); state.compareFamily = null; render(); });
}

render();
