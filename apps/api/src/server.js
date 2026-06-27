const http = require("http");
const app = require("./app");
const env = require("./config/env");
const { connectDB } = require("./config/db");
const { initSockets } = require("./sockets");

async function bootstrap() {
  await connectDB();

  const server = http.createServer(app);
  initSockets(server);

  server.listen(env.PORT, () => {
    console.log(`✅ Sanctum API listening on http://localhost:${env.PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});