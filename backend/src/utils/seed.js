import bcrypt from "bcrypt";
import { connectDb } from "../config/db.js";
import { User } from "../models/User.js";
import { Complaint } from "../models/Complaint.js";
import { Notice } from "../models/Notice.js";
import { env } from "../config/env.js";

async function seed() {
  await connectDb();
  await Promise.all([User.deleteMany({}), Complaint.deleteMany({}), Notice.deleteMany({})]);

  const passwordHash = await bcrypt.hash("Password123", 12);
  const [admin, residentOne, residentTwo] = await User.create([
    { name: "Admin User", email: "admin@example.com", passwordHash, role: "admin" },
    { name: "Asha Resident", email: "asha@example.com", passwordHash, role: "resident" },
    { name: "Rohan Resident", email: "rohan@example.com", passwordHash, role: "resident" }
  ]);

  const oldDate = new Date(Date.now() - (env.overdueDays + 2) * 24 * 60 * 60 * 1000);
  await Complaint.create([
    {
      residentId: residentOne._id,
      category: "Plumbing",
      description: "Kitchen sink pipe is leaking continuously.",
      priority: "High",
      status: "Open",
      createdAt: oldDate,
      updatedAt: oldDate,
      statusHistory: [{ status: "Open", changedBy: residentOne._id, note: "Complaint submitted", timestamp: oldDate }]
    },
    {
      residentId: residentOne._id,
      category: "Lift",
      description: "Lift buttons on the third floor are not working.",
      priority: "Medium",
      status: "In Progress",
      statusHistory: [
        { status: "Open", changedBy: residentOne._id, note: "Complaint submitted", timestamp: new Date() },
        { status: "In Progress", changedBy: admin._id, note: "Technician assigned", timestamp: new Date() }
      ]
    },
    {
      residentId: residentTwo._id,
      category: "Cleaning",
      description: "Basement parking area needs cleaning.",
      priority: "Low",
      status: "Resolved",
      resolvedAt: new Date(),
      statusHistory: [
        { status: "Open", changedBy: residentTwo._id, note: "Complaint submitted", timestamp: new Date() },
        { status: "Resolved", changedBy: admin._id, note: "Cleaning completed", timestamp: new Date() }
      ]
    }
  ]);

  await Notice.create([
    { title: "Water Supply Maintenance", content: "Water supply will pause from 10 AM to 12 PM tomorrow.", isImportant: true, createdBy: admin._id },
    { title: "Gym Timings", content: "Gym timings are updated for the weekend.", isImportant: false, createdBy: admin._id }
  ]);

  console.log("Seed complete");
  console.log("Admin: admin@example.com / Password123");
  console.log("Resident: asha@example.com / Password123");
  console.log("Resident: rohan@example.com / Password123");
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
