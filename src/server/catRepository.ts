import { randomUUID } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  CatCardSummary,
  CatFile,
  DueItem,
  DueItemStatus,
  HealthRecord,
  VetVisit,
  WeightMeasurement,
} from "../shared/types";

export type CatRepository = {
  listPublicSummaries(): Promise<CatCardSummary[]>;
  getCatProfile(catId: string): Promise<CatFile | undefined>;
  addHealthRecord(catId: string, input: unknown): Promise<HealthRecord | undefined>;
};

export function createCatRepository(options: {
  dataDir: string;
  today?: string;
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

      const record = toHealthRecord(input);

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
  await writeFile(
    join(dataDir, `${cat.id}.json`),
    `${JSON.stringify(cat, null, 2)}\n`,
  );
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

function toHealthRecord(input: unknown): HealthRecord | undefined {
  if (!isPlainRecord(input) || typeof input.type !== "string") {
    return undefined;
  }

  const date = asRequiredString(input.date);

  if (!date) {
    return undefined;
  }

  const note = asOptionalString(input.note);
  const id = `${input.type}-${date}-${randomUUID()}`;

  switch (input.type) {
    case "weight": {
      if (typeof input.weightKg !== "number" || !Number.isFinite(input.weightKg)) {
        return undefined;
      }

      return {
        id,
        type: "weight",
        date,
        weightKg: input.weightKg,
        ...(note ? { note } : {}),
      };
    }
    case "vetVisit": {
      const reason = asOptionalString(input.reason);

      return {
        id,
        type: "vetVisit",
        date,
        ...(reason ? { reason } : {}),
        ...(note ? { note } : {}),
      };
    }
    case "medication": {
      const medicine = asRequiredString(input.medicine);
      const dose = asOptionalString(input.dose);

      if (!medicine) {
        return undefined;
      }

      return {
        id,
        type: "medication",
        date,
        medicine,
        ...(dose ? { dose } : {}),
        ...(note ? { note } : {}),
      };
    }
    case "vomit": {
      if (typeof input.hairball !== "boolean") {
        return undefined;
      }

      return {
        id,
        type: "vomit",
        date,
        hairball: input.hairball,
        ...(note ? { note } : {}),
      };
    }
    case "note": {
      if (!note) {
        return undefined;
      }

      return {
        id,
        type: "note",
        date,
        note,
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
