import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const destinations = await prisma.savedDestination.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(destinations)
  } catch (error) {
    console.error('Failed to fetch saved destinations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch saved destinations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { label, type, address } = await request.json()

    if (!label || !type || !address) {
      return NextResponse.json(
        { error: 'Missing required fields: label, type, and address' },
        { status: 400 }
      )
    }

    if (type !== 'slack' && type !== 'gmail') {
      return NextResponse.json(
        { error: 'Type must be "slack" or "gmail"' },
        { status: 400 }
      )
    }

    const destination = await prisma.savedDestination.create({
      data: {
        label,
        type,
        address,
      },
    })

    return NextResponse.json(destination)
  } catch (error) {
    console.error('Failed to create saved destination:', error)
    return NextResponse.json(
      { error: 'Failed to create saved destination' },
      { status: 500 }
    )
  }
}
