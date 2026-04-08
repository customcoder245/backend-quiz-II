import express from "express";
import { adminLogin, getAdminLoginHint, getAuthUsers } from "../controllers/auth.controller.js";
import {
    createQuestion,
    deleteQuestion,
    getAdminDashboardData,
    getAllQuestions,
    getAllUserResponses,
    getReportsData,
    reorderQuestions,
    updateQuestion
} from "../controllers/question.controller.js";
import { adminOnly, protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/login", adminLogin);
router.get("/login-hint", getAdminLoginHint);
router.get("/user-details", protect, adminOnly, getAuthUsers);
router.get("/dashboard", protect, adminOnly, getAdminDashboardData);
router.get("/user-responses", protect, adminOnly, getAllUserResponses);
router.get("/reports", protect, adminOnly, getReportsData);
router.get("/questions", protect, adminOnly, getAllQuestions);
router.post("/questions", protect, adminOnly, createQuestion);
router.put("/questions/:id", protect, adminOnly, updateQuestion);
router.delete("/questions/:id", protect, adminOnly, deleteQuestion);
router.post("/questions/reorder", protect, adminOnly, reorderQuestions);

export default router;
