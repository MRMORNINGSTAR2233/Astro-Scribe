"use client"

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, FileText, Users, Calendar, Hash, BookOpen, Network } from 'lucide-react'
import Link from 'next/link'

interface Paper {
  id: number
  title: string
  authors: string[]
  publication_year: number
  source: string
  abstract: string
  keywords: string[]
  file_name: string
  content: string
  page_count?: number
  file_size?: number
  created_at: string
}

interface Summary {
  summary: string
  key_findings: string[]
  methodology: string
  conclusions: string[]
}

interface RelatedPaper {
  id: number
  title: string
  similarity_score: number
}

interface KnowledgeGraph {
  nodes: Array<{
    id: string
    label: string
    type: 'paper' | 'author' | 'keyword' | 'concept'
    properties?: any
  }>
  edges: Array<{
    source: string
    target: string
    relationship: string
    weight?: number
  }>
}

export default function PaperDetailPage() {
  const params = useParams()
  const paperId = params.id as string
  
  const [paper, setPaper] = useState<Paper | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [relatedPapers, setRelatedPapers] = useState<RelatedPaper[]>([])
  const [knowledgeGraph, setKnowledgeGraph] = useState<KnowledgeGraph | null>(null)
  const [loading, setLoading] = useState(true)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'summary' | 'graph' | 'related'>('overview')

  useEffect(() => {
    if (paperId) {
      fetchPaperDetails()
    }
  }, [paperId])

  const fetchPaperDetails = async () => {
    try {
      const response = await fetch(`/api/paper/${paperId}`)
      if (response.ok) {
        const data = await response.json()
        setPaper(data.paper)
        setRelatedPapers(data.relatedPapers || [])
        setKnowledgeGraph(data.knowledgeGraph || null)
      }
    } catch (error) {
      console.error('Error fetching paper details:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateSummary = async () => {
    if (!paper) return
    
    setSummaryLoading(true)
    try {
      const response = await fetch(`/api/paper/${paperId}/summary`, {
        method: 'POST'
      })
      if (response.ok) {
        const data = await response.json()
        setSummary(data.summary)
      }
    } catch (error) {
      console.error('Error generating summary:', error)
    } finally {
      setSummaryLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!paper) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Paper Not Found</h1>
          <Link href="/dashboard">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Badge variant={paper.source === 'NASA' ? 'default' : 'secondary'} className="mb-2">
              {paper.source}
            </Badge>
            <h1 className="text-3xl font-bold mb-2">{paper.title}</h1>
            <p className="text-muted-foreground mb-4">
              {Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">{paper.publication_year}</p>
            <p className="text-sm text-muted-foreground">{paper.file_name}</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: FileText },
            { id: 'summary', label: 'AI Summary', icon: BookOpen },
            { id: 'graph', label: 'Knowledge Graph', icon: Network },
            { id: 'related', label: 'Related Papers', icon: Hash }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4 inline mr-2" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Abstract</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {paper.abstract}
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Hash className="h-4 w-4 mr-2" />
                  Keywords
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {paper.keywords.map((keyword, index) => (
                    <Badge key={index} variant="outline">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Document Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {paper.page_count && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pages:</span>
                    <span>{paper.page_count}</span>
                  </div>
                )}
                {paper.file_size && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Size:</span>
                    <span>{(paper.file_size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Added:</span>
                  <span>{new Date(paper.created_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'summary' && (
        <div className="max-w-4xl">
          {!summary ? (
            <Card>
              <CardHeader>
                <CardTitle>AI-Generated Summary</CardTitle>
                <CardDescription>
                  Generate an intelligent summary of this paper using AI analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={generateSummary} disabled={summaryLoading}>
                  {summaryLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <BookOpen className="h-4 w-4 mr-2" />
                  )}
                  Generate Summary
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-relaxed">{summary.summary}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Key Findings</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-2">
                    {summary.key_findings.map((finding, index) => (
                      <li key={index} className="text-muted-foreground">{finding}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Methodology</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{summary.methodology}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Conclusions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-2">
                    {summary.conclusions.map((conclusion, index) => (
                      <li key={index} className="text-muted-foreground">{conclusion}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {activeTab === 'graph' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Network className="h-4 w-4 mr-2" />
              Knowledge Graph
            </CardTitle>
            <CardDescription>
              Visual representation of concepts and relationships in this paper
            </CardDescription>
          </CardHeader>
          <CardContent>
            {knowledgeGraph ? (
              <div className="h-96 bg-muted/20 rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">Knowledge graph visualization will be rendered here</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Knowledge graph not yet generated for this paper</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'related' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Hash className="h-4 w-4 mr-2" />
              Related Papers
            </CardTitle>
            <CardDescription>
              Papers with similar content and themes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {relatedPapers.length > 0 ? (
              <div className="space-y-4">
                {relatedPapers.map((relatedPaper) => (
                  <div key={relatedPaper.id} className="border rounded-lg p-4 hover:bg-muted/20 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <Link href={`/paper/${relatedPaper.id}`}>
                          <h4 className="font-medium hover:text-primary transition-colors">
                            {relatedPaper.title}
                          </h4>
                        </Link>
                      </div>
                      <Badge variant="outline">
                        {(relatedPaper.similarity_score * 100).toFixed(0)}% match
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No related papers found</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}