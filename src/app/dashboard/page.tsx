'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Feed {
  id: string
  title: string
  url: string
  siteUrl: string | null
  faviconUrl: string | null
  category: string
  _count: { articles: number }
}

interface Article {
  id: string
  title: string
  url: string
  author: string | null
  publishedAt: string
  summary: string | null
  sentiment: string | null
  tags: string[]
  importance: number
  imageUrl: string | null
  contentText: string | null
  isRead: boolean
  isBookmarked: boolean
  feed: {
    id: string
    title: string
    faviconUrl: string | null
    category: string
  }
}

type Filter = 'all' | 'unread' | 'bookmarked'
type SortBy = 'date' | 'importance'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // State
  const [articles, setArticles] = useState<Article[]>([])
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [selectedFeed, setSelectedFeed] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [fetchingFeeds, setFetchingFeeds] = useState(false)
  const articleListRef = useRef<HTMLDivElement>(null)

  // Auth guard
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status, router])

  // Load feeds
  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/feeds')
      .then((r) => r.json())
      .then((data) => setFeeds(data.feeds || []))
      .catch(console.error)
  }, [status])

  // Load articles
  const loadArticles = useCallback(async () => {
    if (status !== 'authenticated') return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedFeed) params.set('feedId', selectedFeed)
      if (selectedCategory) params.set('category', selectedCategory)
      if (search) params.set('search', search)
      if (filter === 'bookmarked') params.set('bookmarked', 'true')
      params.set('page', page.toString())
      params.set('limit', '30')

      const res = await fetch(`/api/articles?${params}`)
      const data = await res.json()

      if (sortBy === 'importance') {
        data.articles.sort((a: Article, b: Article) => b.importance - a.importance)
      }

      setArticles(data.articles || [])
      setTotalPages(data.totalPages || 1)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [status, selectedFeed, selectedCategory, search, filter, page, sortBy])

  useEffect(() => {
    loadArticles()
  }, [loadArticles])

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Mark as read
  const markAsRead = async (articleId: string) => {
    await fetch('/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId, action: 'read' }),
    })
    setArticles((prev) =>
      prev.map((a) => (a.id === articleId ? { ...a, isRead: true } : a))
    )
  }

  // Toggle bookmark
  const toggleBookmark = async (articleId: string) => {
    await fetch('/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId, action: 'bookmark' }),
    })
    setArticles((prev) =>
      prev.map((a) =>
        a.id === articleId ? { ...a, isBookmarked: !a.isBookmarked } : a
      )
    )
  }

  // Hide article
  const hideArticle = async (articleId: string) => {
    await fetch('/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId, action: 'hide' }),
    })
    setArticles((prev) => prev.filter((a) => a.id !== articleId))
  }

  // Trigger fetch
  const triggerFetch = async () => {
    setFetchingFeeds(true)
    try {
      await fetch('/api/cron', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'manual'}`,
        },
      })
      await loadArticles()
    } finally {
      setFetchingFeeds(false)
    }
  }

  // Categories
  const categories = Array.from(new Set(feeds.map((f) => f.category)))

  // Article click handler
  const handleArticleClick = (article: Article) => {
    setSelectedArticle(article)
    if (!article.isRead) markAsRead(article.id)
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="h-screen flex flex-col bg-[hsl(var(--background))]">
      {/* Top Bar */}
      <header className="h-14 border-b border-[hsl(var(--border))] flex items-center px-4 gap-4 shrink-0">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <h1 className="text-xl font-bold">
          <span className="text-[hsl(var(--primary))]">Pulse</span>Feed
        </h1>

        {/* Search */}
        <div className="flex-1 max-w-md mx-4">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search articles..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-1.5 text-sm rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={triggerFetch}
            disabled={fetchingFeeds}
            className="px-3 py-1.5 text-sm rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition flex items-center gap-2"
          >
            <svg className={`w-4 h-4 ${fetchingFeeds ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Fetch Now
          </button>

          {(session.user as any)?.role === 'admin' && (
            <a
              href="/admin"
              className="px-3 py-1.5 text-sm rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition"
            >
              Admin
            </a>
          )}

          <button
            onClick={() => signOut()}
            className="px-3 py-1.5 text-sm rounded-lg hover:bg-[hsl(var(--muted))] transition"
          >
            Sign Out
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="w-64 border-r border-[hsl(var(--border))] flex flex-col overflow-hidden shrink-0">
            <div className="p-3 space-y-4 overflow-y-auto flex-1">
              {/* Filters */}
              <div>
                <h3 className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2 px-2">
                  Filters
                </h3>
                <div className="space-y-0.5">
                  {(['all', 'unread', 'bookmarked'] as Filter[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => { setFilter(f); setPage(1); setSelectedFeed(null); setSelectedCategory(null) }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-sm capitalize transition ${
                        filter === f && !selectedFeed && !selectedCategory
                          ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                          : 'hover:bg-[hsl(var(--muted))]'
                      }`}
                    >
                      {f === 'all' ? '📰 All Articles' : f === 'unread' ? '🔵 Unread' : '⭐ Bookmarked'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort */}
              <div>
                <h3 className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2 px-2">
                  Sort By
                </h3>
                <div className="space-y-0.5">
                  {(['date', 'importance'] as SortBy[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => { setSortBy(s); setPage(1) }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-sm capitalize transition ${
                        sortBy === s
                          ? 'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]'
                          : 'hover:bg-[hsl(var(--muted))]'
                      }`}
                    >
                      {s === 'date' ? '🕐 Latest First' : '🔥 By Importance'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories */}
              {categories.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2 px-2">
                    Categories
                  </h3>
                  <div className="space-y-0.5">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(selectedCategory === cat ? null : cat)
                          setSelectedFeed(null)
                          setPage(1)
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-sm capitalize transition ${
                          selectedCategory === cat
                            ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                            : 'hover:bg-[hsl(var(--muted))]'
                        }`}
                      >
                        📁 {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Feeds */}
              <div>
                <h3 className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2 px-2">
                  Feeds ({feeds.length})
                </h3>
                <div className="space-y-0.5">
                  {feeds.map((feed) => (
                    <button
                      key={feed.id}
                      onClick={() => {
                        setSelectedFeed(selectedFeed === feed.id ? null : feed.id)
                        setSelectedCategory(null)
                        setPage(1)
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition flex items-center gap-2 truncate ${
                        selectedFeed === feed.id
                          ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                          : 'hover:bg-[hsl(var(--muted))]'
                      }`}
                    >
                      {feed.faviconUrl ? (
                        <img src={feed.faviconUrl} alt="" className="w-4 h-4 rounded" />
                      ) : (
                        <span className="w-4 h-4 rounded bg-[hsl(var(--muted))] flex items-center justify-center text-[10px]">
                          📡
                        </span>
                      )}
                      <span className="truncate">{feed.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Article List */}
        <div
          ref={articleListRef}
          className={`${selectedArticle ? 'w-[420px]' : 'flex-1'} border-r border-[hsl(var(--border))] overflow-y-auto shrink-0`}
        >
          {loading && articles.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[hsl(var(--primary))]" />
            </div>
          ) : articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-[hsl(var(--muted-foreground))]">
              <p className="text-lg mb-2">📭</p>
              <p>No articles found</p>
              <p className="text-sm mt-1">Try adjusting your filters or add some feeds</p>
            </div>
          ) : (
            <div>
              {articles.map((article) => (
                <div
                  key={article.id}
                  onClick={() => handleArticleClick(article)}
                  className={`p-4 border-b border-[hsl(var(--border))] cursor-pointer transition hover:bg-[hsl(var(--muted))]/50 ${
                    selectedArticle?.id === article.id ? 'bg-[hsl(var(--muted))]' : ''
                  } ${!article.isRead ? 'border-l-2 border-l-[hsl(var(--primary))]' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Feed info */}
                      <div className="flex items-center gap-2 mb-1">
                        {article.feed.faviconUrl && (
                          <img src={article.feed.faviconUrl} alt="" className="w-4 h-4 rounded" />
                        )}
                        <span className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                          {article.feed.title}
                        </span>
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">
                          {formatRelativeTime(article.publishedAt)}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className={`text-sm leading-snug mb-1 ${!article.isRead ? 'font-semibold' : ''}`}>
                        {article.title}
                      </h3>

                      {/* Summary */}
                      {article.summary && (
                        <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-2 mb-2">
                          {article.summary}
                        </p>
                      )}

                      {/* Meta row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Sentiment */}
                        {article.sentiment && (
                          <span className="text-xs">
                            {article.sentiment === 'positive' ? '🟢' : article.sentiment === 'negative' ? '🔴' : '⚪'}
                          </span>
                        )}

                        {/* Importance */}
                        {article.importance > 0 && (
                          <span className={`text-xs font-medium ${
                            article.importance >= 80 ? 'text-red-500' :
                            article.importance >= 60 ? 'text-orange-500' :
                            article.importance >= 40 ? 'text-yellow-600' :
                            'text-[hsl(var(--muted-foreground))]'
                          }`}>
                            {article.importance >= 80 ? '🔥' : article.importance >= 60 ? '⚡' : ''} {article.importance}
                          </span>
                        )}

                        {/* Tags */}
                        {article.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-1.5 py-0.5 rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleBookmark(article.id) }}
                        className={`p-1 rounded hover:bg-[hsl(var(--muted))] transition ${
                          article.isBookmarked ? 'text-yellow-500' : 'text-[hsl(var(--muted-foreground))]'
                        }`}
                        title="Bookmark"
                      >
                        {article.isBookmarked ? '⭐' : '☆'}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); hideArticle(article.id) }}
                        className="p-1 rounded hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] transition"
                        title="Hide"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 p-4">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1 text-sm rounded border border-[hsl(var(--border))] disabled:opacity-30 hover:bg-[hsl(var(--muted))] transition"
                  >
                    ← Prev
                  </button>
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1 text-sm rounded border border-[hsl(var(--border))] disabled:opacity-30 hover:bg-[hsl(var(--muted))] transition"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Article Detail */}
        {selectedArticle && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto p-6">
              {/* Close button */}
              <button
                onClick={() => setSelectedArticle(null)}
                className="mb-4 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition"
              >
                ← Back to list
              </button>

              {/* Article header */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  {selectedArticle.feed.faviconUrl && (
                    <img src={selectedArticle.feed.faviconUrl} alt="" className="w-5 h-5 rounded" />
                  )}
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">
                    {selectedArticle.feed.title}
                  </span>
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">·</span>
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">
                    {new Date(selectedArticle.publishedAt).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <h1 className="text-2xl font-bold mb-3">{selectedArticle.title}</h1>

                {selectedArticle.author && (
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">
                    By {selectedArticle.author}
                  </p>
                )}

                {/* Tags and meta */}
                <div className="flex items-center gap-2 flex-wrap mb-4">
                  {selectedArticle.sentiment && (
                    <span className="text-sm px-2 py-0.5 rounded-full bg-[hsl(var(--muted))]">
                      {selectedArticle.sentiment === 'positive' ? '🟢 Positive' :
                       selectedArticle.sentiment === 'negative' ? '🔴 Negative' : '⚪ Neutral'}
                    </span>
                  )}
                  {selectedArticle.importance > 0 && (
                    <span className={`text-sm px-2 py-0.5 rounded-full bg-[hsl(var(--muted))] ${
                      selectedArticle.importance >= 80 ? 'text-red-500' :
                      selectedArticle.importance >= 60 ? 'text-orange-500' : ''
                    }}`}>
                      Importance: {selectedArticle.importance}/100
                    </span>
                  )}
                  {selectedArticle.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-[hsl(var(--muted))]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* AI Summary */}
              {selectedArticle.summary && (
                <div className="mb-6 p-4 rounded-lg bg-[hsl(var(--primary))]/5 border border-[hsl(var(--primary))]/20">
                  <h3 className="text-sm font-semibold text-[hsl(var(--primary))] mb-2">🤖 AI Summary</h3>
                  <p className="text-sm leading-relaxed">{selectedArticle.summary}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 mb-6">
                <a
                  href={selectedArticle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm font-medium hover:opacity-90 transition"
                >
                  Read Original ↗
                </a>
                <button
                  onClick={() => toggleBookmark(selectedArticle.id)}
                  className={`px-4 py-2 rounded-lg border text-sm transition ${
                    selectedArticle.isBookmarked
                      ? 'border-yellow-500 text-yellow-500'
                      : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'
                  }`}
                >
                  {selectedArticle.isBookmarked ? '⭐ Bookmarked' : '☆ Bookmark'}
                </button>
              </div>

              {/* Article content */}
              {selectedArticle.contentText && (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[hsl(var(--foreground))]/80">
                    {selectedArticle.contentText}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <footer className="h-8 border-t border-[hsl(var(--border))] flex items-center px-4 text-xs text-[hsl(var(--muted-foreground))] shrink-0">
        <span>{articles.length} articles loaded</span>
        <span className="mx-2">·</span>
        <span>{feeds.length} feeds</span>
        <span className="mx-2">·</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-dot" />
          Live
        </span>
        <span className="ml-auto">
          {(session.user as any)?.name} ({(session.user as any)?.role})
        </span>
      </footer>
    </div>
  )
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString()
}
