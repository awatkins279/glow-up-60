# Glow Up 60

A gamified 60-day accountability app for one person: eat more, gain lean muscle, get healthier, clear your skin. Everything lives on your phone. **No account, no login, no server**, works offline.

Built with Expo SDK 57, Expo Router, TypeScript, Zustand (persisted to AsyncStorage), Reanimated, react-native-svg, expo-notifications, expo-background-task.

---

## a) Run it on your iPhone today (Expo Go)

1. Install **Expo Go** from the App Store on your iPhone.
2. On this PC, open a terminal in this folder and run:

```bash
cd "C:\Users\gymki\OneDrive\Documents\VanEpps 6th Grade Espanol\glow-up-60"
```

```bash
npx expo start
```

3. A QR code appears in the terminal. Open the iPhone **Camera** app, point it at the QR code, tap the banner. Expo Go opens the app.
4. Phone and PC must be on the same Wi-Fi. If the QR code does not connect (work networks, Norton firewall), use a tunnel instead:

```bash
npx expo start --tunnel
```

What works in Expo Go on iPhone: the whole app, local scheduled notifications, the background refresh task, haptics, photos, backup export/import. Two limits:

- The app only loads while the dev server on this PC is running. Close the terminal and Expo Go cannot reload it (data on the phone is kept).
- Notifications get the normal "active" priority. The "time-sensitive" priority for the 8 PM injection reminder only applies in a real build.

First launch walks you through 3 onboarding screens: start date + bedtime + injection time, notification permission, then "Day 1 starts now."

---

## b) Install it permanently

All options use EAS Build (Expo's cloud build service, free tier is enough). One-time setup:

```bash
npx eas-cli@latest login
```

```bash
npx eas-cli@latest build:configure
```

The `eas.json` in this folder already defines three profiles: `development`, `preview` (Android APK), `production`.

### iPhone

| Option | Cost | How long it lasts | Needs dev server running? | Notes |
| --- | --- | --- | --- | --- |
| **Expo Go** (above) | Free | As long as the PC server runs | Yes | Fastest. Fine for daily use if the PC stays on. |
| **Development build** | Apple Developer account, $99/yr | 1 year per build (provisioning profile) | Yes for JS updates, but the app itself is a real installed app | Native modules get their real entitlements (time-sensitive notifications). Install over USB/AirDrop from the EAS build page. |
| **TestFlight** | Apple Developer account, $99/yr | 90 days per build, then rebuild + resubmit | No | Closest to a "real" app. Full background behaviour, notifications at full priority, launches with no PC. |

Development build:

```bash
npx eas-cli@latest build --profile development --platform ios
```

Then register your iPhone when prompted (`eas device:create`), install the build from the link EAS gives you, and run `npx expo start` to load the JS.

TestFlight:

```bash
npx eas-cli@latest build --profile production --platform ios
```

```bash
npx eas-cli@latest submit --platform ios
```

Then add yourself as an internal tester in App Store Connect and install from the TestFlight app. You never have to publish to the public App Store.

Simple tradeoff: **Expo Go** is free and instant but tethered to the PC. **TestFlight** costs $99/yr but gives you a real standalone app with reliable background notifications. The development build is the middle ground and is mainly useful if you plan to keep changing the code.

### Android (if you ever switch)

```bash
npx eas-cli@latest build --profile preview --platform android
```

EAS gives you a direct `.apk` download link. Open it on the phone, allow "install from unknown sources", done. No developer account needed, no expiry.

---

## c) Back up your data

Settings → **Export backup** writes one JSON file with everything (items, completions, scores, streak, workouts, check-ins, settings, photo paths) and opens the iOS share sheet. Save it to **Files → iCloud Drive** or AirDrop it to your Mac.

Settings → **Import backup** picks that file and restores it (replaces current data).

Progress photos are stored inside the app's private documents folder. They are not inside the JSON. If you reinstall the app, re-add photos or keep copies in Photos.

Reinstalling or deleting the app wipes its storage, so export first.

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

## Notifications

All reminders are local. Every app open, every check/uncheck and every settings change cancels the schedule and rebuilds the next 7 days from your actual checklist, so a reminder is skipped when everything it mentions is already done. A background task refreshes the 7-day window daily when iOS allows it. iOS caps pending local notifications at 64, so the planner schedules at most 60 and nearest-first.

Settings → Notifications has a toggle and time for each of the 10 reminders. Changing bedtime or injection time in Settings shifts the related reminders and the scoring windows automatically. Settings → **Send test notification** fires one in 3 seconds.

## Development

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

Layout:

- `src/lib/scheduling.ts` – which items are due, quota pips, urgency, rest days
- `src/lib/scoring.ts` – multipliers, bonuses, streak evaluation, levels
- `src/lib/badges.ts` – badge conditions
- `src/lib/foods.ts` – offline food database + natural-language parser
- `src/lib/notificationPlan.ts` – pure 7-day reminder planner; `notifications.ts` talks to expo-notifications
- `src/store/useStore.ts` – persisted state + all actions (complete/undo, nutrition auto-check, workouts, check-ins, backup)
- `src/app/` – screens (Expo Router)
