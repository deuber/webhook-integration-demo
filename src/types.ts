export interface GitHubIssuePayload {
  action: string;
  issue: {
    number: number;
    title: string;
    user: { login: string };
  };
  repository: {
    name: string;
    full_name: string;
    owner: { login: string };
  };
  sender: { login: string };
}

export interface ProcessedEventRecord {
  timestamp: string;
  deliveryId: string;
  event: string;
  action: string;
  repo: string;
  issueNumber: number | "";
  duplicate: boolean;
  labelApplied: string;
  restCallMode: "live" | "dry-run";
  openIssueCount: number | "";
}
