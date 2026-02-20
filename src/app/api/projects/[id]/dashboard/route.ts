import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sortActionItems, sortDecisions } from '@/lib/sorting'
import { checkProjectAccess } from '@/lib/auth'

// GET /api/projects/[id]/dashboard - Get project dashboard stats
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const access = await checkProjectAccess(id)
    if (access instanceof NextResponse) return access

    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        statusSummary: true,
        statusUpdatedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project niet gevonden' },
        { status: 404 }
      )
    }

    // Get counts
    const [
      totalTranscripts,
      totalReports,
      openActionItems,
      inProgressActionItems,
      doneActionItems,
      activeDecisions,
      supersededDecisions,
      revokedDecisions,
    ] = await Promise.all([
      prisma.transcript.count({ where: { projectId: id } }),
      prisma.report.count({ where: { projectId: id } }),
      prisma.actionItem.count({ where: { projectId: id, status: 'open' } }),
      prisma.actionItem.count({ where: { projectId: id, status: 'in_progress' } }),
      prisma.actionItem.count({ where: { projectId: id, status: 'done' } }),
      prisma.decision.count({ where: { projectId: id, status: 'active' } }),
      prisma.decision.count({ where: { projectId: id, status: 'superseded' } }),
      prisma.decision.count({ where: { projectId: id, status: 'revoked' } }),
    ])

    // Get recent activity
    const [recentTranscripts, recentReports, actionItemsRaw, recentDecisionsRaw] = await Promise.all([
      prisma.transcript.findMany({
        where: { projectId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          filename: true,
          status: true,
          duration: true,
          summary: true,
          createdAt: true,
        },
      }),
      prisma.report.findMany({
        where: { projectId: id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.actionItem.findMany({
        where: { projectId: id, status: { not: 'done' } },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          assignee: true,
          dueDate: true,
          createdAt: true,
          description: true,
        },
      }),
      prisma.decision.findMany({
        where: { projectId: id, status: 'active' },
        select: {
          id: true,
          title: true,
          description: true,
          context: true,
          status: true,
          madeBy: true,
          createdAt: true,
        },
      }),
    ])

    // Sort action items: status (open first), then priority (high to low), then date
    const recentActionItems = sortActionItems(actionItemsRaw).slice(0, 10)

    // Sort decisions: active first, then by date
    const recentDecisions = sortDecisions(recentDecisionsRaw).slice(0, 10)

    return NextResponse.json({
      project,
      stats: {
        totalTranscripts,
        totalReports,
        actionItems: {
          open: openActionItems,
          inProgress: inProgressActionItems,
          done: doneActionItems,
          total: openActionItems + inProgressActionItems + doneActionItems,
        },
        decisions: {
          active: activeDecisions,
          superseded: supersededDecisions,
          revoked: revokedDecisions,
          total: activeDecisions + supersededDecisions + revokedDecisions,
        },
      },
      recent: {
        transcripts: recentTranscripts,
        reports: recentReports,
        actionItems: recentActionItems,
        decisions: recentDecisions,
      },
    })
  } catch (error) {
    console.error('Error fetching project dashboard:', error)
    return NextResponse.json(
      { error: 'Kon dashboard niet ophalen' },
      { status: 500 }
    )
  }
}
