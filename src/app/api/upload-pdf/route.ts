import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { extractText } from 'unpdf'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const title = formData.get('title') as string | null
    const projectId = formData.get('projectId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'Geen bestand gevonden' }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Alleen PDF bestanden toegestaan' }, { status: 400 })
    }

    // Read PDF file
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Parse PDF with unpdf
    const { text: textArray } = await extractText(buffer)
    const text = textArray.join('\n')

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Kon geen tekst uit PDF halen. Is het een gescand document?' },
        { status: 400 }
      )
    }

    // Create transcript record
    const transcript = await prisma.transcript.create({
      data: {
        filename: file.name,
        title: title?.trim() || null,
        status: 'completed',
        text: text.trim(),
        language: 'nl', // Assume Dutch
        projectId: projectId || null,
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(transcript, { status: 201 })
  } catch (error) {
    console.error('Error processing PDF:', error)
    return NextResponse.json(
      { error: 'Fout bij verwerken van PDF' },
      { status: 500 }
    )
  }
}
