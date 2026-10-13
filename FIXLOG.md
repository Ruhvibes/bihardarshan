# Bihar Darshan — build log (Hasnain Khan's 11th app)

## 2026-10-13 — v1 (versionCode 1, versionName "1.0")
- Scaffolded from RuhLife template: WebView + Three.js r128, package `com.bihardarshan.app`.
- Signed with persistent Ruhvibes keystore (CN=Hasnain, OU=Ruhvibes) — apksigner verified.
- Fixed during build: missing `android/gradle.properties` (added `android.useAndroidX=true`),
  stale RuhLife APK in copied build dir (cleaned), `Theme.RuhLife` → `Theme.BiharDarshan`
  (case-sensitive sed miss), CA cert rotation after VM restart, /root/.gradle wipe (restored from backup).

## Content (all bilingual HI/EN, formal Hindi)
- **23 places**: Nalanda, Bodh Gaya, Rajgir (premium), Vaishali, Patna, Sonepur Mela,
  Vikramshila, Pawapuri, Kesaria, Sasaram (expanded Sher Shah Suri), Madhubani, Chhath Puja,
  Bihar Sharif, Maner Sharif, Pathar ki Masjid, Barabar Caves, Lauria Nandangarh, Kakolat Falls,
  Valmiki National Park, Dr. Rajendra Prasad, Jayaprakash Narayan, Sita Kund, Sama-Chakeva.
- 460 facts (10 HI + 10 EN per place), ~8,326 Hindi + ~7,825 English story words.
- Rajgir premium: 500-word stories, 6 gallery images, enriched 3D scene
  (ropeway with moving cars, Griddhakuta, Saptaparni caves, Bimbisara's jail,
  Jarasandh akhada, Brahmakund with steam, Maniyar Math).
- Data merge: places.js + places-islamic.js + places-extra.js + places-rajgir.js
  (later files override by id — sasaram & rajgir replaced with richer versions).

## Media (bundled, offline-first)
- 50 AI images (2 per place, Rajgir 6), compressed to ≤1280px/q82 → 13MB.
- 6 video clips (hero-montage, chhath, nalanda, bodhgaya, kakolat, valmiki) → 50MB.
- APK total: ~65MB.

## 3D (procedural Three.js, no external assets)
- 23 scenes: stupas, shikharas, domes, minarets, ghats, waterfall (animated),
  ropeway (animated cars), steam particles, day/night toggle, auto-rotate,
  custom touch orbit + pinch zoom.
- Headless test: 15/15 scenes render, 0 JS errors.

## App QA (headless, mobile 400px)
- Home: 23 cards + 6 videos render; search filters; HI/EN toggle; favorites ♡ + filter.
- Detail: 4 tabs (3D/Story/Facts/Gallery); gallery lightbox; back navigation.
- 0 JS errors across full flow.

## Not done (parent)
- GitHub repo + release upload (parent handles).
- On-phone verification pending (3D perf, video playback, WebView file access).
