const GITHUB_GRAPHQL_API = "https://api.github.com/graphql";

const OPEN_ISSUE_COUNT_QUERY = `
  query OpenIssueCount($owner: String!, $repo: String!) {
    repository(owner: $owner, name: $repo) {
      issues(states: OPEN) {
        totalCount
      }
    }
  }
`;

/**
 * A GraphQL follow-up call alongside the REST one above, to show the same
 * event can be enriched through either API style. GitHub's GraphQL API
 * requires auth even for public data, so this also runs in dry-run mode
 * without a token.
 */
export async function getOpenIssueCount(owner: string, repo: string): Promise<number | null> {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    console.log(
      `[GraphQL dry-run] POST ${GITHUB_GRAPHQL_API} query=OpenIssueCount variables=${JSON.stringify(
        { owner, repo },
      )}`,
    );
    return null;
  }

  const response = await fetch(GITHUB_GRAPHQL_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: OPEN_ISSUE_COUNT_QUERY,
      variables: { owner, repo },
    }),
  });

  const json = (await response.json()) as {
    data?: { repository?: { issues?: { totalCount?: number } } };
    errors?: unknown;
  };

  if (json.errors) {
    console.error("[GraphQL] errors:", json.errors);
    return null;
  }

  return json.data?.repository?.issues?.totalCount ?? null;
}
