import express from "express";
import {
  completeAssessment,
  getUserResponses,
  saveLeadUser,
  saveUserResponses,
  submitAssessment
} from "../controllers/question.controller.js";
import { optionalProtect, protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/me", protect, getUserResponses);
router.post("/", optionalProtect, saveUserResponses);
router.post("/save", optionalProtect, saveUserResponses);
router.post("/store", optionalProtect, saveUserResponses);
router.post("/user-details", optionalProtect, saveLeadUser);
router.post("/complete", optionalProtect, completeAssessment);
router.post("/submit", optionalProtect, submitAssessment);

export default router;
