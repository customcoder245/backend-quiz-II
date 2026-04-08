import jwt from "jsonwebtoken";
import Question from "../models/question.model.js";
import UserResponse from "../models/userResponse.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const exportsDirectory = path.join(__dirname, "..", "exports");
const ASSESSMENT_COMPLETE_SCREEN = 24;

const slugify = (value) =>
    String(value || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

const normalizeQuestionPayload = (payload, existingQuestion = null) => {
    const normalizedPayload = { ...payload };
    const resolvedOrder = normalizedPayload.order || existingQuestion?.order || "question";

    if (normalizedPayload.attributeId && !normalizedPayload.attributeIds) {
        normalizedPayload.attributeIds = [normalizedPayload.attributeId];
    }

    if (normalizedPayload.classid && !normalizedPayload.classIds) {
        normalizedPayload.classIds = [normalizedPayload.classid];
    }

    if (Array.isArray(normalizedPayload.attributeIds)) {
        normalizedPayload.attributeIds = normalizedPayload.attributeIds
            .map((value) => String(value || "").trim())
            .filter(Boolean);
    }

    if (Array.isArray(normalizedPayload.classIds)) {
        normalizedPayload.classIds = normalizedPayload.classIds
            .map((value) => String(value || "").trim())
            .filter(Boolean);
    }

    if (Array.isArray(normalizedPayload.options)) {
        normalizedPayload.options = normalizedPayload.options.map((option) => ({
            ...option,
            label: option?.label || option?.text || option?.value || "",
            value: option?.value || option?.text || option?.label || "",
            text: option?.text || option?.label || option?.value || ""
        }));
    }

    if (!normalizedPayload.answerFormat) {
        if (normalizedPayload.type === "multi-select") {
            normalizedPayload.answerFormat = "string[]";
        } else if (normalizedPayload.type === "number-input") {
            normalizedPayload.answerFormat = "number";
        } else {
            normalizedPayload.answerFormat = existingQuestion?.answerFormat || "string";
        }
    }

    if (!normalizedPayload.screenKey) {
        normalizedPayload.screenKey =
            existingQuestion?.screenKey ||
            `screen-${resolvedOrder}`;
    }

    if (!normalizedPayload.storageKey) {
        const storageSource =
            normalizedPayload.classIds?.[0] ||
            normalizedPayload.attributeIds?.[0] ||
            normalizedPayload.questionText ||
            normalizedPayload.screenKey;

        normalizedPayload.storageKey =
            existingQuestion?.storageKey ||
            slugify(`${storageSource}-${resolvedOrder}`);
    }

    return normalizedPayload;
};

const getQuestionReference = (response) =>
    response?.questionId ||
    response?._id ||
    response?.id ||
    response?.storageKey ||
    response?.screenKey ||
    response?.questionKey ||
    response?.key ||
    response?.question ||
    response?.questionText ||
    response?.label ||
    response?.title;

const getAnswerValue = (response) => {
    if (response?.answer !== undefined) {
        return response.answer;
    }

    if (response?.value !== undefined) {
        return response.value;
    }

    if (response?.selectedOption !== undefined) {
        return response.selectedOption;
    }

    if (response?.selectedOptions !== undefined) {
        return response.selectedOptions;
    }

    if (response?.selected !== undefined) {
        return response.selected;
    }

    if (response?.option !== undefined) {
        return response.option;
    }

    if (response?.options !== undefined) {
        return response.options;
    }

    if (response?.response !== undefined) {
        return response.response;
    }

    return undefined;
};

const getResponsesFromRequest = (body = {}) => {
    const payload =
        body.responses ||
        body.answers ||
        body.userResponses ||
        body.selectedAnswers ||
        body.assessmentResponses ||
        body.data;

    if (Array.isArray(payload)) {
        return payload.map((item, index) => {
            if (item && typeof item === "object") {
                return {
                    key: item.key || item.questionKey || item.screenKey || item.storageKey || `answer-${index + 1}`,
                    ...item
                };
            }

            return {
                key: `answer-${index + 1}`,
                answer: item
            };
        });
    }

    if (payload && typeof payload === "object") {
        return Object.entries(payload).map(([key, value]) => {
            if (value && typeof value === "object" && !Array.isArray(value)) {
                return {
                    key,
                    ...value,
                    answer: getAnswerValue(value)
                };
            }

            return { key, answer: value };
        });
    }

    return [];
};

const isValidResponsesPayload = (responses) =>
    Array.isArray(responses) &&
    responses.length > 0 &&
    responses.every(
        (item) =>
            item &&
            typeof item === "object" &&
            getAnswerValue(item) !== undefined
    );

const resolveQuestionDetails = async (response) => {
    const questionReference = String(getQuestionReference(response) || "").trim();

    if (mongoose.Types.ObjectId.isValid(questionReference)) {
        const question = await Question.findById(questionReference).select("_id questionText screenKey storageKey");

        return {
            questionId: question?._id || new mongoose.Types.ObjectId(questionReference),
            questionKey: question?.storageKey || question?.screenKey || questionReference,
            questionText: question?.questionText || response.questionText || response.question || questionReference
        };
    }

    const question = await Question.findOne({
        $or: [
            { storageKey: questionReference },
            { screenKey: questionReference },
            { questionText: questionReference }
        ]
    }).select("_id questionText screenKey storageKey");

    return {
        questionId: question?._id || null,
        questionKey: question?.storageKey || question?.screenKey || questionReference,
        questionText: question?.questionText || response.questionText || response.question || questionReference
    };
};

const normalizeResponsesPayload = async (responses) =>
    Promise.all(
        responses.map(async (response) => {
            const questionDetails = await resolveQuestionDetails(response);

            return {
                ...questionDetails,
                answer: getAnswerValue(response)
            };
        })
    );

const extractScreenNumber = (value) => {
    if (value === undefined || value === null) {
        return null;
    }

    if (typeof value === "number") {
        return value;
    }

    const match = String(value).match(/\d+/);
    return match ? Number(match[0]) : null;
};

const hasCompletionScreenInBody = (body = {}) => {
    const screenValues = [
        body.currentScreen,
        body.currentScreenNumber,
        body.screen,
        body.screenNumber,
        body.currentStep,
        body.step,
        body.currentScreenKey,
        body.screenKey
    ];

    return screenValues.some((value) => {
        const screenNumber = extractScreenNumber(value);
        return screenNumber !== null && screenNumber >= ASSESSMENT_COMPLETE_SCREEN;
    });
};

const hasCompletionQuestion = async (responses) => {
    const questionIds = responses
        .map((response) => response.questionId)
        .filter((questionId) => questionId && mongoose.Types.ObjectId.isValid(questionId));

    if (!questionIds.length) {
        return false;
    }

    const completionQuestion = await Question.exists({
        _id: { $in: questionIds },
        order: { $gte: ASSESSMENT_COMPLETE_SCREEN }
    });

    return Boolean(completionQuestion);
};

const shouldCompleteAssessment = async (body = {}, responses = []) => {
    if (body.completed === true || body.isCompleted === true || body.status === "completed") {
        return true;
    }

    if (hasCompletionScreenInBody(body)) {
        return true;
    }

    return hasCompletionQuestion(responses);
};

const normalizeResponseIdentityValue = (value) =>
    String(value || "")
        .trim()
        .toLowerCase();

const getResponseIdentity = (response = {}) => {
    const questionId = response.questionId?._id || response.questionId || null;

    if (questionId) {
        return `id:${String(questionId)}`;
    }

    if (response.questionKey) {
        return `key:${normalizeResponseIdentityValue(response.questionKey)}`;
    }

    if (response.questionText) {
        return `text:${normalizeResponseIdentityValue(response.questionText)}`;
    }

    return null;
};

const toPlainResponse = (response = {}) => ({
    questionId: response.questionId?._id || response.questionId || null,
    questionKey:
        response.questionKey ||
        response.questionId?.storageKey ||
        response.questionId?.screenKey ||
        "",
    questionText: response.questionText || response.questionId?.questionText || "",
    answer: response.answer
});

const mergeStoredResponses = (existingResponses = [], incomingResponses = []) => {
    const mergedResponses = [];
    const responseIndexByIdentity = new Map();

    const upsertResponse = (response) => {
        const normalizedResponse = toPlainResponse(response);
        const identity = getResponseIdentity(normalizedResponse);

        if (identity && responseIndexByIdentity.has(identity)) {
            mergedResponses[responseIndexByIdentity.get(identity)] = normalizedResponse;
            return;
        }

        mergedResponses.push(normalizedResponse);

        if (identity) {
            responseIndexByIdentity.set(identity, mergedResponses.length - 1);
        }
    };

    existingResponses.forEach(upsertResponse);
    incomingResponses.forEach(upsertResponse);

    return mergedResponses;
};

const upsertUserResponse = async ({ userId, responses = [], completed, mergeWithExisting = true }) => {
    const existingUserResponse = mergeWithExisting
        ? await UserResponse.findOne({ userId }).select("responses")
        : null;
    const nextResponses = mergeWithExisting
        ? mergeStoredResponses(existingUserResponse?.responses || [], responses)
        : responses;
    const update = {
        responses: nextResponses,
        lastSavedAt: new Date()
    };

    if (completed) {
        update.completedAt = new Date();
    }

    return UserResponse.findOneAndUpdate(
        { userId },
        {
            $set: update,
            $setOnInsert: { userId }
        },
        {
            returnDocument: "after",
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert: true
        }
    );
};

const extractNameParts = ({ name, fullName, firstName, lastName, middleInitial }) => {
    const resolvedFullName = (fullName || name || "").trim();

    if (resolvedFullName && !firstName && !lastName) {
        const parts = resolvedFullName.split(/\s+/).filter(Boolean);
        return {
            firstName: parts[0] || "Guest",
            middleInitial: middleInitial || "",
            lastName: parts.length > 1 ? parts.slice(1).join(" ") : ""
        };
    }

    return {
        firstName: firstName?.trim() || "Guest",
        middleInitial: middleInitial?.trim() || "",
        lastName: lastName?.trim() || ""
    };
};

const updateUserProfileFromPayload = async (user, payload = {}) => {
    const { name, fullName, firstName, lastName, middleInitial, gender } = payload;
    const nameParts = extractNameParts({ name, fullName, firstName, lastName, middleInitial });

    if (firstName || fullName || name) {
        user.firstName = nameParts.firstName || user.firstName;
    }

    if (middleInitial || fullName || name) {
        user.middleInitial = nameParts.middleInitial || user.middleInitial;
    }

    if (lastName || fullName || name) {
        user.lastName = nameParts.lastName || user.lastName;
    }

    if (gender) {
        user.gender = gender;
    }

    await user.save();
    return user;
};

const buildPublicUserPayload = (user) => ({
    id: user._id,
    name: buildDisplayName(user),
    fullName: buildDisplayName(user),
    email: user.email,
    firstName: user.firstName,
    middleInitial: user.middleInitial,
    lastName: user.lastName,
    gender: user.gender,
    role: user.role,
    signedUpAt: user.createdAt,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt
});

const getParticipantUser = async (userId) => {
    const user = await User.findById(userId);

    if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    if (user.role === "admin") {
        const error = new Error("Admins cannot participate in the assessment. Please use the dashboard.");
        error.statusCode = 403;
        throw error;
    }

    return user;
};

const getParticipantUserFromRequest = async (req) => {
    if (req.user?.userId) {
        return getParticipantUser(req.user.userId);
    }

    const error = new Error("Login token is required to save assessment responses.");
    error.statusCode = 401;
    throw error;
};

const sendParticipantError = (res, error) =>
    res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Server error"
    });

const buildDisplayName = (user) =>
    [
        user?.firstName,
        user?.middleInitial,
        user?.lastName
    ]
        .filter(Boolean)
        .join(" ") || "Guest";

const isObjectIdLike = (value) =>
    value instanceof mongoose.Types.ObjectId ||
    value?._bsontype === "ObjectId" ||
    (typeof value?.toHexString === "function" && !value?.email && !value?.firstName);

const getRecordUser = (record = {}) => {
    if (record.user) {
        return record.user;
    }

    if (record.userId && typeof record.userId === "object" && !isObjectIdLike(record.userId)) {
        return record.userId;
    }

    return null;
};

const getRecordUserId = (record = {}) => {
    const user = getRecordUser(record);

    return user?._id || record.user?._id || record.userId?._id || record.userId || null;
};

const formatSubmissionDate = (value) =>
    value ? new Date(value).toLocaleDateString() : "In Progress";

const formatAnswerValue = (answer) => {
    if (answer == null) {
        return "";
    }

    return Array.isArray(answer) ? answer.join(", ") : String(answer);
};

const formatDateTime = (value) => {
    if (!value) {
        return null;
    }

    return new Date(value).toLocaleString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
};

const normalizeFilterValue = (value) => String(value || "").trim().toLowerCase();

const buildFormattedSubmissions = (records) =>
    records.map((record, index) => {
        const user = getRecordUser(record);
        const validResponses = (record.responses || []).filter(
            (response) => response && typeof response === "object"
        );
        const responseCount = validResponses.length;
        const userId = getRecordUserId(record);

        const firstThreeQuestions = validResponses
            .slice(0, 3)
            .map((response) => response.questionId?.questionText || response.questionText || response.questionKey || "Question")
            .join(", ");

        const summary =
            responseCount > 3
                ? `${firstThreeQuestions}... (+${responseCount - 3} more)`
                : firstThreeQuestions || "No questions answered";

        return {
            id: record._id || user?._id,
            userId,
            userResponseId: record.userResponseId || record._id || null,
            submissionId: `#${1011 + index}`,
            name: buildDisplayName(user),
            username: buildDisplayName(user),
            fullName: buildDisplayName(user),
            email: user?.email || "N/A",
            gender: user?.gender || "N/A",
            date: formatSubmissionDate(record.completedAt),
            createdAt: formatDateTime(record.completedAt || record.createdAt),
            questions: summary,
            responseCount,
            status: record.completedAt ? "Published" : "Draft",
            selectedOptions:
                validResponses
                    .slice(0, 3)
                    .map((response) => formatAnswerValue(response.answer))
                    .join(" | ") + (responseCount > 3 ? "..." : ""),
            fullResponses: validResponses.map((response) => ({
                key: String(
                    response.questionId?.screenKey ||
                    response.questionId?.storageKey ||
                    response.questionKey ||
                    response.questionId?._id ||
                    "question"
                )
                    .replace(/-/g, " ")
                    .toUpperCase(),
                question: response.questionId?.questionText || response.questionText || response.questionKey || "Question",
                answer: formatAnswerValue(response.answer)
            })),
            user: {
                id: userId,
                username: buildDisplayName(user),
                email: user?.email || "N/A",
                gender: user?.gender || "N/A"
            }
        };
    });

const buildDetailedUserResponses = (records) =>
    records.map((record, index) => {
        const user = record.userId || null;
        const responses = (record.responses || []).filter(Boolean);
        const answers = responses.map((response) => ({
            questionId: response.questionId?._id || response.questionId || null,
            question: response.questionId?.questionText || response.questionText || response.questionKey || "Question",
            screenKey: response.questionId?.screenKey || response.questionKey || "",
            storageKey: response.questionId?.storageKey || response.questionKey || "",
            questionKey: response.questionKey || response.questionId?.storageKey || response.questionId?.screenKey || "",
            answer: formatAnswerValue(response.answer)
        }));

        const firstThreeQuestions = answers
            .slice(0, 3)
            .map((answer) => answer.question)
            .join(", ");

        return {
            id: record._id,
            userResponseId: record._id,
            submissionId: `#${1011 + index}`,
            userId: user?._id || null,
            name: buildDisplayName(user),
            username: buildDisplayName(user),
            fullName: buildDisplayName(user),
            email: user?.email || "N/A",
            gender: user?.gender || "N/A",
            role: user?.role || "user",
            date: formatSubmissionDate(record.completedAt),
            createdAt: formatDateTime(record.createdAt),
            updatedAt: formatDateTime(record.updatedAt),
            completedAt: record.completedAt || null,
            lastSavedAt: record.lastSavedAt || record.updatedAt || null,
            responseCount: responses.length,
            status: record.completedAt ? "Published" : "Draft",
            questions:
                responses.length > 3
                    ? `${firstThreeQuestions}... (+${responses.length - 3} more)`
                    : firstThreeQuestions || "No questions answered",
            selectedOptions:
                answers
                    .slice(0, 3)
                    .map((answer) => answer.answer)
                    .join(" | ") + (responses.length > 3 ? "..." : ""),
            answers,
            fullResponses: answers,
            user: {
                id: user?._id || null,
                name: buildDisplayName(user),
                fullName: buildDisplayName(user),
                email: user?.email || "N/A",
                gender: user?.gender || "N/A",
                role: user?.role || "user"
            }
        };
    });

const buildDashboardUsers = (records) =>
    records.map((record) => {
        const user = getRecordUser(record);
        const { password, __v, ...safeUser } = user || {};
        const userId = getRecordUserId(record) || safeUser?._id || record._id || null;

        return {
            ...safeUser,
            _id: userId,
            id: userId,
            userResponseId: record.userResponseId || record._id || null,
            name: safeUser?.name || buildDisplayName(user),
            fullName: safeUser?.fullName || buildDisplayName(user),
            email: safeUser?.email || "N/A",
            gender: safeUser?.gender || "N/A",
            role: safeUser?.role || "user",
            completedAt: record.completedAt || null,
            submitted: Boolean(record.completedAt),
            responseCount: Array.isArray(record.responses) ? record.responses.length : 0,
            signedUpAt: safeUser?.signedUpAt || safeUser?.createdAt || record.createdAt || null,
            createdAt: safeUser?.createdAt || record.createdAt || null,
            updatedAt: safeUser?.updatedAt || record.updatedAt || null,
            lastLoginAt: safeUser?.lastLoginAt || null,
            lastSavedAt: record.lastSavedAt || null,
            authStatus: record.completedAt ? "Published" : (safeUser?.lastLoginAt ? "Logged in" : "Signed up")
        };
    });

const filterDashboardRecords = (records, { q, status }) => {
    const normalizedQuery = normalizeFilterValue(q);
    const normalizedStatus = normalizeFilterValue(status);

    return records.filter((record) => {
        const user = getRecordUser(record) || {};
        const searchable = [
            buildDisplayName(user),
            user.email,
            user.gender
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
        const recordStatus = record.completedAt ? "completed" : "draft";
        const matchesStatus =
            !normalizedStatus ||
            normalizedStatus === "all" ||
            recordStatus === normalizedStatus ||
            (normalizedStatus === "published" && recordStatus === "completed");

        return matchesQuery && matchesStatus;
    });
};

const buildSelectedUser = (submissions, queryEmail) => {
    if (!submissions.length) {
        return null;
    }

    const normalizedQuery = normalizeFilterValue(queryEmail);
    const match =
        submissions.find((submission) => normalizeFilterValue(submission.email) === normalizedQuery) ||
        submissions[0];

    return match
        ? {
            id: match.id,
            submissionId: match.submissionId,
            fullName: match.fullName,
            email: match.email,
            gender: match.gender,
            createdAt: match.createdAt,
            status: match.status,
            responseCount: match.responseCount,
            answers: match.fullResponses
        }
        : null;
};

const buildReportPayload = async (query = {}) => {
    const dashboardRecords = filterDashboardRecords(await getDashboardRecords(), query);
    const stats = await buildDashboardStats();
    const submissions = buildFormattedSubmissions(dashboardRecords);
    const users = buildDashboardUsers(dashboardRecords);
    const selectedUser = buildSelectedUser(submissions, query.q);

    return {
        source: "database",
        dataSource: "database",
        stats,
        users,
        userDetails: users,
        submissions,
        userResponses: submissions,
        selectedUser,
        report: {
            source: "database",
            stats,
            users,
            userDetails: users,
            submissions,
            userResponses: submissions,
            selectedUser,
            totalRows: submissions.length
        }
    };
};

const escapeCsvValue = (value) => `"${String(value ?? "").replace(/"/g, "\"\"")}"`;

const buildCsvContent = (submissions) => {
    const header = [
        "submissionId",
        "fullName",
        "email",
        "gender",
        "status",
        "responseCount",
        "createdAt",
        "questions",
        "selectedOptions"
    ];

    const rows = submissions.map((submission) =>
        [
            submission.submissionId,
            submission.fullName,
            submission.email,
            submission.gender,
            submission.status,
            submission.responseCount,
            submission.createdAt,
            submission.questions,
            submission.selectedOptions
        ]
            .map(escapeCsvValue)
            .join(",")
    );

    return [header.join(","), ...rows].join("\n");
};

const getDashboardRecords = async () => {
    const [users, userResponses] = await Promise.all([
        User.find({ role: "user" })
            .select("-password -__v")
            .sort({ createdAt: -1 })
            .lean(),
        UserResponse.find()
            .populate("responses.questionId", "questionText screenKey storageKey")
            .sort({ createdAt: -1 })
            .lean()
    ]);

    const responseByUserId = new Map(
        userResponses.map((response) => [String(response.userId), response])
    );

    return users.map((user) => {
        const matchedResponse = responseByUserId.get(String(user._id));

        return {
            _id: matchedResponse?._id || user._id,
            id: matchedResponse?._id || user._id,
            userId: matchedResponse?.userId || user._id,
            userResponseId: matchedResponse?._id || null,
            user,
            responses: matchedResponse?.responses || [],
            completedAt: matchedResponse?.completedAt || null,
            lastSavedAt: matchedResponse?.lastSavedAt || null,
            createdAt: matchedResponse?.createdAt || user.createdAt,
            updatedAt: matchedResponse?.updatedAt || user.updatedAt
        };
    });
};

const buildDashboardStats = async () => {
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
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const newAssessmentsToday = await UserResponse.countDocuments({
        createdAt: { $gte: startOfToday }
    });
    const draftSubmissions = totalSubmissions - completedSubmissions;

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

    return {
        source: "database",
        totalSubmissions,
        totalAssessments: totalSubmissions,
        completedSubmissions,
        publishedSubmissions: completedSubmissions,
        publishedCount: completedSubmissions,
        draftSubmissions,
        draftCount: draftSubmissions,
        publishedDraft: `${completedSubmissions}/${draftSubmissions}`,
        totalUsers,
        uniqueUsers: totalUsers,
        completionRate: `${completionRate}%`,
        recentSubmissionsCount,
        newAssessmentsToday,
        newAssessments: newAssessmentsToday,
        genderStats,
        last7Days
    };
};

export const getAllQuestions = async (req, res) => {
    try {
        const { gender, includeInactive, isPopup, stakeholder, domain, subdomain } = req.query;
        const filter = includeInactive === "true" ? {} : { isActive: true };

        if (gender && gender !== "all" && gender !== "both") {
            filter.$or = [{ gender: "both" }, { gender }];
        }

        if (isPopup !== undefined) {
            filter.isPopup = isPopup === "true";
        }

        if (stakeholder) {
            filter.stakeholder = stakeholder;
        }

        if (domain) {
            filter.domain = domain;
        }

        if (subdomain) {
            filter.subdomain = subdomain;
        }

        const questions = await Question.find(filter).sort({ order: 1 });
        return res.status(200).json({
            success: true,
            count: questions.length,
            questions,
            data: questions
        });
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

export const saveLeadUser = async (req, res) => {
    try {
        const user = await getParticipantUserFromRequest(req);
        await updateUserProfileFromPayload(user, req.body);

        return res.status(200).json({
            success: true,
            message: "User details saved",
            user: buildPublicUserPayload(user)
        });
    } catch (error) {
        return sendParticipantError(res, error);
    }
};

export const createQuestion = async (req, res) => {
    try {
        const payload = { ...req.body };

        if (payload.order == null) {
            const lastQuestion = await Question.findOne().sort({ order: -1 }).select("order");
            payload.order = (lastQuestion?.order || 0) + 1;
        }

        const question = await Question.create(normalizeQuestionPayload(payload));
        return res.status(201).json({ success: true, message: "Question created", question });
    } catch (error) {
        console.error("Error in createQuestion:", error);
        return res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

export const updateQuestion = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);
        if (!question) {
            return res.status(404).json({ success: false, message: "Question not found" });
        }

        question.set(normalizeQuestionPayload(req.body, question));
        await question.save();

        return res.status(200).json({ success: true, message: "Question updated", question });
    } catch (error) {
        console.error("Error in updateQuestion:", error);
        return res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

export const deleteQuestion = async (req, res) => {
    try {
        const question = await Question.findByIdAndDelete(req.params.id);
        if (!question) {
            return res.status(404).json({ success: false, message: "Question not found" });
        }

        return res.status(200).json({ success: true, message: "Question deleted" });
    } catch (error) {
        console.error("Error in deleteQuestion:", error);
        return res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

export const saveUserResponses = async (req, res) => {
    try {
        const { completed, gender, name, fullName, firstName, lastName, middleInitial } = req.body;
        const responses = getResponsesFromRequest(req.body);

        if (!isValidResponsesPayload(responses)) {
            return res.status(400).json({
                success: false,
                message: "Assessment responses are required. Send responses/answers as an array or object with question reference and answer."
            });
        }

        const user = await getParticipantUserFromRequest(req);
        const userId = user._id;
        const normalizedResponses = await normalizeResponsesPayload(responses);
        const isCompleted = await shouldCompleteAssessment(req.body, normalizedResponses);

        await updateUserProfileFromPayload(user, {
            gender,
            name,
            fullName,
            firstName,
            lastName,
            middleInitial
        });

        const userResponse = await upsertUserResponse({
            userId,
            responses: normalizedResponses,
            completed: isCompleted,
            mergeWithExisting: true
        });

        return res.status(200).json({ success: true, message: "Responses saved", userResponse });
    } catch (error) {
        console.error("Error in saveUserResponses:", error);
        return sendParticipantError(res, error);
    }
};

export const appendUserResponse = async (req, res) => {
    try {
        const { questionId, _id, id, storageKey, screenKey, questionKey, key, question, answer } = req.body;
        const answerValue = getAnswerValue(req.body);

        if (!(questionId || _id || id || storageKey || screenKey || questionKey || key || question) || answerValue === undefined) {
            return res.status(400).json({
                success: false,
                message: "Question reference and answer are required"
            });
        }

        const user = await getParticipantUserFromRequest(req);
        const userId = user._id;
        const resolvedQuestion = await resolveQuestionDetails({
            questionId,
            _id,
            id,
            storageKey,
            screenKey,
            questionKey,
            key,
            question
        });

        let userResponse = await UserResponse.findOne({ userId });
        if (!userResponse) {
            userResponse = new UserResponse({ userId, responses: [] });
        }

        const existingIndex = userResponse.responses.findIndex(
            (response) =>
                (resolvedQuestion.questionId && response.questionId?.toString() === resolvedQuestion.questionId.toString()) ||
                (resolvedQuestion.questionKey && response.questionKey === resolvedQuestion.questionKey)
        );

        if (existingIndex >= 0) {
            userResponse.responses[existingIndex].answer = answerValue;
            userResponse.responses[existingIndex].questionId = resolvedQuestion.questionId;
            userResponse.responses[existingIndex].questionKey = resolvedQuestion.questionKey;
            userResponse.responses[existingIndex].questionText = resolvedQuestion.questionText;
        } else {
            userResponse.responses.push({ ...resolvedQuestion, answer: answerValue });
        }

        userResponse.lastSavedAt = new Date();
        if (await shouldCompleteAssessment(req.body, [{ ...resolvedQuestion, answer: answerValue }])) {
            userResponse.completedAt = new Date();
        }
        await userResponse.save();
        return res.status(200).json({ success: true, message: "Response appended", userResponse });
    } catch (error) {
        console.error("Error in appendUserResponse:", error);
        return sendParticipantError(res, error);
    }
};

export const getUserResponses = async (req, res) => {
    try {
        const userId = req.user.userId;
        const userResponse = await UserResponse.findOne({ userId }).populate("responses.questionId");

        if (!userResponse) {
            return res.status(404).json({ message: "No responses found for this user" });
        }

        return res.status(200).json({ success: true, userResponse });
    } catch (error) {
        console.error("Error in getUserResponses:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const submitAssessment = async (req, res) => {
    try {
        const {
            name,
            fullName,
            firstName,
            lastName,
            middleInitial,
            gender
        } = req.body;
        const responses = getResponsesFromRequest(req.body);
        const hasIncomingResponses = responses.length > 0;

        if (hasIncomingResponses && !isValidResponsesPayload(responses)) {
            return res.status(400).json({
                success: false,
                message: "Assessment responses are required. Send responses/answers as an array or object with question reference and answer."
            });
        }

        const user = await getParticipantUserFromRequest(req);
        let userResponse;

        if (hasIncomingResponses) {
            const normalizedResponses = await normalizeResponsesPayload(responses);

            userResponse = await upsertUserResponse({
                userId: user._id,
                responses: normalizedResponses,
                completed: true,
                mergeWithExisting: true
            });
        } else {
            userResponse = await UserResponse.findOneAndUpdate(
                { userId: user._id },
                {
                    $set: {
                        completedAt: new Date(),
                        lastSavedAt: new Date()
                    }
                },
                { returnDocument: "after" }
            );

            if (!userResponse || !Array.isArray(userResponse.responses) || userResponse.responses.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "No saved assessment responses found for this user. Submit responses or save them before finishing the assessment."
                });
            }
        }

        await updateUserProfileFromPayload(user, {
            name,
            fullName,
            firstName,
            lastName,
            middleInitial,
            gender
        });

        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.status(200).json({
            success: true,
            message: "Assessment submitted",
            token,
            user: buildPublicUserPayload(user),
            userResponse
        });
    } catch (error) {
        console.error("Error in submitAssessment:", error);
        return sendParticipantError(res, error);
    }
};

export const completeAssessment = async (req, res) => {
    try {
        const user = await getParticipantUserFromRequest(req);
        const responses = getResponsesFromRequest(req.body);
        const hasIncomingResponses = responses.length > 0;
        let userResponse;

        if (hasIncomingResponses) {
            if (!isValidResponsesPayload(responses)) {
                return res.status(400).json({
                    success: false,
                    message: "Assessment responses are invalid. Send responses/answers with question reference and answer."
                });
            }

            const normalizedResponses = await normalizeResponsesPayload(responses);
            userResponse = await upsertUserResponse({
                userId: user._id,
                responses: normalizedResponses,
                completed: true,
                mergeWithExisting: true
            });
        } else {
            userResponse = await UserResponse.findOneAndUpdate(
                { userId: user._id },
                {
                    $set: {
                        completedAt: new Date(),
                        lastSavedAt: new Date()
                    }
                },
                { returnDocument: "after" }
            );

            if (!userResponse) {
                return res.status(400).json({
                    success: false,
                    message: "No saved assessment responses found for this user. Send responses with the complete request."
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: "Assessment completed and saved",
            user: buildPublicUserPayload(user),
            userResponse
        });
    } catch (error) {
        console.error("Error in completeAssessment:", error);
        return sendParticipantError(res, error);
    }
};

export const getAllSubmissions = async (req, res) => {
    try {
        const dashboardRecords = filterDashboardRecords(await getDashboardRecords(), req.query);
        const formattedSubmissions = buildFormattedSubmissions(dashboardRecords);

        return res.status(200).json({
            success: true,
            source: "database",
            dataSource: "database",
            count: formattedSubmissions.length,
            submissions: formattedSubmissions,
            userResponses: formattedSubmissions,
            debug: {
                rawCount: dashboardRecords.length,
                dbConnected: mongoose.connection.readyState === 1
            }
        });
    } catch (error) {
        console.error("Error in getAllSubmissions:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const getAllUserResponses = async (req, res) => {
    try {
        const dashboardRecords = filterDashboardRecords(await getDashboardRecords(), req.query);
        const responseDocumentCount = await UserResponse.countDocuments();
        const userResponses = buildFormattedSubmissions(dashboardRecords).map((submission) => ({
            ...submission,
            answers: submission.fullResponses
        }));

        return res.status(200).json({
            success: true,
            source: "database",
            dataSource: "database",
            count: userResponses.length,
            responseDocumentCount,
            userResponses,
            submissions: userResponses,
            data: userResponses,
            debug: {
                rawCount: dashboardRecords.length,
                responseDocumentCount,
                dbConnected: mongoose.connection.readyState === 1
            }
        });
    } catch (error) {
        console.error("Error in getAllUserResponses:", error);
        return res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

export const getDashboardStats = async (req, res) => {
    try {
        const stats = await buildDashboardStats();

        return res.status(200).json({
            success: true,
            stats
        });
    } catch (error) {
        console.error("Error in getDashboardStats:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const getDashboardUsers = async (req, res) => {
    try {
        const dashboardRecords = filterDashboardRecords(await getDashboardRecords(), req.query);
        const users = buildDashboardUsers(dashboardRecords);

        return res.status(200).json({
            success: true,
            count: users.length,
            users
        });
    } catch (error) {
        console.error("Error in getDashboardUsers:", error);
        return res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

export const getReportsData = async (req, res) => {
    try {
        const reportPayload = await buildReportPayload(req.query);

        return res.status(200).json({
            success: true,
            ...reportPayload
        });
    } catch (error) {
        console.error("Error in getReportsData:", error);
        return res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

export const exportReportsData = async (req, res) => {
    try {
        const format = String(req.query.format || "json").toLowerCase();
        const reportPayload = await buildReportPayload(req.query);
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const extension = format === "csv" ? "csv" : "json";
        const fileName = `report-${timestamp}.${extension}`;
        const filePath = path.join(exportsDirectory, fileName);

        await fs.mkdir(exportsDirectory, { recursive: true });

        const fileContent =
            extension === "csv"
                ? buildCsvContent(reportPayload.submissions)
                : JSON.stringify(
                    {
                        exportedAt: new Date().toISOString(),
                        ...reportPayload
                    },
                    null,
                    2
                );

        await fs.writeFile(filePath, fileContent, "utf8");

        return res.status(200).json({
            success: true,
            message: "Report exported successfully",
            fileName,
            filePath,
            downloadUrl: `/exports/${fileName}`,
            format: extension,
            totalRows: reportPayload.report.totalRows
        });
    } catch (error) {
        console.error("Error in exportReportsData:", error);
        return res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

export const getAdminDashboardData = async (req, res) => {
    try {
        const dashboardRecords = filterDashboardRecords(await getDashboardRecords(), req.query);
        const stats = await buildDashboardStats();
        const formattedSubmissions = buildFormattedSubmissions(dashboardRecords);
        const users = buildDashboardUsers(dashboardRecords);
        const selectedUser = buildSelectedUser(formattedSubmissions, req.query.q);

        return res.status(200).json({
            success: true,
            source: "database",
            dataSource: "database",
            stats,
            users,
            userDetails: users,
            submissions: formattedSubmissions,
            userResponses: formattedSubmissions,
            selectedUser,
            dashboard: {
                source: "database",
                dataSource: "database",
                stats,
                users,
                userDetails: users,
                submissions: formattedSubmissions,
                userResponses: formattedSubmissions,
                selectedUser
            }
        });
    } catch (error) {
        console.error("Error in getAdminDashboardData:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const deleteUserResponses = async (req, res) => {
    try {
        const userId = req.user.userId;
        await UserResponse.findOneAndDelete({ userId });
        return res.status(200).json({ success: true, message: "Quiz responses reset successfully" });
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

        return res.status(200).json({ success: true, message: "Questions reordered successfully" });
    } catch (error) {
        console.error("Error in reorderQuestions:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};
