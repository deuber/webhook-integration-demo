import { Router } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "../config/loadConfig.js";
import { isDuplicateDelivery } from "../lib/dedupe.js";
import { addLabelAndComment } from "../lib/restClient.js";
import { getOpenIssueCount } from "../lib/graphqlClient.js";
import { logProcessedEvent } from "../lib/eventLog.js";
import type { GitHubIssuePayload } from "../types.js";

export const githubWebhookRouter = Router();

function isValidSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signatureHeader);

  // Lengths must match before timingSafeEqual, or it throws.
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

githubWebhookRouter.post("/github", async (req, res) => {
  const rawBody: Buffer = req.rawBody;
  const signature = req.header("X-Hub-Signature-256");

  if (!isValidSignature(rawBody, signature)) {
    res.status(401).json({ error: "invalid signature" });
    return;
  }

  const deliveryId = req.header("X-GitHub-Delivery") ?? "unknown";
  const eventName = req.header("X-GitHub-Event") ?? "unknown";
  const duplicate = isDuplicateDelivery(deliveryId);

  if (duplicate) {
    console.log(`[webhook] duplicate delivery ${deliveryId} — skipping reprocessing`);
    logProcessedEvent({
      timestamp: new Date().toISOString(),
      deliveryId,
      event: eventName,
      action: "",
      repo: "",
      issueNumber: "",
      duplicate: true,
      labelApplied: "",
      restCallMode: "dry-run",
      openIssueCount: "",
    });
    res.status(200).json({ status: "duplicate-ignored" });
    return;
  }

  if (eventName !== "issues") {
    console.log(`[webhook] ignoring event type "${eventName}"`);
    res.status(200).json({ status: "ignored", reason: "unhandled event type" });
    return;
  }

  const payload = req.body as GitHubIssuePayload;

  if (payload.action !== "opened") {
    console.log(`[webhook] ignoring issues action "${payload.action}"`);
    res.status(200).json({ status: "ignored", reason: "unhandled action" });
    return;
  }

  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;
  const issueNumber = payload.issue.number;

  const [restResult, openIssueCount] = await Promise.all([
    addLabelAndComment({ owner, repo, issueNumber }),
    getOpenIssueCount(owner, repo),
  ]);

  logProcessedEvent({
    timestamp: new Date().toISOString(),
    deliveryId,
    event: eventName,
    action: payload.action,
    repo: payload.repository.full_name,
    issueNumber,
    duplicate: false,
    labelApplied: restResult.labelApplied,
    restCallMode: restResult.mode,
    openIssueCount: openIssueCount ?? "",
  });

  console.log(
    `[webhook] processed issue #${issueNumber} on ${payload.repository.full_name} — labeled "${config.triageLabel}"`,
  );

  res.status(200).json({ status: "processed" });
});
