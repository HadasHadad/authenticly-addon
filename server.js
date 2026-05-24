const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express(); // הגדרת ה-app חייבת להיות כאן, לפני השימוש בו!

// 1. הגדרות Middleware
app.use(cors({
    origin: "*", 
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// הוספת ה-Header שפותר את בעיית ה-Private Network של כרום
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    next();
});

app.use(express.json());
app.use(express.static("public"));

// 2. חיבור ל-DB
mongoose
  .connect("mongodb://127.0.0.1:27017/imagesDB")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// 3. Schema ו-Model
const imageSchema = new mongoose.Schema({
  imageUrl: { type: String, unique: true }, // הוספתי unique: true למשימת ה-DB
  realCount: { type: Number, default: 0 },
  aiCount: { type: Number, default: 0 },
});

const Image = mongoose.model("Image", imageSchema);

// 4. Routes
app.get("/front", async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) return res.status(400).json({ error: "missing url" });

  let image = await Image.findOne({ imageUrl: imageUrl });
  if (!image) {
    image = await Image.create({ imageUrl: imageUrl, realCount: 0, aiCount: 0 });
  }

  res.json({ real: image.realCount, ai: image.aiCount });
});

app.post("/vote", async (req, res) => {
  const { url, voteType } = req.body;
  if (!url || !voteType) return res.status(400).json({ error: "missing params" });

  let image = await Image.findOne({ imageUrl: url });
  if (!image) {
    image = await Image.create({ imageUrl: url, realCount: 0, aiCount: 0 });
  }

  if (voteType === "ai") image.aiCount++;
  else if (voteType === "real") image.realCount++;
  else return res.status(400).json({ error: "invalid voteType" });

  await image.save();
  res.json({ real: image.realCount, ai: image.aiCount });
});

// 5. הפעלת השרת
const port = 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});