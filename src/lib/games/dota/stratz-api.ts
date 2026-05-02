/**
 * Stratz GraphQL client for live match data. Free tier requires an API key
 * from https://stratz.com/api (sign in with Steam).
 *
 * The `live` schema field returns currently-tracked public matches; not all
 * matches are visible immediately (Stratz's coverage is best-effort).
 */

const STRATZ_GQL = "https://api.stratz.com/graphql";

export class StratzApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "StratzApiError";
  }
}

export class StratzKeyMissingError extends Error {
  constructor() {
    super("STRATZ_API_KEY is not set. Get one at https://stratz.com/api");
    this.name = "StratzKeyMissingError";
  }
}

function apiKey() {
  const k = process.env.STRATZ_API_KEY;
  if (!k) throw new StratzKeyMissingError();
  return k;
}

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(STRATZ_GQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      "User-Agent": "STRATZ_API",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new StratzApiError(res.status, text.slice(0, 200) || `HTTP ${res.status}`);
  }
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) {
    throw new StratzApiError(200, json.errors.map((e) => e.message).join("; "));
  }
  return json.data as T;
}

export interface StratzLivePlayer {
  steamAccountId: number;
  heroId: number;
  isRadiant: boolean;
  name?: string;
  level?: number;
  numLastHits?: number;
  numDenies?: number;
  numKills?: number;
  numDeaths?: number;
  numAssists?: number;
}

export interface StratzLiveMatch {
  matchId: number;
  gameTime: number;
  gameMode: string | null;
  lobbyType: string | null;
  radiantScore?: number;
  direScore?: number;
  players: StratzLivePlayer[];
}

const LIVE_MATCH_QUERY = /* GraphQL */ `
  query LiveMatch($id: Long!) {
    live {
      match(steamAccountId: $id) {
        matchId
        gameTime
        gameMode
        lobbyType
        radiantScore: radiantKills
        direScore: direKills
        players {
          steamAccountId
          heroId
          isRadiant
          level: heroLevel
          numLastHits
          numDenies
          numKills
          numDeaths
          numAssists
        }
      }
    }
  }
`;

export async function liveMatchByAccount(accountId: number): Promise<StratzLiveMatch | null> {
  const data = await gql<{ live: { match: StratzLiveMatch | null } }>(LIVE_MATCH_QUERY, { id: accountId });
  return data.live?.match ?? null;
}
