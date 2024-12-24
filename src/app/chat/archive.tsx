'use client'

import { useState, useEffect } from 'react'
import { Bot, Send, Loader2, X, Copy, Download, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { motion, AnimatePresence } from 'framer-motion'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"

interface Message {
  id: string
  content: string
  type: 'user' | 'assistant'
  loading?: boolean
}

interface Person {
  id: string
  name: string
  linkedinUrl: string
}

interface EmailDraft {
  recipientName: string
  emailContent: string
}

export default function NetworkingAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hi! I\'m your networking assistant. What industry are you targeting?',
      type: 'assistant'
    }
  ])
  const [input, setInput] = useState('')
  const [currentStep, setCurrentStep] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [resultComplete, setResultComplete] = useState(false)
  const [results, setResults] = useState<Person[]>([])
  const [emailDrafts, setEmailDrafts] = useState<EmailDraft[]>([])
  const { toast } = useToast()

  // For Code 2
  const [draftFilter, setDraftFilter] = useState<'all' | 'undrafted' | 'drafted'>('all')
  const [selectAll, setSelectAll] = useState(false)
  // We'll create `draftEmails` by mapping `emailDrafts` once they're available:
  const [draftEmails, setDraftEmails] = useState<any[]>([])

  useEffect(() => {
    if (emailDrafts.length > 0) {
      // Map the simpler emailDrafts (from Code 1) to the richer draftEmails (for Code 2)
      const mapped = emailDrafts.map((d, index) => {
        const linkedPerson = results.find(r => r.name === d.recipientName)
        return {
          id: String(index),
          to_email: `${d.recipientName.toLowerCase().split(' ').join('.')}@example.com`, 
          subject: `Networking Introduction - ${d.recipientName}`,
          body: d.emailContent,
          linkedin_url: linkedPerson ? linkedPerson.linkedinUrl : '',
          draft_count: 1, // Since these are generated drafts, we can consider them as drafted
          selected: false
        }
      })
      setDraftEmails(mapped)
    }
  }, [emailDrafts, results])

  const handleEmailOpen = (emails: any[], openAll: boolean) => {
    // Placeholder: Implement your logic to open selected emails
    console.log('Opening emails:', emails, 'Open all:', openAll)
  }

  const handleEmailSelection = (id: string) => {
    setDraftEmails(prev =>
      prev.map(email => 
        email.id === id ? { ...email, selected: !email.selected } : email
      )
    )
  }

  const questions = [
    'What details about the position are you looking for?',
    'Are there specific companies you\'d like to target?',
    'Any preferred regions to focus on?'
  ]

  const handleSubmitMessage = async () => {
    if (!input.trim()) return

    const userMessageId = Date.now().toString()
    const assistantMessageId = (Date.now() + 1).toString()

    // Add user message
    setMessages(prev => [...prev, {
      id: userMessageId,
      content: input,
      type: 'user'
    }])

    setInput('')
    setIsProcessing(true)

    // Add loading message
    setMessages(prev => [...prev, {
      id: assistantMessageId,
      content: '',
      type: 'assistant',
      loading: true
    }])

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1000))

    if (currentStep < questions.length) {
      // Continue with questions
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { ...msg, content: questions[currentStep], loading: false }
          : msg
      ))
      setCurrentStep(prev => prev + 1)
    } else {
      // Process final results
      const mockResults = [
        { id: '1', name: 'John Doe', linkedinUrl: 'https://linkedin.com/in/johndoe' },
        { id: '2', name: 'Jane Smith', linkedinUrl: 'https://linkedin.com/in/janesmith' },
        { id: '3', name: 'Mike Johnson', linkedinUrl: 'https://linkedin.com/in/mikejohnson' }
      ]
      
      await new Promise(resolve => setTimeout(resolve, 1000))

      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { ...msg, content: 'Great! I\'ve found some matching profiles based on your criteria:', loading: false }
          : msg
      ))
      setResults(mockResults)
    }

    setIsProcessing(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmitMessage()
    }
  }

  const handleRemovePerson = (id: string) => {
    setResults(results.filter(person => person.id !== id))
  }

  const handleGenerateEmails = async () => {
    setIsProcessing(true)
    const assistantMessageId = Date.now().toString()

    setMessages(prev => [...prev, {
      id: assistantMessageId,
      content: '',
      type: 'assistant',
      loading: true
    }])

    await new Promise(resolve => setTimeout(resolve, 2000))

    const drafts = results.map(person => ({
      recipientName: person.name,
      emailContent: `Dear ${person.name},\n\nI hope this email finds you well. I came across your profile and was impressed by your experience...`
    }))

    setEmailDrafts(drafts)
    setMessages(prev => prev.map(msg => 
      msg.id === assistantMessageId 
        ? { ...msg, content: 'I\'ve drafted personalized emails for each contact:', loading: false }
        : msg
    ))
    setIsProcessing(false)
    setResultComplete(true)
  }

  const handleCopyEmail = (content: string) => {
    navigator.clipboard.writeText(content)
    toast({
      variant: "default",
      title: "Success!",
      description: "Email content has been copied to your clipboard",
    })
  }

  const handleDownloadAll = () => {
    const content = emailDrafts
      .map(draft => `To: ${draft.recipientName}\n\n${draft.emailContent}\n\n---\n\n`)
      .join('')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'email-drafts.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl space-y-8">
        <Card className="p-6">
          <div className="mb-6 flex items-center gap-2 text-2xl font-semibold">
            <Bot className="h-8 w-8 text-primary" />
            <h1>Networking Assistant</h1>
          </div>

          <div className="space-y-6">
            {/* Chat Messages */}
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                <AnimatePresence>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`rounded-lg px-3 py-1.5 max-w-[70%] text-sm ${
                          message.type === 'user'
                            ? 'bg-primary text-primary-foreground ml-auto'
                            : 'bg-muted'
                        }`}
                      >
                        {message.loading ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>...</span>
                          </div>
                        ) : (
                          message.content
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {/* Results List */}
                <AnimatePresence>
                  {results.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 ml-4"
                    >
                      <ScrollArea className="h-[300px] rounded-md border p-4 max-w-[80%]">
                        <div className="space-y-4">
                          {results.map((person) => (
                            <motion.div
                              key={person.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50"
                            >
                              <div>
                                <h3 className="font-medium">{person.name}</h3>
                                <a
                                  href={person.linkedinUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline"
                                >
                                  LinkedIn Profile <ExternalLink className="ml-1 inline h-3 w-3" />
                                </a>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemovePerson(person.id)}
                              >
                                <X className="h-4 w-4" />
                                <span className="sr-only">Remove {person.name}</span>
                              </Button>
                            </motion.div>
                          ))}
                        </div>
                      </ScrollArea>
                      <div className="flex justify-end">
                        <Button
                          className="w-auto"
                          onClick={handleGenerateEmails}
                          disabled={isProcessing || resultComplete}
                        >
                          {isProcessing ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Generate Email Drafts
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() && !isProcessing) {
                      handleSubmitMessage();
                    }
                  }
                }}
                placeholder="Type your message... (Shift+Enter for new line)"
                disabled={isProcessing}
                className="flex-1 min-h-[40px] max-h-[200px] resize-none transition-all duration-200"
                rows={1}
              />
              <Button
                size="icon"
                onClick={handleSubmitMessage}
                disabled={isProcessing || !input.trim()}
              >
                <Send className="h-4 w-4" />
                <span className="sr-only">Send message</span>
              </Button>
            </div>
          </div>
        {/* Code 2 integrated: show the table after results are complete */}
        {resultComplete && draftEmails.length > 0 && (
          <Card className="w-full max-w-8xl mx-auto mt-4">
            <CardContent>
              <div className="space-y-2 mt-4">
                <Button
                  variant="outline"
                  className="mb-4 mr-2"
                  onClick={() => {
                    handleEmailOpen(draftEmails, true)
                  }}
                >
                  Open Selected Emails
                </Button>
                <div className="mb-4 space-x-2">
                  <Button
                    variant={draftFilter === 'all' ? "default" : "outline"}
                    onClick={() => {
                      setDraftFilter('all')
                      setSelectAll(false)
                    }}
                  >
                    All Emails
                  </Button>
                  <Button
                    variant={draftFilter === 'undrafted' ? "default" : "outline"}
                    onClick={() => {
                      setDraftFilter('undrafted')
                      setSelectAll(false)
                    }}
                  >
                    Undrafted
                  </Button>
                  <Button
                    variant={draftFilter === 'drafted' ? "default" : "outline"}
                    onClick={() => {
                      setDraftFilter('drafted')
                      setSelectAll(false)
                    }}
                  >
                    Drafted
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px] pr-4">
                        <Checkbox
                          checked={selectAll}
                          onCheckedChange={(checked: boolean) => {
                            setSelectAll(checked)
                            // Update all emails selected state
                            setDraftEmails(prev =>
                              prev.map(email => ({ ...email, selected: checked }))
                            )
                          }}
                        />
                      </TableHead>
                      <TableHead className="pr-4">Email</TableHead>
                      <TableHead className="pr-4">Subject</TableHead>
                      <TableHead className="pr-4">Body</TableHead>
                      <TableHead>LinkedIn</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {draftEmails
                      .filter(email => {
                        if (draftFilter === 'drafted') return email.draft_count > 0
                        if (draftFilter === 'undrafted') return email.draft_count === 0
                        return true
                      })
                      .map((email) => (
                        <TableRow 
                          key={email.id}
                          className={email.draft_count > 0 ? "bg-green-100" : ""}
                        >
                          <TableCell className="w-[50px] pr-4">
                            <Checkbox
                              checked={email.selected}
                              onCheckedChange={() => handleEmailSelection(email.id)}
                            />
                          </TableCell>
                          <TableCell className="pr-4">{email.to_email}</TableCell>
                          <TableCell className="pr-4">{email.subject}</TableCell>
                          <TableCell className="pr-4 p-4">
                            <div className="border rounded p-4 shadow-sm shadow-gray-200">
                              <pre className="whitespace-pre-wrap font-['Open_Sans']">{email.body}</pre>
                            </div>
                          </TableCell>
                          <TableCell>
                            <a 
                              href={email.linkedin_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {email.linkedin_url.replace('https://www.linkedin.com/in/', '').slice(0, 10)}...
                            </a>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
        </Card>
      </div>
      <Toaster />
    </div>
  )
}
