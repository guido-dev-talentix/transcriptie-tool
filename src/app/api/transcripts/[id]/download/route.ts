import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

function generateObsidianMarkdown(transcript: {
  title: string | null
  filename: string
  duration: number | null
  language: string | null
  createdAt: Date
  summary: string | null
  cleanedText: string | null
  text: string | null
  project: { name: string } | null
  actionItems: { title: string; description: string | null; priority: string; assignee: string | null; status: string }[]
  decisions: { title: string; description: string | null; context: string | null; madeBy: string | null; status: string }[]
}): string {
  const title = transcript.title || transcript.filename.replace(/\.[^/.]+$/, '')
  const date = transcript.createdAt.toISOString().split('T')[0]

  // Build tags
  const tags: string[] = ['transcriptie', 'meeting']
  if (transcript.project) {
    tags.push(transcript.project.name.toLowerCase().replace(/\s+/g, '-'))
  }
  if (transcript.actionItems.length > 0) tags.push('actiepunten')
  if (transcript.decisions.length > 0) tags.push('besluiten')

  // Build topics
  const topics: string[] = []
  if (transcript.project) topics.push(transcript.project.name)

  // Duration formatting
  const duration = transcript.duration
    ? `${Math.floor(transcript.duration / 60)}:${(transcript.duration % 60).toString().padStart(2, '0')}`
    : null

  // Frontmatter
  const lines: string[] = [
    '---',
    `tags: [${tags.map(t => `"${t}"`).join(', ')}]`,
    `date: ${date}`,
    `type: transcriptie`,
    `importance: medium`,
  ]
  if (transcript.project) {
    lines.push(`project: "${transcript.project.name}"`)
  }
  if (duration) {
    lines.push(`duration: "${duration}"`)
  }
  if (transcript.language) {
    lines.push(`language: "${transcript.language}"`)
  }
  lines.push(`topics: [${topics.map(t => `"${t}"`).join(', ')}]`)
  lines.push('---')
  lines.push('')

  // Title
  lines.push(`# ${title}`)
  lines.push('')
  if (transcript.project) {
    lines.push(`**Project:** [[${transcript.project.name}]] | **Datum:** ${date}${duration ? ` | **Duur:** ${duration}` : ''}`)
  } else {
    lines.push(`**Datum:** ${date}${duration ? ` | **Duur:** ${duration}` : ''}`)
  }
  lines.push('')

  // Samenvatting
  if (transcript.summary) {
    lines.push('## Samenvatting')
    lines.push('')
    lines.push(transcript.summary)
    lines.push('')
  }

  // Actiepunten
  if (transcript.actionItems.length > 0) {
    lines.push('## Actiepunten')
    lines.push('')
    for (const item of transcript.actionItems) {
      const checkbox = item.status === 'done' ? '[x]' : '[ ]'
      const priority = item.priority === 'high' ? ' 🔴' : item.priority === 'low' ? ' 🔵' : ''
      const assignee = item.assignee ? ` → ${item.assignee}` : ''
      lines.push(`- ${checkbox} **${item.title}**${priority}${assignee}`)
      if (item.description) {
        lines.push(`  ${item.description}`)
      }
    }
    lines.push('')
  }

  // Besluiten
  if (transcript.decisions.length > 0) {
    lines.push('## Besluiten')
    lines.push('')
    for (const decision of transcript.decisions) {
      lines.push(`- **${decision.title}**`)
      if (decision.description) {
        lines.push(`  ${decision.description}`)
      }
      if (decision.context) {
        lines.push(`  *Context: ${decision.context}*`)
      }
      if (decision.madeBy) {
        lines.push(`  Besloten door: ${decision.madeBy}`)
      }
    }
    lines.push('')
  }

  // Opgeschoonde tekst
  const textContent = transcript.cleanedText || transcript.text
  if (textContent) {
    lines.push('## Transcript')
    lines.push('')
    lines.push(textContent)
    lines.push('')
  }

  // Onderwerpen
  if (topics.length > 0) {
    lines.push('## Onderwerpen')
    lines.push('')
    for (const topic of topics) {
      lines.push(`- [[${topic}]]`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'txt'
    const { id } = await params

    if (format === 'obsidian') {
      const transcript = await prisma.transcript.findUnique({
        where: { id },
        include: {
          project: true,
          actionItems: true,
          decisions: true,
        },
      })

      if (!transcript) {
        return NextResponse.json({ error: 'Transcript not found' }, { status: 404 })
      }
      if (transcript.status !== 'completed') {
        return NextResponse.json({ error: 'Transcript not yet completed' }, { status: 400 })
      }

      const safeTitle = (transcript.title || transcript.filename.replace(/\.[^/.]+$/, '')).replace(/[/\\:*?"<>|]/g, '-')
      const markdown = generateObsidianMarkdown(transcript)

      return new NextResponse(markdown, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="${safeTitle}.md"`,
        },
      })
    }

    const transcript = await prisma.transcript.findUnique({ where: { id } })

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 })
    }

    if (transcript.status !== 'completed') {
      return NextResponse.json(
        { error: 'Transcript not yet completed' },
        { status: 400 }
      )
    }

    const baseFilename = transcript.filename.replace(/\.[^/.]+$/, '')

    if (format === 'srt') {
      if (!transcript.srt) {
        return NextResponse.json(
          { error: 'SRT not available' },
          { status: 404 }
        )
      }

      return new NextResponse(transcript.srt, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="${baseFilename}.srt"`,
        },
      })
    }

    // Default: txt format
    if (!transcript.text) {
      return NextResponse.json(
        { error: 'Transcript text not available' },
        { status: 404 }
      )
    }

    return new NextResponse(transcript.text, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${baseFilename}.txt"`,
      },
    })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: 'Download failed' },
      { status: 500 }
    )
  }
}
