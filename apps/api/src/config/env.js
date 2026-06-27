// src/config/env.js
require("dotenv").config();

const env = {
  PORT: process.env.PORT || 3001,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",

  // Billing (Stripe)
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_PRO: process.env.STRIPE_PRICE_PRO,
  STRIPE_PRICE_STUDIO: process.env.STRIPE_PRICE_STUDIO,
  BILLING_SUCCESS_URL: process.env.BILLING_SUCCESS_URL,
  BILLING_CANCEL_URL: process.env.BILLING_CANCEL_URL,
  MEMBERSHIP_SUCCESS_URL: process.env.MEMBERSHIP_SUCCESS_URL,
  MEMBERSHIP_CANCEL_URL: process.env.MEMBERSHIP_CANCEL_URL,

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  CLOUDINARY_FOLDER: process.env.CLOUDINARY_FOLDER || "sanctum",
};

if (!env.MONGODB_URI) throw new Error("Missing MONGODB_URI in .env");
if (!env.JWT_SECRET) throw new Error("Missing JWT_SECRET in .env");

if (!env.CLOUDINARY_CLOUD_NAME) {
  throw new Error("Missing CLOUDINARY_CLOUD_NAME in .env");
}
if (!env.CLOUDINARY_API_KEY) {
  throw new Error("Missing CLOUDINARY_API_KEY in .env");
}
if (!env.CLOUDINARY_API_SECRET) {
  throw new Error("Missing CLOUDINARY_API_SECRET in .env");
}

module.exports = env; 