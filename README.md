# FoodieGo - Production-Ready Food Delivery App

A React Native food delivery application with production-level security and responsiveness.

## Repository Scope

This repository is the mobile frontend (`React Native`) codebase.  
Backend services (API server, database, workers, admin backend infrastructure) are not implemented in this repo.

## Features

- Modern food delivery UI with clean architecture
- Phone/OTP authentication
- Restaurant browsing with filters
- Cart and checkout flow
- Real-time order tracking
- Loyalty rewards system
- Responsive design (phones + tablets)
- WiFi debugging support for live testing

## Quick Start

### Prerequisites

- Node.js >= 22.11.0
- Android SDK
- Java 17+

### Installation

```bash
cd FoodieGoApp
npm install
```

### Run in Development

**WiFi Mode (Recommended for tablets):**
```bash
npm run start:wifi
```

**USB Mode:**
```bash
npm run android
```

### Windows Android Build (Recommended Stable Flow)

If your project path is long, Android New Architecture C++ build can fail on Windows with
`Filename longer than 260 characters`.

Use a short junction path before building:

```powershell
New-Item -ItemType Junction -Path C:\fg -Target C:\Users\Almohi1\Desktop\fullstack_development\projects\FoodieGo\FoodieGoApp
cd C:\fg\android
.\gradlew clean
.\gradlew app:installDebug
```

Then run Metro + app from project root:

```powershell
adb reverse tcp:8081 tcp:8081
npx react-native run-android --port 8081
```

### Build APK

```bash
npm run build:android
```

APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

## WiFi Live Testing Setup

See [WIFI_SETUP.md](./WIFI_SETUP.md) for detailed instructions.

Your computer IP: **172.20.10.4**

## Project Structure

```
src/
├── data/           # API, storage, mock data
├── domain/         # Types, constants, interfaces
├── presentation/  # Screens, components, navigation
├── store/         # Redux state management
├── theme/          # Colors, typography, spacing
└── utils/         # Helper functions
```

## Technology Stack

- React Native 0.84.1
- TypeScript
- Redux Toolkit
- React Navigation 7
- react-native-responsive-screen

## Developer Docs

- Start here: `docs/00_DEV_INDEX.md`
- Backend production blockers and required build scope: `docs/10_BACKEND_BUILD_REQUIREMENTS.md`
