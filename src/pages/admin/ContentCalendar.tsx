import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ContentScheduler } from '@/lib/services/content-scheduler.service'
import { BlogService } from '@/lib/services/blog.service'
import type { BlogPost } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import {
  Calendar as CalendarIcon,
  Clock,
  Edit,
  Eye,
  Play,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, startOfWeek, endOfWeek } from 'date-fns'
import { toast } from 'sonner'

export default function ContentCalendar() {
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [scheduledPosts, setScheduledPosts] = useState<BlogPost[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    scheduled: 0,
    publishedToday: 0,
    publishingToday: 0,
    publishingThisWeek: 0
  })

  useEffect(() => {
    loadScheduledPosts()
    loadStats()
    
    // Refresh every minute
    const interval = setInterval(() => {
      loadScheduledPosts()
      loadStats()
    }, 60000)

    return () => clearInterval(interval)
  }, [currentDate])

  const loadScheduledPosts = async () => {
    try {
      setLoading(true)
      const posts = await ContentScheduler.getScheduledPosts()
      setScheduledPosts(posts)
    } catch (error: any) {
      toast.error('Failed to load scheduled posts')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const schedulingStats = await ContentScheduler.getSchedulingStats()
      setStats(schedulingStats)
    } catch (error) {
      console.error('Failed to load stats', error)
    }
  }

  const handleReschedule = async (postId: string, newDate: Date) => {
    try {
      await ContentScheduler.schedulePost(postId, newDate)
      toast.success('Post rescheduled successfully')
      loadScheduledPosts()
      loadStats()
    } catch (error: any) {
      toast.error(error.message || 'Failed to reschedule post')
    }
  }

  const handlePublishNow = async (postId: string) => {
    try {
      await ContentScheduler.publishScheduledPost(postId)
      toast.success('Post published successfully')
      loadScheduledPosts()
      loadStats()
    } catch (error: any) {
      toast.error(error.message || 'Failed to publish post')
    }
  }

  const handleUnschedule = async (postId: string) => {
    try {
      await ContentScheduler.unschedulePost(postId)
      toast.success('Post unscheduled')
      loadScheduledPosts()
      loadStats()
    } catch (error: any) {
      toast.error(error.message || 'Failed to unschedule post')
    }
  }

  const getPostsForDate = (date: Date): BlogPost[] => {
    return scheduledPosts.filter(post => {
      if (!post.scheduled_for) return false
      return isSameDay(new Date(post.scheduled_for), date)
    })
  }

  const getMonthDates = () => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  const selectedDatePosts = selectedDate ? getPostsForDate(selectedDate) : []

  if (loading && scheduledPosts.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900">Content Calendar</h1>
          <p className="text-sm text-gray-500 mt-1">Manage scheduled blog posts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={goToToday}>
            Today
          </Button>
          <Button onClick={() => navigate('/admin/blog/new')}>
            Create Post
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.scheduled}</div>
            <div className="text-xs text-gray-500">Scheduled</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.publishedToday}</div>
            <div className="text-xs text-gray-500">Published Today</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.publishingToday}</div>
            <div className="text-xs text-gray-500">Publishing Today</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.publishingThisWeek}</div>
            <div className="text-xs text-gray-500">This Week</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                {format(currentDate, 'MMMM yyyy')}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={previousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {getMonthDates().map((date, index) => {
                const posts = getPostsForDate(date)
                const isCurrentMonth = date.getMonth() === currentDate.getMonth()
                const isSelected = selectedDate && isSameDay(date, selectedDate)
                const isTodayDate = isToday(date)

                return (
                  <div
                    key={index}
                    onClick={() => setSelectedDate(date)}
                    className={`
                      min-h-[80px] p-1 border rounded-md cursor-pointer transition-colors
                      ${!isCurrentMonth ? 'bg-gray-50 opacity-50' : 'bg-white'}
                      ${isSelected ? 'ring-2 ring-blue-500' : ''}
                      ${isTodayDate ? 'border-blue-500 border-2' : 'border-gray-200'}
                      hover:bg-gray-50
                    `}
                  >
                    <div className={`
                      text-sm font-medium mb-1
                      ${isTodayDate ? 'text-blue-600' : 'text-gray-700'}
                    `}>
                      {format(date, 'd')}
                    </div>
                    <div className="space-y-1">
                      {posts.slice(0, 2).map(post => (
                        <div
                          key={post.id}
                          className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded truncate"
                          title={post.title}
                        >
                          {post.title.substring(0, 20)}...
                        </div>
                      ))}
                      {posts.length > 2 && (
                        <div className="text-xs text-gray-500">
                          +{posts.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Date Posts */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a Date'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDate ? (
              selectedDatePosts.length > 0 ? (
                <div className="space-y-3">
                  {selectedDatePosts.map(post => (
                    <div
                      key={post.id}
                      className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                    >
                      <h4 className="font-semibold text-sm mb-2 line-clamp-2">
                        {post.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                        <Clock className="h-3 w-3" />
                        {post.scheduled_for && format(new Date(post.scheduled_for), 'h:mm a')}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/admin/blog/${post.id}/edit`)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePublishNow(post.id)}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Publish Now
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUnschedule(post.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No posts scheduled for this date</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4"
                    onClick={() => navigate('/admin/blog/new')}
                  >
                    Create Post
                  </Button>
                </div>
              )
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">Click a date to view scheduled posts</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Posts List */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Scheduled Posts</CardTitle>
        </CardHeader>
        <CardContent>
          {scheduledPosts.length > 0 ? (
            <div className="space-y-2">
              {scheduledPosts
                .sort((a, b) => {
                  const dateA = a.scheduled_for ? new Date(a.scheduled_for).getTime() : 0
                  const dateB = b.scheduled_for ? new Date(b.scheduled_for).getTime() : 0
                  return dateA - dateB
                })
                .slice(0, 10)
                .map(post => (
                  <div
                    key={post.id}
                    className="flex items-center justify-between border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{post.title}</h4>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {post.scheduled_for
                            ? format(new Date(post.scheduled_for), 'MMM d, yyyy')
                            : 'Not scheduled'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {post.scheduled_for
                            ? format(new Date(post.scheduled_for), 'h:mm a')
                            : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/admin/blog/${post.id}/edit`)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePublishNow(post.id)}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Publish Now
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUnschedule(post.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No scheduled posts</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-4"
                onClick={() => navigate('/admin/blog/new')}
              >
                Create Post
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

