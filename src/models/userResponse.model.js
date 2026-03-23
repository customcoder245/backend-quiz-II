import mongoose, { Schema } from "mongoose";

const answerSchema = new Schema(
    {
        questionId: {
            type: Schema.Types.ObjectId,
            ref: "Question",
            required: true,
        },
        // For single-select: a string. For multi-select: an array. For input: a string/number.
        answer: {
            type: Schema.Types.Mixed,
            required: true,
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
    },
    { timestamps: true, collection: "userresponses" }
);

export default mongoose.model("UserResponse", userResponseSchema);
