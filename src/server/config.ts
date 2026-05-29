import { resolve } from "node:path";

type ServerEnv = Record<string, string | undefined>;

export type ServerConfig = {
  dataDir: string;
  ownerUnlockCode: string;
  port: number;
  uploadsDir: string;
};

export function createServerConfig(
  env: ServerEnv = process.env,
  cwd = process.cwd(),
): ServerConfig {
  const nodeEnv = env.NODE_ENV ?? "development";
  const ownerUnlockCode = env.OWNER_UNLOCK_CODE?.trim();

  if (nodeEnv === "production" && !ownerUnlockCode) {
    throw new Error("OWNER_UNLOCK_CODE is required in production.");
  }

  return {
    dataDir: resolve(cwd, env.PAWFOLIO_DATA_DIR?.trim() || "data/cats"),
    ownerUnlockCode: ownerUnlockCode || "pawfolio",
    port: parsePort(env.PORT),
    uploadsDir: resolve(cwd, env.PAWFOLIO_UPLOADS_DIR?.trim() || "data/uploads"),
  };
}

function parsePort(value: string | undefined) {
  const port = Number(value ?? 3001);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  return port;
}
