import { prisma } from './prisma'

interface SummarizeResult {
  summary: string
  sentiment: string
  tags: string[]
  importance: number
}

// Uses OpenAI-compatible API (configurable endpoint)
export async function summarizeArticle(
  title: string,
  content: string
): Promise<SummarizeResult> {
  const apiKey = process.env.OPENAI_API_KEY
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

  if (!apiKey) {
    return {
      summary: 'AI summarization not configured',
      sentiment: 'neutral',
      tags: [],
      importance: 50,
    }
  }

  const prompt = `Analyze this article and return a JSON object with these fields:
- summary: A concise 2-3 sentence TLDR summary
- sentiment: "positive", "negative", or "neutral"
- tags: Array of 3-5 relevant topic tags (lowercase)
- importance: Score 0-100 for news importance (100 = breaking news, 0 = filler)

Article Title: ${title}
Article Content: ${content.slice(0, 3000)}

Return ONLY valid JSON, no other text.`

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
      }),
    })

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || '{}'
    
    // Clean up markdown code blocks if present
    const cleaned = text.replace(/```json\n?/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return {
      summary: parsed.summary || '',
      sentiment: parsed.sentiment || 'neutral',
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      importance: Math.min(100, Math.max(0, parsed.importance || 50)),
    }
  } catch (error) {
    console.error('Summarization failed:', error)
    return {
      summary: '',
      sentiment: 'neutral',
      tags: [],
      importance: 50,
    }
  }
}

// Batch summarize unprocessed articles
export async function summarizeUnprocessedArticles(limit = 20): Promise<number> {
  const articles = await prisma.article.findMany({
    where: { summary: null },
    orderBy: { publishedAt: 'desc' },
    take: limit,
  })

  let count = 0
  for (const article of articles) {
    const content = article.contentText || article.contentHtml || ''
    if (content.length < 50) continue

    const result = await summarizeArticle(article.title, content)

    await prisma.article.update({
      where: { id: article.id },
      data: {
        summary: result.summary,
        sentiment: result.sentiment,
        tags: JSON.stringify(result.tags),
        importance: result.importance,
      },
    })

    count++
    // Rate limiting
    await new Promise((r) => setTimeout(r, 1000))
  }

  return count
}
