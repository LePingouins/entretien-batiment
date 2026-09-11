Android publishing checklist and commands

Prerequisites
- Google Play Console account (one-time $25)
- Expo account and `eas-cli` installed
- Project configured (`mobile/app.json` has `android.package` set to `com.lepingouin.entretientrajets`)
- Privacy policy URL for the store listing

High-level steps
1. Create a Google Play app in the Play Console
   - Login to Play Console → All apps → Create app
   - Fill app name, default language, app type (Apps), and whether it is a paid app
2. Create a service account for Play API access
   - Play Console → Setup → API access → Create Service Account
   - Follow the Play Console prompts to create a Google Cloud service account and grant the recommended roles (the Play Console guides you). Download the JSON key file and keep it safe.
3. Install EAS CLI and login to Expo
   - Run: `npm install -g eas-cli`
   - Run: `eas login` and enter your Expo account credentials
4. Configure EAS for your project (if not already done)
   - From `mobile` folder: `eas build:configure`
   - This creates/updates `eas.json` and links the project to your Expo account
5. Build an Android AAB for release
   - From `mobile` folder:
     ```powershell
     eas build --platform android --profile production
     ```
   - Choose "Expo handles credentials" unless you prefer manual signing
6. Submit the completed build to the Play Console
   - After the build finishes, run:
     ```powershell
     eas submit --platform android --latest
     ```
   - `eas submit` will prompt for the path to the Google service account JSON if needed
7. Complete Play Console store listing
   - Fill store listing information: screenshots (phone/tablet), description, app icon, content rating, privacy policy URL
   - Configure internal testing or rollout to production

Quick local commands
```powershell
# from your development machine
npm install -g eas-cli
cd C:\EntretienBatiment\mobile
eas login
eas build --platform android --profile production
# after build completes
eas submit --platform android --latest
```

Notes
- EAS can manage Android signing keys automatically. If you already have a Play App Signing key, you can upload it or let Google manage it.
- For internal company distribution, use Play's "Internal testing" or Managed Google Play (for enterprise device management).
- Keep the Google service account JSON secure; it's sensitive credentials used for Play publishing.

If you want, I can:
- Walk you interactively through `eas build` when you run it locally (tell me when to start).
- Create a Play Console service-account key guidance with exact role recommendations.
- Trigger the `eas build` command locally if you run it and paste prompts back here.
