import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Activity,
  Bell,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  ClipboardList,
  Heart,
  Home,
  LockKeyhole,
  NotebookText,
  PawPrint,
  Pill,
  Plus,
  Settings,
  Stethoscope,
  Weight,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  hrefForRoute,
  routeFromHash,
  sectionIdForRoute,
  type AppRoute,
} from "./navigation";
import type {
  AddRecordInput,
  AddRecordResponse,
  CatCardSummary,
  CatCardsResponse,
  CatFile,
  CatProfileResponse,
  HealthRecord,
  RecordPhotoInput,
  UpdateCatProfileInput,
} from "../shared/types";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; cats: CatCardSummary[] }
  | { status: "error"; message: string };

type ProfileLoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; cat: CatFile }
  | { status: "error"; message: string };

type RecordType = AddRecordInput["type"];
type HistoryFilter = HealthRecord["type"] | "all";
type PortraitCat = Pick<CatCardSummary, "id" | "placeholder" | "profilePhoto">;

const ownerCodeStorageKey = "pawfolio-owner-code";

export function App() {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [profileState, setProfileState] = useState<ProfileLoadState>({
    status: "idle",
  });
  const [selectedCatId, setSelectedCatId] = useState<string | undefined>();
  const [profileVersion, setProfileVersion] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [ownerCode, setOwnerCode] = useState(readOwnerCode);
  const [route, setRoute] = useState(readCurrentRoute);

  useEffect(() => {
    let active = true;

    fetchCatCards()
      .then((data) => {
        if (!active) {
          return;
        }

        setLoadState({ status: "ready", cats: data.cats });
        setSelectedCatId((current) => current ?? data.cats[0]?.id);
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        setLoadState({
          status: "error",
          message: error instanceof Error ? error.message : "Pawfolio could not load.",
        });
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedCatId) {
      setProfileState({ status: "idle" });
      return;
    }

    let active = true;
    setProfileState({ status: "loading" });

    fetchCatProfile(selectedCatId)
      .then((data) => {
        if (!active) {
          return;
        }

        setProfileState({ status: "ready", cat: data.cat });
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        setProfileState({
          status: "error",
          message:
            error instanceof Error ? error.message : "Cat profile could not load.",
        });
      });

    return () => {
      active = false;
    };
  }, [selectedCatId, profileVersion]);

  useEffect(() => {
    function syncRoute() {
      setRoute(readCurrentRoute());
    }

    window.addEventListener("hashchange", syncRoute);
    syncRoute();

    return () => window.removeEventListener("hashchange", syncRoute);
  }, []);

  useEffect(() => {
    const sectionId = sectionIdForRoute(route);

    if (!sectionId) {
      return;
    }

    window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
    });
  }, [loadState.status, profileState.status, route]);

  async function refreshCatCards() {
    const data = await fetchCatCards();
    setLoadState({ status: "ready", cats: data.cats });
    setSelectedCatId((current) => current ?? data.cats[0]?.id);
  }

  function saveOwnerCode(nextCode: string) {
    const trimmed = nextCode.trim();
    setOwnerCode(trimmed);

    if (trimmed) {
      window.sessionStorage.setItem(ownerCodeStorageKey, trimmed);
      return;
    }

    window.sessionStorage.removeItem(ownerCodeStorageKey);
  }

  const cats = loadState.status === "ready" ? loadState.cats : [];
  const selectedCat = cats.find((cat) => cat.id === selectedCatId) ?? cats[0];
  const dueCount = cats.filter((cat) => cat.alertChip).length;

  return (
    <main className="min-h-screen px-3 py-3 text-foreground sm:px-5 sm:py-5">
      <div className="mx-auto min-h-[calc(100vh-1.5rem)] w-full max-w-[1180px] overflow-hidden rounded-lg border border-border bg-card shadow-[0_24px_80px_oklch(47%_0.08_42_/_0.17)] sm:min-h-[calc(100vh-2.5rem)]">
        <AppHeader
          ownerCodeSet={ownerCode.length > 0}
          onToggleUnlock={() => setUnlockOpen((isOpen) => !isOpen)}
        />

        <div className="grid lg:grid-cols-[236px_minmax(0,1fr)]">
          <Sidebar dueCount={dueCount} route={route} />

          <div className="px-4 py-8 sm:px-8 sm:py-9 lg:px-9">
            {unlockOpen && (
              <OwnerUnlockPanel
                ownerCode={ownerCode}
                onClose={() => setUnlockOpen(false)}
                onSave={saveOwnerCode}
              />
            )}

            {route.view === "settings" ? (
              <SettingsPage
                ownerCodeSet={ownerCode.length > 0}
                onOpenUnlock={() => setUnlockOpen(true)}
              />
            ) : (
              <>
                <section aria-labelledby="overview-title" className="relative">
                  <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2
                        className="text-[1.9rem] font-black leading-tight tracking-normal text-ink"
                        id="overview-title"
                      >
                        Overview
                      </h2>
                      <p className="mt-1 text-base font-medium text-muted-foreground">
                        Health at a glance for your feline family.
                      </p>
                    </div>
                    <Button
                      className="h-14 w-full px-7 text-lg sm:w-auto"
                      disabled={!selectedCat}
                      onClick={() => setComposerOpen(true)}
                      type="button"
                    >
                      <Plus />
                      Add Record
                    </Button>
                  </div>

                  {composerOpen && selectedCat && (
                    <RecordComposer
                      cat={selectedCat}
                      ownerCode={ownerCode}
                      onCancel={() => setComposerOpen(false)}
                      onRequestUnlock={() => setUnlockOpen(true)}
                      onSaved={async () => {
                        setComposerOpen(false);
                        setProfileVersion((version) => version + 1);
                        await refreshCatCards();
                      }}
                    />
                  )}

                  {loadState.status === "loading" && <SkeletonGrid />}
                  {loadState.status === "error" && (
                    <Card className="border-rose-200 bg-rose-50 p-4 text-rose-950">
                      {loadState.message}
                    </Card>
                  )}
                  {loadState.status === "ready" && (
                    <div className="grid gap-4 md:grid-cols-3">
                      {cats.map((cat) => (
                        <CatCard
                          cat={cat}
                          isSelected={selectedCat?.id === cat.id}
                          key={cat.id}
                          onSelect={() => setSelectedCatId(cat.id)}
                        />
                      ))}
                    </div>
                  )}
                </section>

                {loadState.status === "ready" && <DueItemsPanel cats={cats} />}
                {selectedCat && (
                  <CatProfilePanel
                    ownerCode={ownerCode}
                    onProfileSaved={async () => {
                      setProfileVersion((version) => version + 1);
                      await refreshCatCards();
                    }}
                    onRequestUnlock={() => setUnlockOpen(true)}
                    profileState={profileState}
                    summary={selectedCat}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function AppHeader({
  ownerCodeSet,
  onToggleUnlock,
}: {
  ownerCodeSet: boolean;
  onToggleUnlock: () => void;
}) {
  return (
    <header className="flex min-h-[92px] items-center justify-between gap-4 border-b border-border bg-card/95 px-5 sm:px-9 lg:px-12">
      <div className="flex items-center gap-3 text-[2rem] font-black leading-none tracking-normal text-ink">
        <PawPrint className="text-primary" size={34} strokeWidth={2.8} />
        <h1>Pawfolio</h1>
      </div>
      <Button
        className="h-12 px-5"
        onClick={onToggleUnlock}
        type="button"
        variant="outline"
      >
        <LockKeyhole />
        {ownerCodeSet ? "Code saved" : "Owner unlock"}
      </Button>
    </header>
  );
}

function OwnerUnlockPanel({
  ownerCode,
  onClose,
  onSave,
}: {
  ownerCode: string;
  onClose: () => void;
  onSave: (ownerCode: string) => void;
}) {
  const [value, setValue] = useState(ownerCode);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave(value);
    onClose();
  }

  return (
    <Card className="mb-6 border-primary/40 bg-accent/50 p-4">
      <form
        className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
        onSubmit={handleSubmit}
      >
        <label className="grid gap-1 text-sm font-black text-ink">
          Owner code
          <Input
            autoComplete="current-password"
            onChange={(event) => setValue(event.target.value)}
            placeholder="Enter unlock code"
            type="password"
            value={value}
          />
        </label>
        <Button className="self-end" type="submit">
          <Check />
          Save
        </Button>
        <Button
          className="self-end"
          onClick={onClose}
          type="button"
          variant="outline"
        >
          <X />
          Close
        </Button>
      </form>
    </Card>
  );
}

function Sidebar({ dueCount, route }: { dueCount: number; route: AppRoute }) {
  const navItems = [
    {
      icon: Home,
      label: "Overview",
      route: { view: "overview", section: "overview" } satisfies AppRoute,
    },
    {
      icon: ClipboardList,
      label: "Timeline",
      route: { view: "overview", section: "profile" } satisfies AppRoute,
    },
    {
      count: dueCount,
      icon: Bell,
      label: "Due Items",
      route: { view: "overview", section: "due-items" } satisfies AppRoute,
    },
    {
      icon: Settings,
      label: "Settings",
      route: { view: "settings" } satisfies AppRoute,
    },
  ];
  const currentHref = hrefForRoute(route);

  return (
    <aside className="hidden min-h-[calc(100vh-2.5rem-92px)] border-r border-border bg-sidebar px-5 py-9 lg:block">
      <nav className="grid gap-3" aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <Button
              asChild
              className={cn(
                "h-12 justify-start px-3",
                hrefForRoute(item.route) === currentHref &&
                  "bg-accent text-accent-foreground",
              )}
              key={item.label}
              variant="nav"
            >
              <a href={hrefForRoute(item.route)}>
                <Icon />
                {item.label}
                {(item.count ?? 0) > 0 && (
                  <span className="ml-auto grid size-6 place-items-center rounded-full bg-amber-300 text-xs font-black text-amber-950">
                    {item.count}
                  </span>
                )}
              </a>
            </Button>
          );
        })}
      </nav>
    </aside>
  );
}

function RecordComposer({
  cat,
  ownerCode,
  onCancel,
  onRequestUnlock,
  onSaved,
}: {
  cat: CatCardSummary;
  ownerCode: string;
  onCancel: () => void;
  onRequestUnlock: () => void;
  onSaved: () => Promise<void>;
}) {
  const [type, setType] = useState<RecordType>("note");
  const [date, setDate] = useState(todayInputValue);
  const [note, setNote] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [reason, setReason] = useState("");
  const [medicine, setMedicine] = useState("");
  const [dose, setDose] = useState("");
  const [hairball, setHairball] = useState(true);
  const [photoFile, setPhotoFile] = useState<File | undefined>();
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | undefined>();
  const [saveState, setSaveState] = useState<
    { status: "idle" } | { status: "saving" } | { status: "error"; message: string }
  >({ status: "idle" });

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreviewUrl(undefined);
      return;
    }

    const previewUrl = URL.createObjectURL(photoFile);
    setPhotoPreviewUrl(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [photoFile]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveState({ status: "idle" });

    if (!ownerCode.trim()) {
      setSaveState({ status: "error", message: "Owner unlock code needed." });
      onRequestUnlock();
      return;
    }

    const photo = await toRecordPhotoInput(photoFile);

    if (photoFile && !photo) {
      setSaveState({
        status: "error",
        message: "Photo must be JPG, PNG, or WebP under 8 MB.",
      });
      return;
    }

    const payload = buildAddRecordInput({
      date,
      dose,
      hairball,
      medicine,
      note,
      photo,
      reason,
      type,
      weightKg,
    });

    if (!payload) {
      setSaveState({ status: "error", message: "Record needs valid details." });
      return;
    }

    setSaveState({ status: "saving" });

    let response: Response;

    try {
      response = await fetch(`/api/cats/${cat.id}/records`, {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
          "x-owner-unlock-code": ownerCode,
        },
        method: "POST",
      });
    } catch {
      setSaveState({ status: "error", message: "Record could not save." });
      return;
    }

    if (response.status === 401) {
      setSaveState({ status: "error", message: "Owner unlock code rejected." });
      onRequestUnlock();
      return;
    }

    if (!response.ok) {
      const error = await readErrorMessage(response);
      setSaveState({ status: "error", message: error });
      return;
    }

    await response.json() as AddRecordResponse;

    try {
      await onSaved();
    } catch {
      setSaveState({ status: "error", message: "Record saved. Refresh failed." });
    }
  }

  return (
    <Card className="mb-6 border-primary/50 bg-card-gradient p-4 shadow-[0_18px_42px_oklch(57%_0.13_38_/_0.13)]">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-normal text-brand">
            Protected Record Change
          </p>
          <h3 className="text-lg font-black text-ink">Add Record for {cat.name}</h3>
        </div>
        <Button onClick={onCancel} type="button" variant="outline">
          <X />
          Close
        </Button>
      </div>

      <form className="grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 sm:grid-cols-[180px_180px_minmax(0,1fr)]">
          <label className="grid gap-1 text-sm font-black text-ink">
            Type
            <select
              className="h-11 cursor-pointer rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
              onChange={(event) => setType(event.target.value as RecordType)}
              value={type}
            >
              <option value="note">Note</option>
              <option value="weight">Weight</option>
              <option value="vetVisit">Vet visit</option>
              <option value="medication">Medication</option>
              <option value="vomit">Vomit</option>
            </select>
          </label>

          <label className="grid gap-1 text-sm font-black text-ink">
            Date
            <Input
              onChange={(event) => setDate(event.target.value)}
              required
              type="date"
              value={date}
            />
          </label>
        </div>

        {type === "weight" && (
          <label className="grid gap-1 text-sm font-black text-ink">
            Weight kg
            <Input
              inputMode="decimal"
              min="0"
              onChange={(event) => setWeightKg(event.target.value)}
              placeholder="4.6"
              required
              step="0.1"
              type="number"
              value={weightKg}
            />
          </label>
        )}

        {type === "vetVisit" && (
          <label className="grid gap-1 text-sm font-black text-ink">
            Reason
            <Input
              onChange={(event) => setReason(event.target.value)}
              placeholder="Annual checkup"
              value={reason}
            />
          </label>
        )}

        {type === "medication" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-black text-ink">
              Medicine
              <Input
                onChange={(event) => setMedicine(event.target.value)}
                placeholder="Medicine name"
                required
                value={medicine}
              />
            </label>
            <label className="grid gap-1 text-sm font-black text-ink">
              Dose
              <Input
                onChange={(event) => setDose(event.target.value)}
                placeholder="1 tablet"
                value={dose}
              />
            </label>
          </div>
        )}

        {type === "vomit" && (
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-black text-ink">
            <input
              checked={hairball}
              className="size-4 cursor-pointer accent-primary"
              onChange={(event) => setHairball(event.target.checked)}
              type="checkbox"
            />
            Hairball
          </label>
        )}

        <label className="grid gap-1 text-sm font-black text-ink">
          Notes
          <Textarea
            onChange={(event) => setNote(event.target.value)}
            placeholder={
              type === "note"
                ? "What changed?"
                : "Extra context, appetite, mood, or care detail"
            }
            required={type === "note"}
            value={note}
          />
        </label>

        <label className="grid gap-2 text-sm font-black text-ink">
          Photo
          <div className="grid gap-3 rounded-lg border border-dashed border-border bg-background/70 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <Input
              accept="image/*"
              className="cursor-pointer"
              onChange={(event) => setPhotoFile(event.target.files?.[0])}
              type="file"
            />
            <span className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground">
              <Camera size={16} />
              Camera or gallery
            </span>
            {photoPreviewUrl && (
              <img
                alt=""
                className="h-24 w-24 rounded-lg border border-border object-cover"
                src={photoPreviewUrl}
              />
            )}
          </div>
        </label>

        {saveState.status === "error" && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold text-rose-950">
            {saveState.message}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button disabled={saveState.status === "saving"} type="submit">
            <Plus />
            {saveState.status === "saving" ? "Saving" : "Save Record"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function CatCard({
  cat,
  isSelected,
  onSelect,
}: {
  cat: CatCardSummary;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={cn(
        "group grid min-h-[330px] cursor-pointer grid-rows-[auto_auto_1fr] gap-4 rounded-lg border border-border bg-card-gradient p-4 text-left text-card-foreground shadow-[0_14px_34px_oklch(51%_0.07_42_/_0.08)] transition-all duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
        isSelected &&
          "border-primary shadow-[0_18px_42px_oklch(57%_0.13_38_/_0.16),inset_0_0_0_1px_oklch(70%_0.14_38_/_0.4)]",
      )}
      onClick={onSelect}
      type="button"
    >
      <CatPortrait cat={cat} size="card" />

      <div className="grid justify-items-center gap-2 text-center">
        <div>
          <strong className="block text-[1.45rem] font-black leading-none text-ink">
            {cat.name}
          </strong>
          <small className="mt-1 block text-sm text-muted-foreground">
            {cat.ageLabel} old
          </small>
        </div>
        {cat.alertChip && (
          <Badge variant={cat.alertChip.status}>{cat.alertChip.label}</Badge>
        )}
      </div>

      <div className="self-end border-t border-border/80">
        <FactRow
          icon={<Weight size={15} />}
          label="Latest weight"
          value={formatWeight(cat.latestWeightKg)}
        />
        <FactRow
          icon={<Stethoscope size={15} />}
          label="Last vet"
          value={formatDate(cat.lastVetVisitDate)}
        />
      </div>
    </button>
  );
}

function FactRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="grid min-h-10 grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-2 border-b border-border/70 last:border-b-0 max-[520px]:grid-cols-[22px_minmax(0,1fr)]">
      <span className="text-brand">{icon}</span>
      <small className="text-muted-foreground">{label}</small>
      <strong className="text-sm font-black text-ink max-[520px]:col-start-2">
        {value}
      </strong>
    </div>
  );
}

function DueItemsPanel({ cats }: { cats: CatCardSummary[] }) {
  const dueCats = cats.filter((cat) => cat.alertChip);

  return (
    <Card className="mt-6 p-4" id="due-items-title">
      <div className="mb-2 flex items-center justify-between gap-4">
        <h2 className="text-base font-black text-ink">Due Items</h2>
        <span className="text-sm font-bold text-muted-foreground">
          {dueCats.length} active
        </span>
      </div>
      <div className="grid">
        {dueCats.map((cat) => (
          <div
            className="grid min-h-14 grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 border-t border-border max-[560px]:grid-cols-[32px_minmax(0,1fr)]"
            key={cat.id}
          >
            <span className="grid size-8 place-items-center rounded-lg bg-muted text-brand">
              <Bell size={16} />
            </span>
            <span>
              <strong className="block text-sm font-black text-ink">
                {cat.name}, {cat.alertChip?.label}
              </strong>
              <small className="mt-1 block text-muted-foreground">
                Due {formatDate(cat.alertChip?.dueDate)}
              </small>
            </span>
            <Badge
              className="max-[560px]:col-start-2 max-[560px]:justify-self-start"
              variant={cat.alertChip?.status}
            >
              {cat.alertChip?.status}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CatProfilePanel({
  ownerCode,
  onProfileSaved,
  onRequestUnlock,
  profileState,
  summary,
}: {
  ownerCode: string;
  onProfileSaved: () => Promise<void>;
  onRequestUnlock: () => void;
  profileState: ProfileLoadState;
  summary: CatCardSummary;
}) {
  if (profileState.status === "loading" || profileState.status === "idle") {
    return (
      <Card className="mt-6 p-5" id="profile-title">
        <p className="font-black text-ink">Loading {summary.name}'s profile...</p>
      </Card>
    );
  }

  if (profileState.status === "error") {
    return (
      <Card className="mt-6 border-rose-200 bg-rose-50 p-5 text-rose-950">
        {profileState.message}
      </Card>
    );
  }

  return (
    <CatProfileReadyPanel
      cat={profileState.cat}
      ownerCode={ownerCode}
      onProfileSaved={onProfileSaved}
      onRequestUnlock={onRequestUnlock}
    />
  );
}

function CatProfileReadyPanel({
  cat,
  ownerCode,
  onProfileSaved,
  onRequestUnlock,
}: {
  cat: CatFile;
  ownerCode: string;
  onProfileSaved: () => Promise<void>;
  onRequestUnlock: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const sections = profileSections(cat);
  const filteredRecords =
    historyFilter === "all"
      ? cat.records
      : cat.records.filter((record) => record.type === historyFilter);
  const activeHistoryTitle = historyTitle(historyFilter);

  useEffect(() => {
    setHistoryFilter("all");
    setEditOpen(false);
  }, [cat.id]);

  function selectHistory(nextFilter: HistoryFilter) {
    setHistoryFilter(nextFilter);
    window.requestAnimationFrame(() => {
      document
        .getElementById("profile-history")
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }

  return (
    <Card className="mt-6 overflow-hidden">
      <section
        aria-labelledby="profile-title"
        className="grid lg:grid-cols-[300px_minmax(0,1fr)]"
      >
        <div className="flex flex-col items-center gap-4 bg-profile-panel p-6 text-center lg:items-start lg:text-left">
          <CatPortrait cat={cat} size="profile" />
          <div>
            <p className="mb-1 text-xs font-black uppercase tracking-normal text-brand">
              Cat Profile
            </p>
            <h2
              className="text-[1.45rem] font-black leading-tight tracking-normal text-ink"
              id="profile-title"
            >
              {cat.name}
            </h2>
            <dl className="mt-4 grid gap-2 text-sm">
              <IdentityFact label="Birthday" value={formatDate(cat.birthday)} />
              <IdentityFact label="Sex" value={cat.identity?.sex} />
              <IdentityFact label="Breed" value={cat.identity?.breed} />
              <IdentityFact label="Color" value={cat.identity?.color} />
            </dl>
            <Button
              className="mt-5"
              onClick={() => {
                if (!ownerCode.trim()) {
                  onRequestUnlock();
                  return;
                }

                setEditOpen((isOpen) => !isOpen);
              }}
              type="button"
              variant="outline"
            >
              <LockKeyhole />
              {ownerCode.trim() ? "Edit Profile" : "Unlock to edit"}
            </Button>
          </div>
        </div>

        <div className="grid px-4 py-3 sm:px-5">
          {sections.map((section) => {
            const Icon = section.icon;

            return (
              <button
                aria-pressed={historyFilter === section.historyFilter}
                className={cn(
                  "grid min-h-16 cursor-pointer grid-cols-[32px_minmax(0,1fr)_auto_18px] items-center gap-3 border-b border-border text-left transition-colors last:border-b-0 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring max-[560px]:grid-cols-[32px_minmax(0,1fr)_18px]",
                  historyFilter === section.historyFilter && "bg-accent/50",
                )}
                key={section.title}
                onClick={() => selectHistory(section.historyFilter)}
                type="button"
              >
                <span className="grid size-8 place-items-center rounded-lg bg-muted text-brand">
                  <Icon size={18} />
                </span>
                <span>
                  <strong className="block text-sm font-black text-ink">
                    {section.title}
                  </strong>
                  <small className="mt-1 block text-muted-foreground">
                    {section.detail}
                  </small>
                </span>
                <Badge
                  className="max-[560px]:col-start-2 max-[560px]:justify-self-start"
                  variant="sage"
                >
                  {section.tag}
                </Badge>
                <ChevronRight className="text-muted-foreground" size={17} />
              </button>
            );
          })}
        </div>
      </section>

      {editOpen && (
        <CatProfileEditor
          cat={cat}
          ownerCode={ownerCode}
          onCancel={() => setEditOpen(false)}
          onRequestUnlock={onRequestUnlock}
          onSaved={async () => {
            setEditOpen(false);
            await onProfileSaved();
          }}
        />
      )}

      <div className="border-t border-border p-4 sm:p-5" id="profile-history">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="text-base font-black text-ink">{activeHistoryTitle}</h3>
          <span className="text-sm font-bold text-muted-foreground">
            {filteredRecords.length} records
          </span>
        </div>
        <ol className="grid">
          {filteredRecords.slice(0, 8).map((record) => (
            <RecordRow key={record.id} record={record} />
          ))}
        </ol>
      </div>
    </Card>
  );
}

function IdentityFact({
  label,
  value,
}: {
  label: string;
  value: string | undefined;
}) {
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2">
      <dt className="font-bold text-muted-foreground">{label}</dt>
      <dd className="font-black text-ink">{value ?? "Unknown"}</dd>
    </div>
  );
}

function CatProfileEditor({
  cat,
  ownerCode,
  onCancel,
  onRequestUnlock,
  onSaved,
}: {
  cat: CatFile;
  ownerCode: string;
  onCancel: () => void;
  onRequestUnlock: () => void;
  onSaved: () => Promise<void>;
}) {
  const [birthday, setBirthday] = useState(cat.birthday ?? "");
  const [breed, setBreed] = useState(cat.identity?.breed ?? "");
  const [color, setColor] = useState(cat.identity?.color ?? "");
  const [insurance, setInsurance] = useState(cat.identity?.insurance ?? "");
  const [microchip, setMicrochip] = useState(cat.identity?.microchip ?? "");
  const [name, setName] = useState(cat.name);
  const [photoFile, setPhotoFile] = useState<File | undefined>();
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | undefined>();
  const [sex, setSex] = useState(cat.identity?.sex ?? "");
  const [vetContact, setVetContact] = useState(cat.identity?.vetContact ?? "");
  const [saveState, setSaveState] = useState<
    { status: "idle" } | { status: "saving" } | { status: "error"; message: string }
  >({ status: "idle" });

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreviewUrl(undefined);
      return;
    }

    const previewUrl = URL.createObjectURL(photoFile);
    setPhotoPreviewUrl(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [photoFile]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveState({ status: "idle" });

    if (!ownerCode.trim()) {
      setSaveState({ status: "error", message: "Owner unlock code needed." });
      onRequestUnlock();
      return;
    }

    const profilePhoto = await toRecordPhotoInput(photoFile);

    if (photoFile && !profilePhoto) {
      setSaveState({
        status: "error",
        message: "Photo must be JPG, PNG, or WebP under 8 MB.",
      });
      return;
    }

    const payload: UpdateCatProfileInput = {
      birthday,
      identity: {
        breed,
        color,
        insurance,
        microchip,
        sex,
        vetContact,
      },
      name,
      ...(profilePhoto ? { profilePhoto } : {}),
    };

    setSaveState({ status: "saving" });

    let response: Response;

    try {
      response = await fetch(`/api/cats/${cat.id}/profile`, {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
          "x-owner-unlock-code": ownerCode,
        },
        method: "PATCH",
      });
    } catch {
      setSaveState({ status: "error", message: "Profile could not save." });
      return;
    }

    if (response.status === 401) {
      setSaveState({ status: "error", message: "Owner unlock code rejected." });
      onRequestUnlock();
      return;
    }

    if (!response.ok) {
      const error = await readErrorMessage(response);
      setSaveState({ status: "error", message: error });
      return;
    }

    try {
      await onSaved();
    } catch {
      setSaveState({ status: "error", message: "Profile saved. Refresh failed." });
    }
  }

  return (
    <div className="border-t border-border bg-accent/20 p-4 sm:p-5">
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-normal text-brand">
              Protected Record Change
            </p>
            <h3 className="text-lg font-black text-ink">Edit {cat.name}</h3>
          </div>
          <Button onClick={onCancel} type="button" variant="outline">
            <X />
            Close
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-black text-ink">
            Name
            <Input
              onChange={(event) => setName(event.target.value)}
              required
              value={name}
            />
          </label>
          <label className="grid gap-1 text-sm font-black text-ink">
            Birthday
            <Input
              onChange={(event) => setBirthday(event.target.value)}
              type="date"
              value={birthday}
            />
          </label>
          <label className="grid gap-1 text-sm font-black text-ink">
            Sex
            <Input onChange={(event) => setSex(event.target.value)} value={sex} />
          </label>
          <label className="grid gap-1 text-sm font-black text-ink">
            Breed
            <Input
              onChange={(event) => setBreed(event.target.value)}
              value={breed}
            />
          </label>
          <label className="grid gap-1 text-sm font-black text-ink">
            Color
            <Input
              onChange={(event) => setColor(event.target.value)}
              value={color}
            />
          </label>
          <label className="grid gap-1 text-sm font-black text-ink">
            Microchip
            <Input
              onChange={(event) => setMicrochip(event.target.value)}
              value={microchip}
            />
          </label>
          <label className="grid gap-1 text-sm font-black text-ink">
            Insurance
            <Input
              onChange={(event) => setInsurance(event.target.value)}
              value={insurance}
            />
          </label>
          <label className="grid gap-1 text-sm font-black text-ink">
            Vet contact
            <Input
              onChange={(event) => setVetContact(event.target.value)}
              value={vetContact}
            />
          </label>
        </div>

        <label className="grid gap-2 text-sm font-black text-ink">
          Profile photo
          <div className="grid gap-3 rounded-lg border border-dashed border-border bg-background/70 p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
            <Input
              accept="image/*"
              className="cursor-pointer"
              onChange={(event) => setPhotoFile(event.target.files?.[0])}
              type="file"
            />
            <span className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground">
              <Camera size={16} />
              Camera or gallery
            </span>
            <img
              alt=""
              className="h-24 w-24 rounded-lg border border-border object-cover"
              src={photoPreviewUrl ?? cat.profilePhoto?.url ?? `/cats/${cat.id}.png`}
            />
          </div>
        </label>

        {saveState.status === "error" && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold text-rose-950">
            {saveState.message}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button disabled={saveState.status === "saving"} type="submit">
            <Check />
            {saveState.status === "saving" ? "Saving" : "Save Profile"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function RecordRow({ record }: { record: HealthRecord }) {
  const Icon = recordIcon(record);

  return (
    <li className="grid min-h-14 grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 border-t border-border first:border-t-0 max-[560px]:grid-cols-[32px_minmax(0,1fr)]">
      <span className="grid size-8 place-items-center rounded-lg bg-muted text-brand">
        <Icon size={16} />
      </span>
      <span>
        <strong className="block text-sm font-black text-ink">
          {recordTitle(record)}
        </strong>
        <small className="mt-1 block text-muted-foreground">
          {recordDetail(record)}
        </small>
        {record.photos && record.photos.length > 0 && (
          <span className="mt-2 flex flex-wrap gap-2">
            {record.photos.map((photo) => (
              <img
                alt=""
                className="size-16 rounded-lg border border-border object-cover"
                key={photo.id}
                src={photo.url}
              />
            ))}
          </span>
        )}
      </span>
      <time
        className="text-sm font-black text-ink max-[560px]:col-start-2"
        dateTime={record.date}
      >
        {formatDate(record.date)}
      </time>
    </li>
  );
}

function SettingsPage({
  ownerCodeSet,
  onOpenUnlock,
}: {
  ownerCodeSet: boolean;
  onOpenUnlock: () => void;
}) {
  return (
    <section aria-labelledby="settings-title" className="grid gap-6">
      <div>
        <div>
          <h2
            className="text-[1.9rem] font-black leading-tight tracking-normal text-ink"
            id="settings-title"
          >
            Settings
          </h2>
          <p className="mt-1 text-base font-medium text-muted-foreground">
            Owner access, local JSON data, and photo storage.
          </p>
        </div>
      </div>

      <SettingsPanel
        ownerCodeSet={ownerCodeSet}
        onOpenUnlock={onOpenUnlock}
      />
    </section>
  );
}

function SettingsPanel({
  ownerCodeSet,
  onOpenUnlock,
}: {
  ownerCodeSet: boolean;
  onOpenUnlock: () => void;
}) {
  return (
    <Card className="mt-6 p-4" id="settings">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-black text-ink">Access & Storage</h2>
        <Button onClick={onOpenUnlock} type="button" variant="outline">
          <LockKeyhole />
          {ownerCodeSet ? "Update code" : "Owner unlock"}
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <SettingTile icon={<LockKeyhole size={18} />} label="Owner" value={ownerCodeSet ? "Code saved" : "Locked"} />
        <SettingTile icon={<NotebookText size={18} />} label="Data" value="JSON files" />
        <SettingTile icon={<Camera size={18} />} label="Photos" value="Local uploads" />
      </div>
    </Card>
  );
}

function SettingTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="grid min-h-20 grid-cols-[36px_minmax(0,1fr)] items-center gap-3 rounded-lg border border-border bg-card-gradient p-3">
      <span className="grid size-9 place-items-center rounded-lg bg-muted text-brand">
        {icon}
      </span>
      <span>
        <strong className="block text-sm font-black text-ink">{label}</strong>
        <small className="mt-1 block font-bold text-muted-foreground">
          {value}
        </small>
      </span>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-3" aria-label="Loading cat cards">
      {[0, 1, 2].map((item) => (
        <Card className="min-h-[330px] animate-pulse bg-muted" key={item} />
      ))}
    </div>
  );
}

function CatPortrait({
  cat,
  size,
}: {
  cat: PortraitCat;
  size: "card" | "profile";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative grid aspect-square place-items-center overflow-hidden rounded-full border-[7px] border-background bg-muted shadow-[0_16px_34px_oklch(45%_0.06_42_/_0.14),0_0_0_1px_oklch(86%_0.038_55)]",
        size === "card" && "w-[min(168px,72%)] place-self-center",
        size === "profile" && "size-28",
      )}
    >
      <img
        alt=""
        className="h-full w-full object-cover"
        src={cat.profilePhoto?.url ?? `/cats/${cat.id}.png`}
      />
    </span>
  );
}

async function fetchCatCards() {
  const response = await fetch("/api/cats");

  if (!response.ok) {
    throw new Error("Cat cards could not load.");
  }

  return (await response.json()) as CatCardsResponse;
}

async function fetchCatProfile(catId: string) {
  const response = await fetch(`/api/cats/${catId}`);

  if (!response.ok) {
    throw new Error("Cat profile could not load.");
  }

  return (await response.json()) as CatProfileResponse;
}

function buildAddRecordInput(input: {
  date: string;
  dose: string;
  hairball: boolean;
  medicine: string;
  note: string;
  photo: RecordPhotoInput | undefined;
  reason: string;
  type: RecordType;
  weightKg: string;
}): AddRecordInput | undefined {
  const date = input.date.trim();
  const note = optionalText(input.note);

  if (!date) {
    return undefined;
  }

  switch (input.type) {
    case "weight": {
      const weightKg = Number(input.weightKg);

      if (!Number.isFinite(weightKg) || weightKg <= 0) {
        return undefined;
      }

      return {
        date,
        ...(input.photo ? { photo: input.photo } : {}),
        type: "weight",
        weightKg,
        ...(note ? { note } : {}),
      };
    }
    case "vetVisit": {
      const reason = optionalText(input.reason);

      return {
        date,
        ...(input.photo ? { photo: input.photo } : {}),
        type: "vetVisit",
        ...(reason ? { reason } : {}),
        ...(note ? { note } : {}),
      };
    }
    case "medication": {
      const medicine = optionalText(input.medicine);
      const dose = optionalText(input.dose);

      if (!medicine) {
        return undefined;
      }

      return {
        date,
        medicine,
        ...(input.photo ? { photo: input.photo } : {}),
        type: "medication",
        ...(dose ? { dose } : {}),
        ...(note ? { note } : {}),
      };
    }
    case "vomit":
      return {
        date,
        hairball: input.hairball,
        ...(input.photo ? { photo: input.photo } : {}),
        type: "vomit",
        ...(note ? { note } : {}),
      };
    case "note":
      if (!note) {
        return undefined;
      }

      return {
        date,
        note,
        ...(input.photo ? { photo: input.photo } : {}),
        type: "note",
      };
  }
}

async function toRecordPhotoInput(
  file: File | undefined,
): Promise<RecordPhotoInput | undefined> {
  if (!file) {
    return undefined;
  }

  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 8 * 1024 * 1024
  ) {
    return undefined;
  }

  return {
    contentType: file.type as RecordPhotoInput["contentType"],
    dataUrl: await readFileAsDataUrl(file),
    filename: file.name,
  };
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("error", () => reject(reader.error));
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.readAsDataURL(file);
  });
}

async function readErrorMessage(response: Response) {
  try {
    const body = await response.json() as { error?: string };
    return body.error ?? "Record could not save.";
  } catch {
    return "Record could not save.";
  }
}

function profileSections(cat: CatFile) {
  const weight = latestRecord(cat, "weight");
  const vetVisit = latestRecord(cat, "vetVisit");
  const medication = latestRecord(cat, "medication");
  const vomit = latestRecord(cat, "vomit");
  const note = latestRecord(cat, "note");

  return [
    {
      historyFilter: "weight" as const,
      icon: Heart,
      title: "Vitals",
      detail: weight
        ? `Latest weight ${formatWeight(weight.weightKg)}`
        : "No weight yet",
      tag: "Current",
    },
    {
      historyFilter: "vetVisit" as const,
      icon: Stethoscope,
      title: "Vet Visits",
      detail: vetVisit
        ? `${formatDate(vetVisit.date)}${vetVisit.reason ? `, ${vetVisit.reason}` : ""}`
        : "No vet visits yet",
      tag: "Tracked",
    },
    {
      historyFilter: "medication" as const,
      icon: Pill,
      title: "Medication Log",
      detail: medication
        ? `${medication.medicine}${medication.dose ? `, ${medication.dose}` : ""}`
        : "No medicine yet",
      tag: "Private",
    },
    {
      historyFilter: "vomit" as const,
      icon: Activity,
      title: "Vomit Events",
      detail: vomit
        ? `${formatDate(vomit.date)}, ${vomit.hairball ? "hairball" : "not hairball"}`
        : "No vomit events yet",
      tag: "Hairball",
    },
    {
      historyFilter: "note" as const,
      icon: NotebookText,
      title: "Notes",
      detail: note ? note.note : "No notes yet",
      tag: "Care",
    },
    {
      historyFilter: "all" as const,
      icon: CalendarDays,
      title: "Timeline",
      detail: "All health records by date",
      tag: `${cat.records.length} total`,
    },
  ];
}

function historyTitle(historyFilter: HistoryFilter) {
  switch (historyFilter) {
    case "weight":
      return "Vitals History";
    case "vetVisit":
      return "Vet Visit History";
    case "medication":
      return "Medication History";
    case "vomit":
      return "Vomit History";
    case "note":
      return "Notes History";
    case "all":
      return "Timeline";
  }
}

function latestRecord<TType extends HealthRecord["type"]>(
  cat: CatFile,
  type: TType,
) {
  return cat.records.find(
    (record): record is Extract<HealthRecord, { type: TType }> =>
      record.type === type,
  );
}

function recordIcon(record: HealthRecord) {
  switch (record.type) {
    case "weight":
      return Weight;
    case "vetVisit":
      return Stethoscope;
    case "medication":
      return Pill;
    case "vomit":
      return Activity;
    case "note":
      return NotebookText;
  }
}

function recordTitle(record: HealthRecord) {
  switch (record.type) {
    case "weight":
      return "Weight";
    case "vetVisit":
      return "Vet Visit";
    case "medication":
      return "Medication";
    case "vomit":
      return "Vomit";
    case "note":
      return "Note";
  }
}

function recordDetail(record: HealthRecord) {
  const photoDetail = record.photos?.length ? "Photo attached" : undefined;

  switch (record.type) {
    case "weight":
      return joinDetails([formatWeight(record.weightKg), record.note, photoDetail]);
    case "vetVisit":
      return (
        joinDetails([record.reason, record.note, photoDetail]) || "Vet visit logged"
      );
    case "medication":
      return joinDetails([record.medicine, record.dose, record.note, photoDetail]);
    case "vomit":
      return joinDetails([
        record.hairball ? "Hairball" : "Not hairball",
        record.note,
        photoDetail,
      ]);
    case "note":
      return joinDetails([record.note, photoDetail]);
  }
}

function formatWeight(weightKg: number | undefined) {
  return weightKg === undefined ? "No weight" : `${weightKg.toFixed(1)} kg`;
}

function formatDate(date: string | undefined) {
  if (!date) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function optionalText(value: string) {
  return value.trim() || undefined;
}

function joinDetails(values: Array<string | undefined>) {
  return values.filter(Boolean).join(", ");
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function readOwnerCode() {
  return window.sessionStorage.getItem(ownerCodeStorageKey) ?? "";
}

function readCurrentRoute() {
  return routeFromHash(window.location.hash);
}
