# 🔐 Firebase Setup Guide — Multi-Coach Login

This guide walks you through creating the free cloud service that lets **multiple
coaches log in and share the same teams, games, and live stats**. It takes about
**10–15 minutes**. You don't need to know any code — just click through the steps
and, at the end, **copy one snippet and send it to me**. I'll do all the wiring.

> **What Firebase is:** a free service from Google that handles two things for us
> — **logins** (Authentication) and a **shared cloud database** (Firestore). Your
> app keeps living on GitHub Pages; Firebase just plugs in behind it.
>
> **Cost:** the free "Spark" plan is far more than a softball team will ever use.
> No credit card required.

---

## Step 1 — Create a Firebase project

1. Go to **https://console.firebase.google.com** and sign in with a Google account.
2. Click **Create a project** (or **Add project**).
3. Name it something like **`kingsmen-softball`**. Click **Continue**.
4. On the "Google Analytics" screen, **turn it OFF** (toggle off) — we don't need it. Click **Create project**.
5. Wait ~30 seconds, then click **Continue** when it's ready.

## Step 2 — Turn on Login (Authentication)

1. In the left sidebar, click **Build → Authentication**.
2. Click **Get started**.
3. Open the **Sign-in method** tab.
4. Enable your chosen login method(s):
   - **Google** (recommended, easiest): click **Google**, toggle **Enable**, pick a
     support email, click **Save**.
   - **Email/Password** (optional): click **Email/Password**, toggle **Enable**, **Save**.
   - *(You can enable both — coaches then pick whichever they prefer.)*

## Step 3 — Allow your app's web address

Still in **Authentication**:

1. Open the **Settings** tab → **Authorized domains**.
2. Click **Add domain** and add your GitHub Pages address:
   **`nickolasadamczyk.github.io`**
   *(This lets Google sign-in work on your live site. `localhost` is already there for testing.)*

## Step 4 — Create the shared database (Firestore)

1. In the left sidebar, click **Build → Firestore Database**.
2. Click **Create database**.
3. Choose **Start in production mode** (I'll add the security rules that protect
   your data). Click **Next**.
4. Pick a location close to you (e.g. **`us-central`** or **`nam5`**). Click **Enable**.

## Step 5 — Register the app and copy the config

1. Click the **⚙️ gear** (top-left, next to "Project Overview") → **Project settings**.
2. Scroll down to **Your apps** and click the **web icon** `</>`.
3. App nickname: **`Kingsmen Web`**. **Do NOT** check "Firebase Hosting". Click **Register app**.
4. You'll see a code block that looks like this:

   ```js
   const firebaseConfig = {
     apiKey: "AIzaSy........................",
     authDomain: "kingsmen-softball.firebaseapp.com",
     projectId: "kingsmen-softball",
     storageBucket: "kingsmen-softball.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abcdef123456"
   };
   ```

5. **Copy that whole `firebaseConfig` block and paste it to me in the chat.**

> ✅ **Is it safe to share this?** Yes. Firebase's web config is *meant* to live in
> the app and isn't a password. Your data is protected by **security rules** (which I
> write), not by hiding these values. This is the standard, documented setup.

---

## What happens after you send me the config

I'll build and push:
- A **login screen** (your chosen sign-in method).
- **Live cloud sync** — every coach sees the same roster, games, and in-progress
  scoring update in real time.
- A **team-sharing model** so coaches join your team (via a **team code** or **email
  invite** — your call).
- **Security rules** so only your team's coaches can read/write your team's data.
- A **one-time migration** that pushes the data already on your phone up to the cloud
  on your first login, so nothing is lost.

## Two quick decisions (reply in chat)

1. **Login method:** Google · Email + password · Both
2. **How coaches join your team:** share a **team code** · **invite by email**

*(If you don't care, I'll use the recommended defaults: **Google sign-in + team code**.)*

---

### Troubleshooting

- **"Can I use my personal Gmail?"** Yes, any Google account works.
- **Picked the wrong project name?** It doesn't matter — the name is cosmetic.
- **Lost the config snippet?** Reopen **⚙️ Project settings → Your apps → Kingsmen Web**;
  it's shown there anytime.
- **Stuck on any step?** Tell me the step number and what you see, and I'll unstick you.
