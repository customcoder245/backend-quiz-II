// node -r dotenv/config src/scripts/seedBreakpoints.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Question from "../models/question.model.js";

dotenv.config();

const breakpoints = [
    {
        order: 5, // Example position
        questionText: "Your Health Snapshot",
        type: "breakpoint",
        gender: "both",
        customHtml: `
            <div style="padding: 2rem; text-align: center;">
                <div style="width: 60px; height: 60px; background: rgba(52, 168, 83, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; color: #34a853;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                </div>
                <h3 style="font-size: 1.5rem; font-weight: 900; color: #1a1a1b; margin-bottom: 2rem;">Here's what we've learned so far</h3>
                
                <div style="background: #f4f4f5; border-radius: 24px; padding: 2rem; margin-bottom: 2rem; text-align: left;">
                    <h4 style="font-size: 1.25rem; font-weight: 900; color: #1a1a1b; margin-bottom: 0.5rem;">Daily activity level</h4>
                    <p style="color: rgba(26, 26, 27, 0.4); font-weight: 700; margin-bottom: 2rem;">Moderate - You're off to a great start!</p>
                    
                    <div style="height: 8px; background: rgba(26, 26, 27, 0.05); border-radius: 4px; position: relative;">
                        <div style="height: 100%; width: 50%; background: linear-gradient(to right, #fbbf24, #10b981); border-radius: 4px;"></div>
                        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 16px; height: 16px; background: #1a1a1b; border: 2px solid white; border-radius: 50%; shadow: 0 4px 6px rgba(0,0,0,0.1);"></div>
                    </div>
                </div>
                
                <div style="background: rgba(52, 168, 83, 0.05); border: 2px solid rgba(52, 168, 83, 0.1); border-radius: 20px; padding: 1.5rem; display: flex; align-items: start; gap: 1rem; text-align: left;">
                     <div style="width: 32px; height: 32px; background: #34a853; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0;">✓</div>
                     <p style="font-weight: 700; color: rgba(26, 26, 27, 0.6); margin: 0; line-height: 1.4;">We'll build a plan that fits your lifestyle, preferences, and long-term goals.</p>
                </div>
            </div>
        `,
        customCss: `
            body { background: white; }
            h3, h4 { letter-spacing: -0.02em; }
        `,
        customJs: "console.log('Breakpoint 1 loaded');",
        isActive: true
    },
    {
        order: 15, // Example position
        questionText: "BMI Snapshot",
        type: "breakpoint",
        gender: "both",
        customHtml: `
            <div style="padding: 2rem; text-align: center;">
                <div style="width: 60px; height: 60px; background: rgba(217, 6, 85, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; color: #D90655;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                </div>
                <h3 style="font-size: 1.5rem; font-weight: 900; color: #1a1a1b; margin-bottom: 2rem;">Body Mass Index (BMI)</h3>
                
                <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                    <div style="background: #f4f4f5; border-radius: 24px; padding: 2rem; text-align: center;">
                        <p style="font-size: 3rem; font-weight: 900; color: #1a1a1b; margin: 0;">31.2</p>
                        <p style="color: rgba(217, 6, 85, 0.6); font-weight: 900; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.1em; margin-top: 0.5rem;">Overweight</p>
                    </div>
                    
                    <div style="background: rgba(249, 115, 22, 0.05); border: 2px solid rgba(249, 115, 22, 0.1); border-radius: 20px; padding: 1.5rem; display: flex; align-items: start; gap: 1rem; text-align: left;">
                         <div style="width: 40px; height: 40px; background: #f97316; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; box-shadow: 0 4px 6px rgba(249, 115, 22, 0.2);">!</div>
                         <div>
                            <p style="font-weight: 900; color: #1a1a1b; margin: 0 0 0.25rem;">Risks of unhealthy BMI</p>
                            <p style="font-size: 0.875rem; color: rgba(26, 26, 27, 0.6); margin: 0; line-height: 1.4;">Increased risk of heart disease, type 2 diabetes, and fatigue.</p>
                         </div>
                    </div>
                </div>
            </div>
        `,
        customCss: `
            body { background: white; }
        `,
        customJs: "console.log('BMI Breakpoint loaded');",
        isActive: true
    }
];

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("Connected to MongoDB");

        for (const bp of breakpoints) {
            const existing = await Question.findOne({ questionText: bp.questionText });
            if (existing) {
                console.log(`Updating existing breakpoint: ${bp.questionText}`);
                await Question.findByIdAndUpdate(existing._id, bp);
            } else {
                console.log(`Creating new breakpoint: ${bp.questionText}`);
                await Question.create(bp);
            }
        }

        console.log("✅ Breakpoints seeded successfully");
        process.exit(0);
    } catch (error) {
        console.error("Error seeding:", error);
        process.exit(1);
    }
};

seed();
