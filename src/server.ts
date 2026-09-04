import "dotenv/config";
import express from "express";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { githubWebhookRouter } from "./webhooks/github.js";
import { oauthRouter } from "./lib/oauth.js";
import { apiRouter } from "./api.js";
import { config } from "./config/loadConfig.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.static(path.join(__dirname, "..", "public")));

app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as express.Request).rawBody = buf;
    },
  }),
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/webhooks", githubWebhookRouter);
app.use("/auth", oauthRouter);
app.use("/api", apiRouter);

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`webhook-integration-demo listening on http://localhost:${port}`);
  console.log(`  dashboard:      http://localhost:${port}`);
  console.log(`  triage label:   ${config.triageLabel}`);
  console.log(`  dedupe window:  ${config.dedupeWindowMinutes} min`);
  console.log(`  REST/GraphQL:   ${process.env.GITHUB_TOKEN ? "live" : "dry-run (no GITHUB_TOKEN set)"}`);
});
