export const metadata = { title: "Privacy · Cadence" };

export default function Privacy() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-4 px-4 py-16 text-sm leading-relaxed">
      <h1 className="text-2xl font-semibold tracking-tight">What Cadence keeps</h1>
      <p>Cadence is built on the Buffer API. It is not an official Buffer product. It has no database of your posts: your queue, ideas and tags stay in Buffer.</p>
      <h2 className="mt-2 font-semibold">On our server</h2>
      <ul className="list-disc pl-5">
        <li>The tokens Buffer gives Cadence when you sign in, encrypted, under a random session id. They let Cadence read and write on your behalf.</li>
        <li>A short-lived copy of your queue in memory, for about a minute, so reloads don&apos;t spend your Buffer API requests.</li>
      </ul>
      <h2 className="mt-2 font-semibold">In your browser</h2>
      <ul className="list-disc pl-5">
        <li>A sealed session cookie.</li>
        <li>A saved copy of your last queue view, so the page opens quickly. It holds no tokens.</li>
        <li>The GitHub repository name you last used.</li>
      </ul>
      <h2 className="mt-2 font-semibold">What Cadence changes in Buffer</h2>
      <p>Only what you approve: posts you add, drafts, ideas, and tags you set. Undo removes a post Cadence just created.</p>
      <h2 className="mt-2 font-semibold">Deleting your data</h2>
      <p>Use <em>Delete my data</em> in the sidebar. It removes the stored tokens, the cached queue and your browser copy. To end Cadence&apos;s access to your Buffer account, also remove the app in Buffer&apos;s settings.</p>
      <a href="/" className="underline">Back</a>
    </main>
  );
}
