import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";

import coursesRoutes from "./routes/courses";
import modulesRoutes from "./routes/modules";
import batchesRoutes from "./routes/batches";
import traineesRoutes from "./routes/trainees";
import attemptsRoutes from "./routes/attempts";
import analyticsRoutes from "./routes/analytics";
import chatRoutes from "./routes/chat";

const app = Fastify({ logger: true });

async function main() {
  await app.register(cors, {
    origin: (process.env.CORS_ORIGIN || "http://localhost:4200").split(","),
  });
  await app.register(websocket);

  app.get("/api/health", async () => ({ status: "ok" }));

  await app.register(coursesRoutes, { prefix: "/api/courses" });
  await app.register(modulesRoutes, { prefix: "/api/modules" });
  await app.register(batchesRoutes, { prefix: "/api/batches" });
  await app.register(traineesRoutes, { prefix: "/api/trainees" });
  await app.register(attemptsRoutes, { prefix: "/api/attempts" });
  await app.register(analyticsRoutes, { prefix: "/api/analytics" });
  await app.register(chatRoutes, { prefix: "/api/chat" });

  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || "0.0.0.0";

  await app.listen({ port, host });
}

main().catch((err) => {
  app.log.error(err);
  process.exit(1);
});
