import "dotenv/config";
import express from "express";
import { githubWebhookRouter } from "./webhooks/github.js";
import { oauthRouter } from "./lib/oauth.js";
import { config } from "./config/loadConfig.js";

const app = express();

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

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`webhook-integration-demo listening on http://localhost:${port}`);
  console.log(`  triage label:   ${config.triageLabel}`);
  console.log(`  dedupe window:  ${config.dedupeWindowMinutes} min`);
  console.log(`  REST/GraphQL:   ${process.env.GITHUB_TOKEN ? "live" : "dry-run (no GITHUB_TOKEN set)"}`);
});
