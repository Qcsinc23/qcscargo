import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { SEOKeyword, KeywordRankingHistory } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import {
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Loader2,
  RefreshCw,
  Plus
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

export default function KeywordTracker() {
  const [keywords, setKeywords] = useState<SEOKeyword[]>([])
  const [selectedKeyword, setSelectedKeyword] = useState<SEOKeyword | null>(null)
  const [rankingHistory, setRankingHistory] = useState<KeywordRankingHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [newKeyword, setNewKeyword] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadKeywords()
  }, [])

  useEffect(() => {
    if (selectedKeyword) {
      loadRankingHistory(selectedKeyword.id)
    }
  }, [selectedKeyword])

  const loadKeywords = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('seo_keywords')
        .select('*')
        .order('priority', { ascending: false })
        .limit(50)

      if (error) throw error
      setKeywords(data || [])
    } catch (error: any) {
      toast.error('Failed to load keywords')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const loadRankingHistory = async (keywordId: string) => {
    try {
      const { data, error } = await supabase
        .from('keyword_ranking_history')
        .select('*')
        .eq('keyword_id', keywordId)
        .order('checked_at', { ascending: false })
        .limit(30)

      if (error) throw error
      setRankingHistory((data || []) as KeywordRankingHistory[])
    } catch (error: any) {
      toast.error('Failed to load ranking history')
      console.error(error)
    }
  }

  const handleAddKeyword = async () => {
    if (!newKeyword.trim()) {
      toast.error('Please enter a keyword')
      return
    }

    try {
      const { data, error } = await supabase
        .from('seo_keywords')
        .insert({
          keyword: newKeyword.trim(),
          priority: 5,
          target_ranking: 1,
          target_location: 'New Jersey',
          related_service: 'air-cargo'
        })
        .select()
        .single()

      if (error) throw error
      
      toast.success('Keyword added successfully')
      setNewKeyword('')
      loadKeywords()
    } catch (error: any) {
      toast.error(error.message || 'Failed to add keyword')
    }
  }

  const handleRefreshRankings = async () => {
    if (!selectedKeyword) return

    try {
      setRefreshing(true)
      
      // Simulate ranking check (in production, this would call an API)
      const mockRanking = Math.floor(Math.random() * 50) + 1
      
      // Update keyword with new ranking
      await supabase
        .from('seo_keywords')
        .update({
          current_ranking: mockRanking,
          last_checked: new Date().toISOString()
        })
        .eq('id', selectedKeyword.id)

      // Add to history
      await supabase
        .from('keyword_ranking_history')
        .insert({
          keyword_id: selectedKeyword.id,
          ranking: mockRanking,
          checked_at: new Date().toISOString(),
          source: 'manual'
        })

      toast.success('Ranking updated')
      loadKeywords()
      if (selectedKeyword) {
        loadRankingHistory(selectedKeyword.id)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to refresh ranking')
    } finally {
      setRefreshing(false)
    }
  }

  const getRankingTrend = (keyword: SEOKeyword): 'up' | 'down' | 'stable' => {
    if (!keyword.current_ranking) return 'stable'
    
    const recentHistory = rankingHistory
      .filter(h => h.keyword_id === keyword.id)
      .slice(0, 2)
    
    if (recentHistory.length < 2) return 'stable'
    
    const [latest, previous] = recentHistory
    if (latest.ranking < previous.ranking) return 'up' // Lower number = better ranking
    if (latest.ranking > previous.ranking) return 'down'
    return 'stable'
  }

  const getRankingBadge = (ranking?: number) => {
    if (!ranking) return <Badge variant="secondary">Not Ranked</Badge>
    
    if (ranking <= 3) return <Badge className="bg-green-600">#{ranking}</Badge>
    if (ranking <= 10) return <Badge className="bg-blue-600">#{ranking}</Badge>
    if (ranking <= 20) return <Badge className="bg-yellow-600">#{ranking}</Badge>
    return <Badge variant="outline">#{ranking}</Badge>
  }

  const chartData = rankingHistory
    .slice()
    .reverse()
    .map(h => ({
      date: format(new Date(h.checked_at), 'MMM d'),
      ranking: h.ranking,
      target: selectedKeyword?.target_ranking || 1
    }))

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
          <h1 className="text-2xl font-bold text-gray-900">Keyword Tracker</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor keyword rankings and performance</p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add new keyword"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddKeyword()
              }
            }}
            className="w-64"
          />
          <Button onClick={handleAddKeyword}>
            <Plus className="h-4 w-4 mr-2" />
            Add Keyword
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Keywords List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Tracked Keywords</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {keywords.length > 0 ? (
                keywords.map(keyword => {
                  const trend = getRankingTrend(keyword)
                  return (
                    <div
                      key={keyword.id}
                      onClick={() => setSelectedKeyword(keyword)}
                      className={`
                        p-3 border rounded-lg cursor-pointer transition-colors
                        ${selectedKeyword?.id === keyword.id ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'}
                      `}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{keyword.keyword}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            {getRankingBadge(keyword.current_ranking)}
                            {trend === 'up' && (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            )}
                            {trend === 'down' && (
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            )}
                            {trend === 'stable' && (
                              <Minus className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Priority {keyword.priority}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        <div>Target: #{keyword.target_ranking}</div>
                        {keyword.last_checked && (
                          <div>Last checked: {format(new Date(keyword.last_checked), 'MMM d')}</div>
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No keywords tracked yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ranking Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {selectedKeyword ? selectedKeyword.keyword : 'Select a Keyword'}
                </CardTitle>
                {selectedKeyword && (
                  <div className="flex items-center gap-4 mt-2">
                    {getRankingBadge(selectedKeyword.current_ranking)}
                    <Badge variant="outline">
                      Target: #{selectedKeyword.target_ranking}
                    </Badge>
                    {selectedKeyword.search_volume && (
                      <span className="text-sm text-gray-500">
                        Search Volume: {selectedKeyword.search_volume.toLocaleString()}/mo
                      </span>
                    )}
                  </div>
                )}
              </div>
              {selectedKeyword && (
                <Button
                  size="sm"
                  onClick={handleRefreshRankings}
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh Ranking
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedKeyword ? (
              <>
                {rankingHistory.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis reversed domain={[0, 50]} />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="ranking"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          name="Current Ranking"
                          dot={{ r: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="target"
                          stroke="#10b981"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          name="Target Ranking"
                        />
                      </LineChart>
                    </ResponsiveContainer>

                    <div className="mt-6">
                      <h3 className="font-semibold mb-3">Ranking History</h3>
                      <div className="space-y-2">
                        {rankingHistory.slice(0, 10).map((history, index) => (
                          <div
                            key={history.id}
                            className="flex items-center justify-between p-2 border rounded"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-500">
                                {format(new Date(history.checked_at), 'MMM d, yyyy HH:mm')}
                              </span>
                              {getRankingBadge(history.ranking)}
                              <span className="text-xs text-gray-500">{history.source}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">No ranking history available</p>
                    <p className="text-xs mt-1">Click "Refresh Ranking" to start tracking</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Select a keyword to view ranking history</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

