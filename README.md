# SAS Academy

A production-oriented SSC typing practice platform built with React, Express and MongoDB. It provides a focused exam simulation for learners and a no-code administration area for exams, paragraphs, users and site settings.

## Features

- JWT authentication with bcrypt password hashing and password-reset tokens
- User profile and password management
- Active exam dashboard with randomized passages
- Exam-style typing screen with a single visible timer
- Character comparison, active-word and cursor highlighting, paste protection, restart and auto-submit
- TCS Mode as the primary SSC typing mode for TCS iON-style exams such as SSC CGL, CHSL, Stenographer, MTS and applicable Railway typing tests
- Server-authoritative WPM, accuracy and error calculations
- Admin overview, exam CRUD, searchable paragraph CRUD, user access control and website settings
- Validation, rate limiting, secure HTTP headers, compression and centralized errors

## Exam modes

TCS Mode is the default and recommended typing mode for this SSC-focused project. It is intended for exams conducted on the TCS iON platform or similar interfaces, including SSC CGL, SSC CHSL, SSC Stenographer, SSC MTS and applicable Railway recruitment typing tests.

Standard Mode is available for administrator-configured custom scoring rules.

NTA Mode is not an SSC typing mode. It is reserved for future NTA-based CBT support for examinations such as JEE Main, NEET UG, CUET UG/PG, UGC NET and NCET, which are generally MCQ-based computer-based tests rather than typing tests.

Administrators are stored in the `users` collection with `role: "admin"`. This avoids duplicating credentials and authentication logic in a separate collection while preserving a distinct, role-gated admin experience.

## Local setup

Requirements: Node.js 20+ and MongoDB 7+.

```bash
npm install
npm run install:all
cp server/.env.example server/.env
cp client/.env.example client/.env
npm run seed --prefix server
npm run dev
```

The web app runs at `http://localhost:5173`; the API runs at `http://localhost:5000`. Change the seeded admin credentials in `server/.env` before running the seed command.

## Scripts

```bash
npm run dev          # frontend and API together
npm run build        # production frontend bundle
npm test             # backend unit tests
npm run seed --prefix server
```

## Deploying to Render + Vercel

### Backend on Render

Deploy the `server` package as a Node web service. A Render Blueprint is included in `render.yaml`.

- Root directory: `server`
- Build command: `npm ci`
- Start command: `npm start`
- Health check path: `/health`

Set these Render environment variables:

```bash
NODE_ENV=production
MONGODB_URI=<your MongoDB Atlas connection string>
JWT_SECRET=<random 32+ character secret>
JWT_EXPIRES_IN=7d
CLIENT_URL=https://your-vercel-app.vercel.app
```

To allow another exact deployment origin, provide a comma-separated list:

```bash
CLIENT_URL=https://your-vercel-app.vercel.app,https://your-preview.vercel.app
```

Configure SMTP variables on Render if password reset emails should work in production.

### Frontend on Vercel

Deploy the `client` folder as the Vercel project.

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`

Set this Vercel environment variable:

```bash
VITE_API_URL=https://your-render-service.onrender.com/api
```

After both services are deployed, update Render's `CLIENT_URL` to the final Vercel domain and redeploy the backend.

## Production checklist

- Set a random `JWT_SECRET` of at least 32 characters.
- Use MongoDB Atlas or a secured replica set and restrict network access.
- Set `CLIENT_URL` to the deployed frontend origin (comma-separated origins are supported).
- Configure the SMTP environment variables to deliver password-reset links; tokens are never returned when `NODE_ENV=production`.
- Serve the built frontend through a CDN and run the API behind TLS and a reverse proxy.
- Add persistent request logging, health monitoring and database backups for the target environment.

## REST API

All endpoints are prefixed by `/api`.

- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `GET /auth/profile`
- `POST /auth/forgot-password`, `POST /auth/reset-password`
- `PATCH /auth/profile`, `PATCH /auth/change-password`
- `GET /exams`, `GET /exams/:id/random-paragraph`
- Admin: `POST|PUT|DELETE /exams`, CRUD `/paragraphs`
- `POST /results`, `GET /results/:id`
- Admin: `/admin/stats`, `/admin/users`, `/admin/settings`

Result records intentionally have no learner-facing history endpoint because the product brief excludes typing history.
# Typing
