import { describe, expect, it } from "bun:test";
import { hrefForRoute, routeFromHash, sectionIdForRoute } from "./navigation";

describe("Pawfolio navigation", () => {
  it("routes Settings to a separate page", () => {
    expect(routeFromHash("#/settings")).toEqual({ view: "settings" });
    expect(hrefForRoute({ view: "settings" })).toBe("#/settings");
    expect(sectionIdForRoute({ view: "settings" })).toBeUndefined();
  });

  it("keeps legacy section hashes on the Overview page", () => {
    expect(routeFromHash("#profile-title")).toEqual({
      section: "profile",
      view: "overview",
    });
    expect(routeFromHash("#due-items-title")).toEqual({
      section: "due-items",
      view: "overview",
    });
  });
});
