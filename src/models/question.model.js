import mongoose, { Schema } from "mongoose";

const optionSchema = new Schema(
    {
        text: { type: String, required: true },
        emoji: { type: String, default: "" },
        score: { type: Number, default: 0 }
    },
    { _id: false }
);

const questionSchema = new Schema(
    {
        order: {
            type: Number,
            required: true,
        },
        questionText: {
            type: String,
            required: true,
        },
        // single-select | multi-select | text-input | number-input | breakpoint
        type: {
            type: String,
            enum: ["single-select", "multi-select", "text-input", "number-input", "breakpoint"],
            required: true,
        },
        // For breakpoint type
        customHtml: { type: String, default: "" },
        customCss: { type: String, default: "" },
        customJs: { type: String, default: "" },
        // 'both' | 'male' | 'female' — for gender-specific questions
        gender: {
            type: String,
            enum: ["both", "male", "female"],
            default: "both",
        },
        options: {
            type: [optionSchema],
            default: [],
        },
        // true = popup question shown during analysis
        isPopup: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        classid: {
            type: String,
            default: ""
        },
        attributeId: {
            type: String,
            default: ""
        }
    },
    { timestamps: true, collection: "questions" }
);

export default mongoose.model("Question", questionSchema);
