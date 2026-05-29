import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "./app";

let dataDir: string | undefined;
let uploadsDir: string | undefined;
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

  if (uploadsDir) {
    await rm(uploadsDir, { recursive: true, force: true });
    uploadsDir = undefined;
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
        records: [catFile.records[2], catFile.records[0], catFile.records[1]],
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

  it("stores one Record Photo outside the Cat File", async () => {
    dataDir = await writeCatFile();
    uploadsDir = await mkdtemp(join(tmpdir(), "pawfolio-uploads-"));
    const app = createApp({
      dataDir,
      ownerUnlockCode: "secret",
      today: "2026-05-29",
      uploadsDir,
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
        note: "Photo shows hairball size.",
        photo: {
          contentType: "image/png",
          dataUrl: "data:image/png;base64,aGVsbG8=",
          filename: "hairball.png",
        },
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.record.photos).toEqual([
      {
        contentType: "image/png",
        filename: "hairball.png",
        id: expect.any(String),
        url: expect.stringMatching(/^\/api\/uploads\/mochi\/.+\.png$/),
      },
    ]);

    const saved = JSON.parse(await readFile(join(dataDir, "mochi.json"), "utf8"));
    expect(saved.records[3]).toEqual(body.record);
    expect(JSON.stringify(saved)).not.toContain("aGVsbG8=");

    const storedFilename = body.record.photos[0].url.split("/").at(-1);
    expect(await readFile(join(uploadsDir, "mochi", storedFilename), "utf8")).toBe(
      "hello",
    );
  });

  it("serves stored Record Photos", async () => {
    dataDir = await writeCatFile();
    uploadsDir = await mkdtemp(join(tmpdir(), "pawfolio-uploads-"));
    const app = createApp({
      dataDir,
      ownerUnlockCode: "secret",
      today: "2026-05-29",
      uploadsDir,
    });

    const createRes = await app.request("/api/cats/mochi/records", {
      method: "POST",
      headers: new Headers({
        "Content-Type": "application/json",
        "x-owner-unlock-code": "secret",
      }),
      body: JSON.stringify({
        type: "note",
        date: "2026-05-29",
        note: "Photo note.",
        photo: {
          contentType: "image/png",
          dataUrl: "data:image/png;base64,aGVsbG8=",
          filename: "note.png",
        },
      }),
    });
    const { record } = await createRes.json();

    const photoRes = await app.request(record.photos[0].url);

    expect(photoRes.status).toBe(200);
    expect(photoRes.headers.get("Content-Type")).toBe("image/png");
    expect(await photoRes.text()).toBe("hello");
  });

  it("rejects invalid Health Records without writing", async () => {
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
        type: "medication",
        date: "2026-05-29",
      }),
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Health record is invalid." });

    const saved = JSON.parse(await readFile(join(dataDir, "mochi.json"), "utf8"));
    expect(saved.records).toHaveLength(3);
  });
});

describe("PATCH /api/cats/:id/profile", () => {
  it("rejects Cat Profile Edit without owner unlock", async () => {
    dataDir = await writeCatFile();
    const app = createApp({
      dataDir,
      ownerUnlockCode: "secret",
      today: "2026-05-29",
    });

    const res = await app.request("/api/cats/mochi/profile", {
      method: "PATCH",
      headers: new Headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        name: "Toffee",
      }),
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Owner unlock required." });

    const saved = JSON.parse(await readFile(join(dataDir, "mochi.json"), "utf8"));
    expect(saved.name).toBe("Mochi");
  });

  it("updates Cat Identity with owner unlock", async () => {
    dataDir = await writeCatFile();
    const app = createApp({
      dataDir,
      ownerUnlockCode: "secret",
      today: "2026-05-29",
    });

    const res = await app.request("/api/cats/mochi/profile", {
      method: "PATCH",
      headers: new Headers({
        "Content-Type": "application/json",
        "x-owner-unlock-code": "secret",
      }),
      body: JSON.stringify({
        birthday: "2021-05-13",
        identity: {
          breed: "Domestic longhair",
          color: "Orange",
          microchip: "",
          sex: "female",
          vetContact: "Zo Vet",
        },
        name: "Toffee",
      }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      cat: {
        ...catFile,
        birthday: "2021-05-13",
        identity: {
          breed: "Domestic longhair",
          color: "Orange",
          sex: "female",
          vetContact: "Zo Vet",
        },
        name: "Toffee",
        records: [catFile.records[2], catFile.records[0], catFile.records[1]],
      },
    });

    const saved = JSON.parse(await readFile(join(dataDir, "mochi.json"), "utf8"));
    expect(saved.name).toBe("Toffee");
    expect(saved.identity.microchip).toBeUndefined();
  });

  it("clears optional Cat Identity fields with owner unlock", async () => {
    dataDir = await writeCatFile();
    const app = createApp({
      dataDir,
      ownerUnlockCode: "secret",
      today: "2026-05-29",
    });

    const res = await app.request("/api/cats/mochi/profile", {
      method: "PATCH",
      headers: new Headers({
        "Content-Type": "application/json",
        "x-owner-unlock-code": "secret",
      }),
      body: JSON.stringify({
        birthday: "",
        identity: {
          microchip: "",
          sex: "",
          vetContact: "",
        },
      }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      cat: {
        id: "mochi",
        name: "Mochi",
        placeholder: "calico",
        dueItems: catFile.dueItems,
        records: [catFile.records[2], catFile.records[0], catFile.records[1]],
      },
    });

    const saved = JSON.parse(await readFile(join(dataDir, "mochi.json"), "utf8"));
    expect(saved.birthday).toBeUndefined();
    expect(saved.identity).toBeUndefined();
  });

  it("stores a Cat Profile photo outside the Cat File", async () => {
    dataDir = await writeCatFile();
    uploadsDir = await mkdtemp(join(tmpdir(), "pawfolio-uploads-"));
    const app = createApp({
      dataDir,
      ownerUnlockCode: "secret",
      today: "2026-05-29",
      uploadsDir,
    });

    const res = await app.request("/api/cats/mochi/profile", {
      method: "PATCH",
      headers: new Headers({
        "Content-Type": "application/json",
        "x-owner-unlock-code": "secret",
      }),
      body: JSON.stringify({
        profilePhoto: {
          contentType: "image/png",
          dataUrl: "data:image/png;base64,aGVsbG8=",
          filename: "toffee.png",
        },
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cat.profilePhoto).toEqual({
      contentType: "image/png",
      filename: "toffee.png",
      id: expect.any(String),
      url: expect.stringMatching(/^\/api\/uploads\/mochi\/profile-.+\.png$/),
    });

    const saved = JSON.parse(await readFile(join(dataDir, "mochi.json"), "utf8"));
    expect(saved.profilePhoto).toEqual(body.cat.profilePhoto);
    expect(JSON.stringify(saved)).not.toContain("aGVsbG8=");

    const storedFilename = body.cat.profilePhoto.url.split("/").at(-1);
    expect(await readFile(join(uploadsDir, "mochi", storedFilename), "utf8")).toBe(
      "hello",
    );
  });
});
