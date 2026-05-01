npm run android:run

👉 This is the one that:

builds the app
syncs it
installs it on your connected Android device
launches it
Quick summary
android:open → opens Android Studio (manual run)
android:run → deploys directly to device ✅
android:live → live reload (not needed for you)
Before running

Make sure:

USB debugging is ON
Device is connected
Run:
adb devices

👉 you should see your device listed

If multiple devices/emulators

You can specify:

npx cap run android --target=<device-id>

