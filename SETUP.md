# Waypoint: get the Android test build to your testers

About 1 hour of clicking, plus Google's account verification wait.
Do the steps in order. Everything is in this folder: `~/Documents/GitHub/waypoint-app`.

---

## 1. Backend (Supabase), about 15 minutes

1. Go to https://supabase.com, sign in with GitHub, click **New project**.
   Name it `waypoint`, pick a US region, save the database password somewhere safe.
2. Left sidebar **SQL Editor** > **New query**. Paste all of `supabase/schema.sql`, click **Run**. It should say "Success".
3. **Authentication > Sign In / Providers > Email**: turn **Confirm email OFF** for testing.
   Supabase's built-in email only sends a few emails per hour, so with 12+ testers signing up, confirmations would get stuck.
   (Before public launch, turn it back on and add a real email sender under **Authentication > Emails > SMTP**, for example Resend.)
4. **Authentication > URL Configuration**:
   - Site URL: `https://oakleywhite.github.io/waypoint-app/`
   - Redirect URLs: add `https://oakleywhite.github.io/waypoint-app/reset.html`
5. **Project Settings > API** (or the **Connect** button): copy the **Project URL** and the **anon / publishable key**.
   Paste them into **both**:
   - `www/config.js` (`supabaseUrl`, `supabaseAnonKey`)
   - `docs/reset.html` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`)

### AI features (Plan with AI, Suggest items, Make challenges)

Get an API key at https://console.anthropic.com (Settings > API keys). Add a few dollars of credit.
Then in Terminal on your Mac:

```bash
brew install supabase/tap/supabase
cd ~/Documents/GitHub/waypoint-app
supabase login
supabase link --project-ref YOUR_PROJECT_REF      # the id in your Supabase URL: https://YOUR_PROJECT_REF.supabase.co
supabase secrets set ANTHROPIC_API_KEY=sk-ant-PASTE-YOUR-KEY
supabase functions deploy ai
```

Each person gets 25 AI requests per day. Change it with `supabase secrets set AI_DAILY_LIMIT=50`.
The app works without this step. The AI buttons just show an error until it's done.

---

## 2. GitHub, about 10 minutes

1. Open **GitHub Desktop** > **File > Add Local Repository** > choose `Documents/GitHub/waypoint-app`.
   It will offer to **create a repository** here. Do that, then click **Publish repository**.
   Uncheck **Keep this code private**: free GitHub Pages (your privacy page) needs a public repo.
   Your signing key is in `keys/`, which is blocked from ever uploading.
2. On github.com, open the repo > **Settings > Secrets and variables > Actions > New repository secret**.
   Add the 3 secrets listed in `keys/README-KEEP-SAFE.txt` (names and values are in that file).
3. **Settings > Pages**: Source **Deploy from a branch**, Branch **main**, folder **/docs**, **Save**.
   In a minute your pages are live at `https://oakleywhite.github.io/waypoint-app/`.
4. Replace `SUPPORT_EMAIL` in `docs/privacy.html`, `docs/terms.html` and `docs/delete-account.html` with the email testers and Google should contact. Commit and push in GitHub Desktop.

**Build the app file:** repo > **Actions** > **Build Android** > **Run workflow**.
It takes about 8 minutes. When it's green, open the run and download **waypoint-aab**.
Unzip it to get `app-release.aab`. That's the file you upload to Google Play.
Every time you change the app: commit, push, run the workflow again. Version numbers go up automatically.

---

## 3. Google Play Console

1. https://play.google.com/console > create a **personal** developer account ($25, one time).
   Google verifies your identity. This can take a few days, so start it first.
2. **Create app**: name `Waypoint: Travel Quests`, language English (US), **App**, **Free**. Accept the declarations.
3. **Test and release > Testing > Closed testing** > **Create track** (or use "Alpha").
   - **Testers** tab > **Create email list** named `Waypoint testers` > paste your testers' Gmail addresses > Save.
   - You need **at least 12 testers opted in for 14 days in a row** before you can apply for production. Invite 15–20 so a few dropping out doesn't reset you.
   - Copy the **opt-in link** ("Join on the web"). You'll send it to testers.
4. **Create new release** > upload `app-release.aab` > let Google manage the app signing key (Play App Signing) > release name `0.1.0` > release notes `First test build` > **Next** > **Save and publish**.
5. Finish every item under **Dashboard > Set up your app**. Answers for Waypoint:
   - **Privacy policy:** `https://oakleywhite.github.io/waypoint-app/privacy.html`
   - **App access:** "All or some functionality is restricted". Create a reviewer account in the app first (e.g. `playreview@` + your domain), and give Google that email and password.
   - **Ads:** No ads.
   - **Content rating:** fill in the questionnaire. Say yes to "users can interact / share content" (shared trips, leaderboard).
   - **Target audience:** 13 and over (18+ is simplest).
   - **Data safety:** collected: email address, name, user IDs, photos, other user-generated content (trips, notes), app interactions (challenge progress, leaderboard), crash logs and diagnostics. Location is used only on the device and isn't sent to the server, so it is not "collected". All data is encrypted in transit. People can request deletion.
   - **Delete account URL:** `https://oakleywhite.github.io/waypoint-app/delete-account.html`
   - **Store listing:** all text is in `store-assets/LISTING.md`. Icon `store-assets/play-icon-512.png`, feature graphic `store-assets/play-feature-graphic-1024x500.png`, screenshots `store-assets/screenshots/play-phone-*.png`.
6. Send testers the message in `TESTERS.md` with your opt-in link.
7. After 14 days with 12+ testers: **Dashboard > Apply for production**. Google asks what you tested and what changed; your feedback inbox helps answer that.

## Where tester feedback shows up

Supabase > **Table Editor**:
- **feedback**: messages from Passport > Send feedback
- **reports**: reported photos (check daily; stores expect action within 24 hours)
- **app_errors**: crashes and errors from testers' phones, with app version and device type

---

## 4. iPhone (App Store), when you're ready

The iPhone project is already in `ios/` with the icon, launch screen and permission messages set.

1. Enroll at https://developer.apple.com/programs ($99/year).
2. Install **Xcode** from the Mac App Store.
3. In Terminal:
   ```bash
   cd ~/Documents/GitHub/waypoint-app
   npm install
   npx cap sync ios
   npx cap open ios
   ```
4. In Xcode: click **App** in the left sidebar > **Signing & Capabilities** > Team: pick your Apple developer team.
   Plug in your iPhone, pick it at the top, press **▶** to run it on your phone.
5. To send it to TestFlight: **Product > Archive** > **Distribute App** > **App Store Connect** > Upload.
6. In https://appstoreconnect.apple.com create the app (bundle ID `com.oakleywhite.waypoint`), paste the text from `store-assets/LISTING.md`, upload `store-assets/screenshots/iphone-6.9-*` and `iphone-6.5-*`, then submit for review.
