const mongoose = require("mongoose");

const topEarnerSchema = new mongoose.Schema({
  cookieCount: { type: Number, required: true },
  userName: { type: String, required: true },
  userDate: { type: Number, required: true }
});

module.exports = mongoose.model("Topearner", topEarnerSchema);
