import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { processTranscript, generateStatusUpdate, extractActionItems, extractDecisions, generateReport } from '@/lib/ai'

interface ProcessOptions {
  extractActionItems?: boolean
  extractDecisions?: boolean
  generateReport?: boolean
}

// Background processing function - runs after response is sent
async function processInBackground(
  transcriptId: string,
  projectId: string | null,
  text: string,
  projectName?: string,
  options?: ProcessOptions
) {
  try {
    // 1. Process with AI (always)
    const result = await processTranscript(text, {
      projectName: projectName,
    })

    // Update transcript with cleaned text and summary
    const updateData: {
      cleanedText: string
      summary: string
      aiStatus: string
      projectId?: string
    } = {
      cleanedText: result.cleanedText,
      summary: result.summary,
      aiStatus: 'completed',
    }

    // Link to project if provided
    if (projectId) {
      updateData.projectId = projectId
    }

    await prisma.transcript.update({
      where: { id: transcriptId },
      data: updateData,
    })

    // 2. Update Stand van Zaken if transcript belongs to a project (always)
    const effectiveProjectId = projectId
    if (effectiveProjectId) {
      try {
        const project = await prisma.project.findUnique({
          where: { id: effectiveProjectId },
          select: { statusSummary: true, name: true },
        })

        if (project) {
          const svzResult = await generateStatusUpdate(
            project.statusSummary,
            result.summary || result.cleanedText,
            projectName || project.name
          )

          await prisma.project.update({
            where: { id: effectiveProjectId },
            data: {
              statusSummary: svzResult.statusSummary,
              statusUpdatedAt: new Date(),
            },
          })

          console.log(`Stand van Zaken updated for project ${effectiveProjectId}`)
        }
      } catch (svzError) {
        console.error('Error updating Stand van Zaken:', svzError)
      }
    }

    // Use cleaned text for extractions
    const textForExtraction = result.cleanedText || text

    // 3. Extract action items if requested
    if (options?.extractActionItems && effectiveProjectId) {
      try {
        const aiResult = await extractActionItems(textForExtraction, { projectName })
        if (aiResult.actionItems && aiResult.actionItems.length > 0) {
          await prisma.actionItem.createMany({
            data: aiResult.actionItems.map(item => ({
              title: item.title,
              description: item.description || null,
              priority: item.priority || 'medium',
              assignee: item.assignee || null,
              sourceType: 'ai',
              projectId: effectiveProjectId,
              transcriptId: transcriptId,
            })),
          })
          console.log(`${aiResult.actionItems.length} action items extracted for transcript ${transcriptId}`)
        }
      } catch (aiError) {
        console.error('Error extracting action items:', aiError)
      }
    }

    // 4. Extract decisions if requested
    if (options?.extractDecisions && effectiveProjectId) {
      try {
        const aiResult = await extractDecisions(textForExtraction, { projectName })
        if (aiResult.decisions && aiResult.decisions.length > 0) {
          await prisma.decision.createMany({
            data: aiResult.decisions.map(item => ({
              title: item.title,
              description: item.description || null,
              context: item.context || null,
              madeBy: item.madeBy || null,
              sourceType: 'ai',
              projectId: effectiveProjectId,
              transcriptId: transcriptId,
            })),
          })
          console.log(`${aiResult.decisions.length} decisions extracted for transcript ${transcriptId}`)
        }
      } catch (aiError) {
        console.error('Error extracting decisions:', aiError)
      }
    }

    // 5. Generate report if requested
    if (options?.generateReport && effectiveProjectId) {
      try {
        const transcript = await prisma.transcript.findUnique({
          where: { id: transcriptId },
          select: { title: true, text: true, cleanedText: true, summary: true },
        })
        const actionItems = await prisma.actionItem.findMany({
          where: { transcriptId, projectId: effectiveProjectId },
          select: { title: true, description: true, status: true, priority: true, assignee: true },
        })

        if (transcript) {
          const reportResult = await generateReport(
            { text: transcript.text || text, cleanedText: transcript.cleanedText, summary: transcript.summary, title: transcript.title },
            actionItems,
            'meeting'
          )

          await prisma.report.create({
            data: {
              title: reportResult.title,
              content: reportResult.content,
              type: 'meeting',
              projectId: effectiveProjectId,
              transcriptId: transcriptId,
            },
          })
          console.log(`Report generated for transcript ${transcriptId}`)
        }
      } catch (reportError) {
        console.error('Error generating report:', reportError)
      }
    }

    console.log(`AI processing completed for transcript ${transcriptId}`)
  } catch (error) {
    console.error('Background AI processing error:', error)
    // Update transcript with error status
    await prisma.transcript.update({
      where: { id: transcriptId },
      data: {
        aiStatus: 'error',
        aiError: error instanceof Error ? error.message : 'Onbekende fout',
      },
    })
  }
}

// POST /api/ai/process-transcript - Start AI processing in background
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { transcriptId, projectId, options } = body

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

    // Check if already processing
    if (transcript.aiStatus === 'processing') {
      return NextResponse.json(
        { error: 'AI verwerking is al bezig' },
        { status: 409 }
      )
    }

    // Resolve project name - if a new projectId is provided, look it up
    let projectName = transcript.project?.name
    const effectiveProjectId = projectId || transcript.projectId
    if (projectId && !transcript.project) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { name: true },
      })
      projectName = project?.name ?? undefined
    }

    // Set status to processing immediately
    await prisma.transcript.update({
      where: { id: transcriptId },
      data: {
        aiStatus: 'processing',
        aiError: null,
        projectId: effectiveProjectId,
      },
    })

    // Start background processing (fire and forget)
    processInBackground(
      transcriptId,
      effectiveProjectId,
      transcript.text,
      projectName,
      options as ProcessOptions | undefined
    )

    // Return immediately
    return NextResponse.json({
      message: 'AI verwerking gestart',
      status: 'processing',
    })
  } catch (error) {
    console.error('Error starting AI processing:', error)
    return NextResponse.json(
      { error: 'Kon AI verwerking niet starten' },
      { status: 500 }
    )
  }
}
