# Part 107 Prep mobile app

The iOS and Android app version of the Part 107 Prep website, built with Capacitor 8. The study content and question bank are pulled from the website (one directory up) by `scripts/sync-content.js`, so there is one source of truth.

All progress (name, test date, checked steps, module completion, exam history) is stored only on the device through the Capacitor Preferences plugin. There is no server, no account system, no analytics, and no advertising.

## Layout

```
app/
  www/                  the app itself (plain HTML, CSS, JavaScript; no bundler)
    index.html
    css/app.css
    js/store.js         on-device storage, readiness score, backup codes
    js/app.js           router, screens, shared UI
    js/exam.js          practice exam engine
    js/bank.js          generated: question bank from the website
    js/content.js       generated: study modules, steps, references from the website
    js/cap/             generated: Capacitor runtime and plugin bundles
    fonts/              generated: Barlow and Barlow Condensed (OFL)
  scripts/sync-content.js
  resources/            icon and splash sources (SVG and PNG)
  android/              native Android project (open in Android Studio)
  ios/                  native iOS project (open in Xcode on a Mac)
  capacitor.config.json
  PUBLISHING.md         step-by-step store submission guide
```

## Commands

```bash
npm install
npm run build      # regenerate www/js/bank.js, content.js, cap/, fonts/ from the website
npx cap sync       # copy www/ into the native projects
npm run serve      # try it in a desktop browser at http://localhost:8080
npx cap open android
npx cap open ios
```

Regenerate icons and splash screens after changing `resources/`:

```bash
npx capacitor-assets generate --iconBackgroundColor '#0b1020' --iconBackgroundColorDark '#0b1020' --splashBackgroundColor '#0b1020' --splashBackgroundColorDark '#0b1020'
```

See `PUBLISHING.md` for accounts, signing, store forms, and listing text.
