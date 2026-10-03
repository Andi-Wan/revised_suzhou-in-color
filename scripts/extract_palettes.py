#!/usr/bin/env python3
"""Rebuild photo and place palettes from the repository's source images.

The extraction stage clusters resized image pixels in CIELAB (D65) with a
deterministic weighted K-means++ implementation. The comparison stage mirrors
the browser: CIEDE2000, exact one-to-one assignment for five colors, then a
proportion-weighted mean distance and a clipped 0–100 display index.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
PHOTOS_PATH = ROOT / "data" / "photos.json"
PLACES_PATH = ROOT / "data" / "places.json"
CATEGORIES_PATH = ROOT / "data" / "categories.json"
MANIFEST_PATH = ROOT / "data" / "extraction-manifest.json"
DATA_JS_PATH = ROOT / "data.js"

METHOD_VERSION = "cielab-kmeans-v1"
K = 5
RESIZE_MAX = 220
MAX_PIXELS = 30_000
MAX_ITERATIONS = 40
TOLERANCE = 1e-4
BASE_SEED = 301


def stable_seed(identifier: str) -> int:
    digest = hashlib.sha256(identifier.encode("utf-8")).digest()
    return BASE_SEED + int.from_bytes(digest[:4], "big")


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def srgb_to_lab(rgb: np.ndarray) -> np.ndarray:
    values = np.asarray(rgb, dtype=np.float64) / 255.0
    linear = np.where(
        values <= 0.04045,
        values / 12.92,
        ((values + 0.055) / 1.055) ** 2.4,
    )
    matrix = np.array(
        [
            [0.4124564, 0.3575761, 0.1804375],
            [0.2126729, 0.7151522, 0.0721750],
            [0.0193339, 0.1191920, 0.9503041],
        ]
    )
    xyz = linear @ matrix.T
    xyz /= np.array([0.95047, 1.0, 1.08883])
    delta = 6 / 29
    transformed = np.where(
        xyz > delta**3,
        np.cbrt(xyz),
        xyz / (3 * delta**2) + 4 / 29,
    )
    return np.column_stack(
        [
            116 * transformed[:, 1] - 16,
            500 * (transformed[:, 0] - transformed[:, 1]),
            200 * (transformed[:, 1] - transformed[:, 2]),
        ]
    )


def rgb_to_hex(rgb: np.ndarray) -> str:
    channels = np.clip(np.rint(rgb), 0, 255).astype(np.uint8)
    return "#{:02x}{:02x}{:02x}".format(*channels.tolist())


def hex_to_rgb(value: str) -> np.ndarray:
    value = value.lstrip("#")
    return np.array([int(value[index : index + 2], 16) for index in (0, 2, 4)])


def deterministic_sample(values: np.ndarray, weights: np.ndarray, limit: int) -> tuple[np.ndarray, np.ndarray]:
    if len(values) <= limit:
        return values, weights
    indices = np.linspace(0, len(values) - 1, limit, dtype=np.int64)
    sampled_weights = weights[indices]
    sampled_weights /= sampled_weights.sum()
    return values[indices], sampled_weights


def weighted_kmeans(
    points: np.ndarray,
    weights: np.ndarray,
    clusters: int,
    seed: int,
) -> tuple[np.ndarray, np.ndarray]:
    if len(points) < clusters:
        raise ValueError(f"Need at least {clusters} points, found {len(points)}")
    weights = np.asarray(weights, dtype=np.float64)
    weights /= weights.sum()
    rng = np.random.default_rng(seed)

    first_index = int(rng.choice(len(points), p=weights))
    centers = [points[first_index].copy()]
    while len(centers) < clusters:
        distances = np.min(
            np.sum((points[:, None, :] - np.asarray(centers)[None, :, :]) ** 2, axis=2),
            axis=1,
        )
        probabilities = distances * weights
        if probabilities.sum() <= 1e-15:
            next_index = int(np.argmax(distances))
        else:
            probabilities /= probabilities.sum()
            next_index = int(rng.choice(len(points), p=probabilities))
        centers.append(points[next_index].copy())

    centers_array = np.asarray(centers)
    labels = np.zeros(len(points), dtype=np.int64)
    for _ in range(MAX_ITERATIONS):
        squared = np.sum((points[:, None, :] - centers_array[None, :, :]) ** 2, axis=2)
        labels = np.argmin(squared, axis=1)
        updated = centers_array.copy()
        for cluster in range(clusters):
            mask = labels == cluster
            if not np.any(mask):
                farthest = int(np.argmax(np.min(squared, axis=1) * weights))
                updated[cluster] = points[farthest]
                continue
            cluster_weights = weights[mask]
            updated[cluster] = np.average(points[mask], axis=0, weights=cluster_weights)
        shift = float(np.max(np.linalg.norm(updated - centers_array, axis=1)))
        centers_array = updated
        if shift < TOLERANCE:
            break

    squared = np.sum((points[:, None, :] - centers_array[None, :, :]) ** 2, axis=2)
    labels = np.argmin(squared, axis=1)
    return centers_array, labels


def normalize_proportions(values: list[float]) -> list[float]:
    total = sum(values) or 1.0
    rounded = [round(value / total, 6) for value in values]
    rounded[0] = round(rounded[0] + (1.0 - sum(rounded)), 6)
    return rounded


def palette_from_points(
    labs: np.ndarray,
    display_rgb: np.ndarray,
    weights: np.ndarray,
    identifier: str,
) -> list[dict[str, float | str]]:
    sampled_labs, sampled_weights = deterministic_sample(labs, weights, MAX_PIXELS)
    centers, _ = weighted_kmeans(sampled_labs, sampled_weights, K, stable_seed(identifier))
    full_distances = np.sum((labs[:, None, :] - centers[None, :, :]) ** 2, axis=2)
    full_labels = np.argmin(full_distances, axis=1)
    cluster_weights = np.array([weights[full_labels == cluster].sum() for cluster in range(K)])
    cluster_weights /= cluster_weights.sum()

    entries = []
    for cluster in range(K):
        members = np.flatnonzero(full_labels == cluster)
        if len(members):
            nearest = members[int(np.argmin(full_distances[members, cluster]))]
        else:
            nearest = int(np.argmin(full_distances[:, cluster]))
        entries.append(
            {
                "hex": rgb_to_hex(display_rgb[nearest]),
                "proportion": float(cluster_weights[cluster]),
            }
        )
    entries.sort(key=lambda entry: (-float(entry["proportion"]), str(entry["hex"])))
    proportions = normalize_proportions([float(entry["proportion"]) for entry in entries])
    for entry, proportion in zip(entries, proportions):
        entry["proportion"] = proportion
    return entries


def extract_photo_palette(image_path: Path, identifier: str) -> list[dict[str, float | str]]:
    with Image.open(image_path) as source:
        image = ImageOps.exif_transpose(source).convert("RGB")
        image.thumbnail((RESIZE_MAX, RESIZE_MAX), Image.Resampling.LANCZOS)
        rgb = np.asarray(image, dtype=np.uint8).reshape(-1, 3)
    labs = srgb_to_lab(rgb)
    weights = np.full(len(rgb), 1.0 / len(rgb), dtype=np.float64)
    return palette_from_points(labs, rgb, weights, identifier)


def aggregate_place_palette(photos: list[dict], identifier: str) -> list[dict[str, float | str]]:
    labs = []
    rgb = []
    weights = []
    divisor = max(len(photos), 1)
    for photo in photos:
        for entry in photo["dominantColors"]:
            color = hex_to_rgb(entry["hex"])
            rgb.append(color)
            labs.append(srgb_to_lab(color.reshape(1, 3))[0])
            weights.append(float(entry["proportion"]) / divisor)
    return palette_from_points(
        np.asarray(labs),
        np.asarray(rgb),
        np.asarray(weights, dtype=np.float64),
        "place:" + identifier,
    )


def delta_e_2000(first: np.ndarray, second: np.ndarray) -> float:
    l1, a1, b1 = map(float, first)
    l2, a2, b2 = map(float, second)
    c1 = math.hypot(a1, b1)
    c2 = math.hypot(a2, b2)
    mean_c = (c1 + c2) / 2
    g = 0.5 * (1 - math.sqrt(mean_c**7 / (mean_c**7 + 25**7)))
    a1p, a2p = (1 + g) * a1, (1 + g) * a2
    c1p, c2p = math.hypot(a1p, b1), math.hypot(a2p, b2)

    def hue(a_value: float, b_value: float) -> float:
        if a_value == 0 and b_value == 0:
            return 0
        return math.degrees(math.atan2(b_value, a_value)) % 360

    h1p, h2p = hue(a1p, b1), hue(a2p, b2)
    delta_lp = l2 - l1
    delta_cp = c2p - c1p
    delta_h = h2p - h1p
    if c1p * c2p == 0:
        delta_h = 0
    elif delta_h > 180:
        delta_h -= 360
    elif delta_h < -180:
        delta_h += 360
    delta_hp = 2 * math.sqrt(c1p * c2p) * math.sin(math.radians(delta_h / 2))
    mean_lp = (l1 + l2) / 2
    mean_cp = (c1p + c2p) / 2
    if c1p * c2p == 0:
        mean_hp = h1p + h2p
    elif abs(h1p - h2p) <= 180:
        mean_hp = (h1p + h2p) / 2
    elif h1p + h2p < 360:
        mean_hp = (h1p + h2p + 360) / 2
    else:
        mean_hp = (h1p + h2p - 360) / 2
    t = (
        1
        - 0.17 * math.cos(math.radians(mean_hp - 30))
        + 0.24 * math.cos(math.radians(2 * mean_hp))
        + 0.32 * math.cos(math.radians(3 * mean_hp + 6))
        - 0.20 * math.cos(math.radians(4 * mean_hp - 63))
    )
    delta_theta = 30 * math.exp(-((mean_hp - 275) / 25) ** 2)
    rc = 2 * math.sqrt(mean_cp**7 / (mean_cp**7 + 25**7))
    sl = 1 + 0.015 * (mean_lp - 50) ** 2 / math.sqrt(20 + (mean_lp - 50) ** 2)
    sc = 1 + 0.045 * mean_cp
    sh = 1 + 0.015 * mean_cp * t
    rt = -math.sin(math.radians(2 * delta_theta)) * rc
    l_term, c_term, h_term = delta_lp / sl, delta_cp / sc, delta_hp / sh
    return math.sqrt(l_term**2 + c_term**2 + h_term**2 + rt * c_term * h_term)


def palette_comparison(first: list[dict], second: list[dict]) -> tuple[float, int]:
    first_labs = [srgb_to_lab(hex_to_rgb(entry["hex"]).reshape(1, 3))[0] for entry in first]
    second_labs = [srgb_to_lab(hex_to_rgb(entry["hex"]).reshape(1, 3))[0] for entry in second]
    costs = np.array(
        [[delta_e_2000(left, right) for right in second_labs] for left in first_labs]
    )
    assignment = min(
        itertools.permutations(range(K)),
        key=lambda permutation: sum(costs[index, permutation[index]] for index in range(K)),
    )
    distance = 0.0
    total_weight = 0.0
    for index, matched in enumerate(assignment):
        weight = (float(first[index]["proportion"]) + float(second[matched]["proportion"])) / 2
        distance += float(costs[index, matched]) * weight
        total_weight += weight
    distance /= total_weight or 1.0
    return distance, max(0, min(100, round(100 - distance)))


def build_outputs() -> tuple[list[dict], list[dict], dict, str]:
    photos = json.loads(PHOTOS_PATH.read_text(encoding="utf-8"))
    places = json.loads(PLACES_PATH.read_text(encoding="utf-8"))
    categories = json.loads(CATEGORIES_PATH.read_text(encoding="utf-8"))
    file_records = []

    for photo in photos:
        image_path = ROOT / photo["src"]
        source_hash = file_sha256(image_path)
        photo["dominantColors"] = extract_photo_palette(image_path, photo["id"])
        photo["colorMetrics"] = {
            "method": METHOD_VERSION,
            "colorSpace": "CIELAB D65",
            "clusters": K,
            "resizeMaxPx": RESIZE_MAX,
            "maxSampledPixels": MAX_PIXELS,
            "seed": stable_seed(photo["id"]),
            "maxIterations": MAX_ITERATIONS,
            "sourceSha256": source_hash,
        }
        file_records.append({"id": photo["id"], "path": photo["src"], "sha256": source_hash})

    photos_by_place = {
        place["id"]: [photo for photo in photos if photo["placeId"] == place["id"]]
        for place in places
    }
    for place in places:
        place_photos = photos_by_place[place["id"]]
        place["photoCount"] = len(place_photos)
        place["recordedPalette"] = aggregate_place_palette(place_photos, place["id"])

    for place in places:
        relationships = []
        for other in places:
            if other["id"] == place["id"]:
                continue
            distance, score = palette_comparison(place["recordedPalette"], other["recordedPalette"])
            relationships.append(
                {"placeId": other["id"], "score": score, "weightedDeltaE00": round(distance, 4)}
            )
        relationships.sort(key=lambda item: (-item["score"], item["placeId"]))
        place["similarity"] = relationships

    manifest = {
        "methodVersion": METHOD_VERSION,
        "input": "Repository JPEG source photographs",
        "inputColorAssumption": "JPEG RGB values are treated as sRGB; current files contain no embedded ICC profiles",
        "pixelColorSpace": "CIELAB D65",
        "clustering": "deterministic weighted K-means++",
        "clustersPerPhoto": K,
        "resizeMaxPx": RESIZE_MAX,
        "maxSampledPixels": MAX_PIXELS,
        "baseSeed": BASE_SEED,
        "maxIterations": MAX_ITERATIONS,
        "tolerance": TOLERANCE,
        "displayColor": "Nearest source-image pixel to each CIELAB centroid",
        "placeAggregation": "Equal photo contribution followed by weighted CIELAB K-means",
        "comparison": "Optimal one-to-one CIEDE2000 matching, pair-proportion weighting",
        "displayIndex": "max(0, min(100, round(100 - weightedDeltaE00)))",
        "files": file_records,
    }
    data_js = "window.ATLAS_DATA = " + json.dumps(
        {"places": places, "categories": categories, "photos": photos},
        ensure_ascii=False,
        separators=(",", ":"),
    ) + ";\n"
    return photos, places, manifest, data_js


def serialized_json(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--write", action="store_true", help="Regenerate palettes and data files")
    action.add_argument("--check", action="store_true", help="Verify committed outputs are reproducible")
    args = parser.parse_args()

    photos, places, manifest, data_js = build_outputs()
    outputs = {
        PHOTOS_PATH: serialized_json(photos),
        PLACES_PATH: serialized_json(places),
        MANIFEST_PATH: serialized_json(manifest),
        DATA_JS_PATH: data_js,
    }
    if args.write:
        for path, content in outputs.items():
            path.write_text(content, encoding="utf-8")
        print(f"Wrote {len(photos)} photo palettes and {len(places)} place summaries.")
        return 0

    mismatches = []
    for path, expected in outputs.items():
        if not path.exists() or path.read_text(encoding="utf-8") != expected:
            mismatches.append(str(path.relative_to(ROOT)))
    if mismatches:
        print("Generated outputs differ:", ", ".join(mismatches))
        return 1
    print(f"PASS reproducibility check: {len(photos)} photos, {len(places)} places")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
