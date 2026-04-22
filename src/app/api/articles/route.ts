import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const feedId = searchParams.get('feedId')
  const category = searchParams.get('category')
  const search = searchParams.get('search')
  const sentiment = searchParams.get('sentiment')
  const bookmarked = searchParams.get('bookmarked')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '30')
  const minImportance = parseInt(searchParams.get('minImportance') || '0')
  const userId = (session.user as any).id

  const where: any = {}

  if (feedId) where.feedId = feedId
  if (category) {
    where.feed = { category }
  }
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { contentText: { contains: search } },
      { summary: { contains: search } },
    ]
  }
  if (sentiment) where.sentiment = sentiment
  if (minImportance > 0) where.importance = { gte: minImportance }

  // Filter out hidden articles
  where.NOT = {
    readStatuses: {
      some: { userId, isHidden: true },
    },
  }

  if (bookmarked === 'true') {
    where.readStatuses = {
      some: { userId, isBookmarked: true },
    }
  }

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      include: {
        feed: {
          select: { id: true, title: true, faviconUrl: true, category: true },
        },
        readStatuses: {
          where: { userId },
          select: { readAt: true, isBookmarked: true },
        },
      },
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.article.count({ where }),
  ])

  const enriched = articles.map((a) => ({
    ...a,
    tags: a.tags ? JSON.parse(a.tags) : [],
    isRead: a.readStatuses.length > 0,
    isBookmarked: a.readStatuses.some((r) => r.isBookmarked),
    readStatuses: undefined,
  }))

  return NextResponse.json({
    articles: enriched,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any).id
  const body = await request.json()
  const { articleId, action } = body

  if (action === 'read') {
    await prisma.articleRead.upsert({
      where: { userId_articleId: { userId, articleId } },
      update: { readAt: new Date() },
      create: { userId, articleId },
    })
  } else if (action === 'bookmark') {
    const existing = await prisma.articleRead.findUnique({
      where: { userId_articleId: { userId, articleId } },
    })
    await prisma.articleRead.upsert({
      where: { userId_articleId: { userId, articleId } },
      update: { isBookmarked: !existing?.isBookmarked },
      create: { userId, articleId, isBookmarked: true },
    })
  } else if (action === 'hide') {
    await prisma.articleRead.upsert({
      where: { userId_articleId: { userId, articleId } },
      update: { isHidden: true },
      create: { userId, articleId, isHidden: true },
    })
  }

  return NextResponse.json({ ok: true })
}
