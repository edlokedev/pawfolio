import { createApp } from "./app";
import { createServerConfig } from "./config";

const config = createServerConfig(Bun.env);
const app = createApp({
  dataDir: config.dataDir,
  ownerUnlockCode: config.ownerUnlockCode,
  uploadsDir: config.uploadsDir,
});

Bun.serve({
  port: config.port,
  fetch: app.fetch,
});

console.log(`Pawfolio API listening on http://localhost:${config.port}`);
