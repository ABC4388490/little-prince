# Public chat acceptance

Release: 2026-10-23. Public entry: https://little-prince.xyz/#b612-chat

## Required checks

1. Public HTML and versioned JavaScript/CSS match the released files. A new visitor needs no localhost service, browser plugin, model key, or API query parameter.
2. Default public chat reaches the production Railway chat service. If the request fails, same-origin `/api/chat` is a backup. Explicit developer endpoint overrides retain priority. Profile authentication remains pinned to the memory client.
3. Eight independent three-turn conversations (24 real responses) cover greetings, corrections, daily topics, short follow-ups, topic switches, requested advice, preferences and context memory. Every request must succeed, reply must be nonempty, and the old fixed fallback must never appear. Each conversation must directly address the current turn and retain the relevant previous details.
4. Real browser verification uses the public URL and includes a greeting, a factual detail, a short follow-up, a correction and a topic switch. Messages must be usable again after each response. API latency target: p95 below 10 seconds for the small acceptance sample, all requests below the frontend 25-second timeout. This is a sample result rather than an uptime guarantee.
5. Automated failure checks prove no fabricated offline reply is stored, retry preserves the user's turn without duplication, obsolete retries cannot answer a newer turn, and sending unlocks after failure.
6. Chinese IME confirmation does not send accidentally. The in-flight lock prevents duplicate messages and preserves a new unsent draft. Rose chat retains its own character.

## Local regression command

```sh
node --test tests/chat.test.cjs tests/chat-input.test.cjs tests/chat-routing.test.cjs
```

Keys belong in server environment variables. No keys are included in the browser bundle or this release.
