# Society Maintenance Tracker (SocietyOS)

## Overview
Society Maintenance Tracker — branded as **SocietyOS** in the UI — is a full-stack web application for apartment societies. Residents can register, submit maintenance complaints with optional photos, track complaint status, and view notices. Administrators can manage all complaints, update status and priority, detect overdue work, publish notices, and trigger resident email notifications.

## Features
- Resident registration and JWT login.
- Role-based authorization for `resident` and `admin`.
- Resident-only access to personal complaints.
- Admin complaint filtering, search, priority updates, status lifecycle management, and operational dashboard analytics.
- Immutable complaint status history with actor, timestamp, and note.
- Configurable overdue detection using `OVERDUE_DAYS`.
- Optional complaint image upload through Multer and Cloudinary.
- Notice board with important notices pinned first.
- Nodemailer notifications for status changes and important notices.
- In-app notification center derived from recent status changes and important notices.
- Operational dashboard: needs attention, complaint trends, maintenance health score, recurring issue insights.

## Tech Stack
Frontend: React, Vite, React Router, Axios, Tailwind CSS, Recharts.

Backend: Node.js, Express.js, MongoDB, Mongoose, JWT, bcrypt, Multer, Cloudinary, Nodemailer.

## Architecture
The React SPA calls the Express API with `Authorization: Bearer <token>`. Express validates JWTs, applies role middleware, persists data in MongoDB through Mongoose, uploads images to Cloudinary, and sends email through SMTP. Dashboard analytics are calculated by backend endpoints, not by the browser.

## Folder Structure
```text
society-maintenance-tracker/
  backend/
    src/config/
    src/controllers/
    src/middleware/
    src/models/
    src/routes/
    src/services/
    src/utils/
    src/app.js
    src/server.js
    test/
  frontend/
    src/components/
    src/auth/
    src/resident/
    src/admin/
    src/layouts/
    src/services/
    src/context/
    src/utils/
    src/App.jsx
    src/main.jsx
  .env.example
  .gitignore
  README.md
  SYSTEM_DESIGN.md
```

## Prerequisites
- Node.js 20+ recommended.
- MongoDB local instance or MongoDB Atlas cluster.
- Cloudinary account for photo uploads.
- SMTP provider such as Brevo or Gmail SMTP.

## Installation
Backend:
```bash
cd backend
npm install
cp ../.env.example .env
npm run seed
npm run dev
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

MongoDB setup: create a local database or Atlas cluster and set `MONGODB_URI`.

Cloudinary setup: set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.

SMTP setup: set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `EMAIL_FROM`.

## Environment Variables
Use `.env.example` as the template. Backend variables include `PORT`, `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, Cloudinary keys, SMTP keys, `OVERDUE_DAYS`, and `CLIENT_URL`. Frontend uses `VITE_API_URL`.

## Running Locally
Start backend at `http://localhost:5000`:
```bash
cd backend
npm run dev
```

Start frontend at `http://localhost:5173`:
```bash
cd frontend
npm run dev
```

## API Documentation
Auth:
- `POST /api/auth/register` public. Body: `{ name, email, password, confirmPassword }`.
- `POST /api/auth/login` public. Body: `{ email, password }`.
- `GET /api/auth/me` authenticated.

Resident complaints:
- `POST /api/complaints` resident. `multipart/form-data`: `category`, `description`, optional `photo`.
- `GET /api/complaints/my` resident.
- `GET /api/complaints/:id` authenticated. Residents can only read their own complaint.

Admin complaints:
- `GET /api/admin/complaints` admin. Query: `category`, `status`, `priority`, `from`, `to`, `overdue`, `search`.
- `GET /api/admin/complaints/:id` admin.
- `PATCH /api/admin/complaints/:id/status` admin. Body: `{ status, note }`.
- `PATCH /api/admin/complaints/:id/priority` admin. Body: `{ priority }`.

Dashboard:
- `GET /api/admin/dashboard` admin. Query: `trendDays` (7, 30, or 90). Returns total, status counts, overdue count, needs attention, resolution metrics, health score, trends, recurring issues, recent complaints, and category/status aggregations.

Notifications:
- `GET /api/complaints/notifications` authenticated. Returns recent status-change and important-notice notifications.

Notices:
- `GET /api/notices` authenticated.
- `POST /api/admin/notices` admin. Body: `{ title, content, isImportant }`.
- `PATCH /api/admin/notices/:id` admin.
- `DELETE /api/admin/notices/:id` admin.

Responses follow:
```json
{ "success": true, "message": "Message", "data": {} }
```
Errors follow:
```json
{ "success": false, "message": "Complaint not found" }
```

## Database Schema
User: `name`, `email`, `passwordHash`, `role`, timestamps.

Complaint: `residentId`, `category`, `description`, `photoUrl`, `status`, `priority`, `isOverdue`, `resolvedAt`, timestamps, `statusHistory`.

StatusHistory: `status`, `changedBy`, `note`, `timestamp`.

Notice: `title`, `content`, `isImportant`, `createdBy`, timestamps.

## Complaint Lifecycle
Valid transitions are `Open -> In Progress`, `Open -> Resolved`, and `In Progress -> Resolved`. Once a complaint is `Resolved`, the backend rejects any further status changes.

## Overdue Detection
`OVERDUE_DAYS` controls when unresolved complaints become overdue. Resolved complaints are never overdue. The backend refreshes overdue state when listing or reading complaints and in dashboard calculations.

## Photo Upload Flow
Resident form sends `multipart/form-data` to Express. Multer validates file type and size in memory. The backend uploads the image to Cloudinary and stores only the Cloudinary URL in MongoDB.

## Notification Flow
When an admin changes complaint status, the backend saves the status history entry and sends the resident an email. When an admin creates an important notice, marks an existing notice important, or edits the title/content of an already-important notice, all resident emails are collected and notified. SMTP failures are logged and do not roll back saved data.

## Deployment
Backend on Render or Railway:
- Set root directory to `backend`.
- Build command: `npm install`.
- Start command: `npm start`.
- Configure all backend environment variables.

Frontend on Vercel:
- Set root directory to `frontend`.
- Build command: `npm run build`.
- Output directory: `dist`.
- Set `VITE_API_URL` to the deployed backend `/api` URL.

MongoDB Atlas:
- Create a cluster, database user, and network access rule.
- Put the connection string in `MONGODB_URI`.

## Demo Credentials
Created by `npm run seed` for local development:
- Admin: `admin@example.com` / `Password123`
- Resident: `asha@example.com` / `Password123`
- Resident: `rohan@example.com` / `Password123`

## Testing
Backend tests are in `backend/test/api.test.js` and can be run with:
```bash
cd backend
npm test
```

## Known Limitations
- Email delivery depends on valid SMTP credentials.
- Photo upload requires Cloudinary credentials; missing configuration returns a clear backend error.
- This assignment implementation does not include real-time updates or background schedulers by design.
