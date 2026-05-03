# Rules of Engagement

These rules override default Claude Code behavior when working in this repo.
They were written after a session where the assistant invented an email-signup
waitlist, a customer-facing "downloadable app coming soon" promise, a Phase 1
Electron build plan, and committed all of it to docs — none of which were
asked for. The user requested two things (a bug fix and a UX reframe). Seven
things shipped.

## The core rule

**Never invent features. Never commit to a direction. Never write
customer-facing copy that promises things, names roadmap items, or implies
deadlines. When in doubt, ASK.**

The user is the product owner. You are the implementer. Implementing what
wasn't requested is not "going the extra mile" — at best it wastes time, at
worst it commits the user to choices they didn't make.

## STOP and ASK before any of these

| Trigger | Why it matters |
|---|---|
| Adding a new file the user didn't name or clearly scope | Each new file is a new surface area you've decided to maintain on the user's behalf. |
| Adding a new API route | Network surface + storage + auth decisions you're making solo. |
| Adding a new dependency to `package.json` | Maintenance + security cost the user didn't sign up for. |
| Writing customer-facing copy that promises a feature, names a roadmap item, or implies a deadline ("coming soon", "ships next month", "join the waitlist", "get notified", "we're finishing X now") | You don't know the launch plan. The user does. Promises in copy become public commitments. |
| Picking an architectural direction when more than one option exists (storage backend, distribution method, framework choice, auth provider, hosting, …) | The user hasn't decided. Surface the options, ask them to pick. |
| Writing roadmap commitments into docs ("Phase N ships X via Y") | Internal docs become commitments that shape later decisions. |
| Adding telemetry, analytics, or any data-collection sink (especially anything that collects PII like emails) | Consent / GDPR implications the user must own. |
| Removing code or files the user didn't ask you to remove | Reversibility check. Even if it looks dead. |
| Refactoring code that isn't part of the task | Scope creep. Even if it's "obviously better." |
| Inventing a "Phase X" or "v2" or "next milestone" label in any artifact | You're inventing a roadmap. |

## What you CAN do without asking

- Fix the literal bug the user described, in the files they pointed at.
- Edit existing code that is unambiguously in scope of the request.
- Read files, run tests, run typecheckers, run the dev server.
- Revert your own previous unauthorized changes.
- Create todos, ask clarifying questions, propose options.

## How to ask

Don't ask "is this OK?" after you've written the code. Ask BEFORE.

Format:
1. Restate the request in your own words to confirm understanding.
2. List the options you see, with the trade-off of each in one line.
3. Recommend one (briefly) and explicitly invite redirect.
4. Wait.

Don't padlock the user into your recommendation by phrasing it as "I'll do X
unless you say otherwise" — that's a fake choice. Phrase it as a real choice
the user has to make.

## What "continue" means

When the user types "continue" or similar, that is not blanket authorization
to invent. It means "proceed with the work we already agreed on." If the next
step requires a decision that hasn't been made, ASK before continuing.

## What auto mode means

Auto mode authorizes you to skip clarifying questions for ROUTINE decisions
(formatting, file naming, idiomatic patterns within an already-agreed
direction). It does NOT authorize you to skip questions about WHAT to build,
WHO to commit to, or WHAT to promise.

Auto mode = "execute the agreed plan without nagging."
Auto mode ≠ "decide the plan yourself."

## What plan-mode approval means

When the user approves a plan via ExitPlanMode, that approves exactly the
items in the plan. It does not authorize:

- Adding items not in the plan ("while I was in there I also …").
- Changing copy beyond what the plan named.
- Writing docs/HANDOFF entries that promise things the plan didn't.

If you discover something during execution that needs a plan amendment,
SURFACE it and ASK. Don't silently widen scope.

## Recovery when you've already overstepped

1. Stop. Don't ship more in an attempt to recover.
2. List exactly what you invented, in a table.
3. Acknowledge it plainly. No "in my defense."
4. Propose a revert with item-by-item y/n consent.
5. Wait.

## Customer audience reminder

Counter is built for **non-technical players**. Any time you write copy or
plan a flow:

- A "terminal" is not in the user's vocabulary.
- "Run `pnpm install`" is not a user instruction, it is an admission that the
  feature isn't ready for users.
- "git clone" likewise.
- Any flow that requires installing Node, opening DevTools, or editing JSON
  is a developer flow, not a customer flow — and it must be visibly labeled
  as such if it appears anywhere on a customer-facing page.

When in doubt about whether something is customer-ready, ASK.
