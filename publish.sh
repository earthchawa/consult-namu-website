#!/bin/sh
# Publishes the website files to a deploy branch that Plesk pulls from.
#   ./publish.sh preview   -> branch "preview" -> preview.consultnamu.com (noindex)
#   ./publish.sh live      -> branch "live"    -> consultnamu.com  (only when the client approves)
set -e
TARGET="$1"
case "$TARGET" in
  preview) ZIP=dist/consultnamu-preview.zip ;;
  live)    ZIP=dist/consultnamu-live.zip ;;
  *) echo "Usage: ./publish.sh preview|live"; exit 1 ;;
esac
./make-preview.sh >/dev/null
WT=$(mktemp -d)
if git ls-remote --exit-code --heads origin "$TARGET" >/dev/null 2>&1; then
  git fetch -q origin "$TARGET:refs/remotes/origin/$TARGET"
  git worktree add -q -B "$TARGET" "$WT" "origin/$TARGET"
else
  git worktree add -q --detach "$WT"
  (cd "$WT" && git checkout -q --orphan "$TARGET")
fi
(cd "$WT" && git rm -rqf . >/dev/null 2>&1 || true)
unzip -qo "$ZIP" -d "$WT"
SRC=$(git rev-parse --short HEAD)
(cd "$WT" && git add -A && git commit -qm "$TARGET build from $SRC" && git push -q -u origin "$TARGET") || echo "No changes to publish"
git worktree remove --force "$WT"
git branch -D "$TARGET" >/dev/null 2>&1 || true
echo "$TARGET branch updated from $SRC"
