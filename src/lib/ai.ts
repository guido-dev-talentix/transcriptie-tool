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
  const systemPrompt = `Je bent een AI-assistent die transcripties verwerkt voor een software development team bij Talentix.
Je taak is om:
1. De ruwe transcriptie op te schonen (verwijder "uhm", "eh", herhaling, en verbeter de leesbaarheid)
2. Een beknopte samenvatting te maken (max 3-4 zinnen)
3. Actiepunten te extraheren uit de tekst

Reageer ALTIJD in het Nederlands.
Geef je antwoord in het volgende JSON formaat:
{
  "cleanedText": "De opgeschoonde versie van de transcriptie...",
  "summary": "Een beknopte samenvatting van wat besproken is...",
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
