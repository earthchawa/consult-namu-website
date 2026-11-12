#!/bin/sh
# Builds two zips from this folder:
#   dist/consultnamu-preview.zip  -> for preview.consultnamu.com (hidden from Google)
#   dist/consultnamu-live.zip     -> for consultnamu.com when the client approves
set -e
FILES="index.html about.html how-we-work.html samy.html samy.vcf styles.css interactions.js globe.js globe-land.js vendor/three.min.js assets/samy.jpeg assets/favicon.png assets/social-cover.png assets/wechat-qr.png assets/how-hero.jpg"
mkdir -p dist
TMP=$(mktemp -d)
for f in $FILES robots.txt sitemap.xml; do mkdir -p "$TMP/live/$(dirname $f)" "$TMP/preview/$(dirname $f)"; cp "$f" "$TMP/live/$f"; done
for f in $FILES; do cp "$f" "$TMP/preview/$f"; done
# Version stamp on styles.css and the scripts, so browsers fetch the new copy after every update
V=$(git rev-parse --short HEAD 2>/dev/null || date +%s)
for d in live preview; do
  sed -i -E 's#(href|src)="([a-z/.-]+\.(css|js))"#\1="\2?v='"$V"'"#g' "$TMP/$d"/*.html
done
# Preview: tell search engines not to index anything
sed -i 's#<meta name="robots" content="index, follow">#<meta name="robots" content="noindex, nofollow">#' "$TMP/preview/"*.html
printf 'User-agent: *\nAllow: /\n' > "$TMP/preview/robots.txt"  # let crawlers read the noindex tag
(cd "$TMP/preview" && zip -qr - .) > dist/consultnamu-preview.zip
(cd "$TMP/live" && zip -qr - .) > dist/consultnamu-live.zip
echo "Built dist/consultnamu-preview.zip and dist/consultnamu-live.zip"
