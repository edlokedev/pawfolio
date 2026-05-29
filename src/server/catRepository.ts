import { readdir, readFile } from "node:fs/promises";
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
};

export function createCatRepository(options: {
  dataDir: string;
  today?: string;
}): CatRepository {
  const today = options.today ?? new Date().toISOString().slice(0, 10);

  return {
    async listPublicSummaries() {
      const files = await readdir(options.dataDir);
      const cats = await Promise.all(
        files
          .filter((file) => file.endsWith(".json"))
          .sort()
          .map(async (file) => {
            const json = await readFile(join(options.dataDir, file), "utf8");
            return JSON.parse(json) as CatFile;
          }),
      );

      return cats.map((cat) => toPublicSummary(cat, today));
    },
  };
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
  return records.filter(predicate).sort((a, b) => b.date.localeCompare(a.date))[0];
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

