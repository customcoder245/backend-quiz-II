import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
    email: {
        type: String,
        required: [true, "Email is required"],
        lowercase: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
        minLength: 8,
    },
    firstName: {
        type: String,
        required: false,
        trim: true,
    },
    middleInitial: {
        type: String,
        required: false,
    },
    lastName: {
        type: String,
        required: false,
        trim: true,
    },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user",
    },
    gender: {
        type: String,
        enum: ["male", "female", "other"],
        required: false,
    },
});

export default mongoose.model("User", userSchema);