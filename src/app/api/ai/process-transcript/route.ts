import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { processTranscript } from '@/lib/ai'

// POST /api/ai/process-transcript - Process transcript with AI
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { transcriptId, projectId } = body

    if (!transcriptId) {
      return NextResponse.json(
        { error: 'Transcript ID is verplicht' },
        { status: 400 }
      )
    }

    // Get transcript
    const transcript = await prisma.transcript.findUnique({
      where: { id: transcriptId },
      include: {
        project: true,
      },
    })

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcriptie niet gevonden' },
        { status: 404 }
      )
    }

    if (!transcript.text) {
      return NextResponse.json(
        { error: 'Transcriptie heeft geen tekst om te verwerken' },
        { status: 400 }
      )
    }

    // Process with AI
    const result = await processTranscript(transcript.text, {
      projectName: transcript.project?.name,
    })

    // Update transcript with cleaned text and summary
    const updateData: {
      cleanedText: string
      summary: string
      projectId?: string
    } = {
      cleanedText: result.cleanedText,
      summary: result.summary,
    }

    // Link to project if provided
    if (projectId) {
      updateData.projectId = projectId
    }

    const updatedTranscript = await prisma.transcript.update({
      where: { id: transcriptId },
      data: updateData,
    })

    // Create action items
    const effectiveProjectId = projectId || transcript.projectId
    let createdActionItems: { id: string; title: string; description: string | null; priority: string; status: string; assignee: string | null }[] = []

    if (effectiveProjectId && result.actionItems.length > 0) {
      createdActionItems = await Promise.all(
        result.actionItems.map((item) =>
          prisma.actionItem.create({
            data: {
              title: item.title,
              description: item.description || null,
              priority: item.priority,
              assignee: item.assignee || null,
              sourceType: 'ai_extracted',
              projectId: effectiveProjectId,
              transcriptId: transcriptId,
            },
          })
        )
      )
    }

    return NextResponse.json({
      transcript: updatedTranscript,
      actionItems: createdActionItems,
      summary: result.summary,
    })
  } catch (error) {
    console.error('Error processing transcript with AI:', error)
    return NextResponse.json(
      { error: 'AI verwerking mislukt' },
      { status: 500 }
    )
  }
}
