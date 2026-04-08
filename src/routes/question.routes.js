import express from "express";
import {
    getAllQuestions,
    getQuestionById,
    createQuestion,
    completeAssessment,
    saveLeadUser,
    updateQuestion,
    deleteQuestion,
    saveUserResponses,
    submitAssessment,
    reorderQuestions,
} from "../controllers/question.controller.js";
import { adminOnly, optionalProtect, protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

// ─── USER RESPONSES (protected/public) ─────────────────────────
router.post("/submit", optionalProtect, submitAssessment);             // POST /api/v1/questions/submit (User)
router.post("/responses/save", optionalProtect, saveUserResponses);    // POST /api/v1/questions/responses/save
router.post("/responses/store", optionalProtect, saveUserResponses);   // POST /api/v1/questions/responses/store
router.post("/responses/user-details", optionalProtect, saveLeadUser); // POST /api/v1/questions/responses/user-details
router.post("/responses/complete", optionalProtect, completeAssessment); // POST /api/v1/questions/responses/complete

// ─── QUESTION REORDER ─────────────────────────────────────────
router.post("/reorder", protect, adminOnly, reorderQuestions);            // POST /api/v1/questions/reorder (Admin)

// ─── QUESTION CRUD ───────────────────────────────────────────
router.get("/all", protect, getAllQuestions);         // GET /api/v1/questions/all (User/Admin)
router.get("/", protect, getAllQuestions);            // GET /api/v1/questions (User/Admin)
router.post("/", protect, adminOnly, createQuestion);   // POST /api/v1/questions (Admin)
router.get("/:id", protect, getQuestionById);        // GET /api/v1/questions/:id (User/Admin)
router.put("/:id", protect, adminOnly, updateQuestion); // PUT /api/v1/questions/:id (Admin)
router.delete("/:id", protect, adminOnly, deleteQuestion); // DELETE /api/v1/questions/:id (Admin)

export default router;
