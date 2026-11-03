#!/bin/sh
# Rebuilds the "preview" branch: only the website files, marked noindex.
# Plesk (preview.consultnamu.com) pulls this branch automatically.
set -e
./make-preview.sh >/dev/null
WT=$(mktemp -d)
git fetch -q origin preview 2>/dev/null || true
if git ls-remote --exit-code --heads origin preview >/dev/null 2>&1; then
  git worktree add -q -B preview "$WT" origin/preview
else
  git worktree add -q --detach "$WT"
  (cd "$WT" && git checkout -q --orphan preview)
fi
(cd "$WT" && git rm -rqf . >/dev/null 2>&1 || true)
unzip -qo dist/consultnamu-preview.zip -d "$WT"
SRC=$(git rev-parse --short HEAD)
(cd "$WT" && git add -A && git commit -qm "Preview build from $SRC" && git push -q -u origin preview) || echo "No changes to publish"
git worktree remove --force "$WT"
echo "preview branch updated from $SRC"
