// src/models/BillingCustomer.js
const mongoose = require("mongoose");

const billingCustomerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    stripeCustomerId: { type: String, required: true, unique: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BillingCustomer", billingCustomerSchema);