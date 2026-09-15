# 15. Local Development Setup Guide

Follow this guide to get the Pineapple project running on a Windows development machine.

---

## 1. Prerequisites Setup

Before starting, verify you have the following installed:
*   **Git**: Version `2.5x` or higher.
*   **Node.js**: Version `22.11.0` or higher (verified on `24.15.0`).
*   **Android Studio**: Android Studio (e.g., Koala or newer) must be installed.
*   **Docker Desktop**: Required to host a local MySQL database instance.

---

## 2. Step-by-Step Configuration

### Step 2.1: Database Instance Launch (Docker)
Open Docker Desktop, open a terminal, and run:
```powershell
docker run --name pineapple-mysql -e MYSQL_ROOT_PASSWORD="" -e MYSQL_DATABASE="pineapple" -p 3306:3306 -d mysql:8.0 --allow-no-password
```
Once the database container is active, you can initialize the tables using the schema file inside the backend directory:
```powershell
# Using a local mysql client or directly inside the container:
docker exec -i pineapple-mysql mysql -u root pineapple < backend/schema.sql
```

### Step 2.2: Backend Dependency Installation
Install Node package dependencies using `npm ci` inside the backend directory:
```powershell
cd backend
npm ci
```
Verify that [`backend/.env`](file:///d:/cosmos%20internship/pineapple-app/backend/.env) exists.

### Step 2.3: Mobile App Dependency Installation
Navigate to your target app directory (e.g., `pineappleandroidboys`) and run `npm ci`:
```powershell
cd pineappleandroidboys
npm ci
```
*Note: Repeat this step for the other mobile directories (`pineappleandroidgirls`, `pineappleios`, or `pineapplegirlsios`) if you plan to run them.*

---

## 3. Starting the Applications

### Step 3.1: Start the Backend Server
From the `backend` directory, launch the API server in development mode:
```powershell
npm run dev
```
Verify the server starts and prints: `🍍 Pineapple backend running on port 3000`.

### Step 3.2: Start the Metro Bundler
Open a new terminal window, navigate to the mobile app directory, and start the Metro JavaScript packager:
```powershell
cd pineappleandroidboys
npm start
```

### Step 3.3: Launch the Android Emulator
Ensure your configured virtual device (`Medium_Phone`) is booted. You can list AVDs and launch the emulator via:
```powershell
& "C:\Users\janhv\AppData\Local\Android\Sdk\emulator\emulator.exe" -avd Medium_Phone
```

### Step 3.4: Build and Run the App on the Emulator
Open a new terminal, navigate to the mobile app directory, set `JAVA_HOME` to use Android Studio's bundled OpenJDK 21, and compile the application:
```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
cd pineappleandroidboys
npm run android
```
The React Native CLI will build the native packages and install the APK on the running emulator.
