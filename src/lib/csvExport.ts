import { existsSync, mkdirSync, appendFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { ProcessedEventRecord } from "../types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "..", "data");
const csvPath = path.join(dataDir, "processed-events.csv");

const HEADER =
  "timestamp,deliveryId,event,action,repo,issueNumber,duplicate,labelApplied,restCallMode,openIssueCount\n";

function escapeCsv(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function appendProcessedEvent(record: ProcessedEventRecord): void {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  if (!existsSync(csvPath)) writeFileSync(csvPath, HEADER);

  const row = [
    record.timestamp,
    record.deliveryId,
    record.event,
    record.action,
    record.repo,
    record.issueNumber,
    record.duplicate,
    record.labelApplied,
    record.restCallMode,
    record.openIssueCount,
  ]
    .map((v) => escapeCsv(String(v)))
    .join(",");

  appendFileSync(csvPath, row + "\n");
}
