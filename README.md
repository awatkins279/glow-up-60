# Glow Up 60

A gamified 60-day accountability app for one person: eat more, gain lean muscle, get healthier, clear your skin. **No account, no login, no server.** All data stays on your phone.

It runs as an installable offline web app (PWA), built with Expo SDK 58 / Expo Router / React Native Web, Zustand persisted to IndexedDB, Reanimated, react-native-svg.

---

## Use it on your phone

**Live site:** https://awatkins279.github.io/glow-up-60/

1. Open that link in Safari on your iPhone.
2. Tap the **Share** button, then **Add to Home Screen**, then **Add**.
3. Open "Glow Up" from your home screen. From now on it opens full-screen like an app, loads with no connection, and keeps your progress on the phone.
4. In Settings → Privacy, **set a 4-digit PIN** so nobody else can open it.

Notes:

- The first open needs a connection (about 10 MB). After that it works fully offline.
- Progress is stored in the browser's IndexedDB on that device. It survives closing the app and restarting the phone. Clearing Safari website data, or deleting the home-screen icon, erases it, so use Settings → **Export backup** now and then.
- Reminders on the web can only fire while the app is open on screen (no server means no push). The in-app checklist, timing windows and scoring all work regardless.
- The link is public but useless to anyone else: the app shows an empty program on their device, and the PIN blocks them on yours.

## Back up your data

Settings → **Export backup** downloads one JSON file with everything (items, completions, scores, streak, workouts, check-ins, custom foods, photos). On iPhone it goes to Files. Settings → **Import backup** restores it, on the same phone or a new one.

---

## How the scoring works

```
points = base × streak × timing × combo   (rounded)
```

- **Streak**: +0.1x per consecutive day with ≥80% of items done, cap 3.0x. Miss a day and it resets, unless you hold a Streak Freeze (earned every 7 streak days, max 2, auto-used).
- **Timing**: night injections within ±30 min of your injection time = 1.5x. Bedtime items more than 15 min before bedtime = 1.25x. Morning items before 10 AM = 1.25x. Anything after bedtime = 0.5x.
- **Combo**: each task within 10 minutes of the previous one adds +0.25x, cap 2.0x.
- **Bonuses** (× streak): Perfect Day +100, Perfect Night +50, Weekly Quest +300, Weekly Check-in +150.
- **Levels** on total score: Rookie 0 → Grinder 1,500 → Locked In 5,000 → Disciplined 10,000 → Glow Mode 18,000 → Main Character 30,000.

The day rolls over at **4:00 AM**, so a bedtime item logged at 12:30 AM still counts for the evening you meant (at the 0.5x past-bedtime rate).

## Food logging

Fuel tab → **Log food**. Type what you ate in plain words and the app works out calories and protein from a built-in offline food database (about 65 common foods with cup / gram / oz / tbsp / scoop / slice / piece conversions):

- `2 cups of full fat greek yogurt` → 475 kcal, 44 g protein
- `3 eggs`, `200g chicken breast`, `1/2 cup oats`, `two slices of bread`, `a banana`
- `protein shake` → logs the shake **and** checks off the Daily protein shake item

If a food is not in the database, save it once under **Custom foods** (name + calories + protein per serving) and from then on type `2 mom's lasagna`. The quick-add buttons (+25g protein, +250 cal, water) still work for rough entries.

## Workouts

Three rotating templates built for a chest bench, ab bench, dumbbells and kettlebells: Day A chest + shoulders, Day B legs + back, Day C arms + core. Edit any exercise in Settings → Workout templates. Finishing a session auto-checks the Workout item.

## Weekly items

Weeks run Monday–Sunday. A "3x / week" item stays on Today until done 3 times, then collapses into "Done this week". When days left in the week ≤ remaining count it turns red: **MUST DO TODAY**. Items with "no back-to-back" on (Workout, Tretinoin, Glutathione, Melanotan 2) hide the day after a completion unless skipping would make the quota unreachable. You can pin fixed weekdays per item in Settings → Items.

---

## Development

```bash
npm install --legacy-peer-deps
```

```bash
npx expo start --web
```

```bash
npm test
```

```bash
npm run typecheck
```

```bash
npm run lint
```

Unit tests (47) cover the scheduling engine (quota math, week rollover, urgency, no-back-to-back, fixed weekdays), the scoring engine (all multipliers, bonuses, streak + freezes, levels, perfect day/night) and the food parser.

### Deploying a new version

```bash
npm run build:web:pages
```

That runs `scripts/build-web.mjs --base /glow-up-60`: an Expo web export, PWA tags injected into `index.html`, a generated `sw.js` that precaches every file, and a `404.html` fallback for deep links. Then publish the `dist/` folder to the `gh-pages` branch:

```bash
git worktree add --detach ../glow-up-60-pages && cd ../glow-up-60-pages && git checkout --orphan gh-pages-tmp && git rm -rfq . ; cp -r ../glow-up-60/dist/. . && touch .nojekyll && git add -A && git commit -m "Deploy" && git push -f origin gh-pages-tmp:gh-pages && cd ../glow-up-60 && git worktree remove --force ../glow-up-60-pages
```

Installed copies pick up the new version the next time they open with a connection (the service worker swaps caches by version).

### Native build (optional)

The same code still runs as a native iOS/Android app through Expo. The `eas.json` profiles are kept for that; a TestFlight build needs an Apple Developer account.

### Layout

- `src/lib/scheduling.ts` – which items are due, quota pips, urgency, rest days
- `src/lib/scoring.ts` – multipliers, bonuses, streak evaluation, levels
- `src/lib/badges.ts` – badge conditions
- `src/lib/foods.ts` – offline food database + natural-language parser
- `src/lib/notificationPlan.ts` – pure 7-day reminder planner; `notifications.ts` (native) / `notifications.web.ts` (browser timers)
- `src/lib/photos.web.ts`, `backup.web.ts` – browser versions of photo storage and backup
- `src/store/useStore.ts` – persisted state + all actions; `storage.ts` picks IndexedDB on web
- `src/components/LockScreen.tsx` – PIN lock
- `src/app/` – screens (Expo Router)
- `scripts/build-web.mjs` – PWA build
