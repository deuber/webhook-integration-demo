import { Router } from "express";
import { getRecentEvents } from "./lib/eventLog.js";
import { config } from "./config/loadConfig.js";

export const apiRouter = Router();

apiRouter.get("/events", (_req, res) => {
  res.json({
    restMode: process.env.GITHUB_TOKEN ? "live" : "dry-run",
    triageLabel: config.triageLabel,
    events: getRecentEvents(),
  });
});
