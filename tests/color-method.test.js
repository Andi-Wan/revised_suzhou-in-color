"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const appNode = { innerHTML: "" };
const context = {
  console: console,
  window: { scrollY: 0, pageYOffset: 0, scrollTo: function () {} },
  document: {
    getElementById: function (id) { return id === "app" ? appNode : null; },
    querySelectorAll: function () { return []; }
  }
};

vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "data.js"), "utf8"), context);
vm.runInContext(
  fs.readFileSync(path.join(root, "app.js"), "utf8") +
    "\n;globalThis.__colorTest={deltaE2000,aggregate,paletteComparison};",
  context
);

const method = context.__colorTest;
const referencePairs = [
  [{ L: 50, a: 2.6772, b: -79.7751 }, { L: 50, a: 0, b: -82.7485 }, 2.0425],
  [{ L: 50, a: 3.1571, b: -77.2803 }, { L: 50, a: 0, b: -82.7485 }, 2.8615],
  [{ L: 50, a: 2.8361, b: -74.0200 }, { L: 50, a: 0, b: -82.7485 }, 3.4412]
];

referencePairs.forEach(function (pair, index) {
  const result = method.deltaE2000(pair[0], pair[1]);
  if (Math.abs(result - pair[2]) > 0.0002) {
    throw new Error("CIEDE2000 reference-pair " + (index + 1) + " failure: " + result);
  }
});

context.window.ATLAS_DATA.places.forEach(function (place) {
  const aggregate = method.aggregate(place.id, "all", "representative");
  if (aggregate.palette.length !== 5) {
    throw new Error(place.id + " did not produce a five-color summary palette");
  }
  const self = method.paletteComparison(aggregate, aggregate);
  if (self.score !== 100 || self.distance > 1e-8) {
    throw new Error(place.id + " failed the self-comparison check");
  }

  place.similarity.forEach(function (stored) {
    const other = method.aggregate(stored.placeId, "all", "representative");
    const browserResult = method.paletteComparison(aggregate, other);
    if (browserResult.score !== stored.score) {
      throw new Error(
        place.id + " → " + stored.placeId +
        " score differs between generated data and browser logic: " +
        stored.score + " vs " + browserResult.score
      );
    }
    if (Math.abs(browserResult.distance - stored.weightedDeltaE00) > 0.0001) {
      throw new Error(
        place.id + " → " + stored.placeId +
        " ΔE00 differs between generated data and browser logic: " +
        stored.weightedDeltaE00 + " vs " + browserResult.distance
      );
    }
  });
});

const first = method.aggregate("jinxi", "all", "representative");
const second = method.aggregate("bacheng", "all", "representative");
const forward = method.paletteComparison(first, second);
const reverse = method.paletteComparison(second, first);
if (Math.abs(forward.distance - reverse.distance) > 1e-8 || forward.score !== reverse.score) {
  throw new Error("Palette comparison is not symmetric");
}

console.log("PASS CIEDE2000 reference pairs:", referencePairs.length);
console.log("PASS generated-data ↔ browser-result consistency");
console.log("PASS five-color summaries, self-comparison, and symmetry");
console.log("Jinxi ↔ Bacheng:", forward.score + "/100; weighted ΔE00 " + forward.distance.toFixed(2));
