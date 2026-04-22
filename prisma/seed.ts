import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const defaultFeeds = [
  // Tech
  { title: 'Hacker News', url: 'https://hnrss.org/frontpage', siteUrl: 'https://news.ycombinator.com', category: 'tech' },
  { title: 'TechCrunch', url: 'https://techcrunch.com/feed/', siteUrl: 'https://techcrunch.com', category: 'tech' },
  { title: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', siteUrl: 'https://www.theverge.com', category: 'tech' },
  { title: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', siteUrl: 'https://arstechnica.com', category: 'tech' },
  { title: 'Wired', url: 'https://www.wired.com/feed/rss', siteUrl: 'https://www.wired.com', category: 'tech' },
  { title: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', siteUrl: 'https://www.technologyreview.com', category: 'tech' },
  
  // News
  { title: 'BBC News', url: 'https://feeds.bbci.co.uk/news/rss.xml', siteUrl: 'https://bbc.com/news', category: 'news' },
  { title: 'Reuters', url: 'https://www.reutersagency.com/feed/', siteUrl: 'https://reuters.com', category: 'news' },
  { title: 'NPR News', url: 'https://feeds.npr.org/1001/rss.xml', siteUrl: 'https://npr.org', category: 'news' },
  { title: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', siteUrl: 'https://aljazeera.com', category: 'news' },
  
  // Business
  { title: 'Bloomberg', url: 'https://feeds.bloomberg.com/markets/news.rss', siteUrl: 'https://bloomberg.com', category: 'business' },
  { title: 'Financial Times', url: 'https://www.ft.com/rss/home', siteUrl: 'https://ft.com', category: 'business' },
  { title: 'CNBC', url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10001147', siteUrl: 'https://cnbc.com', category: 'business' },
  
  // Science
  { title: 'Nature News', url: 'https://www.nature.com/nature.rss', siteUrl: 'https://nature.com', category: 'science' },
  { title: 'Science Magazine', url: 'https://www.science.org/action/showFeed?type=etoc&feed=rss&jc=science', siteUrl: 'https://science.org', category: 'science' },
  { title: 'New Scientist', url: 'https://www.newscientist.com/feed/home/', siteUrl: 'https://newscientist.com', category: 'science' },
  { title: 'NASA Breaking News', url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss', siteUrl: 'https://nasa.gov', category: 'science' },
  
  // AI/ML (specialty)
  { title: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml', siteUrl: 'https://openai.com/blog', category: 'ai' },
  { title: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss/', siteUrl: 'https://blog.google/technology/ai/', category: 'ai' },
  { title: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml', siteUrl: 'https://huggingface.co/blog', category: 'ai' },
  { title: 'The Batch (Andrew Ng)', url: 'https://www.deeplearning.ai/the-batch/feed/', siteUrl: 'https://www.deeplearning.ai/the-batch/', category: 'ai' },
  { title: 'Towards Data Science', url: 'https://towardsdatascience.com/feed', siteUrl: 'https://towardsdatascience.com', category: 'ai' },
  
  // Entertainment
  { title: 'The Guardian Entertainment', url: 'https://www.theguardian.com/culture/rss', siteUrl: 'https://theguardian.com', category: 'entertainment' },
  { title: 'Variety', url: 'https://variety.com/feed/', siteUrl: 'https://variety.com', category: 'entertainment' },
  
  // Dev/Programming
  { title: 'GitHub Blog', url: 'https://github.blog/feed/', siteUrl: 'https://github.blog', category: 'dev' },
  { title: 'Dev.to', url: 'https://dev.to/feed', siteUrl: 'https://dev.to', category: 'dev' },
  { title: 'CSS-Tricks', url: 'https://css-tricks.com/feed/', siteUrl: 'https://css-tricks.com', category: 'dev' },
  { title: 'Python Weekly', url: 'https://us2.campaign-archive.com/feed?u=e2e180baf855ac797ef407fc7&id=9e26887fc5', siteUrl: 'https://www.pythonweekly.com', category: 'dev' },
  { title: 'Rust Blog', url: 'https://blog.rust-lang.org/feed.xml', siteUrl: 'https://blog.rust-lang.org', category: 'dev' },
]

async function main() {
  console.log('🌱 Seeding PulseFeed database...')

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@pulsefeed.local',
      passwordHash: adminPassword,
      displayName: 'Admin',
      role: 'admin',
      inviteCode: 'pulse2025',
    },
  })
  console.log(`👤 Admin user: admin / admin123`)

  // Create demo reader
  const readerPassword = await bcrypt.hash('reader123', 12)
  const reader = await prisma.user.upsert({
    where: { username: 'reader' },
    update: {},
    create: {
      username: 'reader',
      email: 'reader@pulsefeed.local',
      passwordHash: readerPassword,
      displayName: 'Reader',
      role: 'reader',
      inviteCode: 'pulse2025',
    },
  })
  console.log(`👤 Reader user: reader / reader123`)

  // Insert default feeds
  let feedCount = 0
  for (const feed of defaultFeeds) {
    try {
      await prisma.feed.upsert({
        where: { url: feed.url },
        update: {},
        create: feed,
      })
      feedCount++
    } catch (e) {
      console.warn(`  ⚠ Skipped: ${feed.title}`)
    }
  }
  console.log(`📡 ${feedCount} feeds created`)

  // Subscribe admin to all feeds
  const allFeeds = await prisma.feed.findMany()
  for (const feed of allFeeds) {
    await prisma.feedSubscription.upsert({
      where: { userId_feedId: { userId: admin.id, feedId: feed.id } },
      update: {},
      create: { userId: admin.id, feedId: feed.id, category: feed.category },
    })
  }
  console.log(`📌 Admin subscribed to ${allFeeds.length} feeds`)

  console.log('\n✅ Seed complete!')
  console.log('\n📝 Login credentials:')
  console.log('   Admin:  admin / admin123')
  console.log('   Reader: reader / reader123')
  console.log(`   Invite code: pulse2025`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
