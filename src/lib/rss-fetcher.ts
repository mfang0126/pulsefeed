import Parser from 'rss-parser'
import { prisma } from './prisma'

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'PulseFeed/1.0 (+https://pulsefeed.app)',
  },
})

export interface FetchResult {
  feedId: string
  newArticles: number
  error?: string
}

export async function fetchFeed(feedId: string): Promise<FetchResult> {
  const feed = await prisma.feed.findUnique({ where: { id: feedId } })
  if (!feed) return { feedId, newArticles: 0, error: 'Feed not found' }

  const job = await prisma.fetchJob.create({
    data: { feedId, status: 'running', startedAt: new Date() },
  })

  try {
    const parsed = await parser.parseURL(feed.url)
    let newCount = 0

    // Update feed metadata
    await prisma.feed.update({
      where: { id: feedId },
      data: {
        title: parsed.title || feed.title,
        siteUrl: parsed.link || feed.siteUrl,
        description: parsed.description || feed.description,
        lastFetchedAt: new Date(),
        lastError: null,
        errorCount: 0,
      },
    })

    // Process articles
    for (const item of (parsed.items || []).slice(0, 50)) {
      if (!item.guid && !item.link) continue

      const guid = item.guid || item.link!
      const publishedAt = item.pubDate ? new Date(item.pubDate) : new Date()

      // Extract image from content or enclosures
      let imageUrl: string | undefined
      if (item.enclosure?.url && item.enclosure.type?.startsWith('image')) {
        imageUrl = item.enclosure.url
      } else if (item['media:content']?.['$']?.url) {
        imageUrl = item['media:content']['$'].url
      } else {
        // Try to extract from HTML content
        const imgMatch = (item['content:encoded'] || item.content || '').match(
          /<img[^>]+src=["']([^"']+)["']/
        )
        if (imgMatch) imageUrl = imgMatch[1]
      }

      try {
        await prisma.article.upsert({
          where: { feedId_guid: { feedId, guid } },
          update: {
            title: item.title || 'Untitled',
            url: item.link || guid,
            author: item.creator || item.author || undefined,
            contentHtml: item['content:encoded'] || item.content || undefined,
            contentText: item.contentSnippet || undefined,
            imageUrl: imageUrl,
          },
          create: {
            feedId,
            guid,
            title: item.title || 'Untitled',
            url: item.link || guid,
            author: item.creator || item.author || undefined,
            publishedAt,
            contentHtml: item['content:encoded'] || item.content || undefined,
            contentText: item.contentSnippet || undefined,
            imageUrl: imageUrl,
          },
        })
        newCount++
      } catch (e) {
        // Skip duplicates silently
      }
    }

    await prisma.fetchJob.update({
      where: { id: job.id },
      data: { status: 'success', endedAt: new Date(), articlesNew: newCount },
    })

    return { feedId, newArticles: newCount }
  } catch (error: any) {
    const errorMsg = error.message || 'Unknown error'

    await prisma.feed.update({
      where: { id: feedId },
      data: {
        lastError: errorMsg,
        errorCount: { increment: 1 },
        lastFetchedAt: new Date(),
      },
    })

    await prisma.fetchJob.update({
      where: { id: job.id },
      data: { status: 'error', endedAt: new Date(), error: errorMsg },
    })

    return { feedId, newArticles: 0, error: errorMsg }
  }
}

export async function fetchAllActiveFeeds(): Promise<FetchResult[]> {
  const feeds = await prisma.feed.findMany({
    where: { isActive: true },
  })

  const results: FetchResult[] = []
  // Fetch in batches of 5 to avoid overwhelming sources
  for (let i = 0; i < feeds.length; i += 5) {
    const batch = feeds.slice(i, i + 5)
    const batchResults = await Promise.all(batch.map((f) => fetchFeed(f.id)))
    results.push(...batchResults)

    if (i + 5 < feeds.length) {
      await new Promise((r) => setTimeout(r, 2000)) // 2s delay between batches
    }
  }

  return results
}
