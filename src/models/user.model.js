import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
    {
        email: {
            type: String,
            required: [true, "Email is required"],
            lowercase: true,
            trim: true,
            unique: true
        },
        password: {
            type: String,
            required() {
                return this.role === "admin";
            },
            validate: {
                validator(value) {
                    return !value || value.length >= 8;
                },
                message: "Password must be at least 8 characters long"
            }
        },
        firstName: {
            type: String,
            required: false,
            trim: true
        },
        middleInitial: {
            type: String,
            required: false
        },
        lastName: {
            type: String,
            required: false,
            trim: true
        },
        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user"
        },
        gender: {
            type: String,
            enum: ["male", "female", "other"],
            required: false
        },
        lastLoginAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

export default mongoose.model("User", userSchema);
