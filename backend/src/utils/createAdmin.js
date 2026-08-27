import readline from "node:readline";
import bcrypt from "bcrypt";
import { connectDb } from "../config/db.js";
import { User } from "../models/User.js";

function askQuestion(rl, query, isPassword = false) {
  return new Promise((resolve) => {
    if (!isPassword) {
      rl.question(query, (answer) => resolve(answer.trim()));
      return;
    }

    // Mask password in terminal if possible
    process.stdout.write(query);
    const stdin = process.stdin;
    const oldRaw = stdin.isRaw;
    
    let password = "";
    const onData = (chunk) => {
      const char = chunk.toString("utf8");
      if (char === "\n" || char === "\r" || char === "\u0004") {
        stdin.removeListener("data", onData);
        if (stdin.setRawMode) stdin.setRawMode(oldRaw || false);
        process.stdout.write("\n");
        resolve(password.trim());
      } else if (char === "\u0003") {
        process.exit(1);
      } else if (char === "\u0008" || char === "\x7f") {
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write("\b \b");
        }
      } else {
        password += char;
        process.stdout.write("*");
      }
    };

    if (stdin.setRawMode) {
      stdin.setRawMode(true);
      stdin.resume();
      stdin.on("data", onData);
    } else {
      rl.question("", (answer) => resolve(answer.trim()));
    }
  });
}

async function run() {
  await connectDb();

  let name = process.env.ADMIN_NAME;
  let email = process.env.ADMIN_EMAIL;
  let password = process.env.ADMIN_PASSWORD;

  // If not provided via environment variables, prompt interactively
  if (!email || !password) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log("\n========================================");
    console.log(" NIVARA — Secure Admin Creation CLI");
    console.log("========================================\n");

    if (!name) {
      name = await askQuestion(rl, "Admin Full Name: ");
    }
    if (!email) {
      email = await askQuestion(rl, "Admin Email: ");
    }
    if (!password) {
      password = await askQuestion(rl, "Admin Password (min 6 chars): ", true);
    }

    rl.close();
  }

  name = (name || "Administrator").trim();
  email = (email || "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    console.error("\n[Error] A valid email address is required.");
    process.exit(1);
  }

  if (!password || password.length < 6) {
    console.error("\n[Error] Password must be at least 6 characters long.");
    process.exit(1);
  }

  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role === "admin") {
      console.log(`\n[Info] An admin account for ${email} already exists.`);
      process.exit(0);
    } else {
      // Elevate existing account to admin
      existing.role = "admin";
      existing.name = name || existing.name;
      existing.passwordHash = await bcrypt.hash(password, 12);
      await existing.save();
      console.log(`\n[Success] Existing account ${email} has been updated to Administrator role.`);
      process.exit(0);
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({
    name,
    email,
    passwordHash,
    role: "admin"
  });

  console.log(`\n[Success] Administrator account created successfully for ${email}.`);
  process.exit(0);
}

run().catch((err) => {
  console.error("\n[Error] Failed to create admin:", err.message);
  process.exit(1);
});
