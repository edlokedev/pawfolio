import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

describe("project tooling", () => {
  it("runs Oxlint and Oxfmt from the check script", async () => {
    const packageJson = JSON.parse(
      await readFile(join(process.cwd(), "package.json"), "utf8"),
    ) as { scripts: Record<string, string>; devDependencies: Record<string, string> };

    expect(packageJson.devDependencies.oxlint).toBeString();
    expect(packageJson.devDependencies.oxfmt).toBeString();
    expect(packageJson.scripts.lint).toBe("oxlint");
    expect(packageJson.scripts["lint:fix"]).toBe("oxlint --fix");
    expect(packageJson.scripts.format).toStartWith("oxfmt ");
    expect(packageJson.scripts["format:check"]).toStartWith("oxfmt --check ");
    expect(packageJson.scripts.check).toBe(
      "bun run lint && bun run format:check && bun test && bun run build",
    );
  });
});
