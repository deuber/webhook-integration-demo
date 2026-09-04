import { config } from "../config/loadConfig.js";

/**
 * Webhook senders (GitHub included) retry deliveries on timeout or non-2xx
 * responses, so the same X-GitHub-Delivery id can arrive more than once.
 * This tracks recently-seen delivery ids so a retry doesn't re-trigger the
 * REST/GraphQL follow-up calls or double-post a comment.
 */
const seenDeliveries = new Map<string, number>();

export function isDuplicateDelivery(deliveryId: string): boolean {
  const windowMs = config.dedupeWindowMinutes * 60_000;
  const now = Date.now();

  for (const [id, seenAt] of seenDeliveries) {
    if (now - seenAt > windowMs) seenDeliveries.delete(id);
  }

  const isDuplicate = seenDeliveries.has(deliveryId);
  seenDeliveries.set(deliveryId, now);
  return isDuplicate;
}
