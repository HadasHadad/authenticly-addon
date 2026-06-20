const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));
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

const imageSchema = new mongoose.Schema({
  imageUrl: String,

  realCount: {
    type: Number,
    default: 0,
  },

  aiCount: {
    type: Number,
    default: 0,
  },
});

const Image = mongoose.model("Image", imageSchema);

// Hamming distance between two equal-length bit strings
function hammingDistance(a, b) {
  if (a.length !== b.length) return Infinity;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) dist++;
  }
  return dist;
}

// Find existing record by fuzzy hash match (threshold: 8 bits out of 1024)
async function findByHash(hashBits) {
  if (!hashBits) return null;
  // Only search among hash-keyed records
  const candidates = await Image.find({ hashBits: { $exists: true, $ne: null } });
  let best = null, bestDist = Infinity;
  for (const doc of candidates) {
    const dist = hammingDistance(hashBits, doc.hashBits);
    if (dist < bestDist) { bestDist = dist; best = doc; }
  }
  // Threshold: <= 8 bits different = same image
  return bestDist <= 200 ? best : null;
}

// GET /front?url=<imageKey>&hash=<rawHashBits>
app.get("/front", async (req, res) => {
  const imageUrl = req.query.url;

  if (!imageUrl) {
    return res.status(400).json({
      error: "missing url",
    });
  }

  let image = await Image.findOne({
    imageUrl: imageUrl,
  });

  if (!image) {
    image = await Image.create({
      imageUrl: imageUrl,
      realCount: 0,
      aiCount: 0,
    });
  }

  res.json({
    real: image.realCount,
    ai: image.aiCount,
  });
});

// POST /vote  { url: imageKey, hash: rawHashBits, voteType: "real"|"ai" }
app.post("/vote", async (req, res) => {
  const { url, voteType } = req.body;

  if (!url || !voteType) {
    return res.status(400).json({
      error: "missing url or voteType",
    });
  }

  let image = await Image.findOne({
    imageUrl: url,
  });

  if (!image) {
    image = await Image.create({
      imageUrl: url,
      realCount: 0,
      aiCount: 0,
    });
  }

  if (voteType === "ai") {
    image.aiCount++;
  } else if (voteType === "real") {
    image.realCount++;
  } else {
    return res.status(400).json({
      error: "invalid voteType",
    });
  }

  await image.save();

  res.json({
    real: image.realCount,
    ai: image.aiCount,
  });
});

const port = 3000;

app.listen(port, () => {
  console.log(`server running on http://localhost:${port}`);
});

