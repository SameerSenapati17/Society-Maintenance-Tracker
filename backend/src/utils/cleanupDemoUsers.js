import { connectDb } from "../config/db.js";
import { User } from "../models/User.js";

const DEMO_EMAILS = [
  "admin@example.com",
  "asha@example.com",
  "rohan@example.com"
];

async function cleanup() {
  await connectDb();

  console.log("\n=============================================");
  console.log(" SocietyOS — Stale Demo Users Cleanup Script");
  console.log("=============================================\n");

  const result = await User.deleteMany({
    email: { $in: DEMO_EMAILS.map((e) => e.toLowerCase()) }
  });

  console.log(`[Success] Removed ${result.deletedCount} stale demo user account(s) from database.`);
  console.log("Cleaned accounts:", DEMO_EMAILS.join(", "));
  console.log("\nDatabase is now clean of legacy demo credentials.");
  process.exit(0);
}

cleanup().catch((err) => {
  console.error("\n[Error] Cleanup failed:", err.message);
  process.exit(1);
});
