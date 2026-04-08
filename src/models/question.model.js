import mongoose, { Schema } from "mongoose";

const optionSchema = new Schema(
    {
        value: { type: String, required: true, trim: true },
        label: { type: String, required: true, trim: true },
        text: { type: String, default: "", trim: true },
        emoji: { type: String, default: "" },
        image: { type: String, default: "" },
        score: { type: Number, default: 0 },
        onText: {
            type: String,
            default: "",
            trim: true
        }
    },
    { _id: false }
);

const inputConfigSchema = new Schema(
    {
        min: { type: Number, default: null },
        max: { type: Number, default: null },
        step: { type: Number, default: 1 },
        unit: { type: String, default: "" },
        placeholder: { type: String, default: "" }
    },
    { _id: false }
);

const questionSchema = new Schema(
    {
        order: {
            type: Number,
            required: true,
            min: 1
        },
        screenKey: {
            type: String,
            required: true,
            trim: true
        },
        storageKey: {
            type: String,
            required: true,
            trim: true,
            unique: true
        },
        questionText: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            default: "",
            trim: true
        },
        type: {
            type: String,
            enum: ["single-select", "multi-select", "number-input", "text-input", "breakpoint"],
            required: true
        },
        answerFormat: {
            type: String,
            enum: ["string", "number", "string[]"],
            default: "string"
        },
        gender: {
            type: String,
            enum: ["both", "male", "female"],
            default: "both"
        },
        options: {
            type: [optionSchema],
            default: []
        },
        inputConfig: {
            type: inputConfigSchema,
            default: () => ({})
        },
        attributeIds: {
            type: [String],
            default: []
        },
        classIds: {
            type: [String],
            default: []
        },
        nextScreenKey: {
            type: String,
            default: "",
            trim: true
        },
        isPopup: {
            type: Boolean,
            default: false
        },
        stakeholder: {
            type: String,
            default: "",
            trim: true
        },
        domain: {
            type: String,
            default: "",
            trim: true
        },
        subdomain: {
            type: String,
            default: "",
            trim: true
        },
        customHtml: {
            type: String,
            default: ""
        },
        customCss: {
            type: String,
            default: ""
        },
        customJs: {
            type: String,
            default: ""
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true,
        collection: "questions",
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

questionSchema.virtual("attributeId").get(function attributeIdGetter() {
    return this.attributeIds?.[0] || "";
});

questionSchema.virtual("classid").get(function classIdGetter() {
    return this.classIds?.[0] || "";
});

questionSchema.pre("validate", function validateQuestion() {
    const selectableTypes = ["single-select", "multi-select"];
    const inputTypes = ["number-input", "text-input"];
    const displayOnlyTypes = ["breakpoint"];

    if (!this.answerFormat) {
        if (this.type === "multi-select") {
            this.answerFormat = "string[]";
        } else if (this.type === "number-input") {
            this.answerFormat = "number";
        } else {
            this.answerFormat = "string";
        }
    }

    if (Array.isArray(this.options)) {
        this.options = this.options.map((option) => {
            if (!option) {
                return option;
            }

            const normalizedLabel = option.label || option.text || option.value || "";
            const normalizedValue = option.value || option.text || option.label || "";

            return {
                ...option,
                label: normalizedLabel,
                value: normalizedValue,
                text: option.text || normalizedLabel
            };
        });
    }

    if (selectableTypes.includes(this.type) && (!Array.isArray(this.options) || this.options.length === 0)) {
        throw new Error("Selectable questions must include at least one option.");
    }

    if (inputTypes.includes(this.type) && Array.isArray(this.options) && this.options.length > 0) {
        throw new Error("Input questions cannot include selectable options.");
    }

    if (displayOnlyTypes.includes(this.type) && Array.isArray(this.options) && this.options.length > 0) {
        throw new Error("Breakpoint questions cannot include selectable options.");
    }

    if (this.answerFormat === "number" && this.type !== "number-input") {
        throw new Error("answerFormat 'number' is only valid for number-input questions.");
    }

    if (this.answerFormat === "string[]" && this.type !== "multi-select") {
        throw new Error("answerFormat 'string[]' is only valid for multi-select questions.");
    }

    if (this.answerFormat === "string" && this.type === "multi-select") {
        throw new Error("Multi-select questions must use answerFormat 'string[]'.");
    }
});

questionSchema.index({ order: 1 }, { unique: true });
questionSchema.index({ gender: 1, isActive: 1, order: 1 });

export default mongoose.model("Question", questionSchema);
