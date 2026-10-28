"use server";

import { BufferApiError, createIdea, createPost, deletePost } from "@cadence/buffer-client";
import { invalidate } from "@/lib/cache";
import { accessToken, currentSid } from "@/lib/session";

export type ActionResult<T> = { ok: true; value: T } | { ok: false; message: string };

const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });

async function session() {
  const [sid, token] = await Promise.all([currentSid(), accessToken()]);
  return sid && token ? { sid, token } : null;
}

const explain = (e: unknown) =>
  e instanceof BufferApiError && e.status === 429
    ? "Buffer's request limit is reached. Try again in a few minutes."
    : e instanceof Error ? e.message : "Something went wrong talking to Buffer.";

export interface ApproveInput {
  channelId: string;
  text: string;
  dueAt: string; // ISO 8601 UTC
  asDraft: boolean; // save in Buffer's drafts instead of scheduling
  tagIds?: string[];
}

/** The one place a user's approval becomes a real Buffer post. Called only from the confirm step. */
export async function approvePost(input: ApproveInput): Promise<ActionResult<{ id: string }>> {
  const s = await session();
  if (!s) return fail("You're signed out. Sign in again.");
  const text = input.text.trim();
  if (!text || text.length > 10_000) return fail("The post text is empty or too long.");
  const due = new Date(input.dueAt);
  if (Number.isNaN(due.getTime())) return fail("That time isn't valid.");
  if (due.getTime() < Date.now() + 60_000) return fail("That slot has already passed. Pick a later one.");

  try {
    const r = await createPost(s.token, {
      channelId: input.channelId, text, dueAt: due.toISOString(), saveToDraft: input.asDraft, tagIds: input.tagIds,
    });
    if (!r.ok) return fail(r.message);
    invalidate(`${s.sid}:queue`);
    return { ok: true, value: { id: r.value.id } };
  } catch (e) {
    return fail(explain(e));
  }
}

/** Undo: deletes a post this app just created. The only delete the app ever performs. */
export async function undoPost(id: string): Promise<ActionResult<null>> {
  const s = await session();
  if (!s) return fail("You're signed out. Sign in again.");
  try {
    const r = await deletePost(s.token, id);
    if (!r.ok) return fail(r.message);
    invalidate(`${s.sid}:queue`);
    return { ok: true, value: null };
  } catch (e) {
    return fail(explain(e));
  }
}

/** Saves an idea in Buffer's Ideas (not scheduled, not published). */
export async function saveIdea(input: { organizationId: string; title: string; text: string }): Promise<ActionResult<{ id: string }>> {
  const s = await session();
  if (!s) return fail("You're signed out. Sign in again.");
  const text = input.text.trim();
  if (!text || text.length > 10_000) return fail("The idea is empty or too long.");
  try {
    const r = await createIdea(s.token, { organizationId: input.organizationId, title: input.title.trim().slice(0, 200) || undefined, text });
    if (!r.ok) return fail(r.message);
    invalidate(`${s.sid}:queue`);
    return { ok: true, value: { id: r.value.id } };
  } catch (e) {
    return fail(explain(e));
  }
}
