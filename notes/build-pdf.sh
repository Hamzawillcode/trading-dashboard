#!/bin/zsh
# Converts every notes/*.md (and PLAN.md) into a PDF in notes/pdf/
# Usage: ./notes/build-pdf.sh
set -e
DIR="${0:A:h}"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for md in "$DIR"/*.md "$DIR/../PLAN.md"; do
  name="${md:t:r}"
  html="$DIR/.build/$name.html"
  pandoc "$md" -s --metadata pagetitle="$name" --css "$DIR/.build/style.css" --self-contained -o "$html"
  "$CHROME" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="$DIR/pdf/$name.pdf" "file://$html" 2>/dev/null
  echo "✓ notes/pdf/$name.pdf"
done
