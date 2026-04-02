import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import dotenv from "dotenv";

dotenv.config();

const buildAuthResponse = (user, message, expiresIn = "1h") => {
  const token = jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn }
  );

  return {
    message,
    token,
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      middleInitial: user.middleInitial,
      lastName: user.lastName,
      role: user.role,
      gender: user.gender
    }
  };
};

export const register = async (req, res) => {
  try {
    const { email, password, firstName, middleInitial, lastName, gender } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      middleInitial,
      lastName,
      gender,
      role: "user"
    });

    return res.status(201).json(buildAuthResponse(user, "User registered successfully", "7d"));
  } catch (error) {
    console.error("Error during register controller:", error);
    return res.status(500).json({
      message: "Server error during register",
      details: error.message
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (role && user.role !== role) {
      return res.status(403).json({ message: `This account is not allowed for ${role} login` });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "Server configuration error" });
    }

    return res.status(200).json(buildAuthResponse(user, "Login successful"));
  } catch (error) {
    console.error("Error during login controller:", error);
    return res.status(500).json({
      message: "Server error during login",
      details: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Error during getMe controller:", error);
    return res.status(500).json({ message: "Server error while fetching user profile" });
  }
};
