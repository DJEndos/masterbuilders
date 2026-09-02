# Masterbuilder International School — Result Management System

A complete, self-hosted student result management system built for **Masterbuilder International School**, Port Harcourt — with three access tiers (Admin, Teacher, Parent/Student), automatic grading, and professional downloadable/printable PDF result sheets branded in the school's navy blue and orange colours.

---

## ✨ Features

- **Admin**
  - Create/manage teacher accounts and assign them to specific classes & subjects
  - Create/manage student records — each student gets an auto-generated unique **Student ID** (`MIS/YEAR/0001`) and a confidential 6-digit **Access PIN**
  - Reset a student's PIN at any time (e.g. if a parent forgets it)
  - Review all results submitted by teachers and **publish** them (individually or a whole class at once) — only published results are visible to parents/students
  - Dashboard with live stats (students, teachers, published results)

- **Teacher**
  - Log in and see only the classes/subjects assigned to them by the Admin
  - Enter CA1, CA2, and Exam scores per subject — **total, grade, and remark are calculated automatically** using the school's grading scale
  - Enter attendance, psychomotor skills, affective traits, and a class teacher's comment
  - Recompute class positions (ranking) automatically based on average scores
  - Editing a previously-published result reverts it to "draft" so the Admin can re-approve it — prevents unauthorised silent edits to published records

- **Parent / Student Portal**
  - Confidential access using **Student ID + Access PIN only** (no email/password needed) — matches how the school hands out credentials
  - View all published results across sessions/terms
  - **Download a print-ready PDF result sheet** for any published term

- **Result Sheet PDF**
  - Branded header with the school logo, name, tagline, address and phone numbers
  - Navy blue / orange colour scheme throughout
  - Subject score table (CA1, CA2, Exam, Total, Grade, Remark, Position), grading key, attendance, psychomotor/affective trait ratings, teacher & principal comments, signature lines, and a confidentiality footer

---

## 🗂 Project Structure

```
masterbuilder-result-system/
├── api/
│   └── index.js               Express app — Vercel serverless function entry point
│                               (also runs standalone locally via `npm start`)
├── config/db.js                MongoDB connection (cached for serverless cold starts)
├── middleware/auth.js          JWT auth + role guards
├── models/                     User, Student, Result (Mongoose schemas)
├── routes/                     auth, admin, teacher, portal, results
├── utils/
│   ├── grading.js               Grading scale + total/grade calculator
│   ├── idGenerator.js           Student ID + PIN generator
│   ├── generatePDF.js           PDF result sheet generator (PDFKit)
│   └── seedAdmin.js             Creates the first Admin account
├── public/                     Static frontend (served directly, plain HTML/CSS/JS)
│   ├── index.html                Landing page (role selection)
│   ├── admin/                    Admin login + dashboard
│   ├── teacher/                  Teacher login + dashboard
│   ├── portal/                   Parent/Student login + results/download
│   ├── css/style.css
│   ├── js/                       api.js (shared), admin.js, teacher.js
│   └── assets/logo.jpg           School logo
├── vercel.json                 Routes /api/* to the serverless function
├── package.json
└── .env.example
```

---

## 🚀 Getting Started (local development)

### 1. Prerequisites
- **Node.js** v18+ 
- **MongoDB** — either a local install, or a free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas)

### 2. Install
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
```
Open `.env` and set:
- `MONGODB_URI` — your MongoDB connection string
- `JWT_SECRET` — a long random string (used to sign login sessions)
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — the first Admin account's login

### 4. Create the first Admin account
```bash
npm run seed
```
This prints the Admin email/password once. **Log in and change the password immediately** (via the "change password" API, or ask for a settings page to be added).

### 5. Run the server
```bash
npm start          # production
npm run dev        # auto-restart during development (requires nodemon, already in devDependencies)
```

Visit **http://localhost:5000** — you'll see the landing page with three portal options.

---

## 👨‍🏫 Day-to-day workflow

1. **Admin** logs in → adds student records (each gets a Student ID + PIN — write these down, the PIN is only shown once) → adds teacher accounts and assigns them classes/subjects.
2. **Teacher** logs in → selects their class, session (e.g. `2025/2026`) and term → enters scores per student → saves.
3. **Admin** reviews the class's draft results in the "Results & Publishing" tab → publishes them (one at a time, or the whole class in one click).
4. **Parent/Student** goes to the "Check Result" portal → enters the Student ID + PIN → views published results → downloads the PDF.

---

## 🔐 Security notes

- Admin/Teacher accounts use email + password with JWT sessions and bcrypt-hashed passwords.
- Student/Parent access uses Student ID + a bcrypt-hashed 6-digit PIN — the PIN is shown in plaintext to the Admin **only once**, at creation or reset. It cannot be retrieved afterwards, only reset.
- Portal and login endpoints are rate-limited to slow down PIN-guessing attempts.
- Only `status: published` results are ever returned to the parent/student portal, regardless of what's stored.
- Change `JWT_SECRET` in `.env` to a long, random value before going live, and always run behind HTTPS in production.

## 🎨 Customising the grading scale

Edit `utils/grading.js` → `GRADE_SCALE` if the school's academic board uses different score boundaries or grade labels. Everything downstream (score entry, PDF, grading key) reads from this one file.

## 📦 Deploying to Vercel

This project is already structured for Vercel: `/api/index.js` is the serverless function that handles every `/api/*` route, and everything in `/public` (the login pages, dashboards, CSS, logo) is served directly as static files. `vercel.json` wires the two together.

### 1. Push this project to a Git repo (GitHub/GitLab/Bitbucket)
Vercel deploys straight from a repo. Create one and push this folder as-is (the `.gitignore` already excludes `node_modules` and `.env`).

### 2. Import the project in Vercel
- Go to [vercel.com/new](https://vercel.com/new) and import the repo.
- Framework preset: **Other** (it's a plain Node project, not Next.js/etc.) — Vercel auto-detects `api/index.js` as a serverless function either way.
- Build command / output directory: leave as default/blank — nothing needs building.

### 3. Set environment variables
In the Vercel project's **Settings → Environment Variables**, add the same values from `.env.example`:
- `MONGODB_URI` — a **MongoDB Atlas** connection string (Vercel has no local disk/database, so you must use a hosted MongoDB — Atlas's free tier works fine)
- `JWT_SECRET` — a long random string
- `JWT_EXPIRES_IN` — e.g. `7d`
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — only needed for the one-time seed step below

### 4. Deploy
Click **Deploy**. Vercel builds and gives you a live URL (e.g. `masterbuilder-result-system.vercel.app`).

### 5. Create the first Admin account
`npm run seed` needs to run somewhere that can reach your `MONGODB_URI` — Vercel doesn't run one-off scripts for you. The simplest options:
- Run it **locally**: put your Atlas `MONGODB_URI` in a local `.env`, then run `npm run seed` from your machine. It writes directly to the same Atlas database your deployed app uses.
- Or temporarily add a one-time protected admin-creation route and remove it after — not required if the local option above works for you.

### Notes specific to serverless hosting
- **MongoDB connection reuse**: `config/db.js` caches the connection across invocations so a warm function doesn't reopen a new connection on every request. This is already handled — no action needed.
- **PDF logo asset**: `vercel.json` explicitly includes `public/assets/**` in the function bundle so `generatePDF.js` can still read the logo file at runtime.
- **Rate limiting**: `express-rate-limit`'s default in-memory store is per-instance. On Vercel's serverless platform that means limits are enforced per warm instance rather than globally across all of them — fine for slowing down casual abuse, but if you need a hard global cap, swap in a Redis-backed store (e.g. Upstash, which integrates natively with Vercel).
- **Cold starts**: the first request after inactivity will be slower (new connection + Mongoose model registration). Subsequent requests on the same warm instance are fast.

### Alternative hosts
Since this is a standard Node/Express + MongoDB app under the hood, it also runs unmodified on Render, Railway, or Fly.io if you'd rather have a persistent (non-serverless) server — just set the start command to `npm start` and skip `vercel.json`.
