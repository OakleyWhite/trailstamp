# Trailstamp

Travel app: trips, day plans, packing and budget, photo challenges around the world, recap cards, a travel map, badges, shared trips with friends and a leaderboard.

- `www/` the app (HTML/JS). `app.js` is the app, `platform.js` connects it to Supabase and the phone, `config.js` holds your Supabase keys.
- `android/` and `ios/` the phone projects (Capacitor).
- `supabase/` database rules (`schema.sql`) and the AI function.
- `docs/` web pages: privacy policy, account deletion, password reset, tester info. Served by GitHub Pages.
- `store-assets/` Play Store icon and feature graphic, App Store icon.
- `keys/` your Android upload key. Private, never committed.

**Start here: `SETUP.md`.** Testers: `TESTERS.md`.

Try it in a browser on your Mac:

```bash
cd ~/Documents/GitHub/trailstamp
npx serve www
```
