#!/usr/bin/env node
// CLI voor de transcriptie-tool — haalt transcripties op zonder knippen en
// plakken, in de terminal of in een Claude Code-sessie.
//
// Twee manieren om te verbinden:
//   1. API-modus (aanbevolen, ook voor collega's) — zet TRANSCRIPTIE_TOKEN.
//      Werkt overal, heeft dit bestand alleen nodig, geen repo of database.
//      Token aanmaken: app → Mijn Profiel → CLI-tokens.
//   2. Database-modus (alleen op Guido's machine) — geen token gezet, dan
//      leest de CLI rechtstreeks uit de database via DATABASE_URL uit .env.
//
// Gebruik:
//   transcriptie list [-n 20] [--zoek term]
//   transcriptie get <id|id-prefix> [--raw|--samenvatting|--srt|--meta]
//   transcriptie laatste
//   transcriptie zoek <term>

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

const DEFAULT_URL = 'https://transcriptie.talentix.ai'

// .env.local / .env inlezen als ze er zijn (zonder dotenv-dependency).
// Ontbreken ze — bijvoorbeeld bij een collega met alleen dit script — dan
// draait de CLI gewoon op de omgevingsvariabelen.
for (const file of ['.env.local', '.env']) {
  try {
    for (const line of readFileSync(join(repoRoot, file), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/)
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2]
    }
  } catch {
    // bestand bestaat niet — prima
  }
}

const TOKEN = process.env.TRANSCRIPTIE_TOKEN
const BASE_URL = (process.env.TRANSCRIPTIE_URL || DEFAULT_URL).replace(/\/$/, '')
const useApi = Boolean(TOKEN)

if (!useApi && !process.env.DATABASE_URL) {
  console.error(`Geen verbinding mogelijk.

Zet TRANSCRIPTIE_TOKEN om via de API te verbinden:
  export TRANSCRIPTIE_TOKEN=txt_...

Een token maak je aan in de app onder Mijn Profiel → CLI-tokens:
  ${BASE_URL}/profile`)
  process.exit(1)
}

const args = process.argv.slice(2)
const command = args[0] || 'help'
const flags = new Set(args.filter((a) => a.startsWith('--')))
const positional = args.slice(1).filter((a) => !a.startsWith('-'))

function flagValue(name, fallback) {
  const idx = args.indexOf(name)
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback
}

// --- Databron: API of database -------------------------------------------

async function apiFetch(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  })
  if (res.status === 401) {
    console.error('Token ongeldig of ingetrokken. Maak een nieuw token aan onder Mijn Profiel.')
    process.exit(1)
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    console.error(body.error || `Verzoek mislukt (HTTP ${res.status})`)
    process.exit(1)
  }
  return res.json()
}

let prisma = null
async function db() {
  if (!prisma) {
    const { PrismaClient } = await import(join(repoRoot, 'node_modules/@prisma/client/default.js'))
    prisma = new PrismaClient()
  }
  return prisma
}

const CLI_USER_EMAIL = process.env.CLI_USER_EMAIL || 'guido@searchxrecruitment.com'

async function privacyWhere() {
  if (flags.has('--alles')) return {}
  const client = await db()
  const me = await client.user.findUnique({
    where: { email: CLI_USER_EMAIL },
    select: { id: true },
  })
  return { OR: [{ isPrivate: false }, ...(me ? [{ userId: me.id }] : [])] }
}

const LIST_SELECT = {
  id: true, title: true, filename: true, duration: true, status: true,
  createdAt: true, isPrivate: true, project: { select: { name: true } },
}

async function fetchList({ zoek, limit }) {
  if (useApi) {
    const params = new URLSearchParams({ limit: String(limit) })
    if (zoek) params.set('zoek', zoek)
    return apiFetch(`/api/cli/transcripts?${params}`)
  }

  const client = await db()
  return client.transcript.findMany({
    where: {
      AND: [
        await privacyWhere(),
        ...(zoek
          ? [{
              OR: [
                { title: { contains: zoek, mode: 'insensitive' } },
                { filename: { contains: zoek, mode: 'insensitive' } },
                { text: { contains: zoek, mode: 'insensitive' } },
              ],
            }]
          : []),
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: LIST_SELECT,
  })
}

async function fetchOne(idPrefix) {
  if (useApi) {
    return apiFetch(`/api/cli/transcripts/${encodeURIComponent(idPrefix)}`)
  }

  const client = await db()
  const matches = await client.transcript.findMany({
    where: { AND: [await privacyWhere(), { id: { startsWith: idPrefix } }] },
    take: 2,
    include: { project: { select: { name: true } } },
  })
  if (matches.length === 0) {
    console.error(`Geen transcriptie gevonden met id (prefix) "${idPrefix}"`)
    process.exit(1)
  }
  if (matches.length > 1) {
    console.error(`Meerdere transcripties matchen "${idPrefix}" — gebruik een langere prefix`)
    process.exit(1)
  }
  return matches[0]
}

// --- Weergave -------------------------------------------------------------

function formatRow(t) {
  const date = new Date(t.createdAt).toISOString().slice(0, 10)
  const dur = t.duration
    ? `${Math.floor(t.duration / 60)}:${String(t.duration % 60).padStart(2, '0')}`
    : '-'
  const lock = t.isPrivate ? '🔒 ' : ''
  const project = t.project ? `  [${t.project.name}]` : ''
  return `${t.id}  ${date}  ${dur.padStart(6)}  ${t.status.padEnd(10)}  ${lock}${t.title || t.filename}${project}`
}

function printTranscript(t) {
  // Meta naar stderr zodat stdout puur de tekst is (pipe-vriendelijk)
  const date = new Date(t.createdAt).toISOString().slice(0, 10)
  console.error(`# ${t.title || t.filename} — ${date}${t.project ? ` — project: ${t.project.name}` : ''}${t.isPrivate ? ' — 🔒 privé' : ''}`)
  if (flags.has('--meta')) return
  if (flags.has('--srt')) {
    console.log(t.srt || '(geen SRT beschikbaar)')
  } else if (flags.has('--samenvatting')) {
    console.log(t.summary || '(geen samenvatting beschikbaar)')
  } else if (flags.has('--raw')) {
    console.log(t.text || '(geen tekst beschikbaar)')
  } else {
    console.log(t.cleanedText || t.text || '(geen tekst beschikbaar)')
  }
}

// --- Commando's -----------------------------------------------------------

async function list() {
  const transcripts = await fetchList({
    zoek: flagValue('--zoek', null),
    limit: parseInt(flagValue('-n', '20'), 10) || 20,
  })
  if (transcripts.length === 0) {
    console.error('Geen transcripties gevonden')
    return
  }
  for (const t of transcripts) console.log(formatRow(t))
}

async function get(idArg) {
  if (!idArg) {
    console.error('Gebruik: transcriptie get <id|id-prefix>')
    process.exit(1)
  }
  printTranscript(await fetchOne(idArg))
}

async function laatste() {
  const transcripts = await fetchList({ zoek: null, limit: 1 })
  if (transcripts.length === 0) {
    console.error('Geen transcripties gevonden')
    process.exit(1)
  }
  printTranscript(await fetchOne(transcripts[0].id))
}

async function zoek(term) {
  if (!term) {
    console.error('Gebruik: transcriptie zoek <term>')
    process.exit(1)
  }
  const transcripts = await fetchList({ zoek: term, limit: 20 })
  if (transcripts.length === 0) {
    console.error(`Niets gevonden voor "${term}"`)
    return
  }
  for (const t of transcripts) console.log(formatRow(t))
}

function help() {
  console.log(`transcriptie — CLI voor de Search X transcriptie-tool

Gebruik:
  transcriptie list [-n 20] [--zoek term]   Recente transcripties
  transcriptie get <id|id-prefix>           Opgeschoonde tekst (stdout)
      [--raw]           ruwe transcriptietekst
      [--samenvatting]  alleen de AI-samenvatting
      [--srt]           ondertitels (SRT)
      [--meta]          alleen titel/datum/project
  transcriptie laatste                      Meest recente transcriptie
  transcriptie zoek <term>                  Zoek in titel/bestand/tekst

Verbinding: ${useApi ? `API (${BASE_URL})` : 'database (lokaal)'}
Token aanmaken: ${BASE_URL}/profile → CLI-tokens, daarna:
  export TRANSCRIPTIE_TOKEN=txt_...

Meta-regels gaan naar stderr; stdout bevat alleen de tekst (pipe-vriendelijk).`)
}

try {
  if (command === 'list') await list()
  else if (command === 'get') await get(positional[0])
  else if (command === 'laatste') await laatste()
  else if (command === 'zoek') await zoek(positional[0])
  else help()
} finally {
  if (prisma) await prisma.$disconnect()
}
