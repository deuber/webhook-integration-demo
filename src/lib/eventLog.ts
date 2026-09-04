import type { ProcessedEventRecord } from "../types.js";
import { appendProcessedEvent } from "./csvExport.js";

// In-memory mirror of the CSV log, newest first, capped so the dashboard
// has something to poll without re-reading the file on every request.
const MAX_EVENTS = 50;
const events: ProcessedEventRecord[] = [];

export function logProcessedEvent(record: ProcessedEventRecord): void {
  appendProcessedEvent(record);
  events.unshift(record);
  if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
}

export function getRecentEvents(): ProcessedEventRecord[] {
  return events;
}
