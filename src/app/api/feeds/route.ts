import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const feeds = await prisma.feed.findMany({
    where: { isActive: true },
    include: {
      _count: { select: { articles: true } },
    },
    orderBy: { title: 'asc' },
  })

  return NextResponse.json({ feeds })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = (session.user as any).role
  if (role !== 'admin' && role !== 'editor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { url, title, category, fetchFrequency } = body

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 })
  }

  try {
    const feed = await prisma.feed.create({
      data: {
        url,
        title: title || url,
        category: category || 'general',
        fetchFrequency: fetchFrequency || 30,
      },
    })
    return NextResponse.json({ feed }, { status: 201 })
  } catch (e: any) {
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'Feed URL already exists' }, { status: 409 })
    }
    throw e
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = (session.user as any).role
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const feedId = searchParams.get('id')

  if (!feedId) {
    return NextResponse.json({ error: 'Feed ID required' }, { status: 400 })
  }

  await prisma.feed.delete({ where: { id: feedId } })
  return NextResponse.json({ ok: true })
}
