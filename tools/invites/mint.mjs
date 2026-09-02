#!/usr/bin/env node
//
// mint — generate one-time invite links for the character submission form.
//
//   node tools/invites/mint.mjs alice@example.com bob@example.com
//   node tools/invites/mint.mjs --count 5
//   node tools/invites/mint.mjs --base https://slopsquest.web.app alice@example.com
//
// Writes tools/invites/invites-<stamp>.json and prints the links to paste into
// email. It does NOT talk to Firebase — creating the docs is a console step, so
// no service-account key ever has to live in this repo. The JSON it writes is
// shaped for pasting straight into the Firestore console.
//
// Each invite is a document in `alphaInvites` keyed by the token:
//
//   alphaInvites/<token>
//     email      string   who it was issued to (shown on the form)
//     used       boolean  false until they submit
//     createdAt  string   ISO date, for your own bookkeeping
//     usedAt     (added by the form when they submit)

import { randomBytes } from 'node:crypto'
import { writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const DEFAULT_BASE = 'https://slopsquest.web.app'

// 24 URL-safe chars. Long enough that guessing is hopeless, short enough that a
// tester can retype it off a phone screen if their mail client mangles the link.
function mintToken() {
  return randomBytes(18).toString('base64url')
}

function parseArgs(argv) {
  const out = { emails: [], count: 0, base: DEFAULT_BASE }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--count')     out.count = Number(argv[++i])
    else if (argv[i] === '--base') out.base = argv[++i].replace(/\/$/, '')
    else if (argv[i] === '--help' || argv[i] === '-h') out.help = true
    else out.emails.push(argv[i])
  }
  return out
}

const args = parseArgs(process.argv.slice(2))

if (args.help || (!args.emails.length && !args.count)) {
  console.log(`
mint — one-time invite links for the character form

  node tools/invites/mint.mjs <email> [<email> ...]   one invite each
  node tools/invites/mint.mjs --count 5               five unassigned invites
  node tools/invites/mint.mjs --base <url> ...        default ${DEFAULT_BASE}

Then: paste the printed JSON into Firestore as documents in the
"alphaInvites" collection, using the token as each document's ID.
`)
  process.exit(0)
}

const recipients = args.emails.length
  ? args.emails
  : Array.from({ length: args.count }, () => '')

const createdAt = new Date().toISOString()
const invites = recipients.map(email => {
  const token = mintToken()
  return { token, email, used: false, createdAt, link: `${args.base}/pages/character.html?t=${token}` }
})

const stamp = createdAt.replace(/[:.]/g, '-').slice(0, 19)
const outPath = join(HERE, `invites-${stamp}.json`)
await mkdir(HERE, { recursive: true })
await writeFile(outPath, JSON.stringify(invites, null, 2))

console.log(`\nminted ${invites.length} invite(s) -> ${outPath}\n`)

console.log('── links to email ──')
for (const inv of invites) {
  console.log(`  ${inv.email || '(unassigned)'}\n    ${inv.link}`)
}

console.log('\n── documents to create in Firestore ──')
console.log('collection: alphaInvites   (document ID = the token)\n')
for (const inv of invites) {
  console.log(`  ${inv.token}`)
  console.log(`    email: ${JSON.stringify(inv.email)}`)
  console.log(`    used: false`)
  console.log(`    createdAt: ${JSON.stringify(inv.createdAt)}`)
}
console.log('')
