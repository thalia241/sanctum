// src/app.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");
const env = require("./config/env");

const routes = require("./routes");
const { notFound, errorHandler } = require("./middleware/error");

const app = express();

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));

app.use(
  express.json({
    limit: "10mb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(morgan("dev"));

app.use("/uploads", express.static(uploadsDir));

app.get("/health", (req, res) => res.json({ ok: true, name: "sanctum-api" }));
app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app; 