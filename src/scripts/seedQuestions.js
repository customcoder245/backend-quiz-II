// node -r dotenv/config src/scripts/seedQuestions.js

import dns from "dns";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Question from "../models/question.model.js";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
dotenv.config();

const questions = [
    {
        order: 2,
        
        questionText: "How old are you?",
        type: "single-select",
        gender: "both",
        options: [
            { text: "Under 30", emoji: "🧒" },
            { text: "30–39", emoji: "🧑" },
            { text: "40–49", emoji: "🧑‍🦳" },
            { text: "50–59", emoji: "👴" },
            { text: "60+", emoji: "🧓" },
        ],
    },
    {
        order: 3,
        questionText: "How familiar are you with the Mediterranean Diet?",
        type: "single-select",
        gender: "both",
        options: [
            { text: "Beginner", emoji: "🌱" },
            { text: "I know the basics", emoji: "📖" },
            { text: "I've tried it before, but didn't stick with it", emoji: "🔄" },
            { text: "I know it pretty well", emoji: "✅" },
        ],
    },
    {
        order: 4,
        questionText: "What is your main goal right now?",
        type: "single-select",
        gender: "both",
        options: [
            { text: "Improve my health", emoji: "❤️" },
            { text: "Feel more confident", emoji: "💪" },
            { text: "Look better", emoji: "✨" },
            { text: "Increase energy", emoji: "⚡" },
            { text: "Set a good example for my family", emoji: "👨‍👩‍👧" },
            { text: "Feel better day to day", emoji: "🌞" },
        ],
    },
    {
        order: 5,
        questionText: "Where are the areas you would like to improve the most?",
        type: "multi-select",
        gender: "male",
        options: [
            { text: "Belly / waist", emoji: "🎯" },
            { text: "Chest", emoji: "💪" },
            { text: "Arms", emoji: "🦾" },
            { text: "Back", emoji: "🏋️" },
            { text: "Overall fitness", emoji: "🏃" },
        ],
    },
    {
        order: 6,
        questionText: "Where are the areas you would like to improve the most?",
        type: "multi-select",
        gender: "female",
        options: [
            { text: "Belly / waist", emoji: "🎯" },
            { text: "Hips & thighs", emoji: "🍑" },
            { text: "Arms", emoji: "🦾" },
            { text: "Bust / chest", emoji: "💕" },
            { text: "Overall fitness", emoji: "🏃‍♀️" },
        ],
    },
    {
        order: 7,
        questionText: "What is your height?",
        type: "text-input",
        gender: "both",
        options: [],
    },
    {
        order: 8,
        questionText: "What is your current weight?",
        type: "number-input",
        gender: "both",
        options: [],
    },
    {
        order: 9,
        questionText: "What is your goal weight?",
        type: "number-input",
        gender: "both",
        options: [],
    },
    {
        order: 10,
        questionText: "What was the first sign your body was starting to change?",
        type: "single-select",
        gender: "both",
        options: [
            { text: "Stubborn weight gain (especially around the belly)", emoji: "⚖️" },
            { text: "Bloating or digestive discomfort", emoji: "🫃" },
            { text: "Brain fog or memory lapses", emoji: "☁️" },
            { text: "Mood swings or irritability", emoji: "😤" },
            { text: "Poor or disrupted sleep", emoji: "😴" },
            { text: "Fatigue or low energy", emoji: "🔋" },
            { text: "Cravings or emotional eating", emoji: "🍫" },
        ],
    },
    {
        order: 11,
        questionText: "How does your hunger feel throughout the day?",
        type: "single-select",
        gender: "both",
        options: [
            { text: "Steady at meals", emoji: "🍽️" },
            { text: "Not hungry earlier, more hungry at night", emoji: "🌙" },
            { text: "Grazing all day", emoji: "🐑" },
            { text: "Up and down depending on stress or tiredness", emoji: "📈" },
        ],
    },
    {
        order: 12,
        questionText: "When cravings hit, what do you reach for?",
        type: "single-select",
        gender: "both",
        options: [
            { text: "Sugar and desserts", emoji: "🍰" },
            { text: "Salty or crunchy snacks", emoji: "🥨" },
            { text: "Fatty foods", emoji: "🍟" },
            { text: "It depends on my stress levels", emoji: "😰" },
            { text: "I don't get cravings", emoji: "🙅" },
        ],
    },
    {
        order: 13,
        questionText: "Which energy pattern sounds most like you?",
        type: "single-select",
        gender: "both",
        options: [
            { text: "Always tired", emoji: "😴" },
            { text: "Afternoon slump", emoji: "📉" },
            { text: "Up and down", emoji: "🎢" },
            { text: "Mostly steady", emoji: "⚡" },
        ],
    },
    {
        order: 14,
        questionText: "How often do you experience puffiness or bloating?",
        type: "single-select",
        gender: "both",
        options: [
            { text: "Rarely", emoji: "✅" },
            { text: "A few times a week", emoji: "📅" },
            { text: "Most days", emoji: "😕" },
            { text: "Constantly", emoji: "😩" },
        ],
    },
    {
        order: 15,
        questionText: "How often do you feel stressed or overwhelmed?",
        type: "single-select",
        gender: "both",
        options: [
            { text: "Almost always", emoji: "🤯" },
            { text: "Several times a day", emoji: "😰" },
            { text: "Occasionally", emoji: "😐" },
            { text: "Rarely", emoji: "😌" },
        ],
    },
    {
        order: 16,
        questionText: "How active are you right now?",
        type: "single-select",
        gender: "both",
        options: [
            { text: "Very active (5+ workouts/week)", emoji: "🏋️" },
            { text: "Somewhat active (2–4 workouts/week)", emoji: "🚴" },
            { text: "Light activity", emoji: "🚶" },
            { text: "Not active", emoji: "🛋️" },
        ],
    },
    {
        order: 17,
        questionText: "How is your sleep, on average?",
        type: "single-select",
        gender: "both",
        options: [
            { text: "Very poor", emoji: "😖" },
            { text: "Broken or inconsistent", emoji: "🌀" },
            { text: "Mostly okay", emoji: "😐" },
            { text: "Consistent and restful", emoji: "😴" },
        ],
    },
    {
        order: 18,
        questionText: "Are you working toward a specific event?",
        type: "single-select",
        gender: "both",
        options: [
            { text: "Yes, within 4 weeks", emoji: "📅" },
            { text: "Yes, 1–3 months away", emoji: "🗓️" },
            { text: "Yes, later this year", emoji: "🎯" },
            { text: "No specific event", emoji: "🙂" },
        ],
    },
    {
        order: 19,
        questionText: "Any dietary preferences or restrictions?",
        type: "multi-select",
        gender: "both",
        options: [
            { text: "Everything", emoji: "🍽️" },
            { text: "Vegan", emoji: "🌿" },
            { text: "Vegetarian", emoji: "🥦" },
            { text: "Gluten Free", emoji: "🌾" },
            { text: "Dairy Free", emoji: "🥛" },
            { text: "Pescatarian", emoji: "🐟" },
        ],
    },
    {
        order: 20,
        questionText: "Select your preferred protein sources",
        type: "multi-select",
        gender: "both",
        options: [
            { text: "Fish (salmon, tuna, sardines)", emoji: "🐟" },
            { text: "Shellfish (prawns, mussels, calamari)", emoji: "🦐" },
            { text: "Chicken or turkey", emoji: "🍗" },
            { text: "Eggs", emoji: "🥚" },
            { text: "Greek yogurt, cottage cheese, or cheese", emoji: "🧀" },
            { text: "Legumes (lentils, chickpeas, beans)", emoji: "🫘" },
            { text: "Tofu or tempeh", emoji: "🌱" },
            { text: "Red meat (beef, lamb, pork)", emoji: "🥩" },
            { text: "Plant-based protein alternatives", emoji: "🌿" },
            { text: "No strong preference", emoji: "🤷" },
        ],
    },
    {
        order: 21,
        questionText: "Which vegetables do you enjoy eating regularly?",
        type: "multi-select",
        gender: "both",
        options: [
            { text: "Leafy greens (spinach, kale, rocket)", emoji: "🥬" },
            { text: "Tomatoes", emoji: "🍅" },
            { text: "Peppers (capsicum)", emoji: "🫑" },
            { text: "Zucchini or eggplant", emoji: "🥒" },
            { text: "Broccoli or cauliflower", emoji: "🥦" },
            { text: "Root vegetables (carrots, sweet potato, beetroot)", emoji: "🥕" },
            { text: "Onions, garlic, leeks", emoji: "🧅" },
            { text: "Mushrooms", emoji: "🍄" },
            { text: "Legumes (beans, lentils)", emoji: "🫘" },
            { text: "I struggle to eat vegetables", emoji: "😅" },
        ],
    },
    {
        order: 22,
        questionText: "Which fruits do you enjoy eating regularly?",
        type: "multi-select",
        gender: "both",
        options: [
            { text: "Berries (strawberries, blueberries, raspberries)", emoji: "🍓" },
            { text: "Citrus fruits (oranges, mandarins, lemons)", emoji: "🍊" },
            { text: "Apples or pears", emoji: "🍎" },
            { text: "Bananas", emoji: "🍌" },
            { text: "Stone fruit (peaches, nectarines, plums)", emoji: "🍑" },
            { text: "Grapes", emoji: "🍇" },
            { text: "Melon", emoji: "🍈" },
            { text: "Figs or dates", emoji: "🫐" },
            { text: "I don't eat much fruit", emoji: "😐" },
            { text: "No strong preference", emoji: "🤷" },
        ],
    },
    {
        order: 23,
        questionText: "Which meal style suits you best?",
        type: "single-select",
        gender: "both",
        options: [
            { text: "3 Balanced meals per day", emoji: "🍽️" },
            { text: "2 Meals with snacks", emoji: "🥙" },
            { text: "Light meals throughout the day", emoji: "🥗" },
            { text: "I'm not sure - I need guidance", emoji: "🤔" },
        ],
    },
    // ─── POPUP QUESTIONS (shown during analysis) ───────────────
    {
        order: 24,
        questionText:
            "How likely are you to finish what you start when it comes to health goals?",
        type: "single-select",
        gender: "both",
        isPopup: true,
        options: [
            { text: "Very likely — I follow through", emoji: "🏆" },
            { text: "I start strong but lose momentum", emoji: "📉" },
            { text: "I struggle to stay consistent", emoji: "😓" },
            { text: "I usually stop once life gets busy", emoji: "⏸️" },
        ],
    },
    {
        order: 25,
        questionText: "What usually gets in the way when things don't stick?",
        type: "single-select",
        gender: "both",
        isPopup: true,
        options: [
            { text: "Plans are too complicated", emoji: "🤯" },
            { text: "I don't see results quickly enough", emoji: "⏳" },
            { text: "My routine changes week to week", emoji: "🔄" },
            { text: "I lose motivation over time", emoji: "😔" },
        ],
    },
];

const seedQuestions = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("MongoDB connected");

        await Question.deleteMany({});
        console.log("Old questions cleared");

        await Question.insertMany(questions);
        console.log(`✅ ${questions.length} questions seeded successfully!`);

        process.exit(0);
    } catch (error) {
        console.error("Error seeding questions:", error.message);
        process.exit(1);
    }
};

seedQuestions();
