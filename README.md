# Transcriptie Tool

Een Next.js web applicatie voor audio transcriptie met AssemblyAI API.

## Features

- Upload audio bestanden (.m4a, .mp3, .wav, .mp4)
- Real-time status updates tijdens transcriptie
- Transcriptie weergeven in browser
- Download als .txt of .srt (ondertitels)
- Opslaan in database met metadata
- Webhook endpoint voor N8N integratie

## Vereisten

- Node.js 18+
- AssemblyAI API key ([gratis registreren](https://www.assemblyai.com/))

## Installatie

1. Clone de repository en installeer dependencies:

```bash
cd transcriptie-tool
npm install
```

2. Kopieer het environment bestand en vul je API key in:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` en vul je AssemblyAI API key in:

```
ASSEMBLYAI_API_KEY=your_api_key_here
```

3. Initialiseer de database:

```bash
npm run db:push
```

4. Start de development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in je browser.

## Gebruik

1. Ga naar de homepage
2. Sleep een audiobestand naar het upload gebied of klik om te selecteren
3. Wacht tot de transcriptie klaar is (automatische polling)
4. Bekijk, kopieer of download de transcriptie

## API Endpoints

| Endpoint | Methode | Beschrijving |
|----------|---------|--------------|
| `/api/upload` | POST | Upload audio en start transcriptie |
| `/api/webhook` | POST | AssemblyAI callback endpoint |
| `/api/transcripts` | GET | Lijst alle transcripties |
| `/api/transcripts/[id]` | GET | Haal specifieke transcriptie op |
| `/api/transcripts/[id]` | DELETE | Verwijder transcriptie |
| `/api/transcripts/[id]/download` | GET | Download als .txt of .srt |

## Webhook voor N8N

Stel de `N8N_WEBHOOK_URL` environment variable in om notificaties te ontvangen wanneer een transcriptie klaar is.

Voorbeeld payload:
```json
{
  "event": "transcription_complete",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "transcriptId": "clr123...",
  "filename": "interview.m4a",
  "status": "completed",
  "text": "De volledige transcriptie tekst...",
  "duration": 180
}
```

## Deployment naar Vercel

1. Push de code naar GitHub
2. Importeer het project in Vercel
3. Stel de environment variables in:
   - `ASSEMBLYAI_API_KEY`
   - `NEXT_PUBLIC_BASE_URL` (je Vercel URL)
   - `DATABASE_URL` (Vercel Postgres of Supabase URL)
   - `N8N_WEBHOOK_URL` (optioneel)

4. Voor productie database: update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## Lokale webhook testen

Gebruik [ngrok](https://ngrok.com/) om een publieke URL voor je lokale server te krijgen:

```bash
ngrok http 3000
```

Update `NEXT_PUBLIC_BASE_URL` in `.env.local` met de ngrok URL.

## Licentie

MIT
