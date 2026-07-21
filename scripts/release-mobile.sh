#!/usr/bin/env bash
# Build a production Android APK via EAS, publish it as a GitHub Release
# asset, and point the web landing page's download banner at it.
#
# Usage:
#   scripts/release-mobile.sh [VERSION]
#
# VERSION defaults to an auto-bumped patch version (e.g. 1.0.0 -> 1.0.1).
# android.versionCode in apps/mobile/app.config.js is always incremented by 1
# — Android refuses to let users upgrade over an existing install otherwise.
#
# Requires: eas-cli (logged in), gh (authenticated), jq, curl.
# Does NOT commit or push — review the diff and commit yourself.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOBILE_DIR="$ROOT_DIR/apps/mobile"
WEB_PAGE="$ROOT_DIR/apps/web/app/page.tsx"
APK_DEST="$ROOT_DIR/apps/web/public/downloads/reelstack.apk"

log() { printf '\n▸ %s\n' "$1"; }
die() { printf '\n✖ %s\n' "$1" >&2; exit 1; }

command -v jq >/dev/null || die "jq is required but not found"
command -v gh >/dev/null || die "gh is required but not found"
gh auth status >/dev/null 2>&1 || die "gh is not authenticated — run 'gh auth login'"

CURRENT_VERSION=$(jq -r '.version' "$MOBILE_DIR/package.json")
CURRENT_VERSION_CODE=$(grep -oP 'versionCode:\s*\K\d+' "$MOBILE_DIR/app.config.js") \
  || die "Could not find android.versionCode in app.config.js"
NEW_VERSION_CODE=$((CURRENT_VERSION_CODE + 1))

if [ "${1:-}" != "" ]; then
  NEW_VERSION="$1"
else
  # Auto-bump patch: 1.0.0 -> 1.0.1
  NEW_VERSION=$(awk -F. -v OFS=. '{ $NF += 1; print }' <<< "$CURRENT_VERSION")
fi

REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
TAG="mobile-v${NEW_VERSION}"

log "Releasing Reelstack Mobile ${CURRENT_VERSION} (code ${CURRENT_VERSION_CODE}) -> ${NEW_VERSION} (code ${NEW_VERSION_CODE})"

if gh release view "$TAG" --repo "$REPO" >/dev/null 2>&1; then
  die "Release $TAG already exists on $REPO — bump the version or delete the existing release first"
fi

log "Bumping version/versionCode"
sed -i "s/\"version\": \"${CURRENT_VERSION}\"/\"version\": \"${NEW_VERSION}\"/" "$MOBILE_DIR/package.json"
sed -i "s/version: \"${CURRENT_VERSION}\"/version: \"${NEW_VERSION}\"/" "$MOBILE_DIR/app.config.js"
sed -i "s/versionCode: ${CURRENT_VERSION_CODE}/versionCode: ${NEW_VERSION_CODE}/" "$MOBILE_DIR/app.config.js"

log "Starting EAS build (profile: production-apk)"
cd "$MOBILE_DIR"
BUILD_OUTPUT=$(eas build --platform android --profile production-apk --non-interactive --no-wait 2>&1) \
  || { echo "$BUILD_OUTPUT"; die "eas build failed to start"; }
echo "$BUILD_OUTPUT"

BUILD_ID=$(grep -oP 'builds/\K[0-9a-f-]{36}' <<< "$BUILD_OUTPUT" | head -1)
[ -n "$BUILD_ID" ] || die "Could not parse build ID from eas output"

log "Waiting for build $BUILD_ID to finish (this can take 10-30+ minutes)"
BUILD_JSON=""
while true; do
  BUILD_JSON=$(eas build:view "$BUILD_ID" --json 2>/dev/null)
  STATUS=$(jq -r '.status' <<< "$BUILD_JSON")
  case "$STATUS" in
    FINISHED) break ;;
    ERRORED|CANCELED)
      OWNER=$(jq -r '.project.ownerAccount.name' <<< "$BUILD_JSON")
      die "Build ended with status $STATUS — see https://expo.dev/accounts/${OWNER}/projects/reelstack-mobile/builds/${BUILD_ID}"
      ;;
    *) echo "  status: $STATUS ..."; sleep 30 ;;
  esac
done

ARTIFACT_URL=$(jq -r '.artifacts.applicationArchiveUrl' <<< "$BUILD_JSON")
[ -n "$ARTIFACT_URL" ] && [ "$ARTIFACT_URL" != "null" ] || die "Build finished but no artifact URL was returned"

log "Downloading built APK"
curl -fL -o "$APK_DEST" "$ARTIFACT_URL" --progress-bar

log "Publishing GitHub Release $TAG"
gh release create "$TAG" "$APK_DEST" \
  --repo "$REPO" \
  --title "Reelstack Mobile v${NEW_VERSION}" \
  --notes "Android APK build (production-apk EAS profile, versionCode ${NEW_VERSION_CODE})."

ASSET_URL=$(gh release view "$TAG" --repo "$REPO" --json assets -q '.assets[0].url')
[ -n "$ASSET_URL" ] || die "Release created but could not resolve the asset URL"

log "Wiring web download banner to $ASSET_URL"
sed -i "s#https://github.com/[^']*/releases/download/[^']*reelstack\.apk#${ASSET_URL}#" "$WEB_PAGE"

log "Done. Review the diff (app.config.js, package.json, page.tsx) and commit/push when ready."
echo "Release: https://github.com/${REPO}/releases/tag/${TAG}"
