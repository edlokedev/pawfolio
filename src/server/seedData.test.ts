import { describe, expect, it } from "bun:test";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { createApp } from "./app";

describe("Pawfolio seed data", () => {
  it("uses one Cat File and portrait per named cat", async () => {
    const app = createApp({ today: "2026-05-29" });

    const res = await app.request("/api/cats");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(
      body.cats.map(({ id, name }: { id: string; name: string }) => ({ id, name })),
    ).toEqual([
      { id: "teddy", name: "Teddy" },
      { id: "toffee", name: "Toffee" },
      { id: "toey", name: "Toey" },
    ]);

    for (const cat of body.cats as Array<{ id: string }>) {
      const profileRes = await app.request(`/api/cats/${cat.id}`);
      const portrait = await stat(join(process.cwd(), "public", "cats", `${cat.id}.png`));

      expect(profileRes.status).toBe(200);
      expect(portrait.isFile()).toBe(true);
    }
  });
});
