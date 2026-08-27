import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { app } from "../src/app.js";
import { User } from "../src/models/User.js";
import { Complaint } from "../src/models/Complaint.js";
import { Notice } from "../src/models/Notice.js";

let mongo;
let adminToken;
let residentToken;
let secondResidentToken;
let residentId;
let secondResidentId;

async function login(email) {
  const res = await request(app).post("/api/auth/login").send({ email, password: "Password123" });
  assert.equal(res.status, 200);
  return res.body.data.token;
}

test.before(async () => {
  process.env.JWT_SECRET = "test-secret";
  process.env.OVERDUE_DAYS = "3";
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  const passwordHash = await bcrypt.hash("Password123", 10);
  const [admin, resident, other] = await User.create([
    { name: "Admin", email: "admin@test.com", passwordHash, role: "admin" },
    { name: "Resident", email: "resident@test.com", passwordHash, role: "resident" },
    { name: "Other", email: "other@test.com", passwordHash, role: "resident" }
  ]);
  residentId = resident._id;
  secondResidentId = other._id;
  adminToken = await login(admin.email);
  residentToken = await login(resident.email);
  secondResidentToken = await login(other.email);
});

test.after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test("auth validates registration, duplicates, login, and JWT protection", async () => {
  const reg = await request(app).post("/api/auth/register").send({
    name: "New Resident",
    email: "new@test.com",
    password: "Password123",
    confirmPassword: "Password123"
  });
  assert.equal(reg.status, 201);
  assert.equal(reg.body.data.user.role, "resident");
  assert.ok(!reg.body.data.user.passwordHash);

  // Attempt role escalation by passing role: "admin" in public registration
  const escalationAttempt = await request(app).post("/api/auth/register").send({
    name: "Sneaky User",
    email: "sneaky@test.com",
    password: "Password123",
    confirmPassword: "Password123",
    role: "admin"
  });
  assert.equal(escalationAttempt.status, 201);
  assert.equal(escalationAttempt.body.data.user.role, "resident"); // MUST strictly be resident

  const dup = await request(app).post("/api/auth/register").send({
    name: "New Resident",
    email: "new@test.com",
    password: "Password123",
    confirmPassword: "Password123"
  });
  assert.equal(dup.status, 409);

  const invalid = await request(app).post("/api/auth/login").send({ email: "new@test.com", password: "wrong" });
  assert.equal(invalid.status, 401);

  // Stale/unseeded demo accounts cannot log in
  const staleAdmin = await request(app).post("/api/auth/login").send({ email: "admin@example.com", password: "Password123" });
  assert.equal(staleAdmin.status, 401);
  const staleResident = await request(app).post("/api/auth/login").send({ email: "asha@example.com", password: "Password123" });
  assert.equal(staleResident.status, 401);

  const protectedRes = await request(app).get("/api/auth/me");
  assert.equal(protectedRes.status, 401);

  // RBAC unauthenticated vs resident vs admin
  const unauthAdmin = await request(app).get("/api/admin/complaints");
  assert.equal(unauthAdmin.status, 401);

  const residentAdmin = await request(app).get("/api/admin/complaints").set("Authorization", `Bearer ${residentToken}`);
  assert.equal(residentAdmin.status, 403);

  const authAdmin = await request(app).get("/api/admin/complaints").set("Authorization", `Bearer ${adminToken}`);
  assert.equal(authAdmin.status, 200);
});

test("complaint access, status history, lifecycle, and dashboard work", async () => {
  const created = await request(app)
    .post("/api/complaints")
    .set("Authorization", `Bearer ${residentToken}`)
    .field("category", "Plumbing")
    .field("description", "Bathroom tap keeps leaking after closing.");
  assert.equal(created.status, 201);
  assert.equal(created.body.data.complaint.statusHistory.length, 1);

  const id = created.body.data.complaint._id;
  const my = await request(app).get("/api/complaints/my").set("Authorization", `Bearer ${residentToken}`);
  assert.equal(my.status, 200);
  assert.equal(my.body.data.complaints.length, 1);

  const forbidden = await request(app).get(`/api/complaints/${id}`).set("Authorization", `Bearer ${secondResidentToken}`);
  assert.equal(forbidden.status, 403);

  const residentAdmin = await request(app).get("/api/admin/complaints").set("Authorization", `Bearer ${residentToken}`);
  assert.equal(residentAdmin.status, 403);

  const priority = await request(app).patch(`/api/admin/complaints/${id}/priority`).set("Authorization", `Bearer ${adminToken}`).send({ priority: "High" });
  assert.equal(priority.status, 200);

  const inProgress = await request(app)
    .patch(`/api/admin/complaints/${id}/status`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ status: "In Progress", note: "Assigned" });
  assert.equal(inProgress.status, 200);
  assert.equal(inProgress.body.data.complaint.statusHistory.length, 2);

  const invalid = await request(app).patch(`/api/admin/complaints/${id}/status`).set("Authorization", `Bearer ${adminToken}`).send({ status: "Open" });
  assert.equal(invalid.status, 400);

  const resolved = await request(app).patch(`/api/admin/complaints/${id}/status`).set("Authorization", `Bearer ${adminToken}`).send({ status: "Resolved" });
  assert.equal(resolved.status, 200);
  assert.ok(resolved.body.data.complaint.resolvedAt);

  const reopen = await request(app).patch(`/api/admin/complaints/${id}/status`).set("Authorization", `Bearer ${adminToken}`).send({ status: "Open" });
  assert.equal(reopen.status, 400);

  const dashboard = await request(app).get("/api/admin/dashboard").set("Authorization", `Bearer ${adminToken}`);
  assert.equal(dashboard.status, 200);
  assert.equal(dashboard.body.data.total, 1);
  assert.equal(dashboard.body.data.resolved, 1);
  assert.ok(dashboard.body.data.slaPerformance);
  assert.ok(Array.isArray(dashboard.body.data.categoryResolution));
});

test("approaching SLA and SLA performance calculation", async () => {
  // Create a complaint approaching SLA (created 2.2 days ago when OVERDUE_DAYS is 3)
  const approachingDate = new Date(Date.now() - 2.2 * 24 * 60 * 60 * 1000);
  await Complaint.create({
    residentId,
    category: "Plumbing",
    description: "Main line pressure drop near flat 204.",
    priority: "Medium",
    status: "In Progress",
    createdAt: approachingDate,
    updatedAt: approachingDate,
    statusHistory: [{ status: "Open", changedBy: residentId, timestamp: approachingDate }]
  });

  const dashboard = await request(app).get("/api/admin/dashboard").set("Authorization", `Bearer ${adminToken}`);
  assert.equal(dashboard.status, 200);
  assert.ok(dashboard.body.data.slaPerformance.approachingSla >= 1);
});

test("overdue sorting and notices work", async () => {
  const old = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  await Complaint.create({
    residentId,
    category: "Security",
    description: "Gate camera is not recording properly.",
    priority: "Low",
    status: "Open",
    createdAt: old,
    updatedAt: old,
    statusHistory: [{ status: "Open", changedBy: residentId, note: "Complaint submitted", timestamp: old }]
  });
  await Complaint.create({
    residentId: secondResidentId,
    category: "Electrical",
    description: "Corridor light is flickering.",
    priority: "High",
    status: "Resolved",
    resolvedAt: new Date(),
    createdAt: old,
    updatedAt: old,
    statusHistory: [{ status: "Resolved", changedBy: secondResidentId, timestamp: old }]
  });

  const list = await request(app).get("/api/admin/complaints").set("Authorization", `Bearer ${adminToken}`);
  assert.equal(list.status, 200);
  assert.equal(list.body.data.complaints[0].isOverdue, true);

  const notice = await request(app)
    .post("/api/admin/notices")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ title: "Important Work", content: "Main gate repair starts tomorrow.", isImportant: true });
  assert.equal(notice.status, 201);

  await Notice.create({ title: "Regular Update", content: "Garden work completed.", createdBy: residentId });
  const notices = await request(app).get("/api/notices").set("Authorization", `Bearer ${residentToken}`);
  assert.equal(notices.status, 200);
  assert.equal(notices.body.data.notices[0].isImportant, true);

  const edit = await request(app).patch(`/api/admin/notices/${notice.body.data.notice._id}`).set("Authorization", `Bearer ${adminToken}`).send({ isImportant: false });
  assert.equal(edit.status, 200);

  const del = await request(app).delete(`/api/admin/notices/${notice.body.data.notice._id}`).set("Authorization", `Bearer ${adminToken}`);
  assert.equal(del.status, 200);
});
