import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8
const BCRYPT_ROUNDS = 12

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
        { status: 400 }
      )
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'An account with that email already exists.' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
    const user = await prisma.user.create({
      data: {
        email,
        name: email.split('@')[0],
        passwordHash,
      },
      select: { id: true },
    })

    return NextResponse.json({ id: user.id }, { status: 201 })
  } catch (err) {
    console.error('Failed to register user:', err)
    return NextResponse.json({ error: 'Could not create account.' }, { status: 500 })
  }
}
