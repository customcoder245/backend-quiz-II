import express from "express";
import {
  completeAssessment,
  saveUserResponses,
  submitAssessment
} from "../controllers/question.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", protect, saveUserResponses);
router.post("/save", protect, saveUserResponses);
router.post("/complete", protect, completeAssessment);
router.post("/submit", protect, submitAssessment);

export default router;
