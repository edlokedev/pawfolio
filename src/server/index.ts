import { createApp } from "./app";

const port = Number(Bun.env.PORT ?? 3001);
const app = createApp();

Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`Pawfolio API listening on http://localhost:${port}`);

