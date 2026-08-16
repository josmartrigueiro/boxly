import { config } from 'dotenv'
import { eq } from 'drizzle-orm'

config({ path: ['.env.local', '.env'] })

const { auth } = await import('#/lib/auth')
const { db } = await import('#/db')
const schema = await import('#/db/schema')

async function main() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  const name = process.env.ADMIN_NAME || 'Admin'

  if (!email || !password) {
    console.error(
      'Set ADMIN_EMAIL and ADMIN_PASSWORD env vars before running this script.',
    )
    process.exit(1)
  }

  const existing = await db.query.user.findFirst({
    where: eq(schema.user.email, email),
  })

  if (existing) {
    await db
      .update(schema.user)
      .set({ role: 'admin' })
      .where(eq(schema.user.email, email))
    console.log(`User ${email} already existed — promoted to admin.`)
    return
  }

  const result = await auth.api.signUpEmail({
    body: { email, password, name },
  })

  await db
    .update(schema.user)
    .set({ role: 'admin' })
    .where(eq(schema.user.id, result.user.id))

  console.log(`Admin user created: ${email}`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
