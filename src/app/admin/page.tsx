'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Providers from '../providers'

function AdminContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [feeds, setFeeds] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [showAddFeed, setShowAddFeed] = useState(false)
  const [newFeed, setNewFeed] = useState({ url: '', title: '', category: 'general' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
    if (status === 'authenticated' && (session.user as any)?.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    loadFeeds()
    loadStats()
  }, [status])

  const loadFeeds = async () => {
    const res = await fetch('/api/feeds')
    const data = await res.json()
    setFeeds(data.feeds || [])
  }

  const loadStats = async () => {
    // Simple stats from the articles endpoint
    const res = await fetch('/api/articles?limit=1')
    const data = await res.json()
    setStats({ totalArticles: data.total })
  }

  const addFeed = async () => {
    if (!newFeed.url) return
    setLoading(true)
    try {
      const res = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFeed),
      })
      if (res.ok) {
        setShowAddFeed(false)
        setNewFeed({ url: '', title: '', category: 'general' })
        loadFeeds()
      } else {
        const err = await res.json()
        alert(err.error)
      }
    } finally {
      setLoading(false)
    }
  }

  const deleteFeed = async (id: string) => {
    if (!confirm('Delete this feed and all its articles?')) return
    await fetch(`/api/feeds?id=${id}`, { method: 'DELETE' })
    loadFeeds()
  }

  const triggerFetch = async () => {
    setLoading(true)
    try {
      await fetch('/api/cron', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'manual'}`,
        },
      })
      loadFeeds()
      loadStats()
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
      </div>
    )
  }

  if (!session || (session.user as any)?.role !== 'admin') return null

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Header */}
      <header className="h-14 border-b border-[hsl(var(--border))] flex items-center px-6 gap-4">
        <a href="/dashboard" className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition">
          ← Back
        </a>
        <h1 className="text-xl font-bold">Admin Panel</h1>
        <div className="flex-1" />
        <button
          onClick={triggerFetch}
          disabled={loading}
          className="px-4 py-1.5 text-sm rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 transition"
        >
          🔄 Fetch All Feeds
        </button>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            <div className="text-3xl font-bold">{feeds.length}</div>
            <div className="text-sm text-[hsl(var(--muted-foreground))]">Active Feeds</div>
          </div>
          <div className="p-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            <div className="text-3xl font-bold">{stats?.totalArticles || 0}</div>
            <div className="text-sm text-[hsl(var(--muted-foreground))]">Total Articles</div>
          </div>
          <div className="p-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            <div className="text-3xl font-bold">
              {feeds.filter((f) => f.lastFetchedAt).length}
            </div>
            <div className="text-sm text-[hsl(var(--muted-foreground))]">Fetched Today</div>
          </div>
        </div>

        {/* Feed Management */}
        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <div className="p-4 border-b border-[hsl(var(--border))] flex items-center justify-between">
            <h2 className="text-lg font-semibold">Feed Management</h2>
            <button
              onClick={() => setShowAddFeed(!showAddFeed)}
              className="px-3 py-1.5 text-sm rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 transition"
            >
              + Add Feed
            </button>
          </div>

          {/* Add Feed Form */}
          {showAddFeed && (
            <div className="p-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="url"
                  placeholder="Feed URL *"
                  value={newFeed.url}
                  onChange={(e) => setNewFeed({ ...newFeed, url: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-sm"
                />
                <input
                  type="text"
                  placeholder="Title (optional)"
                  value={newFeed.title}
                  onChange={(e) => setNewFeed({ ...newFeed, title: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-sm"
                />
                <select
                  value={newFeed.category}
                  onChange={(e) => setNewFeed({ ...newFeed, category: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-sm"
                >
                  <option value="general">General</option>
                  <option value="tech">Tech</option>
                  <option value="news">News</option>
                  <option value="business">Business</option>
                  <option value="science">Science</option>
                  <option value="entertainment">Entertainment</option>
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={addFeed}
                    disabled={loading || !newFeed.url}
                    className="flex-1 px-3 py-2 rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm hover:opacity-90 transition disabled:opacity-50"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddFeed(false)}
                    className="px-3 py-2 rounded-lg border border-[hsl(var(--border))] text-sm hover:bg-[hsl(var(--muted))] transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Feed List */}
          <div className="divide-y divide-[hsl(var(--border))]">
            {feeds.length === 0 ? (
              <div className="p-8 text-center text-[hsl(var(--muted-foreground))]">
                No feeds yet. Add your first feed above.
              </div>
            ) : (
              feeds.map((feed) => (
                <div key={feed.id} className="p-4 flex items-center gap-4">
                  {feed.faviconUrl ? (
                    <img src={feed.faviconUrl} alt="" className="w-6 h-6 rounded" />
                  ) : (
                    <div className="w-6 h-6 rounded bg-[hsl(var(--muted))] flex items-center justify-center text-sm">
                      📡
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{feed.title}</div>
                    <div className="text-sm text-[hsl(var(--muted-foreground))] truncate">
                      {feed.url}
                    </div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[hsl(var(--muted))] capitalize">
                    {feed.category}
                  </span>
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    {feed._count.articles} articles
                  </span>
                  {feed.lastError && (
                    <span className="text-xs text-red-500 truncate max-w-[200px]" title={feed.lastError}>
                      ⚠ {feed.lastError}
                    </span>
                  )}
                  {feed.lastFetchedAt && (
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      {new Date(feed.lastFetchedAt).toLocaleTimeString()}
                    </span>
                  )}
                  <button
                    onClick={() => deleteFeed(feed.id)}
                    className="p-1.5 rounded hover:bg-red-500/10 text-[hsl(var(--muted-foreground))] hover:text-red-500 transition"
                    title="Delete feed"
                  >
                    🗑
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Environment Info */}
        <div className="mt-8 p-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <h3 className="font-semibold mb-3">Configuration</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-[hsl(var(--muted-foreground))]">AI Summarization: </span>
              <span className={process.env.NEXT_PUBLIC_OPENAI_KEY ? 'text-green-500' : 'text-yellow-500'}>
                {process.env.NEXT_PUBLIC_OPENAI_KEY ? 'Configured' : 'Not set (set OPENAI_API_KEY in .env)'}
              </span>
            </div>
            <div>
              <span className="text-[hsl(var(--muted-foreground))]">Cron Endpoint: </span>
              <code className="text-xs bg-[hsl(var(--muted))] px-1 py-0.5 rounded">POST /api/cron</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  return (
    <Providers>
      <AdminContent />
    </Providers>
  )
}
