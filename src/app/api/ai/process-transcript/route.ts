import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { processTranscript, generateStatusUpdate, extractActionItems, extractDecisions, generateReport } from '@/lib/ai'
import { getTranscriptViewer, canViewTranscript } from '@/lib/auth'

interface ProcessOptions {
  extractActionItems?: boolean
  extractDecisions?: boolean
  generateReport?: boolean
}

// POST /api/ai/process-transcript - Process transcript via streaming SSE
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
      include: { project: true },
    })

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcriptie niet gevonden' },
        { status: 404 }
      )
    }

    if (transcript.isPrivate) {
      const viewer = await getTranscriptViewer()
      if (!canViewTranscript(transcript, viewer)) {
        return NextResponse.json(
          { error: 'Transcriptie niet gevonden' },
          { status: 404 }
        )
      }
    }

    if (!transcript.text) {
      return NextResponse.json(
        { error: 'Transcriptie heeft geen tekst om te verwerken' },
        { status: 400 }
      )
    }

    // Check if already processing (allow retry if stuck for >10 minutes)
    if (transcript.aiStatus === 'processing') {
      const staleMinutes = 10
      const msSinceUpdate = Date.now() - new Date(transcript.updatedAt).getTime()
      if (msSinceUpdate < staleMinutes * 60 * 1000) {
        return NextResponse.json(
          { error: 'AI verwerking is al bezig' },
          { status: 409 }
        )
      }
      console.log(`AI processing stuck for ${Math.round(msSinceUpdate / 60000)}m, allowing retry for transcript ${transcript.id}`)
    }

    // Resolve project name — privé-transcripties worden nooit aan een project
    // gekoppeld (dan zouden actiepunten/besluiten in gedeelde projecten lekken)
    let projectName = transcript.project?.name
    const effectiveProjectId = transcript.isPrivate
      ? null
      : (projectId || transcript.projectId)
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

    const text = transcript.text
    const opts = options as ProcessOptions | undefined
    const encoder = new TextEncoder()

    // Return streaming SSE response — keeps Vercel function alive on Hobby plan
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
          } catch {
            // Stream already closed (client disconnected)
          }
        }

        // Heartbeat keeps connection alive during long AI calls
        const heartbeat = setInterval(() => {
          send({ type: 'heartbeat' })
        }, 5000)

        try {
          // Step 1: Process transcript (always)
          send({ type: 'progress', step: 'clean', status: 'processing' })
          const result = await processTranscript(text, { projectName })

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
          if (effectiveProjectId) {
            updateData.projectId = effectiveProjectId
          }

          await prisma.transcript.update({
            where: { id: transcriptId },
            data: updateData,
          })
          send({ type: 'progress', step: 'clean', status: 'completed' })

          // Step 2: Update Stand van Zaken if project linked (always)
          if (effectiveProjectId) {
            try {
              send({ type: 'progress', step: 'status', status: 'processing' })
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
              send({ type: 'progress', step: 'status', status: 'completed' })
            } catch (svzError) {
              console.error('Error updating Stand van Zaken:', svzError)
              send({ type: 'progress', step: 'status', status: 'error' })
            }
          }

          // Use cleaned text for extractions
          const textForExtraction = result.cleanedText || text
          let actionItemCount = 0
          let decisionCount = 0

          // Step 3: Extract action items if requested
          if (opts?.extractActionItems && effectiveProjectId) {
            try {
              send({ type: 'progress', step: 'actions', status: 'processing' })
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
                actionItemCount = aiResult.actionItems.length
                console.log(`${actionItemCount} action items extracted for transcript ${transcriptId}`)
              }
              send({ type: 'progress', step: 'actions', status: 'completed', count: actionItemCount })
            } catch (aiError) {
              console.error('Error extracting action items:', aiError)
              send({ type: 'progress', step: 'actions', status: 'error' })
            }
          }

          // Step 4: Extract decisions if requested
          if (opts?.extractDecisions && effectiveProjectId) {
            try {
              send({ type: 'progress', step: 'decisions', status: 'processing' })
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
                decisionCount = aiResult.decisions.length
                console.log(`${decisionCount} decisions extracted for transcript ${transcriptId}`)
              }
              send({ type: 'progress', step: 'decisions', status: 'completed', count: decisionCount })
            } catch (aiError) {
              console.error('Error extracting decisions:', aiError)
              send({ type: 'progress', step: 'decisions', status: 'error' })
            }
          }

          // Step 5: Generate report if requested
          if (opts?.generateReport && effectiveProjectId) {
            try {
              send({ type: 'progress', step: 'report', status: 'processing' })
              const transcriptData = await prisma.transcript.findUnique({
                where: { id: transcriptId },
                select: { title: true, text: true, cleanedText: true, summary: true },
              })
              const actionItems = await prisma.actionItem.findMany({
                where: { transcriptId, projectId: effectiveProjectId },
                select: { title: true, description: true, status: true, priority: true, assignee: true },
              })

              if (transcriptData) {
                const reportResult = await generateReport(
                  { text: transcriptData.text || text, cleanedText: transcriptData.cleanedText, summary: transcriptData.summary, title: transcriptData.title },
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
              send({ type: 'progress', step: 'report', status: 'completed' })
            } catch (reportError) {
              console.error('Error generating report:', reportError)
              send({ type: 'progress', step: 'report', status: 'error' })
            }
          }

          console.log(`AI processing completed for transcript ${transcriptId}`)
          send({ type: 'complete', summary: result.summary, actionItemCount, decisionCount })
        } catch (error) {
          console.error('Background AI processing error:', error)
          const message = error instanceof Error ? error.message : 'Onbekende fout'
          send({ type: 'error', message })

          try {
            await prisma.transcript.update({
              where: { id: transcriptId },
              data: {
                aiStatus: 'error',
                aiError: message,
              },
            })
          } catch (dbError) {
            console.error('Failed to update transcript error status:', dbError)
          }
        } finally {
          clearInterval(heartbeat)
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Error starting AI processing:', error)
    return NextResponse.json(
      { error: 'Kon AI verwerking niet starten' },
      { status: 500 }
    )
  }
}
