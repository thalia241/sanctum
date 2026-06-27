const { verifyToken } = require("../utils/tokens");

/**
 * Accept token from:
 * - socket.handshake.auth.token   (recommended)
 * - Authorization header: "Bearer <token>"
 * - query param: ?token=...
 */
function extractToken(socket) {
  const authToken = socket.handshake?.auth?.token;
  if (authToken) return authToken;

  const header = socket.handshake?.headers?.authorization || "";
  const [type, token] = header.split(" ");
  if (type === "Bearer" && token) return token;

  const queryToken = socket.handshake?.query?.token;
  if (typeof queryToken === "string" && queryToken.length > 0) return queryToken;

  return null;
}

function socketAuthMiddleware(socket, next) {
  try {
    const token = extractToken(socket);
    if (!token) return next(new Error("Unauthorized: missing token"));

    const payload = verifyToken(token);
    // store on socket for later
    socket.data.user = {
      id: payload.sub,
      username: payload.username,
    };

    next();
  } catch (err) {
    next(new Error("Unauthorized: invalid or expired token"));
  }
}

module.exports = { socketAuthMiddleware };