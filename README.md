# Cadence

One queue to plan what's scheduled and turn what you shipped into posts. Built for the Buffer Commit contest on the Buffer API. Not an official Buffer product.

See [PLAN.md](PLAN.md) and [DESIGN.md](DESIGN.md).

## Layout

- `apps/web`: Next.js app (sign-in, queue)
- `packages/buffer-client`: OAuth + PKCE, token refresh, GraphQL client
- `packages/core`: pure product logic (gaps, balance)
- `spikes/`, `scripts/`: early experiments

## Run locally

```bash
pnpm install
cp .env.example apps/web/.env.local   # fill in values, never commit
pnpm dev                               # https://localhost:3000
```

Register `https://localhost:3000/callback` as a redirect URI on your Buffer App Client (publish.buffer.com/settings/api).
