import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

  // Middleware: automatische retry bij connectiefouten (Neon wake-up / pooler drops)
  client.$use(async (params, next) => {
    const MAX_RETRIES = 3
    const RETRY_DELAYS = [500, 1500, 3000] // exponential backoff in ms

    let lastError: unknown
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await next(params)
      } catch (error: unknown) {
        lastError = error
        const isConnectionError = isRetryableError(error)

        if (!isConnectionError || attempt === MAX_RETRIES) {
          throw error
        }

        const delay = RETRY_DELAYS[attempt] ?? 3000
        console.warn(
          `[Prisma] Connection error on ${params.model}.${params.action} (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${delay}ms...`,
          error instanceof Error ? error.message : error
        )
        await sleep(delay)
      }
    }
    throw lastError
  })

  return client
}

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const msg = error.message.toLowerCase()

  // Neon / PgBouncer / network errors
  return (
    msg.includes("can't reach database server") ||
    msg.includes('connection refused') ||
    msg.includes('connection reset') ||
    msg.includes('connection terminated') ||
    msg.includes('connection timed out') ||
    msg.includes('econnreset') ||
    msg.includes('econnrefused') ||
    msg.includes('etimedout') ||
    msg.includes('epipe') ||
    msg.includes('socket hang up') ||
    msg.includes('prepared statement') || // PgBouncer prepared statement conflict
    msg.includes('server closed the connection unexpectedly') ||
    msg.includes('ssl connection has been closed unexpectedly')
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
