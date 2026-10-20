# AttendX — personal attendance tracker for every student

AttendX is an Expo React Native app for web and Android with a polished dark navy/purple UI.

## What's included
- **Today:** Present, Absent and OFF buttons; mark all scheduled classes OFF for a college holiday.
- **Attendance:** overall and subject-wise targets, timetable, calendar and subject management.
- **Account:** email/password sign-up and sign-in, password reset, Google sign-in on the web, phone OTP on the web.
- **Private cloud sync:** each account reads/writes only `users/{uid}/privateData/attendance` in Firestore; local cache is also namespaced per user.
- **Android APK:** EAS preview build profile is included.

### Important auth notes
- Firebase phone authentication is **OTP-based**, not phone-number-plus-password. In this starter, phone OTP and Google popup sign-in are available on the web. The APK supports email/password; native Google and native phone OTP require extra native OAuth/phone-auth configuration.
- Google, email/password and phone providers must be enabled in Firebase Console before use.
- This project has not been verified on your Firebase project/device yet. You must complete the setup below and test it.

## 1. Create Firebase project (required for accounts + sync)
1. Go to https://console.firebase.google.com/ and create a project, e.g. `attendx-student`.
2. In **Build → Authentication → Get started → Sign-in method**, enable **Email/Password**, **Google**, and **Phone**.
3. In **Project settings → General → Your apps**, add a **Web app** and copy its config values.
4. In **Build → Firestore Database**, create a database. Start in production mode if available.
5. Open **Firestore → Rules** and publish the contents of `firestore.rules` from this project. This rule makes each user able to read/write only their own user path.
6. Copy `.env.example` to `.env` and replace every placeholder with the Firebase Web App values. Do not commit `.env` to GitHub.

## 2. Run on Windows
Open PowerShell in the `AttendX` folder (the folder containing `package.json`):

```powershell
Copy-Item .env.example .env
notepad .env
npm install
npx expo start --web
```

Fill the `.env` values before running the app. If Expo was already running when you edited `.env`, stop it with Ctrl+C and restart it. To run the Android Expo project locally, use `npx expo start` and scan the QR code with Expo Go; native Google/phone sign-in are not configured by this starter.

## 3. Push to GitHub
Create a repository named `attendx` at https://github.com/new. Then, in PowerShell inside the project folder, replace `YOUR-GITHUB-USERNAME`:

```powershell
git init
git add .
git commit -m "Add AttendX accounts, OFF status and cloud sync"
git branch -M main
git remote add origin https://github.com/YOUR-GITHUB-USERNAME/attendx.git
git push -u origin main
```

If this folder already has a Git remote, use `git remote -v` first and update it instead of adding a second remote. `.env` is ignored by `.gitignore`; verify it is not in your commit.

## 4. Deploy website to Vercel
1. Open https://vercel.com/ and sign in with GitHub.
2. Import your `attendx` repository.
3. In Vercel Project Settings → Environment Variables, add the six `EXPO_PUBLIC_FIREBASE_*` values from your local `.env` for **Production**, **Preview**, and **Development** as needed.
4. Build Command: `npm run build:web`; Output Directory: `dist`; Install Command: `npm install`. The build script copies the PWA manifest, service worker and icons into `dist`.
5. Deploy. In Firebase Console → Authentication → Settings → Authorized domains, add your Vercel domain (for example `attendx-yourname.vercel.app`).
6. Open the deployed HTTPS website and test sign-up, sign-in, Google, phone OTP and cloud data sync.

## 5. Install the website as a PWA
The project includes a web manifest, app icons, and a service worker for a basic offline shell. Browser and hosting behavior can vary; verify the exported `dist` folder includes `manifest.json`, `service-worker.js`, and `icons/` before publishing.

Open the deployed HTTPS link in Android Chrome, then use Chrome's menu → **Install app** or **Add to Home screen** if offered. This is a home-screen web app, not a Play Store APK. Expo's web output and browser support determine whether PWA installation is offered; verify on the deployed site.

## 6. Build an Android APK
Install Node.js and ensure the project dependencies are installed. Sign in to Expo and configure the cloud build:

```powershell
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform android --profile preview
```

Keep the `preview` profile set to `android.buildType: apk`. When the cloud build finishes, open the EAS build URL and download the APK. The first build may ask EAS to create Android signing credentials. Before starting the cloud build, add the same six `EXPO_PUBLIC_FIREBASE_*` values in the Expo project dashboard under **Environment variables** for the environment used by the `preview` build (or use the EAS environment-variable CLI). A local `.env` file is ignored by Git and should not be relied on to reach EAS cloud builders. The APK includes email/password sign-in and Firestore account sync once those variables are configured for the build. Native Google sign-in and phone OTP need additional native setup; website Google/phone flows do not automatically become native flows.

## OFF behavior
OFF means the class was not held. It is excluded from the present/absent denominator and does not lower attendance percentage. `College OFF today` marks every subject scheduled for the current weekday as OFF.

## Data privacy
Attendance is account-scoped in Firestore and locally cached under the Firebase user UID. Do not share credentials. The Firestore rules in this repository are required for user-level data isolation; do not deploy with open test rules. No administrator dashboard is included.
