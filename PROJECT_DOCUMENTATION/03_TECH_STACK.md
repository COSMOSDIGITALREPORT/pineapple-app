# 03. Technology Stack Catalog

This document details the exact technical composition of each project layer.

---

## 1. Frontend Mobile Applications (React Native)

All four mobile directories (`pineappleandroidboys`, `pineappleandroidgirls`, `pineappleios`, `pineapplegirlsios`) share the following configuration:

*   **Core Framework**: React Native
*   **Version**: `0.85.2` (as per `package.json`)
*   **Language**: JavaScript / TS (mix of JSX files and TS typings)
*   **State Management**: Redux Toolkit (`@reduxjs/toolkit` version `^2.11.2`, `react-redux` version `^9.2.0`)
*   **Audio/Video Calling**: `react-native-agora` version `^4.5.4` (utilizes WebRTC streams via Agora server)
*   **Socket Communication**: `socket.io-client` version `^4.8.3`
*   **Payment Gateway**: `react-native-razorpay` version `^3.0.0`
*   **Local Storage**: `@react-native-async-storage/async-storage` version `^1.23.1`
*   **Notification Engine**: `@react-native-firebase/app` and `@react-native-firebase/auth` (v24.x and v25.x)
*   **UI Components**: Custom components built with `react-native-svg` and `react-native-linear-gradient` (vibrant pink gradients)
*   **Ringtones/Sounds**: `react-native-sound` version `^0.13.0`
*   **Navigation Stack**: *None.* (Note: the project maps screens dynamically using custom state flags rather than standard React Navigation libraries).

---

## 2. Backend Services

The backend (`backend/`) is a Node.js web server:

*   **Runtime Environment**: Node.js
*   **HTTP Framework**: Express (version `^4.18.2`)
*   **Signaling Framework**: Socket.IO (version `^4.7.2`)
*   **Database Client**: `mysql2/promise` (version `^3.22.4`)
*   **JWT Security**: `jsonwebtoken` (version `^9.0.2`)
*   **Firebase Integration**: `firebase-admin` (version `^13.10.0`)
*   **Image Storage Service**: `cloudinary` (version `^2.10.0`)
*   **Payments SDK**: `razorpay` (version `^2.9.6`)
*   **Call Token Generator**: `agora-access-token` (version `^2.0.4`)
*   **File Upload Utility**: `multer` (version `^2.1.1`)
*   **SMS Client**: Axios connections to Fast2SMS and 2Factor.in APIs

---

## 3. Web & Admin Clients

*   **Marketing Web Landing Page (`pineappleweb`)**: Plain HTML5 & CSS3 with no bundlers, compilation frameworks, or dependencies.
*   **Admin Dashboard (`backend/admin`)**: Single-page HTML application (`index.html`) using raw Vanilla JS fetch commands to communicate with the `/admin` routes. Styled with Vanilla CSS (uses Inter and Pacifico fonts from Google Web Fonts).

---

## 4. Host Development Environment Requirements

To develop, configure, and compile this project successfully, your development machine must satisfy the following minimum requirements:

### A. Windows (Android Development)
*   **Node.js**: Version `22.11.0` or higher (verified working on **`v24.15.0`**).
*   **npm**: Version `10.x` or higher (verified working on **`11.13.0`**).
*   **Java SDK**: OpenJDK **`17`** or **`21`** (verified working with the embedded Java **`21.0.10`** in Android Studio).
*   **Android SDK**: SDK Platform **`36`** (Android 12/13/14+ support) and SDK Build-tools **`36.0.0`** (pre-installed in Android Studio).
*   **Gradle**: Wrapper version **`9.3.1`** (defined in project wrappers).
*   **ADB**: Android Debug Bridge installed and available in the system execution PATH.

### B. macOS (iOS Development - For Future Phase)
*   **Operating System**: macOS (latest stable version recommended).
*   **IDE**: Xcode (version 15.0 or higher).
*   **CocoaPods**: Version `1.15.x` or higher.
*   **Ruby Runtime**: Bundler support (managed via `Gemfile`).
