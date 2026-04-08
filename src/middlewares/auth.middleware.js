import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const getTokenFromRequest = (req) => {
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith("Bearer ")) {
        return authHeader.split(" ")[1];
    }

    return req.headers["x-auth-token"] || req.headers["x-invite-token"] || req.body?.token || req.query?.token || null;
};

const attachUserFromToken = async (req, token) => {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
        const error = new Error("User not found.");
        error.statusCode = 401;
        throw error;
    }

    req.user = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        gender: user.gender,
    };
};

export const protect = async (req, res, next) => {
    const token = getTokenFromRequest(req);

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Not authorized. Login token is required."
        });
    }

    try {
        await attachUserFromToken(req, token);
        next();
    } catch (error) {
        return res.status(error.statusCode || 401).json({
            success: false,
            message: error.message || "Invalid or expired token."
        });
    }
};

export const optionalProtect = async (req, res, next) => {
    const token = getTokenFromRequest(req);

    if (!token) {
        return next();
    }

    try {
        await attachUserFromToken(req, token);
        return next();
    } catch (error) {
        return res.status(error.statusCode || 401).json({
            success: false,
            message: error.message || "Invalid or expired token."
        });
    }
};

export const adminOnly = (req, res, next) => {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required." });
    }

    next();
};
