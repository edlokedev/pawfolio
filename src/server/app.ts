import { Hono } from "hono";
import { join } from "node:path";
import { createCatRepository } from "./catRepository";

export type AppOptions = {
  dataDir?: string;
  ownerUnlockCode?: string;
  today?: string;
  uploadsDir?: string;
};

export function createApp(options: AppOptions = {}) {
  const app = new Hono();
  const repository = createCatRepository({
    dataDir: options.dataDir ?? join(process.cwd(), "data", "cats"),
    today: options.today,
    uploadsDir: options.uploadsDir ?? join(process.cwd(), "data", "uploads"),
  });
  const ownerUnlockCode =
    options.ownerUnlockCode ?? process.env.OWNER_UNLOCK_CODE ?? "pawfolio";

  app.get("/api/health", (c) => c.json({ ok: true }));

  app.get("/api/cats", async (c) => {
    const cats = await repository.listPublicSummaries();
    return c.json({ cats });
  });

  app.get("/api/cats/:id", async (c) => {
    const cat = await repository.getCatProfile(c.req.param("id"));

    if (!cat) {
      return c.json({ error: "Cat not found." }, 404);
    }

    return c.json({ cat });
  });

  app.get("/api/uploads/:catId/:filename", async (c) => {
    const photo = await repository.getRecordPhoto(
      c.req.param("catId"),
      c.req.param("filename"),
    );

    if (!photo) {
      return c.json({ error: "Record photo not found." }, 404);
    }

    return new Response(photo.bytes, {
      headers: {
        "Cache-Control": "private, max-age=31536000",
        "Content-Type": photo.contentType,
      },
      status: 200,
    });
  });

  app.patch("/api/cats/:id/profile", async (c) => {
    if (c.req.header("x-owner-unlock-code") !== ownerUnlockCode) {
      return c.json({ error: "Owner unlock required." }, 401);
    }

    const catId = c.req.param("id");
    const cat = await repository.getCatProfile(catId);

    if (!cat) {
      return c.json({ error: "Cat not found." }, 404);
    }

    let input: unknown;

    try {
      input = await c.req.json();
    } catch {
      return c.json({ error: "Cat profile JSON required." }, 400);
    }

    const nextCat = await repository.updateCatProfile(catId, input);

    if (!nextCat) {
      return c.json({ error: "Cat profile is invalid." }, 400);
    }

    return c.json({ cat: nextCat });
  });

  app.post("/api/cats/:id/records", async (c) => {
    if (c.req.header("x-owner-unlock-code") !== ownerUnlockCode) {
      return c.json({ error: "Owner unlock required." }, 401);
    }

    const catId = c.req.param("id");
    const cat = await repository.getCatProfile(catId);

    if (!cat) {
      return c.json({ error: "Cat not found." }, 404);
    }

    let input: unknown;

    try {
      input = await c.req.json();
    } catch {
      return c.json({ error: "Health record JSON required." }, 400);
    }

    const record = await repository.addHealthRecord(catId, input);

    if (!record) {
      return c.json({ error: "Health record is invalid." }, 400);
    }

    return c.json({ record }, 201);
  });

  app.onError((error, c) => {
    console.error(error);
    return c.json({ error: "Pawfolio could not read cat data." }, 500);
  });

  return app;
}
