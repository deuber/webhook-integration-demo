import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import yaml from "js-yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface AppConfig {
  triageLabel: string;
  commentTemplate: string;
  dedupeWindowMinutes: number;
}

function loadConfig(): AppConfig {
  const raw = readFileSync(path.join(__dirname, "config.yaml"), "utf8");
  const parsed = yaml.load(raw) as Partial<AppConfig>;

  if (!parsed.triageLabel || !parsed.commentTemplate || !parsed.dedupeWindowMinutes) {
    throw new Error("config.yaml is missing required fields");
  }

  return parsed as AppConfig;
}

export const config = loadConfig();
