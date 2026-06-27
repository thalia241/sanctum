function notFound(req, res, next) {
  res.status(404);
  next(new Error(`Not Found: ${req.method} ${req.originalUrl}`));
}

function errorHandler(err, req, res, next) {
  const status = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  res.status(status).json({
    error: {
      message: err.message || "Server error",
      // keep stack in dev only
      stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
    },
  });
}

module.exports = { notFound, errorHandler };