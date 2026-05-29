export type OverviewSection = "overview" | "profile" | "due-items";

export type AppRoute =
  | { view: "overview"; section: OverviewSection }
  | { view: "settings" };

export function routeFromHash(hash: string): AppRoute {
  switch (hash) {
    case "#/settings":
    case "#settings":
      return { view: "settings" };
    case "#/overview/profile":
    case "#profile-title":
      return { view: "overview", section: "profile" };
    case "#/overview/due-items":
    case "#due-items-title":
      return { view: "overview", section: "due-items" };
    case "#/overview":
    case "#overview-title":
    default:
      return { view: "overview", section: "overview" };
  }
}

export function hrefForRoute(route: AppRoute) {
  if (route.view === "settings") {
    return "#/settings";
  }

  if (route.section === "profile") {
    return "#/overview/profile";
  }

  if (route.section === "due-items") {
    return "#/overview/due-items";
  }

  return "#/overview";
}

export function sectionIdForRoute(route: AppRoute) {
  if (route.view === "settings") {
    return undefined;
  }

  if (route.section === "profile") {
    return "profile-title";
  }

  if (route.section === "due-items") {
    return "due-items-title";
  }

  return "overview-title";
}
