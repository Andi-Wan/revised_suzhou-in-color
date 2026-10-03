"use strict";

const D = window.ATLAS_DATA;
const app = document.getElementById("app");

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

// Simplified Natural Earth 1:110m geometry projected into a 1000 x 620 viewBox.
// It is used as a quiet geographic scaffold rather than an official boundary map.
const CHINA_OUTLINE_PATH = "M112.4,275.1 L110.0,271.3 L108.0,263.8 L108.5,258.7 L100.3,255.7 L95.9,257.0 L92.5,244.9 L96.3,241.8 L94.5,238.8 L107.3,232.5 L116.6,230.0 L130.8,231.7 L135.9,223.3 L153.1,221.8 L157.9,216.5 L179.1,209.4 L181.0,206.4 L179.9,198.9 L189.1,195.5 L177.0,172.7 L203.7,167.4 L210.5,164.5 L220.2,140.9 L246.9,145.3 L254.4,139.3 L255.0,126.1 L266.2,124.9 L276.4,116.1 L281.7,115.0 L285.2,124.2 L296.5,131.2 L315.6,136.1 L324.9,146.7 L319.7,162.1 L324.6,167.8 L340.5,170.1 L358.6,171.9 L374.9,180.1 L383.2,181.6 L389.3,193.7 L397.2,201.5 L412.0,201.2 L439.7,204.1 L457.6,202.3 L470.9,204.3 L490.8,212.3 L507.0,212.3 L513.0,216.3 L528.6,209.3 L550.3,204.7 L570.5,204.2 L586.2,199.6 L595.8,192.5 L605.2,188.1 L603.0,183.8 L598.7,178.7 L605.8,170.2 L613.4,171.4 L627.2,174.1 L640.6,167.1 L661.0,162.0 L670.9,153.3 L680.4,149.6 L699.9,147.8 L710.5,149.3 L711.9,144.6 L699.8,135.4 L689.0,131.2 L678.7,136.1 L665.4,134.0 L657.8,135.7 L654.3,130.3 L663.8,117.2 L670.4,107.3 L686.5,112.2 L705.4,103.9 L705.3,98.1 L717.4,84.2 L724.9,79.9 L724.8,72.7 L717.4,69.6 L728.5,63.0 L745.2,60.6 L763.0,60.3 L783.1,64.2 L794.9,69.0 L803.2,82.3 L808.2,88.0 L812.9,96.1 L817.9,108.9 L841.3,113.1 L857.2,122.5 L862.6,134.9 L883.1,134.9 L894.7,129.7 L916.9,125.8 L909.9,137.7 L904.6,142.5 L900.0,156.9 L891.0,169.7 L874.7,167.4 L863.2,172.0 L866.7,183.3 L864.8,198.8 L857.9,199.2 L858.0,205.9 L849.3,198.1 L844.0,205.5 L823.2,211.1 L825.3,218.1 L813.7,217.6 L807.3,213.5 L798.1,222.8 L783.3,229.9 L772.3,238.3 L753.5,242.1 L743.6,248.3 L729.2,251.9 L736.3,245.8 L733.5,240.7 L744.1,231.8 L737.0,224.9 L725.3,229.6 L710.2,238.7 L701.9,247.2 L688.7,247.8 L681.8,254.0 L688.9,262.9 L699.9,265.0 L700.4,270.9 L711.0,274.8 L726.1,265.4 L738.0,270.5 L746.7,270.9 L748.9,277.8 L729.8,281.4 L723.6,288.5 L710.5,295.1 L703.6,304.3 L718.1,311.6 L723.3,324.5 L731.5,336.6 L740.6,346.7 L740.4,356.5 L732.0,360.0 L735.2,367.1 L743.1,371.2 L741.0,381.9 L737.6,392.3 L730.1,393.5 L720.3,407.7 L709.4,425.0 L697.0,440.7 L678.5,452.8 L659.8,463.9 L644.6,465.4 L636.4,471.3 L631.8,467.0 L624.2,473.5 L605.4,480.1 L591.2,482.1 L586.6,496.0 L579.1,496.8 L575.6,487.3 L578.8,482.2 L560.8,478.0 L554.4,480.1 L540.9,476.7 L534.5,471.3 L536.6,463.8 L524.3,461.4 L517.9,456.4 L506.4,463.4 L493.3,465.0 L482.6,464.9 L475.4,468.1 L468.4,470.0 L470.5,485.1 L463.3,484.7 L462.1,481.6 L461.7,476.2 L451.8,480.0 L446.0,477.6 L436.0,472.7 L440.0,461.7 L431.5,459.2 L428.2,447.1 L414.1,449.2 L415.7,433.6 L428.4,422.6 L428.9,411.8 L428.5,401.7 L422.7,398.6 L418.2,390.8 L410.3,391.8 L395.8,389.9 L400.4,384.3 L394.1,376.1 L384.5,381.7 L373.2,378.5 L357.7,386.8 L345.5,396.6 L334.7,398.3 L328.8,394.7 L321.7,394.4 L312.1,391.4 L304.8,394.7 L295.9,404.5 L294.8,394.1 L286.6,396.9 L271.0,395.6 L255.8,392.6 L244.8,386.8 L234.4,384.2 L229.9,377.9 L222.3,376.0 L208.8,367.4 L198.0,363.4 L192.4,366.5 L173.8,357.3 L160.6,349.0 L156.8,334.5 L166.4,336.3 L166.9,329.5 L161.5,322.8 L162.9,312.1 L148.4,296.7 L126.3,291.3 L122.4,281.2 L112.4,275.1 Z M585.2,517.9 L573.6,524.2 L562.6,520.2 L562.2,508.8 L568.8,502.9 L583.5,499.2 L591.2,499.5 L594.2,504.5 L588.3,510.3 L585.2,517.9 Z";
const TAIWAN_OUTLINE_PATH = "M738.9,442.7 L730.8,463.8 L725.0,474.6 L718.0,463.5 L716.4,453.7 L724.3,440.8 L735.1,430.8 L741.2,434.8 L738.9,442.7 Z";

const MAP_CALLOUTS = {
  genie: { x: 212, y: 393, w: 188, anchorX: 395, anchorY: 424 },
  luoyang: { x: 498, y: 188, w: 188, anchorX: 590, anchorY: 278 },
  jinxi: { x: 778, y: 270, w: 184, anchorX: 778, anchorY: 315 },
  bacheng: { x: 785, y: 383, w: 177, anchorX: 785, anchorY: 413 },
  hongkong: { x: 676, y: 500, w: 214, anchorX: 676, anchorY: 520 }
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
    '<strong>CN/COLOR</strong><small>A living atlas of recorded color</small></a>' +
    '<nav aria-label="Primary navigation">' +
    items.map(function (item) {
      return '<button class="nav-button' + (state.view === item[0] ? " is-active" : "") +
        '" data-nav="' + item[0] + '">' + item[1] + "</button>";
    }).join("") +
    '</nav><span class="prototype-label">Prototype · 50 sampled photographs</span></header>';
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

function hookBlendPalette(photo, source) {
  return themedEntries(photo, state.themeMode).map(function (entry) {
    return '<span class="hook-blend-swatch source-' + source + '" data-hook-source="' + source +
      '" data-hook-weight="' + entry.proportion + '" style="background:' + entry.hex +
      ';flex-grow:' + (entry.proportion * 0.5) + '" title="' +
      escapeHTML((source === "a" ? "A · " : "B · ") + entry.hex + " · source weight " +
        Math.round(entry.proportion * 100) + "%") + '"></span>';
  }).join("");
}

function compareHook() {
  const firstPhoto = photoById(state.photoCompare[0]) || D.photos[0];
  const secondPhoto = photoById(state.photoCompare[1]) || D.photos[1];
  const firstPlace = placeById(firstPhoto.placeId);
  const secondPlace = placeById(secondPhoto.placeId);
  const firstAggregate = aggregatePhotoSet([firstPhoto], state.themeMode);
  const secondAggregate = aggregatePhotoSet([secondPhoto], state.themeMode);
  const score = similarityScore(firstAggregate, secondAggregate);
  const rows = comparisonRows(firstAggregate, secondAggregate);
  const largestGap = rows.slice().sort(function (a, b) { return b.gap - a.gap; })[0];
  const strongestShared = rows.slice().sort(function (a, b) {
    return Math.min(b.a, b.b) - Math.min(a.a, a.b);
  })[0];
  const sameCategory = firstPhoto.primaryCategory === secondPhoto.primaryCategory;
  const categoryNote = sameCategory ? "Category matched" : "Different scene categories";

  return '<section class="compare-hook" aria-labelledby="compare-hook-title">' +
    '<div class="compare-hook-head"><div><p class="eyebrow">Interactive opening · chromatic blend</p>' +
      '<h2 id="compare-hook-title">Blend two records. Trace what remains distinct.</h2>' +
      '<p>Adjust the contribution of A and B. The image blend supports atmospheric inspection, while the weighted palette and color-family evidence identify what is shared and different.</p></div>' +
      '<button class="primary-button" data-open-compare="photos">Choose different photographs</button></div>' +
    '<div class="compare-hook-grid">' +
      '<div class="hook-compare-stage" id="hook-compare-stage" role="img" aria-label="A fifty-fifty visual blend of ' +
        escapeHTML(firstPlace.name + " and " + secondPlace.name) + '">' +
        '<div class="hook-image hook-image-b"><img src="' + secondPhoto.src + '" alt=""><span>B · ' + escapeHTML(secondPlace.name) + '</span></div>' +
        '<div class="hook-image hook-image-a" id="hook-image-a"><img src="' + firstPhoto.src + '" alt=""><span>A · ' + escapeHTML(firstPlace.name) + '</span></div>' +
        '<div class="hook-blend-mark" aria-hidden="true"><span>A</span><i>+</i><span>B</span></div>' +
      '</div>' +
      '<aside class="hook-reading"><p class="eyebrow">Read the blend</p>' +
        '<div class="hook-score"><strong>' + score + '</strong><span>palette similarity<br><small>fixed result from these two photographs</small></span></div>' +
        '<div class="hook-evidence-pair"><article><i style="background:' +
          (strongestShared ? FAMILIES[strongestShared.id].color : "#777") + '"></i><span><small>Strongest shared family</small><strong>' +
          (strongestShared ? escapeHTML(FAMILIES[strongestShared.id].label) : "None") + '</strong></span></article>' +
          '<article><i style="background:' + (largestGap ? FAMILIES[largestGap.id].color : "#777") + '"></i><span><small>Largest difference</small><strong>' +
          (largestGap ? escapeHTML(FAMILIES[largestGap.id].label + " · " + Math.round(largestGap.gap * 100) + " pp") : "None") + '</strong></span></article></div>' +
        '<div class="hook-blend-palette-block"><div><strong>Weighted blend palette</strong><small id="hook-blend-label">A 50% · B 50%</small></div>' +
          '<div class="hook-blended-palette" aria-label="Weighted combination of both recorded palettes">' +
            hookBlendPalette(firstPhoto, "a") + hookBlendPalette(secondPhoto, "b") + '</div>' +
          '<div class="hook-source-key"><span><i class="source-a"></i>A · ' + escapeHTML(firstPlace.name) + '</span><span><i class="source-b"></i>B · ' + escapeHTML(secondPlace.name) + '</span></div></div>' +
        '<div class="hook-controls"><label for="hook-compare-split">Image and palette contribution <output id="hook-split-output">A 50% · B 50%</output></label>' +
          '<input id="hook-compare-split" class="hook-visible-range" type="range" min="0" max="100" value="50" aria-label="Blend contribution: ' +
            escapeHTML(firstPlace.name + " to " + secondPlace.name) + '">' +
          '<div class="hook-control-ends"><span>A only</span><span>Equal blend</span><span>B only</span></div>' +
          '<button class="secondary-button compact" id="center-hook-divider" type="button">Reset to equal blend</button></div>' +
        '<p class="hook-context"><strong>' + escapeHTML(categoryNote) + '.</strong> The blend is an exploratory overlay, not a shared place, before/after image, or claim of cultural connection.</p>' +
      '</aside>' +
    '</div>' +
  '</section>';
}

function atlasView() {
  return hero(
    "Dataset overview · spatial evidence",
    "A geographic atlas of recorded color.",
    "Five photographic samples are positioned by latitude and longitude. Their placement shows where the records come from—not whether the places are culturally or chromatically similar."
  ) + compareHook() +
  '<section class="map-layout">' +
    '<div class="map-card geographic-map-card" tabindex="0" aria-label="Scrollable geographic atlas">' + chinaMapGraphic() + '</div>' +
    '<aside class="map-aside"><p class="eyebrow">Data boundary</p><h2>5 places, 50 photographs</h2>' +
      '<p>This is a selected photographic sample, not a national color census. Coordinates locate each place; individual photo coordinates are still incomplete.</p>' +
      '<div class="place-list">' +
      D.places.map(function (place) {
        return '<button class="place-list-item" data-place="' + place.id + '">' +
          '<span><strong>' + escapeHTML(place.name) + '</strong><small>' + escapeHTML(place.nameZh + " · " + place.region) + '</small></span>' +
          '<span class="coordinates">' + place.coordinates[0].toFixed(3) + "°, " + place.coordinates[1].toFixed(3) + "°</span></button>";
      }).join("") +
      '</div><p class="map-source-note">Simplified outline: Natural Earth 1:110m. Point positions use the WGS84 place coordinates recorded in this prototype. The outline is for orientation, not an official boundary reference.</p></aside></section>' +
    '<section class="view-bridge"><div><p class="eyebrow">Next question</p><h2>Geographic distance is not color similarity.</h2>' +
      '<p>Use Compare for matched evidence; its place-level view also contains the sample-based similarity network.</p></div>' +
      '<div class="button-row"><button class="primary-button" data-open-compare="places">Compare places</button>' +
      '<button class="secondary-button" data-open-compare="photos">Compare photographs</button></div></section>';
}

function projectGeographic(coordinates) {
  const latitude = coordinates[0];
  const longitude = coordinates[1];
  return {
    x: 70 + (longitude - 72) / 64 * 860,
    y: 40 + (55 - latitude) / 38 * 500
  };
}

function mapPalette(place, x, y) {
  return place.recordedPalette.slice(0, 5).map(function (entry, index) {
    return '<rect class="map-palette-swatch" x="' + (x + index * 17) + '" y="' + y +
      '" width="13" height="13" fill="' + escapeHTML(entry.hex) + '"></rect>';
  }).join("");
}

function mapNode(place) {
  const point = projectGeographic(place.coordinates);
  const callout = MAP_CALLOUTS[place.id];
  const labelY = callout.y + 28;
  const coordinateLabel = place.coordinates[0].toFixed(2) + '° N · ' + place.coordinates[1].toFixed(2) + '° E';
  return '<g class="china-node" data-place="' + place.id + '" role="button" tabindex="0" aria-label="Open ' +
    escapeHTML(place.name + ', ' + place.region) + '">' +
      '<line class="map-leader" x1="' + point.x.toFixed(1) + '" y1="' + point.y.toFixed(1) + '" x2="' +
        callout.anchorX + '" y2="' + callout.anchorY + '"></line>' +
      '<circle class="map-node-halo" cx="' + point.x.toFixed(1) + '" cy="' + point.y.toFixed(1) + '" r="13"></circle>' +
      '<circle class="map-node-dot" cx="' + point.x.toFixed(1) + '" cy="' + point.y.toFixed(1) + '" r="5"></circle>' +
      '<rect class="map-callout-bg" x="' + callout.x + '" y="' + callout.y + '" width="' + callout.w + '" height="82"></rect>' +
      '<text class="map-place-name" x="' + (callout.x + 13) + '" y="' + labelY + '">' + escapeHTML(place.name.toUpperCase()) + '</text>' +
      '<text class="map-place-zh" x="' + (callout.x + callout.w - 13) + '" y="' + labelY + '" text-anchor="end">' + escapeHTML(place.nameZh) + '</text>' +
      '<text class="map-coordinate" x="' + (callout.x + 13) + '" y="' + (labelY + 19) + '">' + escapeHTML(coordinateLabel) + '</text>' +
      mapPalette(place, callout.x + 13, labelY + 30) +
    '</g>';
}

function chinaMapGraphic() {
  return '<div class="map-title-line"><span>GEOGRAPHIC SAMPLE / 05</span><span>CLICK A LOCATION TO OPEN ITS RECORDS</span></div>' +
    '<svg class="china-map" viewBox="0 0 1000 620" role="img" aria-labelledby="china-map-title china-map-desc">' +
      '<title id="china-map-title">Five sampled places positioned on an outline of China</title>' +
      '<desc id="china-map-desc">Genie Town in western Sichuan, Luoyang in Henan, Jinxi and Bacheng near Suzhou, and Hong Kong are positioned using latitude and longitude.</desc>' +
      '<g class="map-graticule" aria-hidden="true">' +
        '<line x1="70" y1="165" x2="930" y2="165"></line><line x1="70" y1="290" x2="930" y2="290"></line><line x1="70" y1="415" x2="930" y2="415"></line>' +
        '<line x1="285" y1="40" x2="285" y2="540"></line><line x1="500" y1="40" x2="500" y2="540"></line><line x1="715" y1="40" x2="715" y2="540"></line>' +
      '</g>' +
      '<path class="china-outline" d="' + CHINA_OUTLINE_PATH + '"></path>' +
      '<path class="china-outline island" d="' + TAIWAN_OUTLINE_PATH + '"></path>' +
      D.places.map(mapNode).join("") +
      '<text class="map-axis-label" x="70" y="582">WGS84 COORDINATE POSITION · SCHEMATIC OUTLINE</text>' +
    '</svg>';
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

function photoSlotCard(photo, slot, index) {
  const place = placeById(photo.placeId);
  const category = categoryById(photo.primaryCategory);
  const active = state.activePhotoSlot === index;
  return '<button class="photo-slot-card' + (active ? " is-active" : "") + '" data-photo-slot="' + index +
    '" aria-pressed="' + String(active) + '">' +
      '<span class="slot-letter">' + slot + '</span>' +
      '<img src="' + photo.src + '" alt="">' +
      '<span class="slot-copy"><strong>' + escapeHTML(photo.title) + '</strong><small>' +
        escapeHTML(place.name + " · " + category.name) + '</small></span>' +
      '<span class="slot-action">' + (active ? "Choosing for this slot" : "Click to replace") + '</span>' +
    '</button>';
}

function themeChoiceButtons() {
  return Object.keys(THEME_MODES).map(function (mode) {
    return '<button class="filter-chip' + (state.themeMode === mode ? " is-active" : "") +
      '" data-theme-mode="' + mode + '" aria-pressed="' + String(state.themeMode === mode) + '">' +
      escapeHTML(THEME_MODES[mode].label) + '</button>';
  }).join("");
}

function libraryPlaceButtons() {
  return '<button class="filter-chip' + (state.libraryPlace === "all" ? " is-active" : "") +
    '" data-library-place-filter="all" aria-pressed="' + String(state.libraryPlace === "all") + '">All places</button>' +
    D.places.map(function (place) {
      return '<button class="filter-chip' + (state.libraryPlace === place.id ? " is-active" : "") +
        '" data-library-place-filter="' + place.id + '" aria-pressed="' + String(state.libraryPlace === place.id) + '">' +
        escapeHTML(place.name) + '</button>';
    }).join("");
}

function libraryCategoryButtons() {
  return '<button class="filter-chip' + (state.libraryCategory === "all" ? " is-active" : "") +
    '" data-library-category-filter="all" aria-pressed="' + String(state.libraryCategory === "all") + '">All photographs</button>' +
    D.categories.map(function (category) {
      return '<button class="filter-chip' + (state.libraryCategory === category.id ? " is-active" : "") +
        '" data-library-category-filter="' + category.id + '" aria-pressed="' + String(state.libraryCategory === category.id) + '">' +
        escapeHTML(category.name) + '</button>';
    }).join("");
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

  return '<section class="photo-selection-workspace">' +
    '<div class="selection-workspace-head"><div><p class="eyebrow">Step 1 · select evidence</p>' +
      '<h2>Choose two photographs from the library</h2><p>Choose slot A or B, then click any thumbnail. Selecting an already chosen photograph focuses its slot.</p></div>' +
      '<div class="selection-actions"><a class="primary-button" href="#comparison-result">View comparison ↓</a></div></div>' +
    '<div class="photo-slot-strip" role="group" aria-label="Selected comparison photographs">' +
      photoSlotCard(firstPhoto, "A", 0) + photoSlotCard(secondPhoto, "B", 1) + '</div>' +
    '<div class="photo-filter-panel">' +
      '<div class="filter-row"><span class="filter-label">Color treatment</span><div class="filter-chips">' +
        themeChoiceButtons() + '</div></div>' +
      '<div class="filter-row"><span class="filter-label">Place</span><div class="filter-chips">' +
        libraryPlaceButtons() + '</div></div>' +
      '<div class="filter-row"><span class="filter-label">Category</span><div class="filter-chips">' +
        libraryCategoryButtons() + '</div><button class="filter-reset" id="reset-photo-compare">Reset A/B</button></div>' +
    '</div>' +
    '<p class="library-status"><strong>' + filteredLibrary.length + '</strong> photographs shown · your next new choice replaces <strong>' +
      (state.activePhotoSlot === 0 ? "A" : "B") + '</strong>.</p>' +
    (filteredLibrary.length ? '<div class="library-grid">' + filteredLibrary.map(function (photo) {
      const place = placeById(photo.placeId);
      const selectedIndex = state.photoCompare.indexOf(photo.id);
      const selectionLabel = selectedIndex === 0 ? "A" : selectedIndex === 1 ? "B" : "";
      return '<button class="library-photo' + (selectionLabel ? " is-selected selected-" + selectionLabel.toLowerCase() : "") +
        '" data-library-photo="' + photo.id + '" aria-label="' +
        escapeHTML((selectionLabel ? "Selected as " + selectionLabel + ". " : "") + photo.title + ", " + place.name) + '">' +
        (selectionLabel ? '<i class="library-selection-badge">' + selectionLabel + '</i>' : "") +
        '<img src="' + photo.src + '" alt="' + escapeHTML(photo.title) + '"><span><strong>' +
        escapeHTML(place.name) + '</strong><small>' + escapeHTML(categoryById(photo.primaryCategory).name) +
        '</small></span></button>';
    }).join("") + '</div>' : '<div class="library-empty"><strong>No photographs match these filters.</strong><span>Change the place or category to continue selecting.</span></div>') +
  '</section>' +
  '<section class="theme-explainer"><span class="theme-badge">' + escapeHTML(THEME_MODES[state.themeMode].label) + '</span>' +
    '<p><strong>Same analytical rule:</strong> ' + escapeHTML(THEME_MODES[state.themeMode].description) +
    ' The comparison preserves both source photographs and their original five swatches.</p></section>' +
  '<section class="comparison-result-heading" id="comparison-result"><p class="eyebrow">Step 2 · inspect the result</p>' +
    '<h2>Compare the selected photographs</h2><p>Read color similarity together with category, place, date, lightness, and chroma.</p></section>' +
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
  );
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
    '<article><span>01</span><h2>Map</h2><p>Uses a native SVG outline for orientation and positions each node from place-level latitude and longitude.</p></article>' +
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

function render(options) {
  const settings = options || {};
  const previousScroll = settings.preserveScroll ? (window.scrollY || window.pageYOffset || 0) : 0;
  let content = "";
  if (state.view === "atlas") content = atlasView();
  if (state.view === "compare") content = compareView();
  if (state.view === "place") content = placeView();
  if (state.view === "category") content = categoryView();
  if (state.view === "photo") content = photoView();
  if (state.view === "about") content = methodView();
  app.innerHTML = nav() + '<main>' + content + '</main>' + footer();
  bind();
  window.scrollTo({ top: previousScroll, behavior: "auto" });
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
      render({ preserveScroll: true });
    });
  });
  document.querySelectorAll("[data-place]").forEach(function (element) {
    const activate = function () {
      state.place = element.dataset.place;
      state.view = "place";
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
      render({ preserveScroll: true });
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
      render({ preserveScroll: true });
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
      render({ preserveScroll: true });
    });
  });
  document.querySelectorAll("[data-library-photo]").forEach(function (element) {
    element.addEventListener("click", function () {
      const selectedIndex = state.photoCompare.indexOf(element.dataset.libraryPhoto);
      if (selectedIndex >= 0) {
        state.activePhotoSlot = selectedIndex;
      } else {
        state.photoCompare[state.activePhotoSlot] = element.dataset.libraryPhoto;
        state.activePhotoSlot = state.activePhotoSlot === 0 ? 1 : 0;
      }
      state.compareFamily = null;
      render({ preserveScroll: true });
    });
  });
  document.querySelectorAll("[data-library-place-filter]").forEach(function (element) {
    element.addEventListener("click", function () {
      state.libraryPlace = element.dataset.libraryPlaceFilter;
      render({ preserveScroll: true });
    });
  });
  document.querySelectorAll("[data-library-category-filter]").forEach(function (element) {
    element.addEventListener("click", function () {
      state.libraryCategory = element.dataset.libraryCategoryFilter;
      render({ preserveScroll: true });
    });
  });
  document.querySelectorAll("[data-theme-mode]").forEach(function (element) {
    element.addEventListener("click", function () {
      state.themeMode = element.dataset.themeMode;
      state.compareFamily = null;
      render({ preserveScroll: true });
    });
  });
  const compareA = document.getElementById("compare-a");
  const compareB = document.getElementById("compare-b");
  const compareLens = document.getElementById("compare-lens");
  const libraryPlace = document.getElementById("library-place");
  const libraryCategory = document.getElementById("library-category");
  const similarityPlace = document.getElementById("similarity-place");
  const similarityLens = document.getElementById("similarity-lens");
  const themeMode = document.getElementById("theme-mode");
  const swap = document.getElementById("swap-places");
  const resetPhotoCompare = document.getElementById("reset-photo-compare");
  const hookSplit = document.getElementById("hook-compare-split");
  const hookStage = document.getElementById("hook-compare-stage");
  const hookImageA = document.getElementById("hook-image-a");
  const hookOutput = document.getElementById("hook-split-output");
  const hookBlendLabel = document.getElementById("hook-blend-label");
  const centerHookDivider = document.getElementById("center-hook-divider");
  if (compareA) compareA.addEventListener("change", function () { state.compare[0] = compareA.value; state.compareFamily = null; render({ preserveScroll: true }); });
  if (compareB) compareB.addEventListener("change", function () { state.compare[1] = compareB.value; state.compareFamily = null; render({ preserveScroll: true }); });
  if (compareLens) compareLens.addEventListener("change", function () { state.compareLens = compareLens.value; state.compareFamily = null; render({ preserveScroll: true }); });
  if (libraryPlace) libraryPlace.addEventListener("change", function () { state.libraryPlace = libraryPlace.value; render({ preserveScroll: true }); });
  if (libraryCategory) libraryCategory.addEventListener("change", function () { state.libraryCategory = libraryCategory.value; render({ preserveScroll: true }); });
  if (similarityPlace) similarityPlace.addEventListener("change", function () { state.sim = similarityPlace.value; render({ preserveScroll: true }); });
  if (similarityLens) similarityLens.addEventListener("change", function () { state.simLens = similarityLens.value; render({ preserveScroll: true }); });
  if (themeMode) themeMode.addEventListener("change", function () {
    state.themeMode = themeMode.value;
    state.compareFamily = null;
    render({ preserveScroll: true });
  });
  if (resetPhotoCompare) resetPhotoCompare.addEventListener("click", function () {
    state.photoCompare = [D.photos[0].id, D.photos[1].id];
    state.activePhotoSlot = 0;
    state.compareFamily = null;
    render({ preserveScroll: true });
  });
  if (hookSplit && hookStage) {
    const updateHookBlend = function () {
      const bWeight = Number(hookSplit.value) / 100;
      const aWeight = 1 - bWeight;
      if (hookImageA) hookImageA.style.opacity = String(aWeight);
      const label = "A " + Math.round(aWeight * 100) + "% · B " + Math.round(bWeight * 100) + "%";
      if (hookOutput) hookOutput.value = label;
      if (hookBlendLabel) hookBlendLabel.textContent = label;
      document.querySelectorAll("[data-hook-source]").forEach(function (swatch) {
        const contribution = swatch.dataset.hookSource === "a" ? aWeight : bWeight;
        swatch.style.flexGrow = String(Number(swatch.dataset.hookWeight) * contribution);
      });
      hookStage.setAttribute("aria-label", label + " visual blend of the selected photographs");
    };
    hookSplit.addEventListener("input", updateHookBlend);
  }
  if (centerHookDivider && hookSplit && hookStage) {
    centerHookDivider.addEventListener("click", function () {
      hookSplit.value = "50";
      if (hookImageA) hookImageA.style.opacity = ".5";
      if (hookOutput) hookOutput.value = "A 50% · B 50%";
      if (hookBlendLabel) hookBlendLabel.textContent = "A 50% · B 50%";
      document.querySelectorAll("[data-hook-source]").forEach(function (swatch) {
        swatch.style.flexGrow = String(Number(swatch.dataset.hookWeight) * 0.5);
      });
      hookStage.setAttribute("aria-label", "A 50% · B 50% visual blend of the selected photographs");
      hookSplit.focus();
    });
  }
  if (swap) swap.addEventListener("click", function () { state.compare.reverse(); state.compareFamily = null; render({ preserveScroll: true }); });
}

render();
