export interface Destination {
  type: 'slack' | 'gmail'
  address: string
}

export async function notifyN8N(data: {
  transcriptId: string
  filename: string
  status: string
  title?: string
  text?: string
  duration?: number
  destination?: Destination
}) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL

  if (!webhookUrl) {
    console.log('N8N webhook URL not configured, skipping notification')
    return
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: 'transcription_complete',
        timestamp: new Date().toISOString(),
        ...data,
      }),
    })

    if (!response.ok) {
      console.error('N8N webhook failed:', response.status, await response.text())
    } else {
      console.log('N8N webhook notification sent successfully')
    }
  } catch (error) {
    console.error('Failed to send N8N webhook:', error)
  }
}
