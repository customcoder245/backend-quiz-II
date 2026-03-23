// node -r dotenv/config src/scripts/dropOrderIndex.js
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const dropIndex = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("MongoDB connected");

        const collection = mongoose.connection.collection("questions");

        // List all indexes
        const indexes = await collection.listIndexes().toArray();
        console.log("Current indexes:", indexes.map(i => i.name));

        // Find the index on 'order' if it's unique
        const orderIndex = indexes.find(i => i.key && i.key.order === 1);

        if (orderIndex) {
            console.log(`Found index: ${orderIndex.name}`);
            if (orderIndex.unique) {
                console.log("Index is unique. Dropping it...");
                await collection.dropIndex(orderIndex.name);
                console.log("✅ Unique index on 'order' dropped successfully.");
            } else {
                console.log("Index is not unique. No action needed.");
            }
        } else {
            console.log("No index on 'order' found.");
        }

        process.exit(0);
    } catch (error) {
        console.error("Error:", error.message);
        process.exit(1);
    }
};

dropIndex();
