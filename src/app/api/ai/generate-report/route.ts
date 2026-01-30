import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateReport } from '@/lib/ai'

// POST /api/ai/generate-report - Generate report from transcript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { transcriptId, projectId, type = 'meeting' } = body

    if (!transcriptId) {
      return NextResponse.json(
        { error: 'Transcript ID is verplicht' },
        { status: 400 }
      )
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is verplicht' },
        { status: 400 }
      )
    }

    if (!['meeting', 'weekly', 'summary'].includes(type)) {
      return NextResponse.json(
        { error: 'Ongeldig type verslag' },
        { status: 400 }
      )
    }

    // Get transcript
    const transcript = await prisma.transcript.findUnique({
      where: { id: transcriptId },
    })

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcriptie niet gevonden' },
        { status: 404 }
      )
    }

    if (!transcript.text && !transcript.cleanedText) {
      return NextResponse.json(
        { error: 'Transcriptie heeft geen tekst' },
        { status: 400 }
      )
    }

    // Get related action items
    const actionItems = await prisma.actionItem.findMany({
      where: { transcriptId },
      select: {
        title: true,
        description: true,
        status: true,
        priority: true,
        assignee: true,
      },
    })

    // Generate report with AI
    const result = await generateReport(
      {
        text: transcript.text || '',
        cleanedText: transcript.cleanedText,
        summary: transcript.summary,
        title: transcript.title,
      },
      actionItems,
      type as 'meeting' | 'weekly' | 'summary'
    )

    // Save report to database
    const report = await prisma.report.create({
      data: {
        title: result.title,
        content: result.content,
        type,
        projectId,
        transcriptId,
      },
    })

    // Link action items to report
    if (actionItems.length > 0) {
      await prisma.actionItem.updateMany({
        where: { transcriptId },
        data: { reportId: report.id },
      })
    }

    return NextResponse.json({
      report,
      actionItemsLinked: actionItems.length,
    })
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json(
      { error: 'Verslag genereren mislukt' },
      { status: 500 }
    )
  }
}
