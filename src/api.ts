import { Router } from "express";
import { getRecentEvents } from "./lib/eventLog.js";
import { sendSimulatedDelivery } from "./lib/simulate.js";
import { config } from "./config/loadConfig.js";

export const apiRouter = Router();

apiRouter.get("/events", (_req, res) => {
  res.json({
    restMode: process.env.GITHUB_TOKEN ? "live" : "dry-run",
    triageLabel: config.triageLabel,
    events: getRecentEvents(),
  });
});

// Powers the dashboard's "send test webhook" buttons — signs and sends a
// sample delivery to this same server's own /webhooks/github endpoint, so
// a click in the browser exercises the real signature/dedupe/REST/GraphQL
// path instead of a canned response.
apiRouter.post("/simulate", async (req, res) => {
  const useNewId = req.body?.newId === true;
  const result = await sendSimulatedDelivery(useNewId);
  res.status(result.status).json(result);
});
