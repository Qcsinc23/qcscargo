import React, { useEffect, useState } from 'react'
import { ContentQueueService } from '@/lib/services/content-queue.service'
import type { ContentGenerationQueue, ContentType } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Plus, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  RefreshCw,
  Trash2,
  Eye,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'

export default function ContentGenerationQueue() {
  const navigate = useNavigate()
  const [queueItems, setQueueItems] = useState<ContentGenerationQueue[]>([])
  const [stats, setStats] = useState({
    pending: 0,
    generating: 0,
    review: 0,
    completed: 0,
    failed: 0,
    total: 0
  })
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  // Form state for new queue item
  const [newKeyword, setNewKeyword] = useState('')
  const [newPriority, setNewPriority] = useState('5')
  const [newContentType, setNewContentType] = useState<ContentType>('blog-post')

  useEffect(() => {
    loadQueue()
    loadStats()

    // Poll for updates every 5 seconds
    const interval = setInterval(() => {
      loadQueue()
      loadStats()
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const loadQueue = async () => {
    try {
      const items = await ContentQueueService.getQueueItems()
      setQueueItems(items)
    } catch (error: any) {
      toast.error('Failed to load queue')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const queueStats = await ContentQueueService.getQueueStats()
      setStats(queueStats)
    } catch (error) {
      console.error('Failed to load stats', error)
    }
  }

  const handleAddToQueue = async () => {
    if (!newKeyword.trim()) {
      toast.error('Please enter a keyword')
      return
    }

    try {
      await ContentQueueService.queueContentGeneration(newKeyword, newContentType, {
        priority: parseInt(newPriority)
      })
      toast.success('Added to queue')
      setNewKeyword('')
      loadQueue()
      loadStats()
    } catch (error: any) {
      toast.error(error.message || 'Failed to add to queue')
    }
  }

  const handleProcess = async (itemId: string) => {
    try {
      setProcessing(itemId)
      await ContentQueueService.processQueueItem(itemId)
      toast.success('Content generated successfully')
      loadQueue()
      loadStats()
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate content')
    } finally {
      setProcessing(null)
    }
  }

  const handleAutoPublish = async (itemId: string) => {
    try {
      setProcessing(itemId)
      const postId = await ContentQueueService.autoPublishGeneratedContent(itemId)
      toast.success('Content published successfully')
      navigate(`/admin/blog/${postId}/edit`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to publish content')
    } finally {
      setProcessing(null)
      loadQueue()
      loadStats()
    }
  }

  const handleRetry = async (itemId: string) => {
    try {
      setProcessing(itemId)
      await ContentQueueService.retryQueueItem(itemId)
      toast.success('Retrying generation')
      loadQueue()
      loadStats()
    } catch (error: any) {
      toast.error(error.message || 'Failed to retry')
    } finally {
      setProcessing(null)
    }
  }

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this queue item?')) return

    try {
      await ContentQueueService.deleteQueueItem(itemId)
      toast.success('Deleted from queue')
      loadQueue()
      loadStats()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete')
    }
  }

  const handleReview = (item: ContentGenerationQueue) => {
    if (item.generated_content) {
      // Navigate to editor with pre-filled content
      const generated = item.generated_content as any
      navigate(`/admin/blog/new?queueId=${item.id}`)
    }
  }

  const getStatusBadge = (status: ContentGenerationQueue['status']) => {
    const variants = {
      pending: { variant: 'secondary' as const, icon: Clock, label: 'Pending' },
      generating: { variant: 'default' as const, icon: Loader2, label: 'Generating' },
      review: { variant: 'default' as const, icon: Eye, label: 'Review' },
      completed: { variant: 'default' as const, icon: CheckCircle2, label: 'Completed' },
      failed: { variant: 'destructive' as const, icon: XCircle, label: 'Failed' }
    }

    const config = variants[status]
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {status === 'generating' && <Icon className="h-3 w-3 animate-spin" />}
        {status !== 'generating' && <Icon className="h-3 w-3" />}
        {config.label}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Generation Queue</h1>
          <p className="text-sm text-gray-500 mt-1">Manage AI-powered blog post generation</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-gray-500">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-xs text-gray-500">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.generating}</div>
            <div className="text-xs text-gray-500">Generating</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.review}</div>
            <div className="text-xs text-gray-500">Review</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-xs text-gray-500">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-xs text-gray-500">Failed</div>
          </CardContent>
        </Card>
      </div>

      {/* Add New Item */}
      <Card>
        <CardHeader>
          <CardTitle>Add to Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Enter target keyword (e.g., 'air cargo shipping New Jersey')"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddToQueue()
                  }
                }}
              />
            </div>
            <Select value={newContentType} onValueChange={(v: any) => setNewContentType(v)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blog-post">Blog Post</SelectItem>
                <SelectItem value="landing-page">Landing Page</SelectItem>
                <SelectItem value="product-page">Product Page</SelectItem>
              </SelectContent>
            </Select>
            <Select value={newPriority} onValueChange={setNewPriority}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Priority 1</SelectItem>
                <SelectItem value="3">Priority 3</SelectItem>
                <SelectItem value="5">Priority 5</SelectItem>
                <SelectItem value="7">Priority 7</SelectItem>
                <SelectItem value="10">Priority 10</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAddToQueue}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Queue Items */}
      <Card>
        <CardHeader>
          <CardTitle>Queue Items</CardTitle>
        </CardHeader>
        <CardContent>
          {queueItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No items in queue. Add a keyword above to start generating content.
            </div>
          ) : (
            <div className="space-y-4">
              {queueItems.map((item) => (
                <div
                  key={item.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{item.target_keyword}</h3>
                        {getStatusBadge(item.status)}
                        <Badge variant="outline">{item.content_type}</Badge>
                        <Badge variant="outline">Priority: {item.priority}</Badge>
                      </div>
                      <div className="text-sm text-gray-500 space-y-1">
                        <div>Created: {format(new Date(item.created_at), 'MMM d, yyyy HH:mm')}</div>
                        {item.scheduled_for && (
                          <div>Scheduled: {format(new Date(item.scheduled_for), 'MMM d, yyyy HH:mm')}</div>
                        )}
                        {item.completed_at && (
                          <div>Completed: {format(new Date(item.completed_at), 'MMM d, yyyy HH:mm')}</div>
                        )}
                        {item.error_message && (
                          <div className="text-red-600 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            {item.error_message}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {item.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => handleProcess(item.id)}
                          disabled={processing === item.id}
                        >
                          {processing === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-1" />
                              Generate
                            </>
                          )}
                        </Button>
                      )}
                      {item.status === 'review' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReview(item)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAutoPublish(item.id)}
                            disabled={processing === item.id}
                          >
                            {processing === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Auto-Publish
                              </>
                            )}
                          </Button>
                        </>
                      )}
                      {item.status === 'failed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetry(item.id)}
                          disabled={processing === item.id}
                        >
                          {processing === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Retry
                            </>
                          )}
                        </Button>
                      )}
                      {(item.status === 'pending' || item.status === 'failed' || item.status === 'completed') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

