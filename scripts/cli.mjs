#!/usr/bin/env node
// CLI voor de transcriptie-tool — leest rechtstreeks uit de database zodat
// transcripties zonder knippen en plakken in de terminal (of een Claude-sessie)
// beschikbaar zijn. Installatie als globaal commando: zie scripts/install-cli.sh
//
// Gebruik:
//   transcriptie list [-n 20] [--zoek term] [--alles]
//   transcriptie get <id|id-prefix> [--raw|--samenvatting|--srt|--meta]
//   transcriptie laatste
//   transcriptie zoek <term>
//
// Privé-transcripties van anderen worden standaard verborgen (op basis van
// CLI_USER_EMAIL, default guido@searchxrecruitment.com); --alles toont alles.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

// DATABASE_URL uit .env.local of .env laden (zonder dotenv-dependency)
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

if (!process.env.DATABASE_URL) {
  console.error('Geen DATABASE_URL gevonden in .env.local of .env')
  process.exit(1)
}

const { PrismaClient } = await import(join(repoRoot, 'node_modules/@prisma/client/default.js'))
const prisma = new PrismaClient()

const CLI_USER_EMAIL = process.env.CLI_USER_EMAIL || 'guido@searchxrecruitment.com'

const args = process.argv.slice(2)
const command = args[0] || 'help'
const flags = new Set(args.filter((a) => a.startsWith('--')))
const positional = args.slice(1).filter((a) => !a.startsWith('-'))

function flagValue(name, fallback) {
  const idx = args.indexOf(name)
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback
}

// Privé-transcripties van anderen standaard uitsluiten
async function privacyWhere() {
  if (flags.has('--alles')) return {}
  const me = await prisma.user.findUnique({
    where: { email: CLI_USER_EMAIL },
    select: { id: true },
  })
  return { OR: [{ isPrivate: false }, ...(me ? [{ userId: me.id }] : [])] }
}

function formatRow(t) {
  const date = t.createdAt.toISOString().slice(0, 10)
  const dur = t.duration
    ? `${Math.floor(t.duration / 60)}:${String(t.duration % 60).padStart(2, '0')}`
    : '-'
  const lock = t.isPrivate ? '🔒 ' : ''
  const project = t.project ? `  [${t.project.name}]` : ''
  return `${t.id}  ${date}  ${dur.padStart(6)}  ${t.status.padEnd(10)}  ${lock}${t.title || t.filename}${project}`
}

async function list(extraWhere = {}) {
  const limit = parseInt(flagValue('-n', '20'), 10)
  const zoek = flagValue('--zoek', null)
  const where = {
    AND: [
      await privacyWhere(),
      extraWhere,
      ...(zoek
        ? [{
            OR: [
              { title: { contains: zoek, mode: 'insensitive' } },
              { filename: { contains: zoek, mode: 'insensitive' } },
            ],
          }]
        : []),
    ],
  }
  const transcripts = await prisma.transcript.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true, title: true, filename: true, duration: true, status: true,
      createdAt: true, isPrivate: true, project: { select: { name: true } },
    },
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
  const where = { AND: [await privacyWhere(), { id: { startsWith: idArg } }] }
  const matches = await prisma.transcript.findMany({
    where,
    take: 2,
    include: { project: { select: { name: true } } },
  })
  if (matches.length === 0) {
    console.error(`Geen transcriptie gevonden met id (prefix) "${idArg}"`)
    process.exit(1)
  }
  if (matches.length > 1) {
    console.error(`Meerdere transcripties matchen "${idArg}" — gebruik een langere prefix`)
    process.exit(1)
  }
  printTranscript(matches[0])
}

function printTranscript(t) {
  // Meta naar stderr zodat stdout puur de tekst is (pipe-vriendelijk)
  const date = t.createdAt.toISOString().slice(0, 10)
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

async function laatste() {
  const matches = await prisma.transcript.findMany({
    where: { AND: [await privacyWhere(), { status: 'completed' }] },
    orderBy: { createdAt: 'desc' },
    take: 1,
    include: { project: { select: { name: true } } },
  })
  if (matches.length === 0) {
    console.error('Geen afgeronde transcripties gevonden')
    process.exit(1)
  }
  printTranscript(matches[0])
}

async function zoek(term) {
  if (!term) {
    console.error('Gebruik: transcriptie zoek <term>')
    process.exit(1)
  }
  const transcripts = await prisma.transcript.findMany({
    where: {
      AND: [
        await privacyWhere(),
        {
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { filename: { contains: term, mode: 'insensitive' } },
            { text: { contains: term, mode: 'insensitive' } },
          ],
        },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true, title: true, filename: true, duration: true, status: true,
      createdAt: true, isPrivate: true, project: { select: { name: true } },
    },
  })
  if (transcripts.length === 0) {
    console.error(`Niets gevonden voor "${term}"`)
    return
  }
  for (const t of transcripts) console.log(formatRow(t))
}

function help() {
  console.log(`transcriptie — CLI voor de Search X transcriptie-tool

Gebruik:
  transcriptie list [-n 20] [--zoek term] [--alles]   Recente transcripties
  transcriptie get <id|id-prefix>                     Opgeschoonde tekst (stdout)
      [--raw]           ruwe transcriptietekst
      [--samenvatting]  alleen de AI-samenvatting
      [--srt]           ondertitels (SRT)
      [--meta]          alleen titel/datum/project
  transcriptie laatste                                Meest recente transcriptie
  transcriptie zoek <term>                            Zoek in titel/bestand/tekst

Privé-transcripties van anderen zijn standaard verborgen (CLI_USER_EMAIL,
default guido@searchxrecruitment.com); --alles toont ze wel.
Meta-regels gaan naar stderr; stdout bevat alleen de tekst (pipe-vriendelijk).`)
}

try {
  if (command === 'list') await list()
  else if (command === 'get') await get(positional[0])
  else if (command === 'laatste') await laatste()
  else if (command === 'zoek') await zoek(positional[0])
  else help()
} finally {
  await prisma.$disconnect()
}
