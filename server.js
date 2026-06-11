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

const imageSchema = new mongoose.Schema({
  imageKey: { type: String, unique: true, required: true },
  // Store raw hash bits separately for fuzzy matching
  hashBits: { type: String, default: null },
  realCount: { type: Number, default: 0 },
  aiCount:   { type: Number, default: 0 },
}, { timestamps: true });

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
  return bestDist <= 8 ? best : null;
}

// GET /front?url=<imageKey>&hash=<rawHashBits>
app.get("/front", async (req, res) => {
  const imageKey = req.query.url;
  const hashBits = req.query.hash || null;
  if (!imageKey) return res.status(400).json({ error: "missing url" });

  // 1. Try exact key match first
  let image = await Image.findOne({ imageKey });

  // 2. If not found and we have a hash, try fuzzy match
  if (!image && hashBits) {
    const fuzzyMatch = await findByHash(hashBits);
    if (fuzzyMatch) {
      // Create an alias pointing to the same data
      image = fuzzyMatch;
      // Also save the new key so next lookup is instant
      await Image.create({ imageKey, hashBits, realCount: fuzzyMatch.realCount, aiCount: fuzzyMatch.aiCount }).catch(() => {});
    }
  }

  // 3. Nothing found — create new record
  if (!image) {
    image = await Image.create({ imageKey, hashBits, realCount: 0, aiCount: 0 });
  }

  res.json({ real: image.realCount, ai: image.aiCount, key: image.imageKey });
});

// POST /vote  { url: imageKey, hash: rawHashBits, voteType: "real"|"ai" }
app.post("/vote", async (req, res) => {
  const { url: imageKey, hash: hashBits, voteType } = req.body;
  if (!imageKey || !voteType) return res.status(400).json({ error: "missing params" });
  if (!["real", "ai"].includes(voteType)) return res.status(400).json({ error: "invalid voteType" });

  // Same lookup logic: exact → fuzzy → create
  let image = await Image.findOne({ imageKey });

  if (!image && hashBits) {
    const fuzzyMatch = await findByHash(hashBits);
    if (fuzzyMatch) {
      image = fuzzyMatch;
    }
  }

  if (!image) {
    image = await Image.create({ imageKey, hashBits: hashBits || null, realCount: 0, aiCount: 0 });
  }

  if (voteType === "ai") image.aiCount++;
  else image.realCount++;
  await image.save();

  res.json({ real: image.realCount, ai: image.aiCount });
});

const port = 3000;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));