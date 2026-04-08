import dns from "dns";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "../models/user.model.js";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
dotenv.config();

const adminCredentials = {
  email: process.env.ADMIN_EMAIL || "customcoder245@gmail.com",
  password: process.env.ADMIN_PASSWORD || "Admin@12345",
  firstName: "Admin",
  lastName: "User",
  role: "admin"
};

const normalUserCredentials = {
  email: process.env.USER_EMAIL || "user@example.com",
  firstName: "Normal",
  lastName: "User",
  role: "user",
  gender: "other"
};

const ensureUser = async ({ email, password, ...rest }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    existingUser.firstName = rest.firstName ?? existingUser.firstName;
    existingUser.lastName = rest.lastName ?? existingUser.lastName;
    existingUser.role = rest.role ?? existingUser.role;

    if (rest.gender) {
      existingUser.gender = rest.gender;
    }

    if (password) {
      existingUser.password = await bcrypt.hash(password, 10);
    }

    await existingUser.save();
    console.log(`${rest.role} synced: ${email}${password ? ` / ${password}` : ""}`);
    return;
  }

  const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;
  await User.create({
    email,
    ...(hashedPassword ? { password: hashedPassword } : {}),
    ...rest
  });

  console.log(
    `${rest.role} created: ${email}${password ? ` / ${password}` : " / no password required"}`
  );
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
