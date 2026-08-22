# System Design

## 1. Overall Architecture
Society Maintenance Tracker uses a React/Vite single-page frontend and an Express/MongoDB backend. The browser stores a JWT in local storage and sends it in the `Authorization: Bearer` header. Express routes apply authentication and role middleware before calling controllers. Mongoose models encapsulate persistence for users, complaints, and notices. External integrations are limited to Cloudinary for images and SMTP through Nodemailer for email.

## 2. Complaint History Model
Each complaint embeds a `statusHistory` array. Every entry stores the new status, actor user ID, optional note, and timestamp. Complaint creation creates the first `Open` history entry with note `Complaint submitted`. Status updates append new entries and never rewrite previous entries. The current status remains denormalized on the complaint for efficient filtering.

## 3. Overdue Detection
Overdue status is computed on the backend using `OVERDUE_DAYS`. A complaint is overdue only when it is not `Resolved` and the current time is beyond the configured number of days after `createdAt`. Resolved complaints always return `false`. Controllers refresh `isOverdue` when complaints are listed, read, updated, or included in dashboard calculations.

## 4. Photo Handling
Complaint photos are optional. The frontend submits `multipart/form-data`. Multer keeps the file in memory, validates MIME type, and limits file size. The backend uploads the image buffer to Cloudinary and stores only the resulting secure URL in MongoDB. If Cloudinary variables are missing, the backend returns a clear configuration error.

## 5. Notification Flow
When an admin changes complaint status, the controller validates the transition, persists the updated complaint and history entry, loads the resident, and sends a status-change email with complaint ID, old status, new status, note, and timestamp. Important notice creation, newly marking a notice important, and edits to already-important notices notify all residents by BCC. Email failures are logged but do not undo successful database writes.

## 6. Authentication and Authorization
Passwords are hashed using bcrypt. Login and registration return JWTs signed with `JWT_SECRET`. `requireAuth` validates tokens and loads the user. `requireRole("resident")` and `requireRole("admin")` protect role-specific routes. Complaint detail access includes an ownership check so residents cannot read another resident's complaint. Admin APIs are inaccessible to residents.

## 7. Database Design
`User` stores name, email, password hash, role, and timestamps. `Complaint` stores resident ID, category, description, photo URL, status, priority, overdue flag, resolved timestamp, and embedded status history. `Notice` stores title, content, importance flag, creator, and timestamps. Indexes are added for complaint resident, status, category, priority, created date, and notice importance/created date.

## 8. Key Design Decisions
The application avoids queues, WebSockets, and background workers to keep the scope deployable and maintainable. Dashboard aggregation is backend-owned to keep analytics consistent across clients. Status transitions are centralized in a lifecycle utility. Images are externalized to Cloudinary to keep MongoDB lean. Email is best-effort after persistence, which prevents notification provider outages from blocking operational updates. In-app notifications are derived from existing complaint history and important notices rather than a separate notification store, keeping the data model simple while providing operational awareness in the UI.
