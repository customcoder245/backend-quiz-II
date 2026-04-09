import mongoose from "mongoose";

let connectionPromise = null;

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState >= 1) {
      return mongoose.connection;
    }

    if (!process.env.MONGODB_URL) {
      throw new Error("MONGODB_URL environment variable is missing");
    }

    if (!connectionPromise) {
      connectionPromise = mongoose.connect(process.env.MONGODB_URL, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
      });
    }

    const connectionInstance = await connectionPromise;
    console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);
    return connectionInstance;
  } catch (error) {
    console.error("MONGODB connection FAILED ", error);
    connectionPromise = null;
    throw error; // Rethrow to allow middleware to handle it
  }
};


export default connectDB; 
