import dotenv from "dotenv";
import connectDB from "../db/index.js";
import User from "../models/user.model.js";
import UserResponse from "../models/userResponse.model.js";

dotenv.config();

const buildDisplayName = (user) =>
    [
        user?.firstName,
        user?.middleInitial,
        user?.lastName
    ]
        .filter(Boolean)
        .join(" ") || user?.email || "Guest";

const buildUserSnapshot = (user) => ({
    id: user?._id || null,
    name: buildDisplayName(user),
    fullName: buildDisplayName(user),
    email: user?.email || "",
    firstName: user?.firstName || "",
    middleInitial: user?.middleInitial || "",
    lastName: user?.lastName || "",
    gender: user?.gender || "",
    role: user?.role || "user",
    signedUpAt: user?.createdAt || null,
    createdAt: user?.createdAt || null,
    lastLoginAt: user?.lastLoginAt || null
});

const main = async () => {
    await connectDB();

    const userResponses = await UserResponse.find().select("_id userId user");
    let updatedCount = 0;
    let skippedCount = 0;

    for (const userResponse of userResponses) {
        const user = await User.findById(userResponse.userId).select("-password -__v");

        if (!user) {
            skippedCount += 1;
            continue;
        }

        userResponse.user = buildUserSnapshot(user);
        await userResponse.save();
        updatedCount += 1;
    }

    console.log(`Backfill complete. Updated: ${updatedCount}, skipped: ${skippedCount}`);
    process.exit(0);
};

main().catch((error) => {
    console.error("Backfill failed:", error);
    process.exit(1);
});
