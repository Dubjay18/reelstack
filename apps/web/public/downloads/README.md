# Android APK download

The landing page's "Get Reelstack on Android" banner downloads the APK from a
**GitHub Release asset** — GitHub blocks any git-tracked file over 100 MB, so
the ~106 MB APK can't live in this repo directly (this directory is gitignored
for `*.apk`; a local copy here is only for local dev/testing).

To publish a new build:

1. From `apps/mobile`, run `npm run build:production` (bumps `android.versionCode`
   in `app.config.js` first — required for users to upgrade over an existing install).
2. Download the resulting `.apk` from the EAS build page.
3. Create a new GitHub Release and attach it as an asset, e.g.:
   ```
   gh release create mobile-vX.Y.Z path/to/reelstack.apk \
     --repo Dubjay18/reelstack \
     --title "Reelstack Mobile vX.Y.Z"
   ```
4. Update the fallback URL in `apps/web/app/page.tsx` (`ANDROID_APK_URL`) to the
   new release's asset URL — or set `NEXT_PUBLIC_ANDROID_APK_URL` in the web
   app's environment to override it without a code change.

Current release: https://github.com/Dubjay18/reelstack/releases/tag/mobile-v1.0.0
