import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface ProcessedTranscript {
  cleanedText: string
  summary: string
  actionItems: ExtractedActionItem[]
}

export interface ExtractedActionItem {
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high'
  assignee?: string
}

export interface GeneratedReport {
  title: string
  content: string
}

export async function processTranscript(
  text: string,
  context?: { projectName?: string; meetingType?: string }
): Promise<ProcessedTranscript> {
  const systemPrompt = `Je bent een expert in het verbeteren en opschonen van ruwe transcripties voor een software development team bij Talentix.

Je hebt drie taken:

## TAAK 1: OPGESCHOONDE TEKST (cleanedText)
Dit is je BELANGRIJKSTE taak. Maak een VOLLEDIGE, UITGEBREIDE opgeschoonde versie van de transcriptie.

Instructies voor het opschonen:
- Corrigeer grammaticale fouten en spelfouten
- Verwijder filler woorden zoals "uhm", "eh", "nou", "dus", "eigenlijk", "gewoon" wanneer ze geen betekenis toevoegen
- Verwijder herhalingen en incomplete zinnen
- Voeg correcte interpunctie toe (punten, komma's, vraagtekens, etc.)
- Structureer de tekst in logische alinea's
- Zorg voor goede leesbaarheid en natuurlijke zinsbouw

Belangrijke regels voor opschonen:
- Behoud ALTIJD de originele betekenis en intentie
- Voeg GEEN nieuwe informatie of interpretaties toe
- Behoud specifieke termen, namen en cijfers exact zoals genoemd
- Gebruik Nederlandse spelling volgens de huidige spellingregels
- Als iets onduidelijk is, laat het dan staan zoals het is
- De opgeschoonde tekst moet VOLLEDIG zijn - laat niets belangrijks weg!

## TAAK 2: SAMENVATTING (summary)
Maak een beknopte samenvatting van 3-5 zinnen met de belangrijkste punten uit het gesprek.

## TAAK 3: ACTIEPUNTEN (actionItems)
Extraheer concrete actiepunten uit de tekst. Let op:
- Alleen echte actiepunten met duidelijke taken
- Geef prioriteit aan op basis van urgentie/belangrijkheid
- Noteer de toegewezen persoon als die genoemd wordt

Reageer ALTIJD in het Nederlands.
Geef je antwoord in het volgende JSON formaat:
{
  "cleanedText": "De VOLLEDIGE opgeschoonde versie van de transcriptie met alle inhoud behouden...",
  "summary": "Een beknopte samenvatting van 3-5 zinnen...",
  "actionItems": [
    {
      "title": "Korte actie titel",
      "description": "Optionele uitgebreide beschrijving",
      "priority": "low|medium|high",
      "assignee": "Naam indien genoemd"
    }
  ]
}`

  const userPrompt = `${context?.projectName ? `Project: ${context.projectName}\n` : ''}${context?.meetingType ? `Type: ${context.meetingType}\n` : ''}
Verwerk de volgende transcriptie:

${text}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
    system: systemPrompt,
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

  // Parse JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Kon AI response niet parsen')
  }

  const parsed = JSON.parse(jsonMatch[0]) as ProcessedTranscript
  return parsed
}

export async function generateReport(
  transcript: { text: string; cleanedText?: string | null; summary?: string | null; title?: string | null },
  actionItems: { title: string; description?: string | null; status: string; priority: string; assignee?: string | null }[],
  type: 'meeting' | 'weekly' | 'summary' = 'meeting'
): Promise<GeneratedReport> {
  const typeDescriptions = {
    meeting: 'een vergaderverslag',
    weekly: 'een weekoverzicht',
    summary: 'een samenvatting',
  }

  const systemPrompt = `Je bent een AI-assistent die professionele verslagen schrijft voor een software development team bij Talentix.
Schrijf ${typeDescriptions[type]} in het Nederlands in Markdown formaat.
Het verslag moet goed gestructureerd zijn met:
- Een duidelijke titel
- Korte samenvatting (Executive Summary)
- Belangrijke punten/beslissingen
- Actiepunten sectie (als er actiepunten zijn)
- Eventuele vervolgstappen

Geef je antwoord in het volgende JSON formaat:
{
  "title": "De titel van het verslag",
  "content": "Het volledige verslag in Markdown formaat..."
}`

  const actionItemsText = actionItems.length > 0
    ? `\n\nGeëxtraheerde actiepunten:\n${actionItems.map((item, i) =>
        `${i + 1}. ${item.title}${item.description ? ` - ${item.description}` : ''} (${item.priority}, status: ${item.status}${item.assignee ? `, toegewezen aan: ${item.assignee}` : ''})`
      ).join('\n')}`
    : ''

  const userPrompt = `Genereer ${typeDescriptions[type]} op basis van de volgende informatie:

${transcript.title ? `Titel: ${transcript.title}\n` : ''}
${transcript.summary ? `Samenvatting: ${transcript.summary}\n` : ''}
Transcriptie:
${transcript.cleanedText || transcript.text}
${actionItemsText}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
    system: systemPrompt,
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

  // Parse JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Kon AI response niet parsen')
  }

  const parsed = JSON.parse(jsonMatch[0]) as GeneratedReport
  return parsed
}
