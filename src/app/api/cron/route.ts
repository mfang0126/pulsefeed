import { NextRequest, NextResponse } from 'next/server'
import { fetchAllActiveFeeds } from '@/lib/rss-fetcher'
import { summarizeUnprocessedArticles } from '@/lib/summarizer'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // Allow triggering via Vercel Cron or manual secret
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Also check if it's a Vercel cron invocation
    const vercelCron = request.headers.get('x-vercel-cron')
    if (!vercelCron) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  console.log('[CRON] Starting feed fetch...')
  const fetchResults = await fetchAllActiveFeeds()
  const totalNew = fetchResults.reduce((sum, r) => sum + r.newArticles, 0)
  const errors = fetchResults.filter((r) => r.error)

  console.log(`[CRON] Fetched ${fetchResults.length} feeds, ${totalNew} new articles, ${errors.length} errors`)

  // Summarize new articles if AI is configured
  let summarized = 0
  if (process.env.OPENAI_API_KEY) {
    console.log('[CRON] Summarizing articles...')
    summarized = await summarizeUnprocessedArticles(20)
    console.log(`[CRON] Summarized ${summarized} articles`)
  }

  return NextResponse.json({
    success: true,
    feeds: fetchResults.length,
    newArticles: totalNew,
    errors: errors.length,
    summarized,
  })
}

// GET for health check
export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() })
}
