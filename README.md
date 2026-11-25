# TriageAI

An AI-assisted clinical triage web application built with **Next.js**, **Tailwind CSS**, **Groq SDK**, and **Firebase Firestore**.

TriageAI helps healthcare providers and triage nurses quickly assess patient symptoms and vitals, categorizing urgency and providing structured clinical recommendations.

---

## Features

- **Clinical Intake Form**: Capture patient demographics, vitals (temperature, blood pressure, heart rate, SpO2, respiratory rate), and symptoms.
- **Fast AI Assessment**: Powered by Groq for low-latency triage analysis and priority stratification (Resuscitation, Emergent, Urgent, Less Urgent, Non-Urgent).
- **Flexible Session Storage**: Connects to Firebase Firestore for session persistence with an automatic local storage fallback.
- **Triage History**: Browse previous triage sessions and review historical assessments.

---

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, React 19)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **AI Inference**: [Groq Cloud SDK](https://console.groq.com/)
- **Database**: [Firebase Firestore](https://firebase.google.com/) (with local disk/in-memory fallback)

---

## Getting Started

### 1. Prerequisites
- Node.js 18+ installed
- A [Groq API Key](https://console.groq.com/keys)
- (Optional) A [Firebase project](https://console.firebase.google.com/) with Cloud Firestore enabled

### 2. Installation
```bash
git clone https://github.com/your-username/triageai.git
cd triageai
npm install
```

### 3. Environment Setup
Copy `.env.example` to `.env.local` and configure your API keys:

```bash
cp .env.example .env.local
```

Fill in your credentials in `.env.local`:
```env
GROQ_API_KEY=your_groq_api_key

# Firebase (optional - defaults to local fallback if omitted)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Pushing to GitHub

To publish this project to a new GitHub repository:

```bash
# 1. Initialize git (if not already initialized)
git init

# 2. Stage all files (verifying .env and .env.local are ignored)
git add .

# 3. Create your initial commit
git commit -m "feat: initial commit for TriageAI"

# 4. Set main branch and link your GitHub remote
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git

# 5. Push to GitHub
git push -u origin main
```
