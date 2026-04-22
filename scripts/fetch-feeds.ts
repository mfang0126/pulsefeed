import { fetchAllActiveFeeds } from '../src/lib/rss-fetcher'
import { summarizeUnprocessedArticles } from '../src/lib/summarizer'

async function main() {
  console.log('🔄 Starting feed fetch...')
  const results = await fetchAllActiveFeeds()

  const totalNew = results.reduce((sum, r) => sum + r.newArticles, 0)
  const errors = results.filter((r) => r.error)

  console.log(`\n📊 Results:`)
  console.log(`   Feeds fetched: ${results.length}`)
  console.log(`   New articles: ${totalNew}`)
  console.log(`   Errors: ${errors.length}`)

  if (errors.length > 0) {
    console.log(`\n⚠️  Errors:`)
    errors.forEach((r) => console.log(`   - ${r.feedId}: ${r.error}`))
  }

  // Summarize if AI configured
  if (process.env.OPENAI_API_KEY) {
    console.log('\n🤖 Summarizing articles...')
    const count = await summarizeUnprocessedArticles(30)
    console.log(`   Summarized: ${count} articles`)
  }

  console.log('\n✅ Done!')
}

main().catch(console.error)
