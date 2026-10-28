import { redirect } from "next/navigation";
import { Queue } from "@/components/queue/Queue";
import { isSignedIn } from "@/lib/session";

// Sample data for now: this page makes no Buffer API calls, so reloading never spends quota.
export default async function QueuePage() {
  if (!(await isSignedIn())) redirect("/");
  return <Queue />;
}
