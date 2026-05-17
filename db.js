const mongoose = require("mongoose");

mongoose
  .connect("mongodb://127.0.0.1:27017/imagesdb")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

const imageSchema = new mongoose.Schema({
  imageUrl: String,
  realCount: { type: Number, default: 0 },
  aiCount: { type: Number, default: 0 },
  votedIPs: [String]
});

const Image = mongoose.model("Image", imageSchema);

module.exports = Image;