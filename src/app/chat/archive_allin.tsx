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
  companyName: string
  location: string
  emailAddress?: string
  subjectLine?: string
  emailBody?: string
}

interface DraftEmail {
  id: string
  user_profile_id: string
  user_prompt_id: string
  profile_urn_id: string
  linkedin_url: string
  to_email: string
  subject: string
  body: string
  draft_count: number
  created_at: string
  selected?: boolean
}

const url = 'http://127.0.0.1:8000'
// const url = 'https://automail-ai-apple.vercel.app'

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
  const [draftEmails, setDraftEmails] = useState<DraftEmail[]>([])
  const [params, setParams] = useState<any>({})
  const [emailTemplate, setEmailTemplate] = useState('')
  const { toast } = useToast()

  const userLinkedin = 'https://www.linkedin.com/in/adamshuang/'

  // For Code 2
  const [draftFilter, setDraftFilter] = useState<'all' | 'undrafted' | 'drafted'>('all')
  const [selectAll, setSelectAll] = useState(false)
  // We'll create `draftEmails` by mapping `emailDrafts` once they're available:
  // const [draftEmails, setDraftEmails] = useState<any[]>([])

  // useEffect(() => {
  //   if (emailDrafts.length > 0) {
  //     // Map the simpler emailDrafts (from Code 1) to the richer draftEmails (for Code 2)
  //     const mapped = emailDrafts.map((d, index) => {
  //       const linkedPerson = results.find(r => r.name === d.recipientName)
  //       return {
  //         id: String(index),
  //         to_email: `${d.recipientName.toLowerCase().split(' ').join('.')}@example.com`, 
  //         subject: `Networking Introduction - ${d.recipientName}`,
  //         body: d.emailContent,
  //         linkedin_url: linkedPerson ? linkedPerson.linkedinUrl : '',
  //         draft_count: 1, // Since these are generated drafts, we can consider them as drafted
  //         selected: false
  //       }
  //     })
  //     setDraftEmails(mapped)
  //   }
  // }, [emailDrafts, results])

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
    'Any preferred regions to focus on?',
    'Are you looking for Canadian candidates?',
    'Lastly, can you share any past emails you\'ve written? This will help personalize the emails.'
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
      // Include the current message along with previous messages
      const allMessages = [...messages, {
        id: userMessageId,
        content: input,
        type: 'user'
      }]
      
      const userMessages = allMessages.filter(msg => msg.type === 'user').map(msg => msg.content)
      console.log('All user messages:', userMessages)

      const sampleText = `
      Key industry: {0}
      Job position: {1}
      Companies: {2}
      Specific locations: {3}
      Canadian?: {4}
      `
      const emailContent = userMessages.reduce((text, msg, i) => text.replace(`{${i}}`, msg), sampleText)
      setEmailTemplate(emailContent[4])
      console.log('Sample email content:', emailContent)
      
      // Process final results
      const mockResults = [
        { id: '1', name: 'John Doe', linkedinUrl: 'https://linkedin.com/in/johndoe' },
        { id: '2', name: 'Jane Smith', linkedinUrl: 'https://linkedin.com/in/janesmith' },
        { id: '3', name: 'Mike Johnson', linkedinUrl: 'https://linkedin.com/in/mikejohnson' }
      ]
      
      // await new Promise(resolve => setTimeout(resolve, 1000))

      const parmsAndTargetsResponse = await fetch(`${url}/extract-prompt-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ input: emailContent })
      })
      if (!parmsAndTargetsResponse.ok) {
        throw new Error(`HTTP error! status: ${parmsAndTargetsResponse.status}`);
      }
      const parmsAndTargetsText = await parmsAndTargetsResponse.text()
      const parmsAndTargets = JSON.parse(parmsAndTargetsText)
      console.log('Output from email generation:', parmsAndTargets)
      setParams(parmsAndTargets.params)
      
      // 
      const targetsCleaned = []
      for (const target of parmsAndTargets.targets) {
        const response = await fetch(`${url}/get-company-locations-id`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ "input": target })
        })
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const output = await response.text()
        const parsedOutput = JSON.parse(output)
        console.log('Output:', parsedOutput)
        const listOfCompanies = parsedOutput.targets.map((company: any) => company[0])
        if (listOfCompanies.includes('')) {
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: 'There was an error with the inputs, please refresh the page and try again.', loading: false }
              : msg
          ))
          throw new Error(`Error: invalid company name`)

        } else {
          targetsCleaned.push(parsedOutput)
        }
      }
      console.log('Output from email generation:', targetsCleaned)

      const preTargetsReady = targetsCleaned.flatMap((entity) => entity.targets)
      const targetsReadyLimits = preTargetsReady.length < 10 ? 
        [10 - (preTargetsReady.length-1), ...Array(preTargetsReady.length-1).fill(1)] : 
        Array(10).fill(1)
      const targetsReady = targetsReadyLimits.map((limit, i) => [limit, preTargetsReady[i]] )
      console.log('Targets Ready:', targetsReady)

      const people = []
      for (const targetSet of targetsReady) {
        const limit = targetSet[0]
        const target = targetSet[1]
        const response = await fetch(`${url}/execute-single-search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            search_keyword: `${parmsAndTargets.params.keyword_industry} ${parmsAndTargets.params.additional_filters.position}`,
            // existing_urn_ids: [],
            offset: 0,
            use_cad: parmsAndTargets.params.additional_filters.include_cad_schools_on_fill_search,
            company_name_for_passthrough: target[3], // 2 is the target_count
            company_urn: target[0],
            location_urn: target[1],
            target_count: 10,
            // school_urn_id: ,
          })
        })
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const output = await response.text()
        const parsedOutput = JSON.parse(output)
        console.log('Output from email generation:', parsedOutput)
        const firstResponseLength = parsedOutput.result?.length || 0
        if (firstResponseLength > 0) {
          people.push(...parsedOutput.result.slice(0, limit))
        } else {
          const response = await fetch(`${url}/execute-single-search`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              search_keyword: `${parmsAndTargets.params.keyword_industry} ${parmsAndTargets.params.additional_filters.position}`,
              // existing_urn_ids: [],
              offset: 10,
              use_cad: parmsAndTargets.params.additional_filters.include_cad_schools_on_fill_search,
              company_urn: target[0],
              location_urn: target[1],
              target_count: 10,
              // school_urn_id: ,
            })
          })
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const output = await response.text()
          const parsedOutput = JSON.parse(output)
          const secondResponseLength = parsedOutput.result?.length || 0
          if (secondResponseLength > 0) {
            const leftover = firstResponseLength - secondResponseLength;
            people.push(...parsedOutput.result.slice(0, Math.min(limit,leftover)));
          } else {
            people.push([])
          }
        }
      }
      console.log('Output from email generation:', people)

      const actualResults = people.map((person, index) => ({
        id: String(index),
        name: person[0],
        linkedinUrl: person[1],
        companyName: person[2],
        location: person[3]
      }))

      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { ...msg, content: 'Great! I\'ve found some matching profiles based on your criteria:', loading: false }
          : msg
      ))
      setResults(actualResults)
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

    try {
      const updateProgress = (message: string) => {
        console.log('Progress:', message);
        // TODO: Add UI progress indicator if needed
      };

      // run the email format generation
      let updatedResultsWithEmail: Person[] = []
      const companySorting = results.reduce((acc, person) => {
        const existingCompany = acc.find(company => company.companyName === person.companyName);
        if (existingCompany) {
          existingCompany.persons.push(person);
        } else {
          acc.push({
            companyName: person.companyName,
            persons: [person]
          });
        }
        return acc;
      }, [] as { companyName: string, persons: typeof results[number][] }[]);

      console.log('Preparing for email format generation:', companySorting)

      for (const companySet of companySorting) {
        const companyName = companySet.companyName
        const nameList = companySet.persons.map(person => person.name)
        
        const response = await fetch(`${url}/format-email-addresses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            company: companyName,
            names: nameList
          })
        })
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const output = await response.text()
        const parsedOutput = JSON.parse(output)
        const emailResults = parsedOutput.result

        // Update each person with their email address
        const updatedPersons = companySet.persons.map((person, index) => ({
          ...person,
          emailAddress: emailResults[index] || ''
        }));
        
        updatedResultsWithEmail = [...updatedResultsWithEmail, ...updatedPersons];
        console.log('Output from email format generation:', parsedOutput)
      }

      setResults(updatedResultsWithEmail)
      console.log('Updated people after email format generation:', updatedResultsWithEmail)

      const chunkSize = 5;
      const chunks: Person[][] = [];
      for (let i = 0; i < updatedResultsWithEmail.length; i += chunkSize) {
        chunks.push(updatedResultsWithEmail.slice(i, i + chunkSize));
      }
      
      const processChunk = async (urls: string[]): Promise<string[]> => {
        const response = await fetch(`${url}/draft-emails`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url_list: urls,
            keyword_industry: params.keyword_industry,
            user_linkedin_url: userLinkedin,
            email_template: emailTemplate
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('Failed to get response reader');

        const decoder = new TextDecoder();
        let draftedEmails: string[] = [];

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const updates = chunk.split('\n').filter(Boolean);
          
          for (const update of updates) {
            const data = JSON.parse(update);
            
            switch (data.status) {
              case 'completed':
                draftedEmails = data.emails;
                break;
              case 'progress':
                updateProgress(data.message);
                break;
              case 'error':
                throw new Error(data.message);
            }
          }
        }

        return draftedEmails;
      };

      let updatedResultsWithBody: Person[] = []
      for (let i = 0; i < chunks.length; i++) {
        updateProgress(`Processing batch ${i + 1} of ${chunks.length}`);
        const linkedinUrls = chunks[i].map(person => person.linkedinUrl).filter(Boolean);
        const chunkEmails = await processChunk(linkedinUrls);

        const chunkEmailsWithPerson = chunkEmails.map((email, index) => ({
          ...chunks[i][index],
          emailBody: email
        }));

        updatedResultsWithBody = [...updatedResultsWithBody, ...chunkEmailsWithPerson];
      }

      // Update email drafts state with the generated emails
      const resultsToEmaildraft = updatedResultsWithBody.map(person => ({
        id: person.id,
        user_profile_id: 'test-urn-id',
        user_prompt_id: 'test-urn-id',
        profile_urn_id: 'test-urn-id',
        linkedin_url: person.linkedinUrl,
        to_email: person.emailAddress || '',
        subject: person.subjectLine || 'Test',
        body: person.emailBody || '',
        draft_count: 0,
        created_at: '2023-08-30T00:00:00.000Z',
      }))
      console.log('Email drafts to be sent:', resultsToEmaildraft)
      setResultComplete(true)
      setIsProcessing(false)
      setDraftEmails((prevDraftEmails) => [...prevDraftEmails, ...resultsToEmaildraft])

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate emails. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setResultComplete(true)
      setIsProcessing(false);
    }
  }

  const test_post = async () => {
    const response = await fetch(`${url}/execute-single-search  `, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        search_keyword: `Investment Banking Analyst`,
        // existing_urn_ids: [],
        offset: 0,
        use_cad: true,
        company_urn: '1382',
        location_urn: '100025096',
        target_count: 10,
        // school_urn_id: ,
      })
    })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const output = await response.text()
    console.log('Output from email generation:', JSON.parse(output))
  }

  const test_post_emailaddresses = async () => {
    const response = await fetch(`${url}/format-email-addresses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        company: 'Apple',
        names: [
          "Nathan Beber", 
          "John Smith", 
          "Jane Doe",
          "Abdullah Chandna",
          "Hasan Raza",
          "Ahmed Ali",
          "Nathan Beber",
          "John Smith",
          "Jane Doe",
          "Abdullah Chandna"
        ]
      })
    })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const output = await response.text()
    console.log('Output from email generation:', JSON.parse(output))
  }

  const handleCopyEmail = (content: string) => {
    navigator.clipboard.writeText(content)
    toast({
      variant: "default",
      title: "Success!",
      description: "Email content has been copied to your clipboard",
    })
  }

  // const handleDownloadAll = () => {
  //   const content = emailDrafts
  //     .map(draft => `To: ${draft.recipientName}\n\n${draft.emailContent}\n\n---\n\n`)
  //     .join('')
  //   const blob = new Blob([content], { type: 'text/plain' })
  //   const url = URL.createObjectURL(blob)
  //   const a = document.createElement('a')
  //   a.href = url
  //   a.download = 'email-drafts.txt'
  //   document.body.appendChild(a)
  //   a.click()
  //   document.body.removeChild(a)
  //   URL.revokeObjectURL(url)
  // }

  return (
    <div className="min-h-screen">
      <Button
        variant="outline"
        className="fixed top-4 right-4 z-50"
        onClick={handleGenerateEmails}
      >
        Test Post
      </Button>
      <div className="mx-auto max-w-5xl space-y-8">
        <Card className="p-6">
          <div className="mb-6 flex items-center gap-2 text-2xl font-semibold">
            <Bot className="h-8 w-8 text-primary" />
            <h1>Networking Assistant</h1>
          </div>

          <div className="space-y-6">
            {/* Chat Messages */}
            <ScrollArea className="h-[450px] pr-4">
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
                          <pre className="font-sans whitespace-pre-wrap">
                            {message.content}
                          </pre>
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
                                <h3 className="text-lg">{person.name}</h3>
                                <p className="text-xs">{person.companyName} | {person.location}</p>
                                <a
                                  href={person.linkedinUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline"
                                  onClick={(e) => {
                                    e.currentTarget.rel = 'noopener noreferrer';
                                    e.currentTarget.target = '_blank';
                                  }}
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
                onChange={(e) => {
                  setInput(e.target.value);
                  // Auto-resize logic
                  e.target.style.height = 'inherit';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() && !isProcessing) {
                      handleSubmitMessage();
                      // Reset height after sending
                      (e.target as HTMLTextAreaElement).style.height = 'inherit';
                    }
                  }
                }}
                placeholder="Type your message... (Shift+Enter for new line)"
                disabled={isProcessing}
                className="flex-1 min-h-[40px] max-h-[200px] resize-none transition-all duration-200 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400 scrollbar-track-transparent"
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
        </Card>
      </div>
        {resultComplete && draftEmails.length > 0 && (
          <Card className="w-full max-w-5xl mx-auto mt-4">
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
      <Toaster />
    </div>
  )
}
