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

export type RecordPhoto = {
  id: string;
  filename: string;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  url: string;
};

export type RecordPhotoInput = {
  filename: string;
  contentType: RecordPhoto["contentType"];
  dataUrl: string;
};

export type WeightMeasurement = {
  id: string;
  type: "weight";
  date: string;
  weightKg: number;
  note?: string;
  photos?: RecordPhoto[];
};

export type VetVisit = {
  id: string;
  type: "vetVisit";
  date: string;
  reason?: string;
  note?: string;
  photos?: RecordPhoto[];
};

export type MedicationEvent = {
  id: string;
  type: "medication";
  date: string;
  medicine: string;
  dose?: string;
  note?: string;
  photos?: RecordPhoto[];
};

export type VomitEvent = {
  id: string;
  type: "vomit";
  date: string;
  hairball: boolean;
  note?: string;
  photos?: RecordPhoto[];
};

export type NoteRecord = {
  id: string;
  type: "note";
  date: string;
  note: string;
  photos?: RecordPhoto[];
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
  profilePhoto?: RecordPhoto;
  dueItems: DueItem[];
  records: HealthRecord[];
};

export type CatCardSummary = {
  id: string;
  name: string;
  ageLabel: string;
  placeholder: CatFile["placeholder"];
  profilePhoto?: RecordPhoto;
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
  | (Omit<WeightMeasurement, "id" | "photos"> & { photo?: RecordPhotoInput })
  | (Omit<VetVisit, "id" | "photos"> & { photo?: RecordPhotoInput })
  | (Omit<MedicationEvent, "id" | "photos"> & { photo?: RecordPhotoInput })
  | (Omit<VomitEvent, "id" | "photos"> & { photo?: RecordPhotoInput })
  | (Omit<NoteRecord, "id" | "photos"> & { photo?: RecordPhotoInput });

export type AddRecordResponse = {
  record: HealthRecord;
};

export type UpdateCatProfileInput = {
  birthday?: string;
  identity?: CatIdentity;
  name?: string;
  profilePhoto?: RecordPhotoInput;
};
