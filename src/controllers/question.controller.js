import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Question from "../models/question.model.js";
import UserResponse from "../models/userResponse.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const isValidResponsesPayload = (responses) =>
    Array.isArray(responses) &&
    responses.every(
        (item) =>
            item &&
            typeof item === "object" &&
            item.questionId &&
            item.answer !== undefined
    );

export const getAllQuestions = async (req, res) => {
    try {
        const { gender, includeInactive, isPopup } = req.query;
        const filter = includeInactive === "true" ? {} : { isActive: true };

        if (gender && gender !== "all" && gender !== "both") {
            filter.$or = [{ gender: "both" }, { gender }];
        }

        if (isPopup !== undefined) {
            filter.isPopup = isPopup === "true";
        }

        const questions = await Question.find(filter).sort({ order: 1 });
        return res.status(200).json({ questions });
    } catch (error) {
        console.error("Error in getAllQuestions:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const getQuestionById = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);
        if (!question) {
            return res.status(404).json({ message: "Question not found" });
        }

        return res.status(200).json({ question });
    } catch (error) {
        console.error("Error in getQuestionById:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const createQuestion = async (req, res) => {
    try {
        const payload = { ...req.body };

        if (payload.order == null) {
            const lastQuestion = await Question.findOne().sort({ order: -1 }).select("order");
            payload.order = (lastQuestion?.order || 0) + 1;
        }

        const question = await Question.create(payload);
        return res.status(201).json({ message: "Question created", question });
    } catch (error) {
        console.error("Error in createQuestion:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const updateQuestion = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);
        if (!question) {
            return res.status(404).json({ message: "Question not found" });
        }

        question.set(req.body);
        await question.save();

        return res.status(200).json({ message: "Question updated", question });
    } catch (error) {
        console.error("Error in updateQuestion:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const deleteQuestion = async (req, res) => {
    try {
        const question = await Question.findByIdAndDelete(req.params.id);
        if (!question) {
            return res.status(404).json({ message: "Question not found" });
        }

        return res.status(200).json({ message: "Question deleted" });
    } catch (error) {
        console.error("Error in deleteQuestion:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const saveUserResponses = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { responses, completed, gender } = req.body;

        if (!isValidResponsesPayload(responses)) {
            return res.status(400).json({
                message: "responses must be an array of { questionId, answer } objects"
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.role === "admin") {
            return res.status(403).json({
                message: "Admins cannot participate in the assessment. Please use the dashboard."
            });
        }

        if (gender) {
            user.gender = gender;
            await user.save();
        }

        let userResponse = await UserResponse.findOne({ userId });
        if (!userResponse) {
            userResponse = new UserResponse({ userId, responses: [] });
        }

        userResponse.responses = responses;
        userResponse.completedAt = completed ? new Date() : null;
        await userResponse.save();

        return res.status(200).json({ message: "Responses saved", userResponse });
    } catch (error) {
        console.error("Error in saveUserResponses:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const appendUserResponse = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { questionId, answer } = req.body;

        if (!questionId || answer === undefined) {
            return res.status(400).json({ message: "questionId and answer are required" });
        }

        let userResponse = await UserResponse.findOne({ userId });
        if (!userResponse) {
            userResponse = new UserResponse({ userId, responses: [] });
        }

        const existingIndex = userResponse.responses.findIndex(
            (response) => response.questionId.toString() === questionId
        );

        if (existingIndex >= 0) {
            userResponse.responses[existingIndex].answer = answer;
        } else {
            userResponse.responses.push({ questionId, answer });
        }

        await userResponse.save();
        return res.status(200).json({ message: "Response appended", userResponse });
    } catch (error) {
        console.error("Error in appendUserResponse:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const getUserResponses = async (req, res) => {
    try {
        const userId = req.user.userId;
        const userResponse = await UserResponse.findOne({ userId }).populate("responses.questionId");

        if (!userResponse) {
            return res.status(404).json({ message: "No responses found for this user" });
        }

        return res.status(200).json({ userResponse });
    } catch (error) {
        console.error("Error in getUserResponses:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const submitAssessment = async (req, res) => {
    try {
        const { email, firstName, responses, gender } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        if (!isValidResponsesPayload(responses)) {
            return res.status(400).json({
                message: "responses must be an array of { questionId, answer } objects"
            });
        }

        let user = await User.findOne({ email });

        if (!user) {
            const generatedPassword = Math.random().toString(36).slice(-8) + "A1!";
            const hashedPassword = await bcrypt.hash(generatedPassword, 10);

            user = await User.create({
                email,
                firstName: firstName || "Guest",
                gender: gender || "other",
                password: hashedPassword,
                role: "user"
            });
        } else {
            if (firstName) {
                user.firstName = firstName;
            }

            if (gender) {
                user.gender = gender;
            }

            await user.save();
        }

        let userResponse = await UserResponse.findOne({ userId: user._id });
        if (!userResponse) {
            userResponse = new UserResponse({ userId: user._id, responses: [] });
        }

        userResponse.responses = responses;
        userResponse.completedAt = new Date();
        await userResponse.save();

        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.status(200).json({
            message: "Assessment submitted",
            token,
            user: {
                email: user.email,
                firstName: user.firstName,
                gender: user.gender,
                role: user.role
            },
            userResponse
        });
    } catch (error) {
        console.error("Error in submitAssessment:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const getAllSubmissions = async (req, res) => {
    try {
        const submissions = await UserResponse.find()
            .populate("userId", "firstName email gender")
            .populate("responses.questionId", "questionText")
            .sort({ createdAt: -1 });

        const formattedSubmissions = submissions.map((submission) => {
            const validResponses = (submission.responses || []).filter(
                (response) => response && typeof response === "object"
            );
            const responseCount = validResponses.length;

            const firstThreeQuestions = validResponses
                .slice(0, 3)
                .map((response) => response.questionId?.questionText || "Deleted Question")
                .join(", ");

            const summary =
                responseCount > 3
                    ? `${firstThreeQuestions}... (+${responseCount - 3} more)`
                    : firstThreeQuestions || "No questions answered";

            return {
                id: submission._id,
                name: submission.userId?.firstName || "Guest",
                email: submission.userId?.email || "N/A",
                gender: submission.userId?.gender || "N/A",
                date: submission.completedAt
                    ? new Date(submission.completedAt).toLocaleDateString()
                    : "In Progress",
                questions: summary,
                responseCount,
                selectedOptions:
                    validResponses
                        .slice(0, 3)
                        .map((response) => {
                            if (response.answer == null) {
                                return "";
                            }

                            return Array.isArray(response.answer)
                                ? response.answer.join(", ")
                                : String(response.answer);
                        })
                        .join(" | ") + (responseCount > 3 ? "..." : ""),
                fullResponses: validResponses.map((response) => ({
                    question: response.questionId?.questionText || "Deleted Question",
                    answer:
                        response.answer != null
                            ? Array.isArray(response.answer)
                                ? response.answer.join(", ")
                                : String(response.answer)
                            : ""
                }))
            };
        });

        return res.status(200).json({
            submissions: formattedSubmissions,
            debug: {
                rawCount: submissions.length,
                dbConnected: mongoose.connection.readyState === 1
            }
        });
    } catch (error) {
        console.error("Error in getAllSubmissions:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const getDashboardStats = async (req, res) => {
    try {
        const totalSubmissions = await UserResponse.countDocuments();
        const completedSubmissions = await UserResponse.countDocuments({
            completedAt: { $ne: null }
        });
        const totalUsers = await User.countDocuments({ role: "user" });

        const completionRate =
            totalSubmissions > 0
                ? ((completedSubmissions / totalSubmissions) * 100).toFixed(1)
                : 0;

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentSubmissionsCount = await UserResponse.countDocuments({
            createdAt: { $gte: sevenDaysAgo }
        });

        const femaleCount = await User.countDocuments({ role: "user", gender: "female" });
        const maleCount = await User.countDocuments({ role: "user", gender: "male" });
        const otherCount = await User.countDocuments({ role: "user", gender: "other" });

        const totalWithGender = femaleCount + maleCount + otherCount;
        const genderStats = {
            female: totalWithGender > 0 ? Math.round((femaleCount / totalWithGender) * 100) : 0,
            male: totalWithGender > 0 ? Math.round((maleCount / totalWithGender) * 100) : 0,
            other: totalWithGender > 0 ? Math.round((otherCount / totalWithGender) * 100) : 0
        };

        const last7Days = [];
        for (let i = 6; i >= 0; i -= 1) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const count = await UserResponse.countDocuments({
                updatedAt: {
                    $gte: date,
                    $lt: nextDate
                }
            });

            last7Days.push({
                day: date.toLocaleDateString("en-US", { weekday: "short" }),
                count
            });
        }

        return res.status(200).json({
            stats: {
                totalSubmissions,
                completedSubmissions,
                totalUsers,
                completionRate: `${completionRate}%`,
                recentSubmissionsCount,
                genderStats,
                last7Days
            }
        });
    } catch (error) {
        console.error("Error in getDashboardStats:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const deleteUserResponses = async (req, res) => {
    try {
        const userId = req.user.userId;
        await UserResponse.findOneAndDelete({ userId });
        return res.status(200).json({ message: "Quiz responses reset successfully" });
    } catch (error) {
        console.error("Error in deleteUserResponses:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const reorderQuestions = async (req, res) => {
    try {
        const { orderedIds } = req.body;
        if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
            return res.status(400).json({ message: "orderedIds array is required" });
        }

        const validIds = orderedIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
        if (validIds.length === 0) {
            return res.status(400).json({ message: "No valid IDs provided" });
        }

        const offset = 1000000;
        const tempOps = validIds.map((id, index) => ({
            updateOne: {
                filter: { _id: new mongoose.Types.ObjectId(id) },
                update: { $set: { order: index + 1 + offset } }
            }
        }));
        await Question.bulkWrite(tempOps, { ordered: false });

        const finalOps = validIds.map((id, index) => ({
            updateOne: {
                filter: { _id: new mongoose.Types.ObjectId(id) },
                update: { $set: { order: index + 1 } }
            }
        }));
        await Question.bulkWrite(finalOps, { ordered: false });

        return res.status(200).json({ message: "Questions reordered successfully" });
    } catch (error) {
        console.error("Error in reorderQuestions:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};
