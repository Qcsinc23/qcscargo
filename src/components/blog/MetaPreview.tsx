import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Globe, Link as LinkIcon } from 'lucide-react'

interface MetaPreviewProps {
  title: string
  description: string
  url?: string
  focusKeyword?: string
}

export function MetaPreview({ title, description, url = 'https://qcscargo.com/blog/', focusKeyword }: MetaPreviewProps) {
  // Simulate Google SERP display
  const displayUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const urlParts = displayUrl.split('/')
  const domain = urlParts[0]
  const path = urlParts.slice(1).join(' › ')

  // Highlight focus keyword if provided
  const highlightKeyword = (text: string, keyword?: string) => {
    if (!keyword) return text
    const regex = new RegExp(`(${keyword})`, 'gi')
    return text.split(regex).map((part, i) =>
      part.toLowerCase() === keyword.toLowerCase() ? (
        <span key={i} className="font-semibold text-gray-900">{part}</span>
      ) : (
        part
      )
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe className="h-4 w-4" />
          Google Search Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
          {/* URL Display */}
          <div className="flex items-center gap-1 mb-1">
            <LinkIcon className="h-3 w-3 text-green-700" />
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <span className="text-green-700">{domain}</span>
              {path && (
                <>
                  <span className="text-gray-400"> › </span>
                  <span className="text-gray-500">{path}</span>
                </>
              )}
            </div>
          </div>

          {/* Title (typically shows ~60 characters) */}
          <h3 className="text-xl text-blue-600 hover:underline cursor-pointer mb-1 line-clamp-1">
            {highlightKeyword(title.slice(0, 60), focusKeyword)}
            {title.length > 60 && '...'}
          </h3>

          {/* Description (typically shows ~155 characters) */}
          <p className="text-sm text-gray-700 leading-relaxed line-clamp-2">
            {highlightKeyword(description.slice(0, 155), focusKeyword)}
            {description.length > 155 && '...'}
          </p>

          {/* Character Count Indicators */}
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Title:</span>
              <span className={title.length >= 30 && title.length <= 60 ? 'text-green-600' : 'text-yellow-600'}>
                {title.length} / 60 characters
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Description:</span>
              <span className={description.length >= 120 && description.length <= 160 ? 'text-green-600' : 'text-yellow-600'}>
                {description.length} / 160 characters
              </span>
            </div>
            {title.length > 60 && (
              <p className="text-amber-600 text-xs mt-2">
                ⚠️ Title may be truncated in search results
              </p>
            )}
            {description.length > 160 && (
              <p className="text-amber-600 text-xs mt-1">
                ⚠️ Description may be truncated in search results
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

