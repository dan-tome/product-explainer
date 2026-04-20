# Product Explainer

A mobile application to explain products.

## How to build for Android (APK)

To install this app on your Android phone for testing, you can generate an APK using Expo EAS.

### Prerequisites

1.  Install EAS CLI:
    ```bash
    npm install -g eas-cli
    ```
2.  Login to your Expo account:
    ```bash
    eas login
    ```

### Generate APK

Run the following command:

```bash
npm run build:android
```

Or directly using EAS:

```bash
eas build --platform android --profile preview
```

### Alternative: Local Build (Advanced)

If you have a local Android development environment set up, you can build the APK locally:

1.  Prebuild the native folders:
    ```bash
    npx expo prebuild
    ```
2.  Build the APK using Gradle:
    ```bash
    cd android
    ./gradlew assembleRelease
    ```
    The APK will be located at `android/app/build/outputs/apk/release/app-release.apk`.

### Installing on your phone

1.  Wait for the build to finish. EAS will provide a link to download the APK.
2.  Download the APK file to your Android device.
3.  Open the file on your phone and install it (you may need to allow installation from unknown sources).

## Development

- `npm start` - Start the development server
- `npm run android` - Run on Android emulator/device
- `npm run ios` - Run on iOS simulator
- `npm run web` - Run in the browser
