#!/usr/bin/env python3
"""Read-only probe of the Buffer GraphQL API.

Reads the key from the BUFFER_ACCESS_TOKEN environment variable. Never writes it anywhere
and runs only queries (no mutations). Prints each response plus the RateLimit headers.
"""
import json
import os
import sys
import urllib.error
import urllib.request

URL = "https://api.buffer.com"
TOKEN = os.environ.get("BUFFER_ACCESS_TOKEN", "").strip()
if TOKEN.startswith("BUFFER_ACCESS_TOKEN="):
    TOKEN = TOKEN.split("=", 1)[1]
if not TOKEN:
    sys.exit("Set BUFFER_ACCESS_TOKEN first (export BUFFER_ACCESS_TOKEN=...)")


def gql(label, query, variables=None):
    body = json.dumps({"query": query, "variables": variables or {}}).encode()
    req = urllib.request.Request(
        URL,
        data=body,
        headers={
            "Authorization": "Bearer " + TOKEN,
            "Content-Type": "application/json",
            "User-Agent": "cadence-probe/0.1",
        },
    )
    print("\n=== " + label)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            rl = {k: v for k, v in r.headers.items() if k.lower().startswith("ratelimit")}
            data = json.load(r)
    except urllib.error.HTTPError as e:
        print("HTTP", e.code, e.read().decode()[:500])
        return None
    print(json.dumps(data, indent=2)[:3500])
    if rl:
        print("rate limit:", rl)
    return data


acct = gql("account + organizations", "query { account { timezone organizations { id name } } }")
try:
    org = acct["data"]["account"]["organizations"][0]["id"]
except Exception:
    sys.exit("No organization found, check the key")

chans = gql(
    "channels with posting schedule",
    "query($o: OrganizationId!) { channels(input:{organizationId:$o}) "
    "{ id name service timezone isQueuePaused isDisconnected postingSchedule { day paused times } } }",
    {"o": org},
)
ids = [c["id"] for c in (chans or {}).get("data", {}).get("channels", [])]

gql(
    "posts in a date range (dueAt filter)",
    "query($o: OrganizationId!) { posts(first: 5, input:{organizationId:$o, "
    "filter:{dueAt:{start:\"2026-10-01T00:00:00Z\", end:\"2026-12-31T00:00:00Z\"}}, "
    "sort:[{field:dueAt, direction:asc}]}) "
    "{ edges { node { id text status dueAt channelId channelService tags { id name } } } } }",
    {"o": org},
)

gql(
    "ideas read",
    "query($o: OrganizationId!) { ideas(first: 3, input:{organizationId:$o}) "
    "{ edges { node { id content { title text tags { id name } } } } } }",
    {"o": org},
)

if ids:
    gql(
        "daily posting limits",
        "query($c: [ChannelId!]!) { dailyPostingLimits(input:{channelIds:$c}) "
        "{ channelId isAtLimit limit scheduled sent } }",
        {"c": ids},
    )

gql("PostStatus enum", '{ __type(name:"PostStatus") { enumValues { name } } }')
gql("EditPostInput fields", '{ __type(name:"EditPostInput") { inputFields { name } } }')
gql("PostSortableKey enum", '{ __type(name:"PostSortableKey") { enumValues { name } } }')
