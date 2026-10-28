import { gql } from "./graphql";

// Mutations return a union: success, or an error type that carries `message`. A failed mutation
// still comes back as HTTP 200, so the union is what has to be checked.
export type MutationOutcome<T> = { ok: true; value: T } | { ok: false; message: string };

export interface CreatePostArgs {
  channelId: string;
  text: string;
  dueAt?: string; // ISO 8601 UTC. Omit to add to the channel's queue.
  saveToDraft?: boolean;
  tagIds?: string[];
}

interface CreatePostResponse {
  createPost: { __typename: string; message?: string; post?: { id: string; status: string; dueAt: string | null } };
}

export async function createPost(token: string, args: CreatePostArgs): Promise<MutationOutcome<{ id: string; status: string; dueAt: string | null }>> {
  const input = {
    channelId: args.channelId,
    text: args.text,
    schedulingType: "automatic",
    mode: args.dueAt ? "customScheduled" : "addToQueue",
    ...(args.dueAt ? { dueAt: args.dueAt } : {}),
    saveToDraft: Boolean(args.saveToDraft),
    needsApproval: false,
    assets: [],
    ...(args.tagIds?.length ? { tagIds: args.tagIds } : {}),
  };
  const { data } = await gql<CreatePostResponse>(
    token,
    `mutation($input: CreatePostInput!) {
      createPost(input: $input) {
        __typename
        ... on PostActionSuccess { post { id status dueAt } }
        ... on MutationError { message }
      }
    }`,
    { input },
  );
  const r = data.createPost;
  return r.post ? { ok: true, value: r.post } : { ok: false, message: r.message ?? `Buffer returned ${r.__typename}` };
}

export async function deletePost(token: string, id: string): Promise<MutationOutcome<{ id: string }>> {
  const { data } = await gql<{ deletePost: { __typename: string; id?: string; message?: string } }>(
    token,
    `mutation($input: DeletePostInput!) {
      deletePost(input: $input) {
        __typename
        ... on DeletePostSuccess { id }
        ... on MutationError { message }
      }
    }`,
    { input: { id } },
  );
  const r = data.deletePost;
  return r.id ? { ok: true, value: { id: r.id } } : { ok: false, message: r.message ?? `Buffer returned ${r.__typename}` };
}
