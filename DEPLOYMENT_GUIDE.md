
# SmartKey System - Deployment Guide

This guide is designed for students and beginners. It covers how to set up the backend (Firebase), host the website online (Firebase Hosting), and configure the system using the built-in Setup Wizard.

---

## 📋 Prerequisites
Before starting, ensure you have:
1.  A **Google Account** (Gmail).
2.  **Node.js** installed on your computer (for running commands).
3.  The source code of this project on your computer.

---

## ☁️ Part 1: Firebase Backend Setup
The "Brain" of the system is Google Firebase. It stores user data and logs.

1.  **Create Project:**
    *   Go to [console.firebase.google.com](https://console.firebase.google.com).
    *   Click **"Add project"**.
    *   Name it (e.g., `smartkey-fyp`).
    *   Disable "Google Analytics" (not needed for this).
    *   Click **"Create Project"**.

2.  **Enable Authentication (Login System):**
    *   In the left sidebar, click **Build** -> **Authentication**.
    *   Click **"Get Started"**.
    *   Select **Google** from the list of Sign-in method.
    *   Click the **Enable** switch.
    *   Select your email for "Project support email".
    *   Click **Save**.

3.  **Create Database:**
    *   In the left sidebar, click **Build** -> **Realtime Database** (NOT Firestore).
    *   Click **"Create Database"**.
    *   Choose a location (e.g., Singapore or US).
    *   **Security Rules:** Select **"Start in test mode"**.
    *   Click **Enable**.

4.  **Get Your Keys:**
    *   Click the **Gear Icon ⚙️** (Project Settings) at the top left sidebar.
    *   Scroll down to the "Your apps" section.
    *   Click the **Web Icon** (`</>`).
    *   Nickname the app (e.g., "Dashboard").
    *   **Uncheck** "Also set up Firebase Hosting" (We will set this up manually in Part 2).
    *   Click **Register app**.
    *   **IMPORTANT:** You will see a code block containing `apiKey`, `authDomain`, `databaseURL`, etc. **Keep this tab open.** You will need these for the Setup Wizard later.

---

## 🚀 Part 2: Hosting with Firebase (Recommended)
We use **Firebase Hosting** because it automatically configures Google Login permissions. If you use other hosts (like Vercel), the login popup might fail.

### 1. Install Tools
*   Open your terminal/command prompt (VS Code Terminal).
*   Install the Firebase CLI:
    ```bash
    npm install -g firebase-tools
    ```

### 2. Login & Initialize
*   Log in to your Google account:
    ```bash
    firebase login
    ```
*   Initialize the project:
    ```bash
    firebase init hosting
    ```
    *   **Select project:** Choose "Use an existing project" -> Select the project you created in Part 1.
    *   **Public directory:** Type `dist` (if using Vite) or `build` (if using Create React App).
    *   **Configure as single-page app?** Type `y` (Yes).
    *   **Set up automatic builds with GitHub?** Type `n` (No - keep it simple).

### 3. Build & Deploy
*   Compile your code for production:
    ```bash
    npm run build
    ```
*   Upload to the internet:
    ```bash
    firebase deploy
    ```

### 4. Get Your URL
*   The terminal will show a **Hosting URL** (e.g., `https://smartkey-fyp.web.app`).
*   Click this link to open your new dashboard.

---

## 🧙‍♂️ Part 3: The Setup Wizard (First Run)
When you open your new website for the first time, it will detect that it is not configured and automatically launch the **System Installer**.

### Step 1: Welcome Screen
*   Read the introduction and click **Next Step**.

### Step 2: Cloud Connection
*   This form asks for the Firebase credentials you generated in **Part 1, Step 4**.
*   Copy and paste the values carefully:
    *   **API Key:** Starts with `AIza...`
    *   **Database URL:** Starts with `https://...`
    *   **Project ID:** e.g., `smartkey-fyp`
    *   **App ID:** Starts with `1:...`
*   Click **Verify & Next**. The system will test the connection.

### Step 3: Organization & Admin
*   **Facility Name:** Give your workshop a name.
*   **System ID:** Enter `WKS-01` (This must match your ESP32 code).
*   **Super Admin Email:** **CRITICAL STEP.** Enter the Google Email address you will use to log in.
    *   *Example:* `student.name@gmail.com`
    *   The system will whitelist this email as the first Administrator.
*   **Offline Persistence:** Choose between **Browser Storage** (Recommended for speed) or **Controller Board** (Advanced LittleFS sync).

### Step 4: Installation
*   Click **Install System**.
*   The app will reload. You will see the Login Screen.
*   Click **"Auth with Google"** and sign in with the email you entered in Step 3.

**🎉 Success! You are now logged into the dashboard.**

---

## 🤖 Optional: Enable AI (Gemini)
To enable the AI Consultant and predictive maintenance:
1.  Go to [aistudio.google.com](https://aistudio.google.com) and create an API Key.
2.  In your Dashboard, go to **Control Hub** (Top switch) -> **System Modules**.
3.  Expand **Configure API Key**, paste the key, and toggle the switch On.

---

## ⚠️ Troubleshooting

**"Permission Denied" in Logs:**
*   Go to Firebase Console -> Realtime Database -> **Rules**.
*   Ensure rules look like this for testing:
    ```json
    {
      "rules": {
        ".read": true,
        ".write": true
      }
    }
    ```

**"Auth Error" / Popup Closed:**
*   This usually happens if you run the app on `localhost` without adding it to authorized domains.
*   **Fix:** Since you are using Firebase Hosting (`.web.app` or `.firebaseapp.com`), this is handled automatically! Ensure you are testing on the deployed URL.
