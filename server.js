const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.set('trust proxy', true); 
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    next();
});

mongoose
  .connect("mongodb://127.0.0.1:27017/imagesDB")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

const imageSchema = new mongoose.Schema({
  imageUrl: String,
  realCount: { type: Number, default: 0 },
  aiCount: { type: Number, default: 0 },
  votedIPs: [String] 
});

const Image = mongoose.model("Image", imageSchema);

app.get("/front", async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) return res.status(400).json({ error: "missing url" });

  let image = await Image.findOne({ imageUrl: imageUrl });
  if (!image) {
    image = await Image.create({ imageUrl: imageUrl });
  }

  const total = image.realCount + image.aiCount;
  let confidence = "low";
  if (total > 15) confidence = "high";
  else if (total >= 5) confidence = "medium";

  res.json({
    real: image.realCount,
    ai: image.aiCount,
    confidenceLevel: confidence 
  });
});

app.post("/vote", async (req, res) => {
  const { url, voteType } = req.body;
  const userIP = req.ip || req.headers['x-forwarded-for'];

  if (!url || !voteType) {
    return res.status(400).json({ error: "missing url or voteType" });
  }

  try {
    let image = await Image.findOne({ imageUrl: url });

    if (!image) {
      image = await Image.create({ imageUrl: url });
    }

    if (image.votedIPs.includes(userIP)) {
      return res.status(400).json({ error: "Already voted from this IP" });
    }

    const updatedImage = await Image.findOneAndUpdate(
      { imageUrl: url },
      { 
        $inc: { [voteType === "ai" ? "aiCount" : "realCount"]: 1 },
        $push: { votedIPs: userIP } 
      },
      { new: true }
    );

    res.json({
      real: updatedImage.realCount,
      ai: updatedImage.aiCount
    });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
  res.json({
});

const port = 3000;
app.listen(port, () => {
  console.log(`server running on http://localhost:${port}`);
});
