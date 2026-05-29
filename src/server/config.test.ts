import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import { createServerConfig } from "./config";

describe("createServerConfig", () => {
  it("uses development defaults", () => {
    const cwd = join(process.cwd(), "pawfolio-fixture");

    expect(createServerConfig({}, cwd)).toEqual({
      dataDir: join(cwd, "data", "cats"),
      ownerUnlockCode: "pawfolio",
      port: 3001,
      uploadsDir: join(cwd, "data", "uploads"),
    });
  });

  it("uses environment overrides", () => {
    const cwd = join(process.cwd(), "pawfolio-fixture");

    expect(
      createServerConfig(
        {
          OWNER_UNLOCK_CODE: "secret",
          PAWFOLIO_DATA_DIR: "data/private",
          PAWFOLIO_UPLOADS_DIR: "data/private-uploads",
          PORT: "4010",
        },
        cwd,
      ),
    ).toEqual({
      dataDir: join(cwd, "data", "private"),
      ownerUnlockCode: "secret",
      port: 4010,
      uploadsDir: join(cwd, "data", "private-uploads"),
    });
  });

  it("requires an owner unlock code in production", () => {
    expect(() => createServerConfig({ NODE_ENV: "production" }, "/pawfolio")).toThrow(
      "OWNER_UNLOCK_CODE is required in production.",
    );
  });

  it("rejects invalid ports", () => {
    expect(() => createServerConfig({ PORT: "nope" }, "/pawfolio")).toThrow(
      "PORT must be an integer between 1 and 65535.",
    );
  });
});
