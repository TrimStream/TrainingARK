import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

const MIN_PASSWORD_LENGTH = 8
const BCRYPT_ROUNDS = 12

// One message for every "your current password didn't check out" case —
// including a missing user row or a user with no passwordHash at all. This is
// an authenticated route so those shouldn't happen, but they must not be
// distinguishable from a plain wrong password.
const CURRENT_PASSWORD_ERROR = 'Current password is incorrect.'

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const body = await req.json()
    const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : ''
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    })
    if (!user?.passwordHash) {
      return NextResponse.json({ error: CURRENT_PASSWORD_ERROR }, { status: 400 })
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: CURRENT_PASSWORD_ERROR }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Failed to change password:', err)
    return NextResponse.json({ error: 'Could not change your password.' }, { status: 500 })
  }
}
