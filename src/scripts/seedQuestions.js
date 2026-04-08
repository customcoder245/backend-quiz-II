import dns from "dns";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Question from "../models/question.model.js";
import { defaultQuestions } from "../data/questions.js";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
dotenv.config();

const seedQuestions = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("MongoDB connected");

        await Question.deleteMany({});
        await Question.insertMany(defaultQuestions, { ordered: true });

        console.log(`${defaultQuestions.length} frontend questions inserted successfully.`);
        process.exit(0);
    } catch (error) {
        console.error("Error seeding questions:", error.message);
        process.exit(1);
    }
};

seedQuestions();
