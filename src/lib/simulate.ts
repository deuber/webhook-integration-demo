import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createHmac, randomUUID } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rawPayload = readFileSync(path.join(__dirname, "..", "fixtures", "issue-opened.json"), "utf8");

export interface SimulatedDeliveryResult {
  deliveryId: string;
  status: number;
  body: unknown;
}

/**
 * Builds and sends a byte-for-byte realistic GitHub `issues.opened` webhook
 * delivery — HMAC-signed the same way GitHub signs real ones — to this same
 * server's own webhook endpoint. Used by both the CLI script and the
 * dashboard's "send test webhook" buttons, so clicking a button in the
 * browser exercises the exact same code path a real GitHub delivery would.
 */
export async function sendSimulatedDelivery(useNewId: boolean): Promise<SimulatedDeliveryResult> {
  const secret = process.env.WEBHOOK_SECRET ?? "demo-webhook-secret-change-me";
  const port = process.env.PORT ?? "3000";
  const deliveryId = useNewId ? randomUUID() : "demo-delivery-fixed-id";
  const signature = "sha256=" + createHmac("sha256", secret).update(rawPayload).digest("hex");

  const response = await fetch(`http://localhost:${port}/webhooks/github`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-GitHub-Event": "issues",
      "X-GitHub-Delivery": deliveryId,
      "X-Hub-Signature-256": signature,
    },
    body: rawPayload,
  });

  return { deliveryId, status: response.status, body: await response.json() };
}
