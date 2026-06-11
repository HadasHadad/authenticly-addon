const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  next();
});

app.use(express.json());
app.use(express.static("public"));

mongoose
  .connect("mongodb://127.0.0.1:27017/imagesDB")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// imageKey יכול להיות hash:xxxx (מה pHash) או url:xxxx (מה URL המנורמל)
const imageSchema = new mongoose.Schema({
  imageKey: { type: String, unique: true, required: true },
  realCount: { type: Number, default: 0 },
  aiCount:   { type: Number, default: 0 },
}, { timestamps: true });

const Image = mongoose.model("Image", imageSchema);

// GET /front?url=<imageKey>
app.get("/front", async (req, res) => {
  const imageKey = req.query.url;
  if (!imageKey) return res.status(400).json({ error: "missing url" });

  let image = await Image.findOne({ imageKey });
  if (!image) {
    image = await Image.create({ imageKey, realCount: 0, aiCount: 0 });
  }

  res.json({ real: image.realCount, ai: image.aiCount });
});

// POST /vote  { url: imageKey, voteType: "real"|"ai" }
app.post("/vote", async (req, res) => {
  const { url: imageKey, voteType } = req.body;
  if (!imageKey || !voteType) return res.status(400).json({ error: "missing params" });
  if (!["real", "ai"].includes(voteType)) return res.status(400).json({ error: "invalid voteType" });

  let image = await Image.findOne({ imageKey });
  if (!image) {
    image = await Image.create({ imageKey, realCount: 0, aiCount: 0 });
  }

  if (voteType === "ai") image.aiCount++;
  else image.realCount++;

  await image.save();
  res.json({ real: image.realCount, ai: image.aiCount });
});

const port = 3000;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));