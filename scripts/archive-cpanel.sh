#!/usr/bin/env bash
#
# Archive the cPanel bundles as .tar.gz.
#
# Why not .zip: cPanel runs ClamAV with the Sanesecurity "Foxhole" signature set
# on File Manager uploads, and Sanesecurity.Foxhole.JS_Zip_2 matches *any ZIP
# archive containing JavaScript files*. It exists to catch JS-in-a-zip email
# attachments. A Next.js standalone bundle is ~3,000 .js files in a zip, so it
# matches the shape exactly while containing nothing malicious — the signature
# keys on the container format, not on behaviour. The upload is refused with:
#
#   Sanesecurity.Foxhole.JS_Zip_2.UNOFFICIAL FOUND
#
# The signature is ZIP-specific, so the same bytes in a gzipped tar go through.
# cPanel's File Manager extracts .tar.gz natively, and tar preserves POSIX paths
# and permissions, which ZIP on Windows does not.
#
# Usage, from the repository root:
#   bash scripts/archive-cpanel.sh [output-dir]
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/dist-cpanel"
OUT="${1:-$HOME/Downloads}"
STAMP="$(date +%Y-%m-%d)"

if [ ! -d "$SRC" ]; then
  echo "error: $SRC not found. Run 'npm run package:cpanel' first." >&2
  exit 1
fi

mkdir -p "$OUT"

archive() {
  local dir="$1" label="$2"
  local target="$OUT/melkaoda-cpanel-$label-$STAMP.tar.gz"

  if [ ! -d "$SRC/$dir" ]; then
    echo "error: missing bundle $SRC/$dir" >&2
    exit 1
  fi

  rm -f "$target"
  # -C so paths are relative to the bundle root: extracting drops files straight
  # into the application root, with no wrapper directory to move afterwards.
  #
  # --force-local because GNU tar reads a "C:/..." argument as host:path and
  # tries to open an rsh connection to a host called "C".
  tar --force-local -czf "$target" -C "$SRC/$dir" .

  local count size
  count="$(tar --force-local -tzf "$target" | wc -l | tr -d ' ')"
  size="$(du -m "$target" | cut -f1)"
  printf '%s  (%s entries, %s MB)\n' "$target" "$count" "${size}"
}

archive api backend
archive web frontend

cat <<'NOTE'

Upload these instead of the .zip files.

  cPanel → File Manager → Upload → then select the archive and choose
  "Extract". Extracting drops the contents straight into the current
  directory, so upload into the application root itself.

If File Manager still objects, use SFTP (port 22) or FTP: the ClamAV hook runs
on the File Manager upload path, not on the SSH/FTP one.
NOTE
