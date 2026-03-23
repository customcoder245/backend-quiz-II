import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken"; // Used for creating JWT tokens
import User from "../models/user.model.js";
import dotenv from "dotenv";

dotenv.config();

// Login controller
export const login = async (req, res) => {
  try {
    // Check if email and password are provided
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Find the user by email
    const user = await User.findOne({ email });

    if (!user) {
      console.log(`Login failed: User not found for email ${email}`);
      return res.status(404).json({ message: "User not found" });
    }

    // Compare the password with the stored hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log(`Login failed: Invalid credentials for email ${email}`);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check for JWT_SECRET
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET environment variable is missing");
      return res.status(500).json({ message: "Server configuration error" });
    }

    // Create a JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    console.log(`Login successful for user: ${email}`);

    // Return the token and user information
    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        email: user.email,
        firstName: user.firstName,
        middleInitial: user.middleInitial,
        lastName: user.lastName,
        role: user.role,
        gender: user.gender,
      },
    });
  } catch (error) {
    console.error("Error during login controller:", error);
    return res.status(500).json({
      message: "Server error during login",
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

