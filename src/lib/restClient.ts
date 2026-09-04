import { config } from "../config/loadConfig.js";

const GITHUB_API = "https://api.github.com";

interface FollowUpParams {
  owner: string;
  repo: string;
  issueNumber: number;
}

interface FollowUpResult {
  mode: "live" | "dry-run";
  labelApplied: string;
}

/**
 * The REST follow-up call a webhook handler makes after an event fires:
 * add a triage label and post a comment on the issue that was just opened.
 *
 * With no GITHUB_TOKEN set this runs in dry-run mode — it logs the exact
 * request it would send instead of calling the real API, so the project
 * runs end-to-end for anyone reviewing it without needing credentials.
 */
export async function addLabelAndComment({
  owner,
  repo,
  issueNumber,
}: FollowUpParams): Promise<FollowUpResult> {
  const token = process.env.GITHUB_TOKEN;
  const label = config.triageLabel;
  const comment = config.commentTemplate.replace("{label}", label);

  if (!token) {
    console.log(
      `[REST dry-run] POST ${GITHUB_API}/repos/${owner}/${repo}/issues/${issueNumber}/labels body=${JSON.stringify(
        { labels: [label] },
      )}`,
    );
    console.log(
      `[REST dry-run] POST ${GITHUB_API}/repos/${owner}/${repo}/issues/${issueNumber}/comments body=${JSON.stringify(
        { body: comment },
      )}`,
    );
    return { mode: "dry-run", labelApplied: label };
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };

  await fetch(`${GITHUB_API}/repos/${owner}/${repo}/issues/${issueNumber}/labels`, {
    method: "POST",
    headers,
    body: JSON.stringify({ labels: [label] }),
  });

  await fetch(`${GITHUB_API}/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
    method: "POST",
    headers,
    body: JSON.stringify({ body: comment }),
  });

  return { mode: "live", labelApplied: label };
}
