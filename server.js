const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

app.use(cors());
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