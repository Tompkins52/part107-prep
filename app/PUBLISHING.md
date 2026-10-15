# Publishing Part 107 Prep to the App Store and Google Play

This is the full path from this folder to a live listing on both stores, written for a first release. Checked against Apple, Google, and Capacitor documentation in October 2026; both stores change their forms often, so expect small differences in wording.

The app is built with Capacitor 8: a native iOS and Android shell around the web app in `www/`. All user progress is stored on the device through the Preferences plugin. There is no server, no account system, no analytics, and no advertising, which makes the store privacy forms short.

## 0. What you need

| Item | Cost | Notes |
| --- | --- | --- |
| A Mac with Xcode 16 or newer | Free (Mac required) | iOS builds can only be made on macOS. If you do not have a Mac, see "No Mac?" at the end. |
| Android Studio (latest stable) | Free | Windows, macOS, or Linux. Installs the Android SDK and the JDK for you. |
| Node.js 22 or newer | Free | nodejs.org |
| Apple Developer Program | $99 per year | developer.apple.com/programs |
| Google Play Console account | $25 one time | play.google.com/console |
| D-U-N-S number for the LLC | Free | Required by both stores for an organization account. dnb.com; allow up to 30 days, usually faster. |
| A domain and basic website for the LLC | Domain cost only | Apple requires an organization's enrollment email to be on the company's domain and a working public website on that domain. Google requires website verification for new organization accounts. |
| A privacy policy URL | Free | Already published: https://tompkins52.github.io/part107-prep/privacy.html |

### Organization account or personal account?

You can enroll either way. The trade-offs that matter for this app:

- **Organization (Tompkins Software Systems LLC):** the seller name on both stores is the LLC. Needs the D-U-N-S number, the LLC to be officially formed, a company-domain email, and a website on that domain. Google Play organization accounts are exempt from the new-account closed-testing requirement. Google displays the organization's legal name and address on the store listing, so if the LLC's registered address is your home address, that address becomes public. A virtual business address or registered agent address solves that; set it up before creating the Google Play account.
- **Personal:** faster (no D-U-N-S, no website), but the seller name is your own name, and new personal Google Play accounts must run a closed test with at least 12 testers opted in for 14 continuous days before they can publish to production. Google also verifies and may display your name and, for monetizing developers, address.

For a free app under the LLC the organization route is the better fit. The sequence is: LLC approved by the state, then D-U-N-S, then domain and website, then both developer accounts.

## 1. Build the app locally

```bash
cd app
npm install
npm run build        # pulls the study content and question bank from the website into www/
npx cap sync         # copies www/ into android/ and ios/ and updates plugins
```

Run `npm run build` and `npx cap sync` again any time the website content or question bank changes. The generated folders `android/app/src/main/assets/public` and `ios/App/App/public` are not committed to git; `cap sync` recreates them.

To try the app in a desktop browser first: `npm run serve` and open http://localhost:8080 with the browser's device toolbar set to a phone.

## 2. Android

### Build and run on a device

1. `npx cap open android` opens the project in Android Studio. Let it finish the Gradle sync (first time takes several minutes).
2. Plug in an Android phone with USB debugging on, or create an emulator (Tools, Device Manager). Press Run.
3. Walk through the app: welcome screen, mark a step done, finish a quick check, force-quit the app, reopen it, and confirm the progress is still there.

### Signing key (do this once, keep it forever)

Google Play App Signing manages the key that signs what users download, but you still need an upload key.

1. In Android Studio: Build, Generate Signed App Bundle / APK, choose Android App Bundle, Create new keystore.
2. Save the keystore file outside the repository (for example `~/keys/part107-upload.jks`), choose a strong password, alias `upload`, validity 25 years or more.
3. Back up the keystore and passwords in a password manager. If you lose the upload key you can request a reset from Google, but it is a slow process.
4. Never commit the keystore to git.

### Create the release bundle

1. Set the version in `android/app/build.gradle`: `versionCode 1` (increase by 1 on every upload) and `versionName "1.0.0"`.
2. Build, Generate Signed App Bundle, select the keystore, choose `release`. The `.aab` file lands in `android/app/release/`.

### Google Play Console

1. Create the developer account at play.google.com/console ($25). Complete identity verification (organization: D-U-N-S, official organization document, government ID of the account owner, website verification, phone verification).
2. Create app: name "Part 107 Prep", default language English (United States), App, Free. A free app cannot later be changed to paid.
3. Work through the **Dashboard** tasks under "Set up your app":
   - **App access:** All functionality is available without special access (there is no login).
   - **Ads:** No, the app does not contain ads.
   - **Content rating:** fill in the IARC questionnaire; it is an education/reference app, expect "Everyone".
   - **Target audience:** 18 and over (or 16 and over). Do not select under-13 age groups; that triggers the Families policy.
   - **News app:** No.
   - **Data safety:** "Does your app collect or share any of the required user data types?" No. The app stores progress only on the device and never transmits it. Say data is not collected and not shared. Encryption in transit and deletion questions will not apply. The optional daily reminder is a local notification scheduled by the phone itself, which is not data collection.
   - **Permissions:** the notifications plugin declares POST_NOTIFICATIONS (asked only when the user turns reminders on). The manifest removes SCHEDULE_EXACT_ALARM because a daily reminder does not need exact timing, so no special-permission justification is needed.
   - **Government apps:** No. **Financial features:** none. **Health:** none.
   - **Privacy policy:** https://tompkins52.github.io/part107-prep/privacy.html
   - **App category:** Education. Tags: Education, Test preparation.
   - **Store listing:** see the text in section 4 below. Required art: app icon 512 x 512 PNG (use `resources/icon-only.png` scaled; Android Studio or any image tool), feature graphic 1024 x 500, at least two phone screenshots (take them from the emulator at 1080 x 1920 or larger), and optionally 7 inch and 10 inch tablet screenshots.
4. **Testing first:** Release, Testing, Internal testing. Create a release, upload the `.aab`, add your own Gmail address as a tester, and install it from the test link. This catches signing and manifest problems without a public release.
5. **Production:** Release, Production, Create new release, upload the same `.aab` (or promote the internal one), choose countries (all), review, and roll out. First reviews take from a few hours to about a week.

Organization accounts can go straight to production after internal testing. Personal accounts must first complete the closed-testing requirement (12 testers, 14 days) and then apply for production access from the dashboard.

### Keep in mind for updates

Google requires new apps and updates to target Android 16 (API 36) since August 31, 2026. This project already targets 36 (`android/variables.gradle`). When Capacitor or Google raises the bar, update `targetSdkVersion` and `compileSdkVersion` there.

## 3. iOS

### Build and run on a device

1. On the Mac: `npx cap open ios` opens `ios/App/App.xcworkspace` (or the `.xcodeproj`; Capacitor 8 uses Swift Package Manager, so there is no CocoaPods step).
2. In Xcode select the App target, Signing and Capabilities, tick "Automatically manage signing" and choose your team (your Apple Developer account). The bundle identifier is already `com.tompkinssoftwaresystems.part107prep`.
3. Plug in an iPhone, select it as the run destination, press Run. The first time, approve the developer certificate on the phone under Settings, General, VPN and Device Management.
4. Test the same flow as on Android, including force-quit and reopen.

### App Store Connect record

1. Enroll at developer.apple.com (organization: D-U-N-S number, legal entity, authority to sign, company-domain email, public website). Apple verifies by phone; allow a week or two.
2. In App Store Connect (appstoreconnect.apple.com), My Apps, plus, New App: iOS, name "Part 107 Prep", primary language English (U.S.), bundle ID from the list (register it first at developer.apple.com, Identifiers, if it is not there), SKU `part107prep`.
3. **App Information:** category Education, secondary category Reference. Content rights: no third-party content requiring rights. Age rating: answer the questionnaire; expect 4+.
4. **App Privacy:** choose "Data Not Collected". Because nothing leaves the device, every data type is "not collected". The privacy policy URL is required anyway: https://tompkins52.github.io/part107-prep/privacy.html
5. **Pricing and Availability:** Free, all territories.
6. **App Store listing** for version 1.0: screenshots (6.9 inch iPhone set required; 6.5 inch and 12.9 inch iPad sets recommended; take them from the Simulator with Cmd+S), description, keywords, support URL (the website), marketing URL (optional). Text is in section 4.
7. **Export compliance:** the app uses no custom encryption. `ITSAppUsesNonExemptEncryption` is set to false in `Info.plist`, so Xcode uploads will not ask every time.

### Upload the build

1. In Xcode set the version (1.0.0) and build number (1) on the App target, General tab. Increase the build number for every upload.
2. Select "Any iOS Device (arm64)" as the destination, then Product, Archive.
3. In the Organizer window, Distribute App, App Store Connect, Upload. Xcode signs and uploads.
4. In App Store Connect the build appears under TestFlight after processing (10 to 30 minutes). Install it on your phone through the TestFlight app and test once more.
5. Attach the build to version 1.0 on the App Store tab, fill in "What's new" and the review notes (see below), and Submit for Review. First reviews usually take one to three days.

### Review notes to include

Reviewers reject apps they cannot understand quickly. Put this in the "Notes" field for App Review:

> Part 107 Prep is a study app for the FAA remote pilot (drone) knowledge test. No account or login is needed. All progress is stored only on the device using local app storage; there is no server. To test: tap "Commit to my goal" on the welcome screen (name and date are optional), open Exam, choose Quick check, answer the 20 questions, and view the scored results. The Path tab is a checklist of the FAA certification steps with costs; the Study tab holds the reading material and flashcards; Home shows the daily goal, streak, plan, and question of the day; More has settings (including an optional local daily reminder), backup, and the privacy policy. Sounds are short synthesized tones and can be turned off in Settings.

Apple guideline 4.2 (minimum functionality) is the one to be ready for with any web-based app. This app has native-feeling navigation, works fully offline, tracks progress on the device, and does much more than show a website, which is what that guideline is about. If a reviewer still asks, reply with the paragraph above.

## 4. Store listing text

**Name:** Part 107 Prep

**Subtitle (Apple, 30 characters):** FAA drone pilot test prep

**Short description (Google, 80 characters):** Study for the FAA Part 107 drone license. Practice exams, scored on your phone.

**Full description:**

> Pass the FAA Part 107 knowledge test and get your remote pilot certificate.
>
> Part 107 Prep is a complete, free study app for the commercial drone license. It walks you through every step of certification, teaches the material the FAA tests, and scores timed practice exams the way the real test does. Your progress stays on your phone.
>
> THE PATH: a step-by-step checklist from your FAA Tracking Number to the card in the mail: IACRA, scheduling with PSI, test day, the application, TSA vetting, registration, Remote ID, and staying current with free recurrent training.
>
> STUDY: five modules matched to the FAA's knowledge areas: regulations, airspace and sectional chart reading, weather, loading and performance, and operations. Plus a section-by-section Part 107 cheat sheet, a safety guide with a preflight checklist, and official FAA links.
>
> PRACTICE EXAMS: more than 200 original questions with explanations and references. Full 60-question timed exams weighted like the real test, 20-question quick checks, topic quizzes, and a weak-spots mode that drills what you have missed. Every attempt gets a score, a pass/fail verdict at 70 percent, and a breakdown by category. Your place is saved automatically, so a phone call never costs you a test.
>
> BUILT TO STICK: a daily goal you choose, a streak with freeze days, a plan for each day, a question of the day, spaced review that brings back what you missed on the right day, 138 flashcards for the numbers and codes, achievements for real milestones, and an optional daily reminder.
>
> YOUR PROGRESS, ON YOUR PHONE: readiness estimate, score trends, accuracy by category, topics to review, and a countdown to your test date. No account, no sign-in, no server, no ads. Nothing you enter ever leaves your device. A backup code lets you move your progress to a new phone yourself.
>
> Part 107 Prep is an independent study resource and is not affiliated with or endorsed by the FAA. Always confirm current rules with the FAA before you fly.

**Keywords (Apple, 100 characters):** part 107,drone,FAA,remote pilot,UAS,drone license,test prep,practice exam,sectional,airspace

**Category:** Education (secondary: Reference)

**Support URL:** https://tompkins52.github.io/part107-prep/

**Privacy policy URL:** https://tompkins52.github.io/part107-prep/privacy.html

## 5. Releasing updates

1. Edit content on the website (or `bank.js` for questions), then in `app/`: `npm run build && npx cap sync`.
2. Bump `versionName`/`versionCode` (Android) and version/build (Xcode). Change `APP_VERSION` in `www/js/app.js` to match.
3. Build, test, upload to both stores as above. Apple reviews every update; Google reviews most.

## 6. No Mac?

Options, cheapest first:

- Borrow a Mac for an afternoon. The whole iOS build and upload takes under an hour once accounts exist.
- A cloud build service: Codemagic has a free tier for small projects and supports Capacitor; it builds, signs, and uploads to TestFlight from this repository. Needs your Apple certificates and an App Store Connect API key.
- A rented cloud Mac (MacStadium, MacinCloud) by the hour.

Android needs no special hardware.

## 7. Things that commonly go wrong

- **"The bundle ID is already registered":** register it under your own team at developer.apple.com, Identifiers, or pick another one and change `appId` in `capacitor.config.json`, `android/app/build.gradle`, and the Xcode project.
- **Google rejects the Data safety form:** the app declares no collection; make sure you did not accidentally tick "Device or other IDs". Capacitor adds no SDKs that collect data.
- **Gradle sync fails:** install the SDK Platform and Build-Tools that Android Studio proposes; set `JAVA_HOME` to Android Studio's bundled JDK if Gradle complains about Java.
- **Blank white screen on launch:** `npx cap sync` was not run after `npm run build`, so `www/` was not copied into the native project.
- **Status bar overlaps the top bar on Android 15+:** this is edge-to-edge; the app pads for `env(safe-area-inset-top)`. If a device still overlaps, set `"adjustMarginsForEdgeToEdge": "force"` under `android` in `capacitor.config.json`.
