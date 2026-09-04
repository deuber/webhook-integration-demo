import { Router } from "express";
import { randomBytes } from "node:crypto";

/**
 * GitHub's OAuth 2.0 authorization code flow — the same flow named in the
 * Prismatic job posting's "bonus" list. Requires a free GitHub OAuth App
 * (Settings -> Developer settings -> OAuth Apps) so client id/secret are
 * read from env rather than hardcoded.
 */
export const oauthRouter = Router();

// In-memory store for demo purposes only — a real app would persist tokens
// per-user and never log them.
let lastIssuedToken: string | null = null;
const pendingStates = new Set<string>();

oauthRouter.get("/login", (_req, res) => {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  if (!clientId) {
    res
      .status(501)
      .send(
        "GITHUB_OAUTH_CLIENT_ID is not set. Register a free GitHub OAuth App and add its " +
          "credentials to .env to try the live authorization code flow.",
      );
    return;
  }

  const state = randomBytes(16).toString("hex");
  pendingStates.add(state);

  const redirectUri = process.env.GITHUB_OAUTH_REDIRECT_URI ?? "http://localhost:3000/auth/callback";
  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", "public_repo");
  authorizeUrl.searchParams.set("state", state);

  res.redirect(authorizeUrl.toString());
});

oauthRouter.get("/callback", async (req, res) => {
  const { code, state } = req.query;

  if (typeof state !== "string" || !pendingStates.has(state)) {
    res.status(400).send("Invalid or missing state parameter — possible CSRF attempt.");
    return;
  }
  pendingStates.delete(state);

  if (typeof code !== "string") {
    res.status(400).send("Missing authorization code.");
    return;
  }

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_OAUTH_CLIENT_ID,
      client_secret: process.env.GITHUB_OAUTH_CLIENT_SECRET,
      code,
    }),
  });

  const json = (await response.json()) as { access_token?: string; error?: string };

  if (!json.access_token) {
    res.status(400).send(`OAuth token exchange failed: ${json.error ?? "unknown error"}`);
    return;
  }

  lastIssuedToken = json.access_token;
  res.send("OAuth authorization code flow complete — access token received and held in memory.");
});

oauthRouter.get("/status", (_req, res) => {
  res.json({ hasToken: lastIssuedToken !== null });
});
