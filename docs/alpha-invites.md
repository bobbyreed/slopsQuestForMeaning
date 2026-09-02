# Alpha invites — the character submission form

The reward for finishing a manual test pass: the tester gets to put a character
into the game as an optional miniboss. The form is
[`public/pages/character.html`](../public/pages/character.html), it is
invite-only, and each invite works exactly once.

Submissions land in Firestore for us to review by hand and implement as feature
passes. Nothing is automated on the game side — that is deliberate, since every
character is real implementation work.

---

## What you need to configure

Three things, all on your side. Nothing here needs a service-account key, and
none is checked into the repo.

### 1. Deploy the Firestore rules

`firestore.rules` exists but is **not deployed** — `firebase.json` currently
declares hosting only. Add the firestore block yourself:

```json
{
  "hosting": { ... },
  "firestore": {
    "rules": "firestore.rules"
  }
}
```

Then:

```bash
firebase deploy --only firestore:rules
```

The rules matter more than usual here. The form's own gate is client-side and
anyone can bypass it; the rules are what actually enforce that a submission
needs a real, unused invite. They also make `alphaInvites` un-listable, so a
single leaked token can't be turned into every token.

### 2. Mint invites

```bash
node tools/invites/mint.mjs alice@example.com bob@example.com
node tools/invites/mint.mjs --count 5          # unassigned
```

It writes `tools/invites/invites-<stamp>.json` and prints both the links to
email and the exact documents to create. It never touches Firebase — creating
the docs is a console step so no credentials live in this repo.

### 3. Create the invite documents

In the Firebase console → Firestore → collection **`alphaInvites`**, add one
document per invite, using **the token as the document ID**:

| field | type | value |
|---|---|---|
| `email` | string | who it was issued to (shown on the form) |
| `used` | boolean | `false` |
| `createdAt` | string | the ISO date the mint script printed |

The form adds `usedAt` when they submit.

Then email each tester their link. It looks like:

```
https://slopsquest.web.app/pages/character.html?t=<token>
```

---

## Reviewing what comes in

Submissions are in the **`characterSubmissions`** collection, one document each:

| field | what it holds |
|---|---|
| `name` | character name |
| `appearance` | what they look like |
| `backstory` | where they came from and what they want |
| `region` / `place` | where in the world, and how the player finds them |
| `palette` | four hex colors — body, accent, detail, glow |
| `trigger` | `aggressive` · `passive-dialogue` · `conditional` · `other` |
| `triggerDetail` | how the fight starts; for dialogue trees, the branches |
| `fight` / `defeat` | optional: how they fight, what happens when they lose |
| `credit` | how to credit the tester, or blank for anonymous |
| `notes` | anything else |
| `status` | `new` → `reviewed` → `building` → `shipped`, maintained by us |
| `token` | which invite it came from |

The rules deny client reads on this collection, so review it in the console or
with an authenticated admin tool — not from a page.

---

## How Slop knows about it

He found it. The form lives in the same directory as his journal, and the game
treats that as something he'd notice rather than something hidden from him:

- **Journal entry 048** — he works out that the form's fields are the shape of
  his own creation, blank and waiting for someone else, and gets stuck on the
  word *optional*.
- **Terminal commands** at the main menu: `character` explains the invite gate in
  his voice, and `form`, `miniboss`, `tester` and `neighbour` are his responses
  to the whole arrangement.

He does not link testers to the form — he can't, since he has no way to know
whether you hold an invite, and the game says so plainly rather than pretending.
