import { Hono } from "hono";
import { join } from "node:path";
import { createCatRepository } from "./catRepository";

export type AppOptions = {
  dataDir?: string;
  today?: string;
};

export function createApp(options: AppOptions = {}) {
  const app = new Hono();
  const repository = createCatRepository({
    dataDir: options.dataDir ?? join(process.cwd(), "data", "cats"),
    today: options.today,
  });

  app.get("/api/health", (c) => c.json({ ok: true }));

  app.get("/api/cats", async (c) => {
    const cats = await repository.listPublicSummaries();
    return c.json({ cats });
  });

  app.onError((error, c) => {
    console.error(error);
    return c.json({ error: "Pawfolio could not read cat data." }, 500);
  });

  return app;
}

