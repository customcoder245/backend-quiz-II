// node -r dotenv/config src/scripts/seedAdmin.js

import dns from "dns";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "../models/user.model.js";

// Force Node.js to use Google DNS (fixes ECONNREFUSED on some ISPs)
dns.setServers(["8.8.8.8", "8.8.4.4"]);

dotenv.config();

const EMAIL = "customcoder245@gmail.com";
const PASSWORD = "Testuser@99";

const seedUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);

    const exists = await User.findOne({ email: EMAIL });
    if (exists) {
      console.log("User already exists");
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(PASSWORD, 10);

    await User.create({
      email: EMAIL,
      password: hashedPassword,
      firstName: "John",
      middleInitial: "D",
      lastName: "Doe",
    });

    console.log(`User created: ${EMAIL} / ${PASSWORD}`);
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
};

seedUser();
