import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/projects/[id]/dashboard - Get project dashboard stats
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
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
    ] = await Promise.all([
      prisma.transcript.count({ where: { projectId: id } }),
      prisma.report.count({ where: { projectId: id } }),
      prisma.actionItem.count({ where: { projectId: id, status: 'open' } }),
      prisma.actionItem.count({ where: { projectId: id, status: 'in_progress' } }),
      prisma.actionItem.count({ where: { projectId: id, status: 'done' } }),
    ])

    // Get recent activity
    const [recentTranscripts, recentReports, recentActionItems] = await Promise.all([
      prisma.transcript.findMany({
        where: { projectId: id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          filename: true,
          status: true,
          duration: true,
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
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        take: 10,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          assignee: true,
          dueDate: true,
          createdAt: true,
        },
      }),
    ])

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
      },
      recent: {
        transcripts: recentTranscripts,
        reports: recentReports,
        actionItems: recentActionItems,
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
