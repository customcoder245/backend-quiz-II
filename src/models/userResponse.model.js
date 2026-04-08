import mongoose, { Schema } from "mongoose";

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
