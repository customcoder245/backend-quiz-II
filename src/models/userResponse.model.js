import mongoose, { Schema } from "mongoose";

const userSnapshotSchema = new Schema(
    {
        id: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        name: {
            type: String,
            default: "",
            trim: true,
        },
        fullName: {
            type: String,
            default: "",
            trim: true,
        },
        email: {
            type: String,
            default: "",
            lowercase: true,
            trim: true,
        },
        firstName: {
            type: String,
            default: "",
            trim: true,
        },
        middleInitial: {
            type: String,
            default: "",
            trim: true,
        },
        lastName: {
            type: String,
            default: "",
            trim: true,
        },
        gender: {
            type: String,
            default: "",
            trim: true,
        },
        role: {
            type: String,
            default: "user",
            trim: true,
        },
        signedUpAt: {
            type: Date,
            default: null,
        },
        createdAt: {
            type: Date,
            default: null,
        },
        lastLoginAt: {
            type: Date,
            default: null,
        },
    },
    { _id: false }
);

const answerSchema = new Schema(
    {
        questionId: {
            type: Schema.Types.ObjectId,
            ref: "Question",
            default: null,
        },
        questionKey: {
            type: String,
            default: "",
            trim: true,
        },
        questionText: {
            type: String,
            default: "",
            trim: true,
        },
        screenKey: {
            type: String,
            default: "",
            trim: true,
        },
        storageKey: {
            type: String,
            default: "",
            trim: true,
        },
        questionSnapshot: {
            type: Schema.Types.Mixed,
            default: null,
        },
        rawResponse: {
            type: Schema.Types.Mixed,
            default: null,
        },
        // For single-select: a string. For multi-select: an array. For input: a string/number.
        answer: {
            type: Schema.Types.Mixed,
            default: null,
        },
    },
    { _id: false }
);

const userResponseSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true, // one quiz response per user 
        },
        user: {
            type: userSnapshotSchema,
            default: () => ({}),
        },
        requestPayload: {
            type: Schema.Types.Mixed,
            default: null,
        },
        assessmentInfo: {
            type: Schema.Types.Mixed,
            default: null,
        },
        submissionId: {
            type: String,
            default: "",
            trim: true,
        },
        responses: [answerSchema],
        completedAt: {
            type: Date,
            default: null,
        },
        lastSavedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true, collection: "userresponses" }
);

export default mongoose.model("UserResponse", userResponseSchema);
