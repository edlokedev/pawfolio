import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "./app";

let dataDir: string | undefined;
const catFile = {
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
};

afterEach(async () => {
  if (dataDir) {
    await rm(dataDir, { recursive: true, force: true });
    dataDir = undefined;
  }
});

async function writeCatFile() {
  dataDir = await mkdtemp(join(tmpdir(), "pawfolio-"));
  await writeFile(join(dataDir, "mochi.json"), JSON.stringify(catFile));
  return dataDir;
}

describe("GET /api/cats", () => {
  it("returns public Cat Card summaries from Cat Files", async () => {
    dataDir = await writeCatFile();

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

describe("GET /api/cats/:id", () => {
  it("returns the selected Cat Profile", async () => {
    dataDir = await writeCatFile();
    const app = createApp({ dataDir, today: "2026-05-29" });

    const res = await app.request("/api/cats/mochi");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      cat: {
        id: "mochi",
        name: "Mochi",
        birthday: "2021-05-12",
        placeholder: "calico",
        identity: catFile.identity,
        dueItems: catFile.dueItems,
        records: [
          catFile.records[2],
          catFile.records[0],
          catFile.records[1],
        ],
      },
    });
  });
});

describe("POST /api/cats/:id/records", () => {
  it("rejects Add Record without owner unlock", async () => {
    dataDir = await writeCatFile();
    const app = createApp({
      dataDir,
      ownerUnlockCode: "secret",
      today: "2026-05-29",
    });

    const res = await app.request("/api/cats/mochi/records", {
      method: "POST",
      headers: new Headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        type: "note",
        date: "2026-05-29",
        note: "Needs fresh water.",
      }),
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Owner unlock required." });

    const saved = JSON.parse(await readFile(join(dataDir, "mochi.json"), "utf8"));
    expect(saved.records).toHaveLength(3);
  });

  it("appends a Health Record with owner unlock", async () => {
    dataDir = await writeCatFile();
    const app = createApp({
      dataDir,
      ownerUnlockCode: "secret",
      today: "2026-05-29",
    });

    const res = await app.request("/api/cats/mochi/records", {
      method: "POST",
      headers: new Headers({
        "Content-Type": "application/json",
        "x-owner-unlock-code": "secret",
      }),
      body: JSON.stringify({
        type: "vomit",
        date: "2026-05-29",
        hairball: true,
        note: "Small hairball after breakfast.",
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.record).toMatchObject({
      type: "vomit",
      date: "2026-05-29",
      hairball: true,
      note: "Small hairball after breakfast.",
    });
    expect(body.record.id).toBeString();

    const saved = JSON.parse(await readFile(join(dataDir, "mochi.json"), "utf8"));
    expect(saved.records).toHaveLength(4);
    expect(saved.records[3]).toEqual(body.record);
  });
});
