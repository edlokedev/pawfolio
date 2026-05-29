import { useEffect, useState } from "react";
import {
  Activity,
  Bell,
  CalendarDays,
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CatCardSummary, CatCardsResponse } from "../shared/types";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; cats: CatCardSummary[] }
  | { status: "error"; message: string };

export function App() {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [selectedCatId, setSelectedCatId] = useState<string | undefined>();

  useEffect(() => {
    let active = true;

    fetch("/api/cats")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Cat cards could not load.");
        }

        return (await response.json()) as CatCardsResponse;
      })
      .then((data) => {
        if (!active) {
          return;
        }

        setLoadState({ status: "ready", cats: data.cats });
        setSelectedCatId(data.cats[0]?.id);
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

  const cats = loadState.status === "ready" ? loadState.cats : [];
  const selectedCat = cats.find((cat) => cat.id === selectedCatId) ?? cats[0];

  return (
    <main className="min-h-screen px-3 py-3 text-foreground sm:px-5 sm:py-5">
      <div className="mx-auto min-h-[calc(100vh-1.5rem)] w-full max-w-[1180px] overflow-hidden rounded-lg border border-border bg-card shadow-[0_24px_80px_oklch(47%_0.08_42_/_0.17)] sm:min-h-[calc(100vh-2.5rem)]">
        <AppHeader />

        <div className="grid lg:grid-cols-[236px_minmax(0,1fr)]">
          <Sidebar />

          <div className="px-4 py-8 sm:px-8 sm:py-9 lg:px-9">
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
                <Button className="h-14 w-full px-7 text-lg sm:w-auto" type="button">
                  <Plus />
                  Add Record
                </Button>
              </div>

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
            {selectedCat && <ProfilePreview cat={selectedCat} />}
          </div>
        </div>
      </div>
    </main>
  );
}

function AppHeader() {
  return (
    <header className="flex min-h-[92px] items-center justify-between gap-4 border-b border-border bg-card/95 px-5 sm:px-9 lg:px-12">
      <div className="flex items-center gap-3 text-[2rem] font-black leading-none tracking-normal text-ink">
        <PawPrint className="text-primary" size={34} strokeWidth={2.8} />
        <h1>Pawfolio</h1>
      </div>
      <Button className="h-12 px-5" type="button" variant="outline">
        <LockKeyhole />
        Owner unlock
      </Button>
    </header>
  );
}

function Sidebar() {
  const navItems = [
    { href: "#overview-title", icon: Home, label: "Overview", active: true },
    { href: "#profile-title", icon: ClipboardList, label: "Timeline" },
    { href: "#due-items-title", icon: Bell, label: "Due Items", count: 2 },
    { href: "#settings", icon: Settings, label: "Settings" },
  ];

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
                item.active && "bg-accent text-accent-foreground",
              )}
              key={item.label}
              variant="nav"
            >
              <a href={item.href}>
                <Icon />
                {item.label}
                {item.count && (
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
        "group grid min-h-[330px] grid-rows-[auto_auto_1fr] gap-4 rounded-lg border border-border bg-card-gradient p-4 text-left text-card-foreground shadow-[0_14px_34px_oklch(51%_0.07_42_/_0.08)] transition-all duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
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
  icon: React.ReactNode;
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

function ProfilePreview({ cat }: { cat: CatCardSummary }) {
  const sections = [
    {
      icon: Heart,
      title: "Vitals",
      detail: `Latest weight ${formatWeight(cat.latestWeightKg)}`,
      tag: "Current",
    },
    {
      icon: Stethoscope,
      title: "Vet Visits",
      detail: `Last vet ${formatDate(cat.lastVetVisitDate)}`,
      tag: cat.alertChip?.label ?? "Tracked",
    },
    {
      icon: Pill,
      title: "Medication Log",
      detail: "Medicine records stay private until unlock",
      tag: "Protected",
    },
    {
      icon: Activity,
      title: "Vomit Events",
      detail: "Hairball flag and notes ready",
      tag: "Hairball",
    },
    {
      icon: NotebookText,
      title: "Notes",
      detail: "Care details, appetite, mood, and context",
      tag: "Private",
    },
    {
      icon: CalendarDays,
      title: "Timeline",
      detail: "All health records by date",
      tag: "History",
    },
  ];

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
            <p className="mt-3 max-w-[31ch] text-sm leading-6 text-muted-foreground">
              Open profile view will collect vitals, visits, meds, vomit events,
              notes, due items, and timeline in one place.
            </p>
          </div>
        </div>

        <div className="grid px-4 py-3 sm:px-5">
          {sections.map((section) => {
            const Icon = section.icon;

            return (
              <div
                className="grid min-h-16 grid-cols-[32px_minmax(0,1fr)_auto_18px] items-center gap-3 border-b border-border last:border-b-0 max-[560px]:grid-cols-[32px_minmax(0,1fr)_18px]"
                key={section.title}
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
              </div>
            );
          })}
        </div>
      </section>
    </Card>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-3" aria-label="Loading cat cards">
      {[0, 1, 2].map((item) => (
        <Card
          className="min-h-[330px] animate-pulse bg-muted"
          key={item}
        />
      ))}
    </div>
  );
}

function CatPortrait({
  cat,
  size,
}: {
  cat: CatCardSummary;
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
        src={`/cats/${cat.id}.png`}
      />
    </span>
  );
}

function formatWeight(weightKg: number | undefined) {
  return weightKg === undefined ? "No weight" : `${weightKg.toFixed(1)} kg`;
}

function formatDate(date: string | undefined) {
  if (!date) {
    return "No visit";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}
