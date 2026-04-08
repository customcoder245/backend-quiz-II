import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import dotenv from "dotenv";

dotenv.config();

const buildUserName = (user) =>
  [user?.firstName, user?.middleInitial, user?.lastName].filter(Boolean).join(" ") ||
  user?.email ||
  "User";

const getNameParts = ({ name, fullName, firstName, middleInitial, lastName }) => {
  const resolvedName = String(fullName || name || "").trim();

  if (resolvedName && !firstName && !lastName) {
    const parts = resolvedName.split(/\s+/).filter(Boolean);
    return {
      firstName: parts[0] || "",
      middleInitial: middleInitial || "",
      lastName: parts.length > 1 ? parts.slice(1).join(" ") : ""
    };
  }

  return {
    firstName,
    middleInitial,
    lastName
  };
};

const normalizeEmail = (email) => String(email || "").toLowerCase().trim();

const buildUserPayload = (user) => ({
  id: user._id,
  name: buildUserName(user),
  fullName: buildUserName(user),
  email: user.email,
  firstName: user.firstName,
  middleInitial: user.middleInitial,
  lastName: user.lastName,
  role: user.role,
  gender: user.gender,
  signedUpAt: user.createdAt,
  createdAt: user.createdAt,
  lastLoginAt: user.lastLoginAt
});

const sanitizeUserRecord = (user) => {
  const plainUser =
    typeof user?.toObject === "function"
      ? user.toObject({ versionKey: false })
      : { ...(user || {}) };
  const { password, __v, ...safeUser } = plainUser;

  return safeUser;
};

const buildAuthUserRecord = (user) => {
  const safeUser = sanitizeUserRecord(user);
  const userId = safeUser._id || safeUser.id;
  const name = safeUser.name || safeUser.fullName || buildUserName(safeUser);

  return {
    ...safeUser,
    _id: userId,
    id: userId,
    name,
    fullName: name,
    email: safeUser.email,
    firstName: safeUser.firstName,
    middleInitial: safeUser.middleInitial,
    lastName: safeUser.lastName,
    role: safeUser.role,
    gender: safeUser.gender,
    signedUpAt: safeUser.signedUpAt || safeUser.createdAt,
    createdAt: safeUser.createdAt,
    updatedAt: safeUser.updatedAt,
    lastLoginAt: safeUser.lastLoginAt || null,
    authStatus: safeUser.authStatus || (safeUser.lastLoginAt ? "Logged in" : "Signed up")
  };
};

const buildAuthResponse = (user, message, expiresIn = "1h") => {
  const token = jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn }
  );

  return {
    success: true,
    message,
    token,
    user: buildUserPayload(user)
  };
};

const getConfiguredAdminCredentials = () => ({
  email: process.env.ADMIN_EMAIL || "customcoder245@gmail.com",
  password: process.env.ADMIN_PASSWORD || "Admin@12345"
});

const handleLogin = async (req, res, enforcedRole) => {
  try {
    const { email, password, role } = req.body;
    const requestedRole = enforcedRole || role;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (requestedRole && user.role !== requestedRole) {
      return res.status(403).json({ success: false, message: `This account is not allowed for ${requestedRole} login` });
    }

    if (!user.password) {
      return res.status(401).json({ success: false, message: "This account cannot login with password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ success: false, message: "Server configuration error" });
    }

    user.lastLoginAt = new Date();
    await user.save();

    return res.status(200).json(buildAuthResponse(user, "Login successful"));
  } catch (error) {
    console.error("Error during login controller:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during login",
      details: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
};

export const register = async (req, res) => {
  try {
    const { email, password, name, fullName, firstName, middleInitial, lastName, gender } = req.body;
    const nameParts = getNameParts({ name, fullName, firstName, middleInitial, lastName });

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters long" });
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      if (existingUser.role === "user" && !existingUser.password) {
        existingUser.password = await bcrypt.hash(password, 10);
        existingUser.firstName = nameParts.firstName || existingUser.firstName;
        existingUser.middleInitial = nameParts.middleInitial || existingUser.middleInitial;
        existingUser.lastName = nameParts.lastName || existingUser.lastName;
        existingUser.gender = gender || existingUser.gender;
        existingUser.lastLoginAt = new Date();
        await existingUser.save();

        return res.status(200).json(buildAuthResponse(existingUser, "User registered successfully", "7d"));
      }

      return res.status(409).json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      firstName: nameParts.firstName,
      middleInitial: nameParts.middleInitial,
      lastName: nameParts.lastName,
      gender,
      lastLoginAt: new Date(),
      role: "user"
    });

    return res.status(201).json(buildAuthResponse(user, "User registered successfully", "7d"));
  } catch (error) {
    console.error("Error during register controller:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during register",
      details: error.message
    });
  }
};

export const login = async (req, res) => {
  return handleLogin(req, res);
};

export const adminLogin = async (req, res) => handleLogin(req, res, "admin");

export const getAdminLoginHint = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      credentials: getConfiguredAdminCredentials(),
      message: "Admin login credentials fetched successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to fetch admin login credentials"
    });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({ success: true, user: buildUserPayload(user) });
  } catch (error) {
    console.error("Error during getMe controller:", error);
    return res.status(500).json({ success: false, message: "Server error while fetching user profile" });
  }
};

export const saveAuthUserDetails = async (req, res) => {
  try {
    const {
      email,
      password,
      name,
      fullName,
      firstName,
      middleInitial,
      lastName,
      gender,
      source,
      authType
    } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const nameParts = getNameParts({ name, fullName, firstName, middleInitial, lastName });
    const loginSource = String(source || authType || "").toLowerCase();
    let user = await User.findOne({ email: normalizedEmail });

    if (loginSource === "login") {
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      if (password && user.password) {
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return res.status(401).json({ success: false, message: "Invalid credentials" });
        }
      }
    }

    if (!user) {
      if (!password) {
        return res.status(400).json({ success: false, message: "Password is required to create a new user" });
      }

      const payload = {
        email: normalizedEmail,
        firstName: nameParts.firstName,
        middleInitial: nameParts.middleInitial,
        lastName: nameParts.lastName,
        gender,
        role: "user",
        lastLoginAt: loginSource === "login" || loginSource === "signup" ? new Date() : null
      };

      if (password.length < 8) {
        return res.status(400).json({ success: false, message: "Password must be at least 8 characters long" });
      }

      payload.password = await bcrypt.hash(password, 10);
      user = await User.create(payload);
    } else {
      user.firstName = nameParts.firstName || user.firstName;
      user.middleInitial = nameParts.middleInitial || user.middleInitial;
      user.lastName = nameParts.lastName || user.lastName;
      user.gender = gender || user.gender;

      if (password && !user.password) {
        if (password.length < 8) {
          return res.status(400).json({ success: false, message: "Password must be at least 8 characters long" });
        }

        user.password = await bcrypt.hash(password, 10);
      }

      if (loginSource === "login" || loginSource === "signup") {
        user.lastLoginAt = new Date();
      }

      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: "User details saved in database",
      user: buildAuthUserRecord(user)
    });
  } catch (error) {
    console.error("Error during saveAuthUserDetails controller:", error);
    return res.status(500).json({ success: false, message: "Server error while saving user details" });
  }
};

export const getAuthUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password -__v")
      .sort({ createdAt: -1 })
      .lean();

    const formattedUsers = users.map(buildAuthUserRecord);

    return res.status(200).json({
      success: true,
      source: "database",
      dataSource: "database",
      count: formattedUsers.length,
      users: formattedUsers,
      data: formattedUsers
    });
  } catch (error) {
    console.error("Error during getAuthUsers controller:", error);
    return res.status(500).json({ success: false, message: "Server error while fetching auth users" });
  }
};
