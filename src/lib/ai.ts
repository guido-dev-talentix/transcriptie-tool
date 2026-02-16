import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

function parseAIJsonResponse<T>(responseText: string): T {
  let jsonString = responseText

  // Remove markdown code blocks if present
  const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    jsonString = codeBlockMatch[1].trim()
  } else {
    const startMatch = responseText.match(/```(?:json)?\s*([\s\S]*)/)
    if (startMatch) {
      jsonString = startMatch[1].trim()
      jsonString = jsonString.replace(/```\s*$/, '').trim()
    }
  }

  // Extract JSON object - find the outermost { and }
  const firstBrace = jsonString.indexOf('{')
  const lastBrace = jsonString.lastIndexOf('}')

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    console.error('AI response could not be parsed. Response:', responseText.substring(0, 500))
    throw new Error('Kon AI response niet parsen')
  }

  const jsonContent = jsonString.substring(firstBrace, lastBrace + 1)

  try {
    return JSON.parse(jsonContent) as T
  } catch (parseError) {
    console.error('JSON parse error:', parseError, 'JSON string:', jsonContent.substring(0, 500))
    throw new Error('Kon AI response JSON niet parsen')
  }
}

// Pricing per million tokens (Claude Sonnet)
const PRICING = { input: 3.0, output: 15.0 }

// Helper: streaming call that returns the final text + stop_reason
async function streamMessage(params: {
  system: string
  userPrompt: string
  max_tokens: number
  label?: string
}): Promise<{ text: string; stopReason: string | null }> {
  const startTime = Date.now()

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: params.max_tokens,
    messages: [
      {
        role: 'user',
        content: params.userPrompt,
      },
    ],
    system: params.system,
  })

  const message = await stream.finalMessage()
  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1)
  const inputTokens = message.usage.input_tokens
  const outputTokens = message.usage.output_tokens
  const costInput = (inputTokens / 1_000_000) * PRICING.input
  const costOutput = (outputTokens / 1_000_000) * PRICING.output
  const costTotal = costInput + costOutput

  console.log(
    `[AI ${params.label || 'call'}] ${durationSec}s | ` +
    `input: ${inputTokens} tokens ($${costInput.toFixed(4)}) | ` +
    `output: ${outputTokens} tokens ($${costOutput.toFixed(4)}) | ` +
    `totaal: $${costTotal.toFixed(4)}`
  )

  return { text, stopReason: message.stop_reason }
}

export interface ProcessedTranscript {
  cleanedText: string
  summary: string
}

export interface StatusUpdate {
  statusSummary: string
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

Je hebt twee taken:

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

Reageer ALTIJD in het Nederlands.
Geef je antwoord in het volgende JSON formaat:
{
  "cleanedText": "De VOLLEDIGE opgeschoonde versie van de transcriptie met alle inhoud behouden...",
  "summary": "Een beknopte samenvatting van 3-5 zinnen..."
}`

  const userPrompt = `${context?.projectName ? `Project: ${context.projectName}\n` : ''}${context?.meetingType ? `Type: ${context.meetingType}\n` : ''}
Verwerk de volgende transcriptie:

${text}`

  const { text: responseText, stopReason } = await streamMessage({
    system: systemPrompt,
    userPrompt,
    max_tokens: 32768,
    label: 'processTranscript',
  })

  if (stopReason === 'max_tokens') {
    console.error('processTranscript response was truncated (max_tokens reached)')
    throw new Error('AI response werd afgekapt - transcriptie is mogelijk te lang')
  }

  return parseAIJsonResponse<ProcessedTranscript>(responseText)
}

export async function generateStatusUpdate(
  previousSVZ: string | null,
  newTranscriptContent: string,
  projectName: string
): Promise<StatusUpdate> {
  const isFirst = !previousSVZ

  const systemPrompt = `Je bent een AI-assistent die een cumulatieve "Stand van Zaken" (projectstatus) bijhoudt voor projecten bij Talentix.

${isFirst ? `Dit is de EERSTE transcriptie voor dit project. Maak een initiële Stand van Zaken op basis van de inhoud.` : `Er is al een bestaande Stand van Zaken. Werk deze bij met de nieuwe informatie uit de laatste transcriptie. Behoud relevante bestaande informatie en voeg nieuwe inzichten toe. Verwijder informatie die achterhaald is door nieuwe ontwikkelingen.`}

De Stand van Zaken moet in Markdown geschreven zijn en de volgende structuur volgen:
- **Huidige status**: Korte beschrijving van waar het project staat
- **Belangrijkste punten**: De kernpunten en lopende zaken
- **Recente ontwikkelingen**: Wat er laatst is besproken/besloten
- **Openstaande vragen/risico's**: Eventuele aandachtspunten

Houd het beknopt maar informatief. Schrijf in het Nederlands.

Geef je antwoord in het volgende JSON formaat:
{
  "statusSummary": "De volledige Stand van Zaken in Markdown..."
}`

  const userPrompt = `Project: ${projectName}

${previousSVZ ? `Huidige Stand van Zaken:\n${previousSVZ}\n\n` : ''}Nieuwe transcriptie inhoud:
${newTranscriptContent}`

  const { text: responseText } = await streamMessage({
    system: systemPrompt,
    userPrompt,
    max_tokens: 4096,
    label: 'generateStatusUpdate',
  })

  return parseAIJsonResponse<StatusUpdate>(responseText)
}

export interface ExtractedActionItems {
  actionItems: { title: string; description: string; priority: string; assignee: string | null }[]
}

export interface ExtractedDecisions {
  decisions: { title: string; description: string; context: string; madeBy: string | null }[]
}

export async function extractActionItems(
  text: string,
  context?: { projectName?: string }
): Promise<ExtractedActionItems> {
  const systemPrompt = `Je bent een expert in het analyseren van vergadertranscripties en het identificeren van actiepunten, taken en to-do items.

Analyseer de gegeven tekst en extraheer alle actiepunten, taken, toezeggingen en to-do items die worden genoemd.

Voor elk actiepunt:
- title: Korte, duidelijke titel van het actiepunt
- description: Meer detail over wat er gedaan moet worden
- priority: "high", "medium" of "low" - gebaseerd op urgentie en belang
- assignee: De naam van de persoon die verantwoordelijk is (als genoemd), anders null

Reageer ALTIJD in het Nederlands.
Geef je antwoord in het volgende JSON formaat:
{
  "actionItems": [
    {
      "title": "Korte titel",
      "description": "Gedetailleerde beschrijving",
      "priority": "high|medium|low",
      "assignee": "Naam of null"
    }
  ]
}

Als er geen actiepunten gevonden worden, geef dan een lege array terug.`

  const userPrompt = `${context?.projectName ? `Project: ${context.projectName}\n\n` : ''}Extraheer alle actiepunten uit de volgende tekst:

${text}`

  const { text: responseText } = await streamMessage({
    system: systemPrompt,
    userPrompt,
    max_tokens: 4096,
    label: 'extractActionItems',
  })

  return parseAIJsonResponse<ExtractedActionItems>(responseText)
}

export async function extractDecisions(
  text: string,
  context?: { projectName?: string }
): Promise<ExtractedDecisions> {
  const systemPrompt = `Je bent een expert in het analyseren van vergadertranscripties en het identificeren van besluiten, afspraken en conclusies.

Analyseer de gegeven tekst en extraheer alle besluiten, afspraken, akkoorden en conclusies die worden genoemd.

Voor elk besluit:
- title: Korte, duidelijke titel van het besluit
- description: Wat er precies is besloten
- context: Waarom dit besluit is genomen (achtergrond/motivatie)
- madeBy: De naam van de persoon die het besluit heeft genomen (als identificeerbaar), anders null

Reageer ALTIJD in het Nederlands.
Geef je antwoord in het volgende JSON formaat:
{
  "decisions": [
    {
      "title": "Korte titel",
      "description": "Wat is besloten",
      "context": "Waarom dit besluit is genomen",
      "madeBy": "Naam of null"
    }
  ]
}

Als er geen besluiten gevonden worden, geef dan een lege array terug.`

  const userPrompt = `${context?.projectName ? `Project: ${context.projectName}\n\n` : ''}Extraheer alle besluiten en afspraken uit de volgende tekst:

${text}`

  const { text: responseText } = await streamMessage({
    system: systemPrompt,
    userPrompt,
    max_tokens: 4096,
    label: 'extractDecisions',
  })

  return parseAIJsonResponse<ExtractedDecisions>(responseText)
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

  const { text: responseText } = await streamMessage({
    system: systemPrompt,
    userPrompt,
    max_tokens: 4096,
    label: 'generateReport',
  })

  return parseAIJsonResponse<GeneratedReport>(responseText)
}
