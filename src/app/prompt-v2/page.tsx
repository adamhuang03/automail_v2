'use client'

import { useState, KeyboardEvent } from 'react'
import { useChat } from 'ai/react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PlusCircle, Send, Bot, User } from 'lucide-react'

const INITIAL_MESSAGES = [
  {
    id: crypto.randomUUID(),
    role: 'assistant' as const,
    content: "Hey how many emails do you want to send out this week (up to 25)",
  },
]

const QUESTIONS = [
  "Hey how many emails do you want to send out this week (up to 25)",
  "Awesome! Which firms do you want to reach out to and the locations? (e.g. Evercore - New York, Moelis - San Francisco)",
  "Perfect :) Do you have any preferences on the people you're looking to outreach so we can personalize the email? (e.g. Same university as me, same clubs as me, only Canadian universities). Be as specific or broad as you'd like - let us know if you don't want the emails personalized.",
  "Thanks! Last step - can you please paste 3-5 of any past emails you've written that got replies? You can let me know where I should adjust the email for personalization",
]

export default function ChatInterface() {
  const [step, setStep] = useState(0)
  const [isTyping, setIsTyping] = useState(false)
  const { messages, input, handleInputChange, handleSubmit, setMessages } = useChat({
    initialMessages: INITIAL_MESSAGES,
  })

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim()) return

    handleSubmit(e)

    const nextStep = step + 1
    setStep(nextStep)

    if (nextStep < 4) {
      setIsTyping(true)
      setTimeout(() => {
        setMessages((prevMessages) => [...prevMessages, { 
          id: crypto.randomUUID(), 
          role: 'assistant' as const, 
          content: QUESTIONS[nextStep] 
        }])
        setIsTyping(false)
      }, 1500)
    } else if (nextStep === 4) {
      setIsTyping(true)
      setTimeout(() => {
        setMessages((prevMessages) => [
          ...prevMessages,
          { 
            id: crypto.randomUUID(), 
            role: 'assistant' as const, 
            content: "Sounds good! I'll send over an excel with all the emails drafted and the professionals' personalized emails" 
          },
        ])
        setIsTyping(false)
      }, 1500)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
    }
  }

  return (
    <div className="flex h-screen">
      <div className="hidden md:flex md:w-[260px] md:flex-col bg-muted">
        <div className="flex h-[60px] items-center px-4">
          <h1 className="font-semibold">Email Outreach Assistant</h1>
        </div>
        <div className="flex-1 overflow-auto">
          <div className="flex items-center px-4 py-2">
            <Button variant="outline" className="w-full justify-start">
              <PlusCircle className="mr-2 h-4 w-4" />
              New chat
            </Button>
          </div>
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        <header className="h-[60px] border-b flex items-center px-4 md:hidden">
          <h1 className="font-semibold">Email Outreach Assistant</h1>
        </header>
        <ScrollArea className="flex-1 p-4">
          {messages.map((message, i) => (
            <div
              key={i}
              className={`flex mb-4 ${
                message.role === 'assistant' ? 'justify-start' : 'justify-end'
              }`}
            >
              {message.role === 'assistant' ? (
                <Bot className="h-6 w-6 mr-2 text-blue-500 flex-shrink-0" />
              ) : (
                <User className="h-6 w-6 ml-2 text-green-500 flex-shrink-0" />
              )}
              <div
                className={`rounded-lg p-3 max-w-[80%] ${
                  message.role === 'assistant' ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start mb-4">
              <Bot className="h-6 w-6 mr-2 text-blue-500 flex-shrink-0" />
              <div className="bg-muted text-foreground rounded-lg p-3">
                <div className="typing-animation">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
        <div className="border-t p-4">
          <form onSubmit={handleFormSubmit} className="flex items-start space-x-2">
            <Textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type your message here..."
              className="flex-1 min-h-[80px] resize-none"
              rows={3}
            />
            <Button type="submit" size="icon" className="mt-1">
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

