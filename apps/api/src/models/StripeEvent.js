// src/models/StripeEvent.js
const mongoose = require("mongoose");

const stripeEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true },
    created: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StripeEvent", stripeEventSchema);