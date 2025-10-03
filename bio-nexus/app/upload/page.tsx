'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { FileText, Upload, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react'

interface UploadFile {
  id: string
  name: string
  size: number
  type: string
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  file: File // Store the original File object
  error?: string
  result?: {
    paperId: number
    title: string
    authors: string[]
    chunksCreated: number
  }
}

export default function UploadPage() {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  // Utility function to format file size safely
  const formatFileSize = (sizeInBytes: number | undefined): string => {
    if (!sizeInBytes || isNaN(sizeInBytes) || sizeInBytes <= 0) {
      return 'Size unknown'
    }
    const sizeInMB = sizeInBytes / 1024 / 1024
    return `${sizeInMB.toFixed(2)} MB`
  }

    const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending' as const,
      progress: 0,
      size: file.size,
      name: file.name,
      type: file.type,
      file: file // Store the original File object
    }))
    setFiles(prev => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc']
    },
    multiple: true
  })

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const uploadFiles = async () => {
    if (files.length === 0) return

    setIsUploading(true)
    
    const pendingFiles = files.filter(f => f.status === 'pending')
    
    for (const file of pendingFiles) {
      try {
        // Update status to uploading
        setFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { ...f, status: 'uploading', progress: 10 }
            : f
        ))

        const formData = new FormData()
        formData.append('files', file.file) // Use the original File object

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`)
        }

        // Update status to processing
        setFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { ...f, status: 'processing', progress: 50 }
            : f
        ))

        const result = await response.json()

        if (result.success) {
          // Find the result that matches our file (should be the first one in most cases)
          // If no matching result is found, use the first one as fallback
          const fileResult = result.results.length > 0 ? result.results[0] : null
          
          // Update status to completed
          setFiles(prev => prev.map(f => 
            f.id === file.id 
              ? { 
                  ...f, 
                  status: 'completed', 
                  progress: 100,
                  result: fileResult
                }
              : f
          ))
        } else {
          throw new Error(result.error || 'Upload failed')
        }

      } catch (error) {
        console.error('Upload error for file:', file.name, error);
        setFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { 
                ...f, 
                status: 'error', 
                progress: 0,
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            : f
        ))
      }
      
      // Add a short delay between file uploads to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsUploading(false)
  }

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'pending':
        return <FileText className="h-4 w-4 text-blue-500" />
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: UploadFile['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-blue-500'
      case 'uploading':
      case 'processing':
        return 'bg-yellow-500'
      case 'completed':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const totalFiles = files.length
  const completedFiles = files.filter(f => f.status === 'completed').length
  const errorFiles = files.filter(f => f.status === 'error').length

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Knowledge Base Upload
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Upload research papers, documents, and publications to expand the knowledge base.
          Supported formats: PDF, DOC, DOCX
        </p>
      </div>

      {/* Upload Area */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Documents
          </CardTitle>
          <CardDescription>
            Drag and drop files here or click to browse. Multiple files supported.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
                : 'border-gray-300 hover:border-gray-400 dark:border-gray-600'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            {isDragActive ? (
              <p className="text-blue-600 dark:text-blue-400">Drop the files here...</p>
            ) : (
              <div>
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  Drag & drop files here, or click to select files
                </p>
                <p className="text-sm text-gray-500">
                  PDF, DOC, DOCX files up to 50MB each
                </p>
              </div>
            )}
          </div>

          {files.length > 0 && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-4">
                  <Badge variant="outline">{totalFiles} total</Badge>
                  <Badge variant="default" className="bg-green-500">{completedFiles} completed</Badge>
                  {errorFiles > 0 && (
                    <Badge variant="destructive">{errorFiles} errors</Badge>
                  )}
                </div>
                <Button 
                  onClick={uploadFiles}
                  disabled={isUploading || files.filter(f => f.status === 'pending').length === 0}
                  className="flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload Files
                    </>
                  )}
                </Button>
              </div>

              {/* File List */}
              <div className="space-y-3">
                {files.map((file) => (
                  <div key={file.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(file.status)}
                        <div className="flex-1">
                          <p className="font-medium text-sm">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {file.status}
                        </Badge>
                        {file.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(file.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    {(file.status === 'uploading' || file.status === 'processing') && (
                      <div className="mb-2">
                        <Progress value={file.progress} className="h-2" />
                        <p className="text-xs text-gray-500 mt-1">
                          {file.status === 'uploading' ? 'Uploading...' : 'Processing content...'}
                        </p>
                      </div>
                    )}

                    {/* Error message */}
                    {file.status === 'error' && file.error && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          {file.error}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Success details */}
                    {file.status === 'completed' && file.result && (
                      <div className="mt-2 p-3 bg-green-50 dark:bg-green-950 rounded border border-green-200 dark:border-green-800">
                        <div className="text-sm">
                          <p className="font-medium text-green-800 dark:text-green-200">
                            Successfully processed!
                          </p>
                          <div className="mt-1 text-green-700 dark:text-green-300">
                            <p><strong>Title:</strong> {file.result.title || 'Untitled'}</p>
                            <p><strong>Authors:</strong> {Array.isArray(file.result.authors) ? file.result.authors.join(', ') : 
                              typeof file.result.authors === 'string' ? file.result.authors : 'Unknown'}</p>
                            <p><strong>Chunks created:</strong> {file.result.chunksCreated || 0}</p>
                            <p><strong>Paper ID:</strong> {file.result.paperId || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Summary */}
      {totalFiles > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalFiles}</p>
                <p className="text-sm text-blue-800 dark:text-blue-200">Total Files</p>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{completedFiles}</p>
                <p className="text-sm text-green-800 dark:text-green-200">Processed</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                  {files.reduce((sum, f) => sum + (f.result?.chunksCreated || 0), 0)}
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">Knowledge Chunks</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}