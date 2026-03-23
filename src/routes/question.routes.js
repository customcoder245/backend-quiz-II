import express from "express";
import {
    getAllQuestions,
    getQuestionById,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    saveUserResponses,
    appendUserResponse,
    submitAssessment,
    getUserResponses,
    deleteUserResponses,
    getAllSubmissions,
    getDashboardStats,
    reorderQuestions,
} from "../controllers/question.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

// ─── USER RESPONSES (protected/public) ─────────────────────────
router.post("/submit", submitAssessment);                      // POST /api/v1/questions/submit (Public)
router.get("/submissions", protect, getAllSubmissions);        // GET /api/v1/questions/submissions (Admin)
router.get("/stats", protect, getDashboardStats);                // GET /api/v1/questions/stats (Admin)
router.post("/responses/save", protect, saveUserResponses);    // POST /api/v1/questions/responses/save
router.post("/responses/append", protect, appendUserResponse); // POST /api/v1/questions/responses/append
router.get("/responses/me", protect, getUserResponses);        // GET /api/v1/questions/responses/me
router.delete("/responses/me", protect, deleteUserResponses);  // DELETE /api/v1/questions/responses/me

// ─── QUESTION REORDER ─────────────────────────────────────────
router.post("/reorder", protect, reorderQuestions);            // POST /api/v1/questions/reorder (Admin)

// ─── QUESTION CRUD ───────────────────────────────────────────
router.get("/", getAllQuestions);            // GET /api/v1/questions (Public)
router.post("/", protect, createQuestion);   // POST /api/v1/questions (Admin)
router.get("/:id", getQuestionById);        // GET /api/v1/questions/:id (Public)
router.put("/:id", protect, updateQuestion); // PUT /api/v1/questions/:id (Admin)
router.delete("/:id", protect, deleteQuestion); // DELETE /api/v1/questions/:id (Admin)

export default router;
