import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createHmac, randomUUID } from "node:crypto";

// Sends a byte-for-byte realistic GitHub `issues.opened` webhook delivery to
// the locally running server — HMAC-signed the same way GitHub signs real
// deliveries — so the whole flow can be demoed with no ngrok/smee tunnel or
// real GitHub repo required.
//
// Usage:
//   npm run simulate            send a delivery (fixed id by default)
//   npm run simulate            run it again with no flags to see the same
//                                delivery id get deduped, exactly like a
//                                real webhook retry would
//   npm run simulate -- --new   use a fresh random delivery id instead

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT ?? "3000";
const secret = process.env.WEBHOOK_SECRET ?? "demo-webhook-secret-change-me";

const payloadPath = path.join(__dirname, "sample-payloads", "issue-opened.json");
const rawPayload = readFileSync(payloadPath, "utf8");

const useNewId = process.argv.includes("--new");
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

const body = await response.json();
console.log(`-> POST /webhooks/github  [${response.status}]  delivery=${deliveryId}`);
console.log(body);

if (!useNewId) {
  console.log("\nRun `npm run simulate` again (same command) to see duplicate handling.");
  console.log("Or run `npm run simulate -- --new` for a fresh delivery id.");
}
