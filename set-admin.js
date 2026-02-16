
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const email = process.argv[2]
    if (!email) {
        console.error('Please provide an email address as an argument.')
        process.exit(1)
    }

    try {
        const user = await prisma.user.upsert({
            where: { email },
            update: { role: 'ADMIN', approved: true },
            create: {
                id: 'manual-' + Math.random().toString(36).substr(2, 9),
                email,
                role: 'ADMIN',
                approved: true
            }
        })
        console.log(`User ${email} is now an ADMIN and approved!`)
    } catch (error) {
        console.error('Error updating user:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
