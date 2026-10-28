import { gql, type RateLimit } from "./graphql";

export interface PostingSlot { day: string; times: string[] }
export interface Channel {
  id: string;
  name: string;
  displayName: string | null;
  service: string;
  timezone: string | null;
  isQueuePaused: boolean;
  isDisconnected: boolean;
  postingSchedule: PostingSlot[];
}
export interface Account { timezone: string | null; organizations: { id: string; name: string }[] }

export type BufferPostStatus = "draft" | "error" | "needs_approval" | "scheduled" | "sending" | "sent";
export interface BufferPost {
  id: string;
  text: string;
  status: BufferPostStatus;
  dueAt: string | null;
  channelId: string;
  tags: { id: string; name: string }[];
}
export interface BufferIdea { id: string; content: { title: string | null; text: string | null; tags: { id: string; name: string }[] } }

export async function getAccount(token: string) {
  const { data, rateLimit } = await gql<{ account: Account }>(
    token,
    "query { account { timezone organizations { id name } } }",
  );
  return { account: data.account, rateLimit };
}

export async function getChannels(token: string, organizationId: string) {
  const { data, rateLimit } = await gql<{ channels: Channel[] }>(
    token,
    `query($o: OrganizationId!) {
      channels(input: { organizationId: $o }) {
        id name displayName service timezone isQueuePaused isDisconnected postingSchedule { day times }
      }
    }`,
    { o: organizationId },
  );
  return { channels: data.channels, rateLimit };
}

/** Posts due between two instants (ISO 8601), soonest first. One page, so at most `first` posts. */
export async function getPosts(token: string, organizationId: string, startIso: string, endIso: string, first = 100) {
  // The dueAt range is inlined (the values are generated server-side ISO strings, never user input).
  const { data, rateLimit } = await gql<{ posts: { edges: { node: BufferPost }[]; pageInfo: { hasNextPage: boolean } } }>(
    token,
    `query($o: OrganizationId!) {
      posts(first: ${Math.trunc(first)}, input: {
        organizationId: $o,
        filter: { dueAt: { start: "${startIso}", end: "${endIso}" } },
        sort: [{ field: dueAt, direction: asc }]
      }) {
        edges { node { id text status dueAt channelId tags { id name } } }
        pageInfo { hasNextPage }
      }
    }`,
    { o: organizationId },
  );
  return {
    posts: data.posts.edges.map((e) => e.node),
    hasMore: data.posts.pageInfo.hasNextPage,
    rateLimit,
  };
}

export async function getIdeas(token: string, organizationId: string, first = 20) {
  const { data, rateLimit } = await gql<{ ideas: { edges: { node: BufferIdea }[] } }>(
    token,
    `query($o: OrganizationId!) {
      ideas(first: ${Math.trunc(first)}, input: { organizationId: $o }) {
        edges { node { id content { title text tags { id name } } } }
      }
    }`,
    { o: organizationId },
  );
  return { ideas: data.ideas.edges.map((e) => e.node), rateLimit };
}

export type { RateLimit };
