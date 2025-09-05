import React, { useState, useRef } from 'react'
import { Camera, Upload, X, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface ProfilePhotoUploadProps {
  currentPhotoUrl: string | null
  onPhotoUploaded: (photoUrl: string, updatedProfile?: any) => void
  onPhotoDeleted: (updatedProfile?: any) => void
}

const ProfilePhotoUpload: React.FC<ProfilePhotoUploadProps> = ({
  currentPhotoUrl,
  onPhotoUploaded,
  onPhotoDeleted
}) => {
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    const maxSize = 5 * 1024 * 1024 // 5MB

    if (!allowedTypes.includes(file.type)) {
      return 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.'
    }

    if (file.size > maxSize) {
      return 'File size must be less than 5MB.'
    }

    return null
  }

  const handleFileSelect = (file: File) => {
    const error = validateFile(file)
    if (error) {
      toast.error(error)
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!preview) return

    try {
      setUploading(true)

      const fileName = `profile_${Date.now()}.jpg`

      const { data, error } = await supabase.functions.invoke('customer-photo-upload', {
        body: {
          imageData: preview,
          fileName: fileName
        }
      })

      if (error) {
        throw new Error(error.message)
      }

      if (data?.error) {
        throw new Error(data.error.message)
      }

      const result = data?.data
      if (result?.publicUrl) {
        onPhotoUploaded(result.publicUrl, result.profile)
        setPreview(null)
      } else {
        throw new Error('No photo URL received from upload')
      }
    } catch (err) {
      console.error('Photo upload error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload photo'
      toast.error('Upload failed: ' + errorMessage)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!currentPhotoUrl) return

    try {
      setDeleting(true)

      const { data, error } = await supabase.functions.invoke('customer-photo-delete')

      if (error) {
        throw new Error(error.message)
      }

      if (data?.error) {
        throw new Error(data.error.message)
      }

      const result = data?.data
      if (result?.success) {
        onPhotoDeleted(result.profile)
      } else {
        throw new Error('Failed to delete photo')
      }
    } catch (err) {
      console.error('Photo delete error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete photo'
      toast.error('Delete failed: ' + errorMessage)
    } finally {
      setDeleting(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  const currentDisplayUrl = preview || currentPhotoUrl

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Camera className="h-5 w-5 text-indigo-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Profile Photo</h3>
        </div>

        <div className="space-y-4">
          {/* Photo Display/Upload Area */}
          <div
            className={`relative border-2 border-dashed rounded-lg transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : currentDisplayUrl
                ? 'border-gray-200 bg-gray-50'
                : 'border-gray-300 bg-gray-50 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {currentDisplayUrl ? (
              <div className="relative">
                <img
                  src={currentDisplayUrl}
                  alt="Profile"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
                  <div className="opacity-0 hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={openFileDialog}
                      className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors mr-2"
                      title="Change photo"
                    >
                      <Camera className="h-5 w-5 text-gray-600" />
                    </button>
                    {!preview && (
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
                        title="Remove photo"
                      >
                        {deleting ? (
                          <Loader2 className="h-5 w-5 text-gray-600 animate-spin" />
                        ) : (
                          <X className="h-5 w-5 text-red-600" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="p-8 text-center cursor-pointer"
                onClick={openFileDialog}
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Upload Profile Photo
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Drag and drop your photo here, or click to browse
                </p>
                <p className="text-xs text-gray-500">
                  Supports JPEG, PNG, WebP • Max 5MB
                </p>
              </div>
            )}
          </div>

          {/* File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/jpg"
            onChange={(e) => {
              const files = e.target.files
              if (files && files.length > 0) {
                handleFileSelect(files[0])
              }
            }}
            className="hidden"
          />

          {/* Preview Actions */}
          {preview && (
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => setPreview(null)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2 transition-colors"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Upload Photo</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Upload Tips */}
          {!currentDisplayUrl && !preview && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-1">
                    Photo Upload Tips
                  </h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Use a clear, professional headshot</li>
                    <li>• Face should be well-lit and centered</li>
                    <li>• Square format works best (1:1 ratio)</li>
                    <li>• Maximum file size: 5MB</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProfilePhotoUpload
