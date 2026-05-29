import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  CatCardSummary,
  CatFile,
  CatIdentity,
  DueItem,
  DueItemStatus,
  HealthRecord,
  RecordPhoto,
  RecordPhotoInput,
  VetVisit,
  WeightMeasurement,
} from "../shared/types";

export type CatRepository = {
  listPublicSummaries(): Promise<CatCardSummary[]>;
  getCatProfile(catId: string): Promise<CatFile | undefined>;
  addHealthRecord(catId: string, input: unknown): Promise<HealthRecord | undefined>;
  getRecordPhoto(
    catId: string,
    filename: string,
  ): Promise<{ bytes: ArrayBuffer; contentType: RecordPhoto["contentType"] } | undefined>;
  updateCatProfile(catId: string, input: unknown): Promise<CatFile | undefined>;
};

type ParsedCatProfileUpdate = {
  birthday?: string | null;
  identity?: CatIdentity | null;
  name?: string;
  profilePhoto?: RecordPhotoInput;
};

export function createCatRepository(options: {
  dataDir: string;
  today?: string;
  uploadsDir: string;
}): CatRepository {
  const today = options.today ?? new Date().toISOString().slice(0, 10);

  return {
    async listPublicSummaries() {
      const cats = await readCatFiles(options.dataDir);

      return cats.map((cat) => toPublicSummary(cat, today));
    },

    async getCatProfile(catId) {
      const cat = await readCatFile(options.dataDir, catId);

      if (!cat) {
        return undefined;
      }

      return {
        ...cat,
        dueItems: [...cat.dueItems],
        records: sortNewestFirst(cat.records),
      };
    },

    async addHealthRecord(catId, input) {
      const cat = await readCatFile(options.dataDir, catId);

      if (!cat) {
        return undefined;
      }

      const record = await toHealthRecord(input, {
        catId,
        uploadsDir: options.uploadsDir,
      });

      if (!record) {
        return undefined;
      }

      const nextCat = {
        ...cat,
        records: [...cat.records, record],
      };

      await writeCatFile(options.dataDir, nextCat);
      return record;
    },

    async updateCatProfile(catId, input) {
      const cat = await readCatFile(options.dataDir, catId);

      if (!cat) {
        return undefined;
      }

      const update = parseCatProfileUpdate(input);

      if (!update) {
        return undefined;
      }

      const profilePhoto = await writeProfilePhoto(
        {
          catId,
          uploadsDir: options.uploadsDir,
        },
        update.profilePhoto,
      );

      if (update.profilePhoto !== undefined && !profilePhoto) {
        return undefined;
      }

      const nextCat: CatFile = { ...cat };

      if (update.name !== undefined) {
        nextCat.name = update.name;
      }

      if (Object.prototype.hasOwnProperty.call(update, "birthday")) {
        if (update.birthday) {
          nextCat.birthday = update.birthday;
        } else {
          delete nextCat.birthday;
        }
      }

      if (Object.prototype.hasOwnProperty.call(update, "identity")) {
        if (update.identity && Object.keys(update.identity).length > 0) {
          nextCat.identity = update.identity;
        } else {
          delete nextCat.identity;
        }
      }

      if (profilePhoto) {
        nextCat.profilePhoto = profilePhoto;
      }

      await writeCatFile(options.dataDir, nextCat);

      return {
        ...nextCat,
        dueItems: [...nextCat.dueItems],
        records: sortNewestFirst(nextCat.records),
      };
    },

    async getRecordPhoto(catId, filename) {
      if (!isSafeCatId(catId) || !isSafeUploadFilename(filename)) {
        return undefined;
      }

      const contentType = contentTypeFromFilename(filename);

      if (!contentType) {
        return undefined;
      }

      try {
        const bytes = await readFile(join(options.uploadsDir, catId, filename));

        return {
          bytes: bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength,
          ),
          contentType,
        };
      } catch (error) {
        if (isFileNotFound(error)) {
          return undefined;
        }

        throw error;
      }
    },
  };
}

async function readCatFiles(dataDir: string): Promise<CatFile[]> {
  const files = await readdir(dataDir);

  return Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .sort()
      .map(async (file) => {
        const json = await readFile(join(dataDir, file), "utf8");
        return JSON.parse(json) as CatFile;
      }),
  );
}

async function readCatFile(
  dataDir: string,
  catId: string,
): Promise<CatFile | undefined> {
  if (!isSafeCatId(catId)) {
    return undefined;
  }

  try {
    const json = await readFile(join(dataDir, `${catId}.json`), "utf8");
    return JSON.parse(json) as CatFile;
  } catch (error) {
    if (isFileNotFound(error)) {
      return undefined;
    }

    throw error;
  }
}

async function writeCatFile(dataDir: string, cat: CatFile) {
  const targetPath = join(dataDir, `${cat.id}.json`);
  const tempPath = join(dataDir, `${cat.id}.${randomUUID()}.tmp`);

  await writeFile(tempPath, `${JSON.stringify(cat, null, 2)}\n`);
  await rename(tempPath, targetPath);
}

function isSafeCatId(catId: string) {
  return /^[a-z0-9-]+$/i.test(catId);
}

function isFileNotFound(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

function toPublicSummary(cat: CatFile, today: string): CatCardSummary {
  const latestWeight = latestRecord(
    cat.records,
    (record): record is WeightMeasurement => record.type === "weight",
  );
  const lastVetVisit = latestRecord(
    cat.records,
    (record): record is VetVisit => record.type === "vetVisit",
  );
  const alertChip = firstActiveDueItem(cat.dueItems, today);

  return {
    id: cat.id,
    name: cat.name,
    ageLabel: ageLabel(cat.birthday, today),
    placeholder: cat.placeholder,
    profilePhoto: cat.profilePhoto,
    latestWeightKg: latestWeight?.weightKg,
    lastVetVisitDate: lastVetVisit?.date,
    alertChip,
  };
}

function latestRecord<T extends HealthRecord>(
  records: HealthRecord[],
  predicate: (record: HealthRecord) => record is T,
): T | undefined {
  return records.filter(predicate).sort(compareNewestFirst)[0];
}

function sortNewestFirst(records: HealthRecord[]) {
  return [...records].sort(compareNewestFirst);
}

function compareNewestFirst(a: HealthRecord, b: HealthRecord) {
  return b.date.localeCompare(a.date);
}

function firstActiveDueItem(
  dueItems: DueItem[],
  today: string,
): CatCardSummary["alertChip"] {
  const active = dueItems
    .map((item) => ({
      ...item,
      status: normalizeDueItemStatus(item, today),
    }))
    .filter((item) => item.status === "due" || item.status === "overdue")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

  if (!active) {
    return undefined;
  }

  return {
    label: active.label,
    dueDate: active.dueDate,
    status: active.status,
  };
}

function normalizeDueItemStatus(
  item: DueItem,
  today: string,
): DueItemStatus {
  if (item.status) {
    return item.status;
  }

  return item.dueDate < today ? "overdue" : item.dueDate === today ? "due" : "upcoming";
}

function ageLabel(birthday: string | undefined, today: string): string {
  if (!birthday) {
    return "Age unknown";
  }

  const birth = new Date(`${birthday}T00:00:00.000Z`);
  const now = new Date(`${today}T00:00:00.000Z`);
  let years = now.getUTCFullYear() - birth.getUTCFullYear();
  const birthdayPassed =
    now.getUTCMonth() > birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() &&
      now.getUTCDate() >= birth.getUTCDate());

  if (!birthdayPassed) {
    years -= 1;
  }

  if (years <= 0) {
    const months =
      (now.getUTCFullYear() - birth.getUTCFullYear()) * 12 +
      now.getUTCMonth() -
      birth.getUTCMonth();
    return `${Math.max(months, 0)}mo`;
  }

  return `${years}y`;
}

async function toHealthRecord(
  input: unknown,
  options: { catId: string; uploadsDir: string },
): Promise<HealthRecord | undefined> {
  if (!isPlainRecord(input) || typeof input.type !== "string") {
    return undefined;
  }

  const date = asRequiredString(input.date);

  if (!date) {
    return undefined;
  }

  const note = asOptionalString(input.note);
  const id = `${input.type}-${date}-${randomUUID()}`;
  const record = toHealthRecordBody(input, { date, id, note });

  if (!record) {
    return undefined;
  }

  const photos = await writeRecordPhotos(options, id, input.photo);

  if (input.photo !== undefined && !photos) {
    return undefined;
  }

  return photos ? { ...record, photos } : record;
}

function toHealthRecordBody(
  input: Record<string, unknown>,
  base: { date: string; id: string; note?: string },
): HealthRecord | undefined {
  switch (input.type) {
    case "weight": {
      if (typeof input.weightKg !== "number" || !Number.isFinite(input.weightKg)) {
        return undefined;
      }

      return {
        id: base.id,
        type: "weight",
        date: base.date,
        weightKg: input.weightKg,
        ...(base.note ? { note: base.note } : {}),
      };
    }
    case "vetVisit": {
      const reason = asOptionalString(input.reason);

      return {
        id: base.id,
        type: "vetVisit",
        date: base.date,
        ...(reason ? { reason } : {}),
        ...(base.note ? { note: base.note } : {}),
      };
    }
    case "medication": {
      const medicine = asRequiredString(input.medicine);
      const dose = asOptionalString(input.dose);

      if (!medicine) {
        return undefined;
      }

      return {
        id: base.id,
        type: "medication",
        date: base.date,
        medicine,
        ...(dose ? { dose } : {}),
        ...(base.note ? { note: base.note } : {}),
      };
    }
    case "vomit": {
      if (typeof input.hairball !== "boolean") {
        return undefined;
      }

      return {
        id: base.id,
        type: "vomit",
        date: base.date,
        hairball: input.hairball,
        ...(base.note ? { note: base.note } : {}),
      };
    }
    case "note": {
      if (!base.note) {
        return undefined;
      }

      return {
        id: base.id,
        type: "note",
        date: base.date,
        note: base.note,
      };
    }
    default:
      return undefined;
  }
}

function isPlainRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function asRequiredString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseCatProfileUpdate(
  input: unknown,
): ParsedCatProfileUpdate | undefined {
  if (!isPlainRecord(input)) {
    return undefined;
  }

  const name = "name" in input ? asRequiredString(input.name) : undefined;

  if ("name" in input && !name) {
    return undefined;
  }

  const update: ParsedCatProfileUpdate = {
    ...(name !== undefined ? { name } : {}),
    ...("birthday" in input
      ? { birthday: emptyableString(input.birthday) ?? null }
      : {}),
    ...("profilePhoto" in input
      ? { profilePhoto: input.profilePhoto as RecordPhotoInput }
      : {}),
  };

  if ("identity" in input) {
    const identity = parseCatIdentity(input.identity);

    if (!identity) {
      return undefined;
    }

    update.identity = Object.keys(identity).length > 0 ? identity : null;
  }

  return update;
}

function parseCatIdentity(input: unknown): CatIdentity | undefined {
  if (!isPlainRecord(input)) {
    return undefined;
  }

  const identity = {
    breed: emptyableString(input.breed),
    color: emptyableString(input.color),
    insurance: emptyableString(input.insurance),
    microchip: emptyableString(input.microchip),
    sex: emptyableString(input.sex),
    vetContact: emptyableString(input.vetContact),
  };

  return Object.fromEntries(
    Object.entries(identity).filter(([, value]) => value !== undefined),
  );
}

function emptyableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

async function writeRecordPhotos(
  options: { catId: string; uploadsDir: string },
  recordId: string,
  input: unknown,
): Promise<RecordPhoto[] | undefined> {
  if (input === undefined) {
    return undefined;
  }

  const photo = parseRecordPhotoInput(input);

  if (!photo) {
    return undefined;
  }

  const extension = extensionForContentType(photo.contentType);
  const id = randomUUID();
  const storedFilename = `${recordId}-${id}.${extension}`;
  const catUploadDir = join(options.uploadsDir, options.catId);
  const tempPath = join(catUploadDir, `${storedFilename}.tmp`);
  const targetPath = join(catUploadDir, storedFilename);

  await mkdir(catUploadDir, { recursive: true });
  await writeFile(tempPath, photo.bytes);
  await rename(tempPath, targetPath);

  return [
    {
      contentType: photo.contentType,
      filename: sanitizeDisplayFilename(photo.filename),
      id,
      url: `/api/uploads/${options.catId}/${storedFilename}`,
    },
  ];
}

async function writeProfilePhoto(
  options: { catId: string; uploadsDir: string },
  input: unknown,
): Promise<RecordPhoto | undefined> {
  if (input === undefined) {
    return undefined;
  }

  const photo = parseRecordPhotoInput(input);

  if (!photo) {
    return undefined;
  }

  const extension = extensionForContentType(photo.contentType);
  const id = randomUUID();
  const storedFilename = `profile-${id}.${extension}`;
  const catUploadDir = join(options.uploadsDir, options.catId);
  const tempPath = join(catUploadDir, `${storedFilename}.tmp`);
  const targetPath = join(catUploadDir, storedFilename);

  await mkdir(catUploadDir, { recursive: true });
  await writeFile(tempPath, photo.bytes);
  await rename(tempPath, targetPath);

  return {
    contentType: photo.contentType,
    filename: sanitizeDisplayFilename(photo.filename),
    id,
    url: `/api/uploads/${options.catId}/${storedFilename}`,
  };
}

function parseRecordPhotoInput(
  input: unknown,
): (RecordPhotoInput & { bytes: Uint8Array }) | undefined {
  if (!isPlainRecord(input)) {
    return undefined;
  }

  const filename = asRequiredString(input.filename);
  const contentType = asRecordPhotoContentType(input.contentType);
  const dataUrl = asRequiredString(input.dataUrl);

  if (!filename || !contentType || !dataUrl) {
    return undefined;
  }

  const prefix = `data:${contentType};base64,`;

  if (!dataUrl.startsWith(prefix)) {
    return undefined;
  }

  const bytes = Buffer.from(dataUrl.slice(prefix.length), "base64");

  if (bytes.length === 0 || bytes.length > 8 * 1024 * 1024) {
    return undefined;
  }

  return {
    contentType,
    dataUrl,
    filename,
    bytes,
  };
}

function asRecordPhotoContentType(value: unknown): RecordPhoto["contentType"] | undefined {
  if (
    value === "image/jpeg" ||
    value === "image/png" ||
    value === "image/webp"
  ) {
    return value;
  }

  return undefined;
}

function extensionForContentType(contentType: RecordPhoto["contentType"]) {
  return contentType === "image/jpeg"
    ? "jpg"
    : contentType === "image/png"
      ? "png"
      : "webp";
}

function contentTypeFromFilename(filename: string): RecordPhoto["contentType"] | undefined {
  if (filename.endsWith(".jpg")) {
    return "image/jpeg";
  }

  if (filename.endsWith(".png")) {
    return "image/png";
  }

  if (filename.endsWith(".webp")) {
    return "image/webp";
  }

  return undefined;
}

function isSafeUploadFilename(filename: string) {
  return /^[a-z0-9_.-]+\.(jpg|png|webp)$/i.test(filename);
}

function sanitizeDisplayFilename(filename: string) {
  return filename.replace(/[^\w .-]/g, "").trim() || "record-photo";
}
