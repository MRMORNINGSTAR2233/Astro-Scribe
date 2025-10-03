"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Search, FileText, Users, Calendar, ExternalLink } from 'lucide-react'
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
  content_snippet?: string
  created_at: string
}

interface PapersResponse {
  papers: Paper[]
  total: number
}

export default function DashboardPage() {
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredPapers, setFilteredPapers] = useState<Paper[]>([])

  useEffect(() => {
    fetchPapers()
  }, [])

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = papers.filter(paper =>
        paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        paper.authors.some(author => author.toLowerCase().includes(searchQuery.toLowerCase())) ||
        paper.keywords.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      setFilteredPapers(filtered)
    } else {
      setFilteredPapers(papers)
    }
  }, [searchQuery, papers])

  const fetchPapers = async () => {
    try {
      const response = await fetch('/api/papers')
      if (response.ok) {
        const data: PapersResponse = await response.json()
        setPapers(data.papers)
        setFilteredPapers(data.papers)
      }
    } catch (error) {
      console.error('Error fetching papers:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Research Papers Dashboard</h1>
        <p className="text-muted-foreground">
          Explore {papers.length} research papers in the knowledge base
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search papers by title, authors, or keywords..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Papers</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{papers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NASA Papers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {papers.filter(p => p.source === 'NASA').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Uploads</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {papers.filter(p => p.source === 'User Upload').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Papers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPapers.map((paper) => (
          <Card key={paper.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <Badge variant={paper.source === 'NASA' ? 'default' : 'secondary'}>
                  {paper.source}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {paper.publication_year}
                </span>
              </div>
              <CardTitle className="text-lg line-clamp-2">
                {paper.title}
              </CardTitle>
              <CardDescription className="line-clamp-3">
                {paper.abstract}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-1">Authors:</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors}
                  </p>
                </div>
                
                {paper.keywords && paper.keywords.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Keywords:</p>
                    <div className="flex flex-wrap gap-1">
                      {paper.keywords.slice(0, 3).map((keyword, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                      {paper.keywords.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{paper.keywords.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-3">
                  <Link href={`/paper/${paper.id}`}>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPapers.length === 0 && searchQuery && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No papers found matching "{searchQuery}"
          </p>
        </div>
      )}
    </div>
  )
}
