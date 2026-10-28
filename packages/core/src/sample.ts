import type { Channel, Day, GapDef, Idea, Post, PostStatus, Tag } from "./queue";

// Sample week shown until real data is connected. Labeled "Sample data" in the UI.
export const SAMPLE_WEEK_LABEL = "Nov 2 – 8";
export const SAMPLE_DEFAULT_DAY = 4;

export const DAYS: Day[] = [
  { name: "Mon", date: 2, full: "Monday, Nov 2" },
  { name: "Tue", date: 3, full: "Tuesday, Nov 3" },
  { name: "Wed", date: 4, full: "Wednesday, Nov 4" },
  { name: "Thu", date: 5, full: "Thursday, Nov 5" },
  { name: "Fri", date: 6, full: "Friday, Nov 6" },
  { name: "Sat", date: 7, full: "Saturday, Nov 7" },
  { name: "Sun", date: 8, full: "Sunday, Nov 8" },
];

export const CHANNELS: Channel[] = [
  { id: "x", name: "X", handle: "@acme", badge: "#12161C", charLimit: 280 },
  { id: "linkedin", name: "LinkedIn", handle: "matheus-alves789", badge: "#0A66C2", charLimit: 3000 },
  { id: "bluesky", name: "Bluesky", handle: "acme.bsky.social", badge: "#1185FE", charLimit: 300 },
];

const P = (day: number, channel: Post["channel"], tag: Tag, time: string, full: string, status: PostStatus = "scheduled"): Omit<Post, "id"> => ({
  day, channel, tag, time, full, status, kind: "",
});

export const SAMPLE_POSTS: Post[] = [
  P(0, "x", "educate", "09:00", "Queue hack: batch your week in 20 minutes", "sent"),
  P(0, "linkedin", "educate", "12:00", "What I learned from scheduling 100 posts in one sitting"),
  P(0, "bluesky", "educate", "09:30", "Queue hack: batch your week in 20 minutes", "sent"),
  P(1, "x", "promote", "09:00", "Early-bird pricing opens today"),
  P(1, "x", "promote", "15:00", "Three teams switched this week. Here is why", "error"),
  P(1, "bluesky", "promote", "09:30", "Early-bird pricing opens today"),
  P(2, "x", "educate", "10:00", "A simple way to pick your content pillars"),
  P(2, "linkedin", "personal", "11:00", "Why I stopped posting only when I had news"),
  P(2, "bluesky", "educate", "10:15", "A simple way to pick your content pillars"),
  P(3, "x", "promote", "08:30", "Last call: early-bird pricing ends tonight"),
  P(3, "x", "educate", "09:00", "Three things I learned caching API responses"),
  P(3, "x", "educate", "14:00", "What a good posting rhythm looks like"),
  P(3, "linkedin", "educate", "10:00", "Three things I learned caching API responses"),
  P(3, "bluesky", "promote", "09:00", "Last call: early-bird pricing ends tonight"),
  P(3, "bluesky", "promote", "12:30", "Last call: early-bird pricing ends tonight"),
  P(3, "bluesky", "educate", "16:00", "What a good posting rhythm looks like"),
  P(4, "x", "personal", "13:00", "Friday note: what shipping weekly does to your head"),
  P(4, "bluesky", "personal", "14:00", "Friday note: what shipping weekly does to your head"),
  P(6, "bluesky", "educate", "10:00", "Sunday read: how small teams keep a posting rhythm"),
].map((p, i) => ({ ...p, id: `b${i}` }));

// Drafts generated from a release ("From GitHub"); they start as "needs review".
export const SAMPLE_DRAFTS: Post[] = [
  {
    id: "x", day: 4, channel: "x", tag: "shipped", time: "10:00", status: "draft",
    kind: "Thread, 3 posts from the v0.4.0 release",
    full: "v0.4.0 is out. Dark mode finally landed, and sync is twice as fast.\n\n2/3 Three people told me the app hurt their eyes at night. That was enough to move it up the list.\n\n3/3 Also in this release: 12 fixes. Full changelog below.",
  },
  {
    id: "li", day: 4, channel: "linkedin", tag: "shipped", time: "10:30", status: "draft",
    kind: "Story post from the v0.4.0 release",
    full: "Two weeks ago, three people told me the app hurt their eyes at night.\n\nToday v0.4.0 ships with dark mode. While I was in there, sync got twice as fast.",
  },
  {
    id: "bs", day: 4, channel: "bluesky", tag: "shipped", time: "10:15", status: "draft",
    kind: "Short post from the v0.4.0 release",
    full: "v0.4.0 shipped: dark mode, faster sync, 12 fixes. Changelog in the replies.",
  },
];

export const SAMPLE_IDEAS: Idea[] = [
  { id: "i1", title: "What I learned building in public", tag: "educate" },
  { id: "i2", title: "A behind-the-scenes look at our week", tag: "personal" },
  { id: "i3", title: "Customer story: how a small team halved its posting time", tag: "promote" },
];

// Placeholder gaps. Real ones come from the deterministic rules (open slots, crowded days, balance).
export const SAMPLE_GAPS: GapDef[] = [
  { id: "g1", title: "LinkedIn has 3 open queue slots", why: "Tue 17:12, Wed 16:30 and Fri 16:34 have no post.", canFill: true, canSpread: false },
  { id: "g2", title: "Thursday is crowded", why: "Thursday has 7 posts, the most of any day.", canFill: false, canSpread: true },
];

export const SAMPLE_API_USAGE = { used: 34, limit: 250 };
