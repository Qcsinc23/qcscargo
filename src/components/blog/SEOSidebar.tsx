import React from 'react'
import { AlertCircle, CheckCircle2, XCircle, Info, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { SEOAnalysisResult } from '@/lib/types'

interface SEOSidebarProps {
  analysis: SEOAnalysisResult | null
  loading?: boolean
}

export function SEOSidebar({ analysis, loading }: SEOSidebarProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            SEO Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            SEO Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Start writing content to see SEO analysis
          </p>
        </CardContent>
      </Card>
    )
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle2 className="h-5 w-5 text-green-600" />
    if (score >= 60) return <AlertCircle className="h-5 w-5 text-yellow-600" />
    return <XCircle className="h-5 w-5 text-red-600" />
  }

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Overall SEO Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="relative inline-flex items-center justify-center w-32 h-32 mb-4">
              <svg className="transform -rotate-90 w-32 h-32">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-gray-200"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - analysis.overallScore / 100)}`}
                  className={getScoreColor(analysis.overallScore)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className={`text-4xl font-bold ${getScoreColor(analysis.overallScore)}`}>
                    {analysis.overallScore}
                  </div>
                  <div className="text-xs text-gray-500">/ 100</div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2">
              {getScoreIcon(analysis.overallScore)}
              <span className={`text-sm font-medium ${getScoreColor(analysis.overallScore)}`}>
                {analysis.overallScore >= 80
                  ? 'Excellent'
                  : analysis.overallScore >= 60
                  ? 'Good'
                  : 'Needs Improvement'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Title Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Title</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Score</span>
            <Badge variant="outline" className={getScoreColor(analysis.titleAnalysis.score)}>
              {analysis.titleAnalysis.score}/100
            </Badge>
          </div>
          <Progress value={analysis.titleAnalysis.score} className="h-2" />
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              {analysis.titleAnalysis.hasKeyword ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span>Contains focus keyword</span>
            </div>
            <div className="flex items-center gap-2">
              {analysis.titleAnalysis.length >= 30 && analysis.titleAnalysis.length <= 60 ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span>Length: {analysis.titleAnalysis.length} chars (30-60 optimal)</span>
            </div>
          </div>
          {analysis.titleAnalysis.recommendations.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs font-medium text-gray-700 mb-2">Recommendations:</p>
              <ul className="space-y-1">
                {analysis.titleAnalysis.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                    <Info className="h-3 w-3 mt-0.5 text-blue-500 flex-shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meta Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Meta Description</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Score</span>
            <Badge variant="outline" className={getScoreColor(analysis.metaDescriptionAnalysis.score)}>
              {analysis.metaDescriptionAnalysis.score}/100
            </Badge>
          </div>
          <Progress value={analysis.metaDescriptionAnalysis.score} className="h-2" />
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              {analysis.metaDescriptionAnalysis.hasKeyword ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span>Contains focus keyword</span>
            </div>
            <div className="flex items-center gap-2">
              {analysis.metaDescriptionAnalysis.length >= 120 && analysis.metaDescriptionAnalysis.length <= 160 ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span>Length: {analysis.metaDescriptionAnalysis.length} chars (120-160 optimal)</span>
            </div>
            <div className="flex items-center gap-2">
              {analysis.metaDescriptionAnalysis.hasCallToAction ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span>Has call-to-action</span>
            </div>
          </div>
          {analysis.metaDescriptionAnalysis.recommendations.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs font-medium text-gray-700 mb-2">Recommendations:</p>
              <ul className="space-y-1">
                {analysis.metaDescriptionAnalysis.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                    <Info className="h-3 w-3 mt-0.5 text-blue-500 flex-shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Word Count:</span>
              <div className="font-semibold">{analysis.contentAnalysis.wordCount.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-gray-600">Keyword Density:</span>
              <div className="font-semibold">{analysis.contentAnalysis.keywordDensity.toFixed(2)}%</div>
            </div>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              {analysis.contentAnalysis.headingStructure.hasH1 ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span>Has H1 heading ({analysis.contentAnalysis.headingStructure.h1Count} found)</span>
            </div>
            <div className="flex items-center gap-2">
              {analysis.contentAnalysis.readabilityScore >= 60 ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span>Readability: {analysis.contentAnalysis.readabilityScore}/100</span>
            </div>
            <div className="flex items-center gap-2">
              {analysis.contentAnalysis.lsiKeywordsFound.length >= 3 ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span>LSI Keywords: {analysis.contentAnalysis.lsiKeywordsFound.length} found</span>
            </div>
          </div>
          {analysis.contentAnalysis.lsiKeywordsFound.length > 0 && (
            <div className="mt-2 pt-2 border-t">
              <p className="text-xs font-medium text-gray-700 mb-1">Found LSI Keywords:</p>
              <div className="flex flex-wrap gap-1">
                {analysis.contentAnalysis.lsiKeywordsFound.map((keyword, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {analysis.contentAnalysis.recommendations.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs font-medium text-gray-700 mb-2">Recommendations:</p>
              <ul className="space-y-1">
                {analysis.contentAnalysis.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                    <Info className="h-3 w-3 mt-0.5 text-blue-500 flex-shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Local SEO */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Local SEO</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              {analysis.localSEOAnalysis.hasLocationMentions ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span>Location mentions present</span>
            </div>
            <div className="flex items-center gap-2">
              {analysis.localSEOAnalysis.hasLocalSchema ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span>Local business schema</span>
            </div>
            <div className="flex items-center gap-2">
              {analysis.localSEOAnalysis.hasNAPConsistency ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span>Target locations configured</span>
            </div>
          </div>
          {analysis.localSEOAnalysis.recommendations.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs font-medium text-gray-700 mb-2">Recommendations:</p>
              <ul className="space-y-1">
                {analysis.localSEOAnalysis.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                    <Info className="h-3 w-3 mt-0.5 text-blue-500 flex-shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Technical SEO */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Technical SEO</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              {analysis.technicalSEO.hasImageAlt ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span>All images have alt text</span>
            </div>
            <div className="flex items-center gap-2">
              {analysis.technicalSEO.hasInternalLinks ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span>Internal links present ({analysis.technicalSEO.internalLinkCount} found)</span>
            </div>
            <div className="flex items-center gap-2">
              {analysis.technicalSEO.hasExternalLinks ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span>External links present</span>
            </div>
            <div className="flex items-center gap-2">
              {analysis.technicalSEO.hasSchema ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span>Schema markup configured</span>
            </div>
          </div>
          {analysis.technicalSEO.recommendations.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs font-medium text-gray-700 mb-2">Recommendations:</p>
              <ul className="space-y-1">
                {analysis.technicalSEO.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                    <Info className="h-3 w-3 mt-0.5 text-blue-500 flex-shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

