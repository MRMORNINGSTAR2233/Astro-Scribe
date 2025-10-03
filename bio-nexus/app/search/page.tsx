"use client"

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Mic, MicOff, Send, FileText, Brain, History, Sparkles, Menu, ChevronLeft } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import Link from 'next/link'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: Array<{
    paperId: number
    title: string
    relevanceScore: number
    snippet: string
  }>
  isFactChecked?: boolean
}

interface ChatSession {
  id: string
  title: string
  createdAt: Date
  lastMessageAt: Date
  messageCount: number
}

export default function ConversationalSearchPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [showSidebar, setShowSidebar] = useState(true)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    loadChatSessions()
    initializeSpeechRecognition()
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const initializeSpeechRecognition = () => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      
      if (recognitionRef.current) {
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = false
        recognitionRef.current.lang = 'en-US'
        
        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript
          setInput(transcript)
        }
        
        recognitionRef.current.onend = () => {
          setIsListening(false)
        }
        
        recognitionRef.current.onerror = () => {
          setIsListening(false)
        }
      }
    }
  }

  const startListening = () => {
    if (recognitionRef.current) {
      setIsListening(true)
      recognitionRef.current.start()
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsListening(false)
  }

  const loadChatSessions = async () => {
    try {
      const response = await fetch('/api/chat/sessions')
      if (response.ok) {
        const sessions = await response.json()
        setChatSessions(sessions)
      }
    } catch (error) {
      console.error('Error loading chat sessions:', error)
    }
  }

  const createNewSession = async () => {
    try {
      const response = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `New Chat - ${new Date().toLocaleDateString()}` })
      })
      
      if (response.ok) {
        const session = await response.json()
        setCurrentSessionId(session.id)
        setMessages([])
        loadChatSessions()
      }
    } catch (error) {
      console.error('Error creating new session:', error)
    }
  }

  const loadSession = async (sessionId: string) => {
    try {
      setCurrentSessionId(sessionId)
      const response = await fetch(`/api/chat/sessions/${sessionId}/messages`)
      if (response.ok) {
        const sessionMessages = await response.json()
        setMessages(sessionMessages)
      }
    } catch (error) {
      console.error('Error loading session:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // If no session, create one
      if (!currentSessionId) {
        await createNewSession()
      }

      const response = await fetch('/api/chat/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMessage.content,
          sessionId: currentSessionId,
          messageHistory: messages.slice(-5) // Send last 5 messages for context
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          sources: data.sources,
          isFactChecked: data.isFactChecked
        }

        setMessages(prev => [...prev, assistantMessage])
      } else {
        throw new Error('Failed to get response')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your question. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className={`${showSidebar ? 'w-80' : 'w-0'} transition-all duration-300 border-r bg-muted/20 flex flex-col overflow-hidden`}>
        <div className="p-4 border-b">
          <Button onClick={createNewSession} className="w-full">
            <Sparkles className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>
        
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-2">
            {chatSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => loadSession(session.id)}
                className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted ${
                  currentSessionId === session.id ? 'bg-muted' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium truncate">{session.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      {session.messageCount} messages • {new Date(session.lastMessageAt).toLocaleDateString()}
                    </p>
                  </div>
                  <History className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2"
              >
                {showSidebar ? (
                  <ChevronLeft className="h-4 w-4" />
                ) : (
                  <Menu className="h-4 w-4" />
                )}
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Bio-Nexus Assistant</h1>
                <p className="text-muted-foreground">Ask questions about space biology research papers</p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <Brain className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Welcome to Bio-Nexus Assistant</h3>
                <p className="text-muted-foreground mb-6">
                  Ask me anything about space biology research. I can help you find papers, 
                  explain concepts, and provide insights from our knowledge base.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                  <Card className="cursor-pointer hover:bg-muted/50 transition-colors" 
                        onClick={() => setInput("What are the effects of microgravity on bone density?")}>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">Microgravity Effects</h4>
                      <p className="text-sm text-muted-foreground">Learn about biological responses to weightlessness</p>
                    </CardContent>
                  </Card>
                  <Card className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setInput("How does space radiation affect astronaut health?")}>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">Radiation Impact</h4>
                      <p className="text-sm text-muted-foreground">Understand space radiation effects on human health</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <Avatar>
                  <AvatarFallback>
                    {message.role === 'user' ? 'U' : 'AI'}
                  </AvatarFallback>
                </Avatar>
                
                <div className={`flex-1 max-w-3xl ${message.role === 'user' ? 'text-right' : ''}`}>
                  <Card className={message.role === 'user' ? 'bg-primary text-primary-foreground' : ''}>
                    <CardContent className="p-4">
                      <p className="leading-relaxed">{message.content}</p>
                      
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border/50">
                          <h4 className="text-sm font-medium mb-2 flex items-center">
                            <FileText className="h-4 w-4 mr-2" />
                            Sources ({message.sources.length})
                          </h4>
                          <div className="space-y-2">
                            {message.sources.map((source, index) => (
                              <div key={index} className="text-sm">
                                <Link 
                                  href={`/paper/${source.paperId}`}
                                  className="font-medium hover:underline text-primary"
                                >
                                  {source.title}
                                </Link>
                                <p className="text-muted-foreground mt-1">{source.snippet}</p>
                                <Badge variant="outline" className="mt-1">
                                  {(source.relevanceScore * 100).toFixed(0)}% relevant
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {message.isFactChecked && (
                        <div className="mt-2 flex items-center text-green-600 text-xs">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Fact-checked against knowledge base
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <p className="text-xs text-muted-foreground mt-1 px-4">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-4">
                <Avatar>
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
                <Card className="flex-1 max-w-3xl">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-muted-foreground">Searching knowledge base...</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t p-4">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  value={input}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
                  placeholder="Ask me about space biology research..."
                  disabled={isLoading}
                  className="pr-12"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-8 w-8 p-0"
                  onClick={isListening ? stopListening : startListening}
                  disabled={isLoading}
                >
                  {isListening ? (
                    <MicOff className="h-4 w-4 text-red-500" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button type="submit" disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {isListening && (
              <div className="text-center mt-2">
                <span className="text-sm text-muted-foreground animate-pulse">
                  🎤 Listening... Speak now
                </span>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}