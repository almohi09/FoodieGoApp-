# FoodieGo - WiFi Live Testing Setup

## Your Computer IP: 172.20.10.4

---

## Quick Setup Instructions

### Option 1: WiFi Debugging (Recommended)

1. **Connect your Android tablet via USB** to your computer

2. **Enable Developer Options** on your tablet:
   - Go to Settings > About Tablet
   - Tap "Build Number" 7 times

3. **Enable USB Debugging**:
   - Settings > Developer Options > USB Debugging = ON

4. **Run this command in PowerShell** (as Administrator):
```powershell
& "C:\Android\Sdk\platform-tools\adb.exe" tcpip 5555
```

5. **Disconnect USB** and run:
```powershell
& "C:\Android\Sdk\platform-tools\adb.exe" connect 172.20.10.4:5555
```

6. **Start Metro Bundler**:
```bash
cd FoodieGoApp
npm run start:wifi
```

7. **Configure the App**:
   - Open the FoodieGo app on your tablet
   - Shake the device to open Dev Menu
   - Go to Settings > Metro Bundler
   - Enter: `172.20.10.4:8081`
   - Enable "Load from bundle"

---

### Option 2: Use Built APK (No Metro)

To build an APK that works without Metro server:
```bash
cd FoodieGoApp
npm run build:android
```

APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## Commands Reference

| Command | Description |
|---------|-------------|
| `npm run start` | Start Metro (localhost) |
| `npm run start:wifi` | Start Metro (WiFi mode) |
| `npm run android` | Run on connected device |
| `npm run build:android` | Build release APK |

---

## Troubleshooting

**Device not found?**
- Make sure USB debugging is enabled
- Try: `adb kill-server` then `adb start-server`

**App not loading?**
- Check Metro is running on correct IP
- Verify both device and PC on same WiFi network

**Build errors?**
- Run: `cd android && ./gradlew clean`
- Then rebuild

---

## Need Help?

If you encounter issues, check:
1. Both devices on same WiFi
2. Firewall not blocking port 8081
3. USB debugging was enabled before WiFi setup
