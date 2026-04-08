import express from "express";
import { getMe, login, register, saveAuthUserDetails } from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/signup", register);
router.post("/login", login);
router.post("/user-details", saveAuthUserDetails);
router.get("/me", protect, getMe);

export default router;
