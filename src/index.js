import dotenv from 'dotenv';
import dns from 'dns';
import connectDB from "./db/index.js";
import { app } from './app.js';

dotenv.config({
    path: './.env',
    quiet: true,
});

if (process.env.NODE_ENV !== 'production') {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
}

// Connect to Database
connectDB()
    .then(() => {
        console.log("Database connection established on startup");
    })
    .catch((err) => {
        console.error("Critical: Initial database connection failed", err);
    });

// Only listen locally. Vercel handles this automatically in production.
if (process.env.NODE_ENV !== 'production') {
    app.listen(process.env.PORT || 3000, () => {
        console.log(`Server is running at port : ${process.env.PORT || 3000}`);
    });
}

export default app;

