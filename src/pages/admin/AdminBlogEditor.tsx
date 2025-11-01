import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Save,
  Eye,
  Calendar,
  Tag,
  Image as ImageIcon,
  Type,
  List,
  AlertCircle,
  Plus,
  Trash2,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BlogService } from '@/lib/services/blog.service'
import { SEOAnalyzer } from '@/lib/services/seo-analyzer.service'
import type { BlogPost, ContentBlock, BlogCategory, BlogTag } from '@/lib/types'
import { toast } from 'sonner'
import { draftStorage } from '@/lib/draftStorage'

const blogPostSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters'),
  slug: z.string().min(3, 'Slug must be at least 3 characters').regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  meta_title: z.string().min(30).max(60),
  meta_description: z.string().min(120).max(160),
  excerpt: z.string().optional(),
  focus_keyword: z.string().min(1, 'Focus keyword is required'),
  featured_image_url: z.string().url().optional().or(z.literal('')),
  featured_image_alt: z.string().optional(),
  canonical_url: z.string().url().optional().or(z.literal('')),
  target_locations: z.array(z.string()).min(1, 'At least one target location is required'),
  target_services: z.array(z.string()).min(1, 'At least one target service is required'),
  status: z.enum(['draft', 'scheduled', 'published', 'archived']),
  scheduled_for: z.string().optional(),
  content: z.array(z.any()).min(1, 'Content is required')
})

type BlogPostFormData = z.infer<typeof blogPostSchema>

const TARGET_LOCATIONS = [
  'New Jersey',
  'Newark',
  'Jersey City',
  'Paterson',
  'Elizabeth',
  'Edison',
  'Woodbridge',
  'Caribbean',
  'Jamaica',
  'Haiti',
  'Dominican Republic',
  'Trinidad',
  'Tobago',
  'Barbados',
  'Grenada',
  'St. Lucia',
  'Antigua'
]

const TARGET_SERVICES = [
  'air-cargo',
  'package-forwarding',
  'express-shipping',
  'freight-forwarding',
  'customs-brokerage'
]

export default function AdminBlogEditor() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const isEditing = !!id

  const [post, setPost] = useState<BlogPost | null>(null)
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [tags, setTags] = useState<BlogTag[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [seoAnalysis, setSeoAnalysis] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset
  } = useForm<BlogPostFormData>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: {
      status: 'draft',
      target_locations: ['New Jersey', 'Caribbean'],
      target_services: ['air-cargo'],
      content: [
        {
          type: 'heading',
          level: 1,
          text: ''
        }
      ]
    }
  })

  const watchedContent = watch('content')
  const watchedTitle = watch('title')
  const watchedFocusKeyword = watch('focus_keyword')

  // Load post if editing
  useEffect(() => {
    if (isEditing && id) {
      loadPost(id)
    } else {
      setLoading(true)
      loadInitialData()
    }
  }, [id, isEditing])

  // Auto-save draft
  useEffect(() => {
    const timer = setTimeout(() => {
      const formData = watch()
      if (formData.title) {
        draftStorage.save(`blog-post-${id || 'new'}`, formData)
      }
    }, 30000) // Auto-save every 30 seconds

    return () => clearTimeout(timer)
  }, [watchedContent, watchedTitle, id])

  // Load draft on mount
  useEffect(() => {
    if (!isEditing) {
      const draft = draftStorage.load<BlogPostFormData>(`blog-post-new`)
      if (draft) {
        reset(draft)
        toast.info('Draft restored from local storage')
      }
    }
  }, [])

  // Update SEO analysis when content changes
  useEffect(() => {
    const timer = setTimeout(() => {
      analyzeSEO()
    }, 1000) // Debounce

    return () => clearTimeout(timer)
  }, [watchedContent, watchedTitle, watchedFocusKeyword])

  const loadPost = async (postId: string) => {
    try {
      setLoading(true)
      const loadedPost = await BlogService.getPostById(postId)
      if (loadedPost) {
        setPost(loadedPost)
        setSelectedCategories(loadedPost.categories?.map(c => c.id) || [])
        setSelectedTags(loadedPost.tags?.map(t => t.id) || [])
        reset({
          ...loadedPost,
          target_locations: loadedPost.target_locations || [],
          target_services: loadedPost.target_services || []
        })
      }
    } catch (error) {
      toast.error('Failed to load post')
      console.error(error)
    } finally {
      setLoading(false)
      loadInitialData()
    }
  }

  const loadInitialData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [cats, tagsData] = await Promise.all([
        BlogService.getCategories(),
        BlogService.getTags()
      ])
      setCategories(cats || [])
      setTags(tagsData || [])
    } catch (error: any) {
      console.error('Failed to load categories/tags:', error)
      const errorMessage = error?.message || 'Failed to load categories and tags'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const analyzeSEO = async () => {
    const formData = watch()
    if (!formData.title || !formData.content || formData.content.length === 0) {
      return
    }

    try {
      const mockPost: BlogPost = {
        id: id || '',
        title: formData.title,
        slug: formData.slug || '',
        meta_title: formData.meta_title || '',
        meta_description: formData.meta_description || '',
        content: formData.content as ContentBlock[],
        excerpt: formData.excerpt,
        featured_image_url: formData.featured_image_url,
        featured_image_alt: formData.featured_image_alt,
        status: formData.status as any,
        focus_keyword: formData.focus_keyword,
        seo_score: 0,
        readability_score: 0,
        target_locations: formData.target_locations,
        target_services: formData.target_services,
        views_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        categories: selectedCategories.map(cid => categories.find(c => c.id === cid)!).filter(Boolean),
        tags: selectedTags.map(tid => tags.find(t => t.id === tid)!).filter(Boolean)
      }

      const analysis = await SEOAnalyzer.analyzeBlogPost(mockPost)
      setSeoAnalysis(analysis)
    } catch (error) {
      console.error('SEO analysis failed:', error)
    }
  }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  const addContentBlock = (type: ContentBlock['type']) => {
    const currentContent = watch('content') || []
    const newBlock: ContentBlock = {
      type,
      ...(type === 'heading' ? { level: 2, text: '' } : {}),
      ...(type === 'list' ? { items: [''] } : {}),
      ...(type === 'callout' ? { style: 'info', text: '' } : {}),
      ...(type === 'cta' ? { text: '', buttonText: 'Get Quote', buttonLink: '/quote' } : {})
    }
    setValue('content', [...currentContent, newBlock])
  }

  const updateContentBlock = (index: number, updates: Partial<ContentBlock>) => {
    const currentContent = watch('content') || []
    const updated = [...currentContent]
    updated[index] = { ...updated[index], ...updates }
    setValue('content', updated)
  }

  const removeContentBlock = (index: number) => {
    const currentContent = watch('content') || []
    setValue('content', currentContent.filter((_, i) => i !== index))
  }

  const onSubmit = async (data: BlogPostFormData) => {
    try {
      setSaving(true)

      const postData = {
        ...data,
        categories: selectedCategories.map(cid => categories.find(c => c.id === cid)!).filter(Boolean),
        tags: selectedTags.map(tid => tags.find(t => t.id === tid)!).filter(Boolean)
      }

      let result: BlogPost
      if (isEditing && id) {
        result = await BlogService.updatePost(id, postData)
      } else {
        result = await BlogService.createPost(postData as any)
      }

      // Clear draft
      draftStorage.clear(`blog-post-${result.id}`)

      toast.success(`Post ${isEditing ? 'updated' : 'created'} successfully`)
      navigate(`/admin/blog/${result.id}`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to save post')
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading editor...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Editor</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <Button onClick={() => {
            setError(null)
            setLoading(true)
            loadInitialData()
          }}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Blog Post' : 'Create New Blog Post'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isEditing ? 'Update your blog post' : 'Create a new SEO-optimized blog post'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {previewMode ? 'Edit' : 'Preview'}
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Post
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Post Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <Input
                  {...register('title')}
                  placeholder="Enter post title (include focus keyword)"
                  onChange={(e) => {
                    register('title').onChange(e)
                    if (!watch('slug')) {
                      setValue('slug', generateSlug(e.target.value))
                    }
                  }}
                />
                {errors.title && (
                  <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slug *
                </label>
                <Input
                  {...register('slug')}
                  placeholder="url-friendly-slug"
                />
                {errors.slug && (
                  <p className="text-sm text-red-500 mt-1">{errors.slug.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Focus Keyword *
                </label>
                <Input
                  {...register('focus_keyword')}
                  placeholder="e.g., air cargo shipping new jersey to caribbean"
                />
                {errors.focus_keyword && (
                  <p className="text-sm text-red-500 mt-1">{errors.focus_keyword.message}</p>
                )}
              </div>

              {/* Content Blocks */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Content Blocks *
                  </label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addContentBlock('heading')}
                    >
                      <Type className="h-3 w-3 mr-1" />
                      Heading
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addContentBlock('paragraph')}
                    >
                      <Type className="h-3 w-3 mr-1" />
                      Paragraph
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addContentBlock('list')}
                    >
                      <List className="h-3 w-3 mr-1" />
                      List
                    </Button>
                  </div>
                </div>

                {(watchedContent || []).map((block: ContentBlock, index: number) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">{block.type}</Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeContentBlock(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>

                    {block.type === 'heading' && (
                      <div className="space-y-2">
                        <select
                          value={block.level || 2}
                          onChange={(e) => updateContentBlock(index, { level: parseInt(e.target.value) })}
                          className="w-full rounded-md border border-input px-3 py-2 text-sm"
                        >
                          {[1, 2, 3, 4, 5, 6].map(level => (
                            <option key={level} value={level}>H{level}</option>
                          ))}
                        </select>
                        <Input
                          value={block.text || ''}
                          onChange={(e) => updateContentBlock(index, { text: e.target.value })}
                          placeholder="Heading text"
                        />
                      </div>
                    )}

                    {(block.type === 'paragraph' || block.type === 'callout') && (
                      <Textarea
                        value={block.text || ''}
                        onChange={(e) => updateContentBlock(index, { text: e.target.value })}
                        placeholder={block.type === 'callout' ? 'Callout text' : 'Paragraph text'}
                        rows={4}
                      />
                    )}

                    {block.type === 'list' && (
                      <div className="space-y-2">
                        {(block.items || ['']).map((item, itemIndex) => (
                          <div key={itemIndex} className="flex gap-2">
                            <Input
                              value={item}
                              onChange={(e) => {
                                const updatedItems = [...(block.items || [])]
                                updatedItems[itemIndex] = e.target.value
                                updateContentBlock(index, { items: updatedItems })
                              }}
                              placeholder="List item"
                            />
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const updatedItems = [...(block.items || []), '']
                            updateContentBlock(index, { items: updatedItems })
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Item
                        </Button>
                      </div>
                    )}
                  </div>
                ))}

                {(!watchedContent || watchedContent.length === 0) && (
                  <p className="text-sm text-gray-500 text-center py-8">
                    No content blocks yet. Add your first block above.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* SEO Fields */}
          <Card>
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meta Title *
                </label>
                <Input
                  {...register('meta_title')}
                  placeholder="50-60 characters"
                  maxLength={60}
                />
                {errors.meta_title && (
                  <p className="text-sm text-red-500 mt-1">{errors.meta_title.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {watch('meta_title')?.length || 0} / 60 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meta Description *
                </label>
                <Textarea
                  {...register('meta_description')}
                  placeholder="120-160 characters"
                  rows={3}
                  maxLength={160}
                />
                {errors.meta_description && (
                  <p className="text-sm text-red-500 mt-1">{errors.meta_description.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {watch('meta_description')?.length || 0} / 160 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Excerpt
                </label>
                <Textarea
                  {...register('excerpt')}
                  placeholder="Short excerpt for listings"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Canonical URL
                </label>
                <Input
                  {...register('canonical_url')}
                  placeholder="https://qcscargo.com/blog/..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* SEO Analysis */}
          {seoAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  SEO Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className={`text-4xl font-bold ${
                    seoAnalysis.overallScore >= 80 ? 'text-green-600' :
                    seoAnalysis.overallScore >= 60 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {seoAnalysis.overallScore}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Overall SEO Score</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  {...register('status')}
                  className="w-full rounded-md border border-input px-3 py-2 text-sm"
                >
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categories
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {categories.map(cat => (
                    <label key={cat.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCategories([...selectedCategories, cat.id])
                          } else {
                            setSelectedCategories(selectedCategories.filter(id => id !== cat.id))
                          }
                        }}
                      />
                      <span className="text-sm">{cat.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {tags.map(tag => (
                    <label key={tag.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedTags.includes(tag.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTags([...selectedTags, tag.id])
                          } else {
                            setSelectedTags(selectedTags.filter(id => id !== tag.id))
                          }
                        }}
                      />
                      <span className="text-sm">{tag.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Locations *
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {TARGET_LOCATIONS.map(location => (
                    <label key={location} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={watch('target_locations')?.includes(location)}
                        onChange={(e) => {
                          const current = watch('target_locations') || []
                          if (e.target.checked) {
                            setValue('target_locations', [...current, location])
                          } else {
                            setValue('target_locations', current.filter(l => l !== location))
                          }
                        }}
                      />
                      <span className="text-sm">{location}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Services *
                </label>
                <div className="space-y-2">
                  {TARGET_SERVICES.map(service => (
                    <label key={service} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={watch('target_services')?.includes(service)}
                        onChange={(e) => {
                          const current = watch('target_services') || []
                          if (e.target.checked) {
                            setValue('target_services', [...current, service])
                          } else {
                            setValue('target_services', current.filter(s => s !== service))
                          }
                        }}
                      />
                      <span className="text-sm">{service}</span>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

