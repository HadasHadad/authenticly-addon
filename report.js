// report.js

import mongoose from "mongoose";
import dotenv from "dotenv";
import Image from "./models/Image.js";

dotenv.config();

async function generateReport() {
  try {
    // התחברות ל-MongoDB
    await mongoose.connect(process.env.MONGO_URI);

    console.log("Connected to MongoDB\n");

    // שליפת כל התמונות
    const images = await Image.find({});

    // סך הכל תמונות
    const totalImages = images.length;

    // משתנים לספירת הצבעות
    let totalAiVotes = 0;
    let totalRealVotes = 0;

    // אובייקט לספירת דומיינים
    const domainCounts = {};

    for (const image of images) {
      totalAiVotes += image.aiVotes || 0;
      totalRealVotes += image.realVotes || 0;

      // בונוס - חילוץ דומיין
      try {
        const domain = new URL(image.url).hostname;

        if (!domainCounts[domain]) {
          domainCounts[domain] = 0;
        }

        domainCounts[domain]++;
      } catch (err) {
        console.log("Invalid URL:", image.url);
      }
    }

    // מציאת הדומיין הכי נפוץ
    let mostCommonDomain = "";
    let highestCount = 0;

    for (const domain in domainCounts) {
      if (domainCounts[domain] > highestCount) {
        highestCount = domainCounts[domain];
        mostCommonDomain = domain;
      }
    }

    // הדפסת הדוח
    console.log("===== SYSTEM REPORT =====");
    console.log("Total Images:", totalImages);
    console.log("Total AI Votes:", totalAiVotes);
    console.log("Total Real Votes:", totalRealVotes);
    console.log(
      "Most Common Domain:",
      mostCommonDomain,
      `(${highestCount} times)`
    );
    console.log("=========================");

    // סגירת חיבור
    await mongoose.connection.close();
  } catch (error) {
    console.error("Error generating report:", error);
  }
}

generateReport();

