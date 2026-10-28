import { redirect } from "next/navigation";
import { currentSid } from "@/lib/session";

const errors: Record<string, string> = {
  access_denied: "You declined access. Nothing was connected.",
  invalid_state: "That sign-in expired. Please try again.",
  token_exchange: "Buffer didn't accept the sign-in. Please try again.",
};

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentSid()) redirect("/queue");
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-4">
      <h1 className="text-4xl font-semibold tracking-tight">Never go quiet. Never ship without telling anyone.</h1>
      <p className="text-[color:var(--muted)]">
        One queue to plan what&apos;s scheduled and turn what you shipped into posts. You approve everything.
      </p>
      {error && <p className="text-sm text-red-700">{errors[error] ?? "Something went wrong."}</p>}
      <a
        href="/api/auth/login"
        className="w-fit rounded-lg bg-[color:var(--action)] px-4 py-2 font-medium text-[color:var(--action-text)] hover:bg-[color:var(--action-hover)]"
      >
        Sign in with Buffer
      </a>
      <p className="text-xs text-[color:var(--muted)]">Built on the Buffer API. Not an official Buffer product.</p>
    </main>
  );
}
