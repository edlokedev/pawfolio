import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "./app";

let dataDir: string | undefined;

afterEach(async () => {
  if (dataDir) {
    await rm(dataDir, { recursive: true, force: true });
    dataDir = undefined;
  }
});

describe("GET /api/cats", () => {
  it("returns public Cat Card summaries from Cat Files", async () => {
    dataDir = await mkdtemp(join(tmpdir(), "pawfolio-"));

    await writeFile(
      join(dataDir, "mochi.json"),
      JSON.stringify({
        id: "mochi",
        name: "Mochi",
        birthday: "2021-05-12",
        placeholder: "calico",
        identity: {
          sex: "female",
          microchip: "hidden-chip",
          vetContact: "hidden-vet",
        },
        dueItems: [
          {
            id: "vet-2026",
            label: "Vet due",
            dueDate: "2026-06-03",
            status: "due",
          },
        ],
        records: [
          {
            id: "weight-1",
            type: "weight",
            date: "2026-05-20",
            weightKg: 4.6,
          },
          {
            id: "vet-1",
            type: "vetVisit",
            date: "2026-03-18",
            reason: "Annual checkup",
          },
          {
            id: "note-1",
            type: "note",
            date: "2026-05-21",
            note: "private detail",
          },
        ],
      }),
    );

    const app = createApp({ dataDir, today: "2026-05-29" });
    const res = await app.request("/api/cats");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      cats: [
        {
          id: "mochi",
          name: "Mochi",
          ageLabel: "5y",
          placeholder: "calico",
          latestWeightKg: 4.6,
          lastVetVisitDate: "2026-03-18",
          alertChip: {
            label: "Vet due",
            dueDate: "2026-06-03",
            status: "due",
          },
        },
      ],
    });
  });
});
