import dns from "dns";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "../models/user.model.js";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
dotenv.config();

const adminCredentials = {
  email: process.env.ADMIN_EMAIL || "admin@example.com",
  password: process.env.ADMIN_PASSWORD || "Admin@12345",
  firstName: "Admin",
  lastName: "User",
  role: "admin"
};

const normalUserCredentials = {
  email: process.env.USER_EMAIL || "user@example.com",
  password: process.env.USER_PASSWORD || "User@12345",
  firstName: "Normal",
  lastName: "User",
  role: "user",
  gender: "other"
};

const ensureUser = async ({ email, password, ...rest }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    console.log(`${rest.role} already exists: ${email}`);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await User.create({
    email,
    password: hashedPassword,
    ...rest
  });

  console.log(`${rest.role} created: ${email} / ${password}`);
};

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);

    await ensureUser(adminCredentials);
    await ensureUser(normalUserCredentials);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
};

seedUsers();
