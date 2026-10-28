import { gql } from "./graphql";

export interface PostingSlot { day: string; times: string[] }
export interface Channel {
  id: string;
  service: string;
  timezone: string | null;
  isQueuePaused: boolean;
  isDisconnected: boolean;
  postingSchedule: PostingSlot[];
}
export interface Account { timezone: string | null; organizations: { id: string; name: string }[] }

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
        id service timezone isQueuePaused isDisconnected postingSchedule { day times }
      }
    }`,
    { o: organizationId },
  );
  return { channels: data.channels, rateLimit };
}
