export type DueItemStatus = "upcoming" | "due" | "overdue";

export type DueItem = {
  id: string;
  label: string;
  dueDate: string;
  status?: DueItemStatus;
};

export type CatIdentity = {
  sex?: string;
  breed?: string;
  color?: string;
  microchip?: string;
  insurance?: string;
  vetContact?: string;
};

export type WeightMeasurement = {
  id: string;
  type: "weight";
  date: string;
  weightKg: number;
  note?: string;
};

export type VetVisit = {
  id: string;
  type: "vetVisit";
  date: string;
  reason?: string;
  note?: string;
};

export type MedicationEvent = {
  id: string;
  type: "medication";
  date: string;
  medicine: string;
  dose?: string;
  note?: string;
};

export type VomitEvent = {
  id: string;
  type: "vomit";
  date: string;
  hairball: boolean;
  note?: string;
};

export type NoteRecord = {
  id: string;
  type: "note";
  date: string;
  note: string;
};

export type HealthRecord =
  | WeightMeasurement
  | VetVisit
  | MedicationEvent
  | VomitEvent
  | NoteRecord;

export type CatFile = {
  id: string;
  name: string;
  birthday?: string;
  placeholder: "calico" | "tabby" | "void";
  identity?: CatIdentity;
  dueItems: DueItem[];
  records: HealthRecord[];
};

export type CatCardSummary = {
  id: string;
  name: string;
  ageLabel: string;
  placeholder: CatFile["placeholder"];
  latestWeightKg?: number;
  lastVetVisitDate?: string;
  alertChip?: {
    label: string;
    dueDate: string;
    status: DueItemStatus;
  };
};

export type CatCardsResponse = {
  cats: CatCardSummary[];
};

export type CatProfileResponse = {
  cat: CatFile;
};

export type AddRecordInput =
  | Omit<WeightMeasurement, "id">
  | Omit<VetVisit, "id">
  | Omit<MedicationEvent, "id">
  | Omit<VomitEvent, "id">
  | Omit<NoteRecord, "id">;

export type AddRecordResponse = {
  record: HealthRecord;
};
