#!/usr/bin/env bash
# Render public/peeked-mark.svg to extension/assets/icon-{16,48,128}.png.
# rsvg-convert can't resolve CSS variables or `currentColor`, so we substitute
# the brand lime + dark knockout into a tmp SVG first. Color values match
# src/app/icon.tsx so the extension toolbar icon and the favicon share a look.
set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT="$( cd "${SCRIPT_DIR}/.." && pwd )"
SRC="${ROOT}/public/peeked-mark.svg"
OUT_DIR="${ROOT}/extension/assets"
TMP_SVG="$( mktemp -t peeked-mark.XXXXXX.svg )"
trap 'rm -f "${TMP_SVG}"' EXIT

if ! command -v rsvg-convert >/dev/null 2>&1; then
  echo "rsvg-convert not found. Install with: brew install librsvg" >&2
  exit 1
fi

if [ ! -f "${SRC}" ]; then
  echo "Source SVG not found: ${SRC}" >&2
  exit 1
fi

# Brand lime for the rects, dark surface for the slice (matches src/app/icon.tsx).
# Strip XML comments first because the source contains "--mark-knockout" inside
# a comment, which rsvg-convert (a strict XML parser) rejects.
perl -0777 -pe 's/<!--.*?-->//gs' "${SRC}" | sed \
  -e 's/currentColor/#a1ff36/g' \
  -e 's|var(--mark-knockout, #0a0a0c)|#0a0a0c|g' \
  > "${TMP_SVG}"

mkdir -p "${OUT_DIR}"
for size in 16 48 128; do
  rsvg-convert -w "${size}" -h "${size}" "${TMP_SVG}" -o "${OUT_DIR}/icon-${size}.png"
  echo "wrote ${OUT_DIR}/icon-${size}.png (${size}x${size})"
done
