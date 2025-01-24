'use client'

import { useState, useEffect, useRef } from 'react'
import { Bot, Send, Loader2, X, Copy, Download, ExternalLink, Redo, Undo2, Undo, Undo2Icon, LogOut, CopyIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { motion, AnimatePresence } from 'framer-motion'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { supabase } from '@/lib/db/supabase'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import clsx from 'clsx';
import { Input } from '@/components/ui/input'
import Image from 'next/image'
import LinkedinDash from './linkedinComponent'

export interface Message {
  id: string
  content: any 
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
  id?: string
  user_profile_id: string
  user_prompt_id?: string
  public_id: string
  linkedin_url: string
  to_email: string
  subject: string
  body: string
  draft_count: number
  created_at?: string
  selected?: boolean
}

interface UserProfile {
  id: string
  user_prompt_id?: string
  full_name: string
  monthly_email_limit: number
  monthly_refresh_date?: string
  email_usage: number
  linkedin_url?: string
  email_template_last_input?: string
  school_urn_id?: string
  school_result_set?: string
  avatar_url?: string
  created_at?: string
}

// const url = 'http://127.0.0.1:8000'
const url = 'https://automail-ai-apple.vercel.app'


export default function NetworkingAssistant() {
  const [messages, setMessages] = useState<Message[]>([{
    id: '1',
    content: '',
    type: 'assistant',
    loading: true
  }])
  const message1 = "Hey! This is the automail at your service.\n\nWhat career path/industry are you targeting? (ie. Software Engineering, Investment Banking, etc.)"
  const message1b = "Hey! This is the automail at your service.\n\nPlease login to LinkedIn to get started."
  const message2 = "What is your name?"
  // const freeTrialMessage = "You are currently on a free trial and have reached your email limit. If you\'d like to upgrade, come join us here!"
  const freeTrialMessage = (
    <span>
      You are currently on a free trial and have reached your email limit. If you'd like to upgrade, come join us <a className="text-blue-600 underline" href="https://tally.so/r/3yjPvX">here</a>!
    </span>
  )
  const paidUserMessage = (
    <span>
      You have reached your email limit. If you'd like more, reach out to us directly or contact us at <a className="text-blue-600 underline" href="mailto:tryautomail@gmail.com">tryautomail@gmail.com</a>!
    </span>
  )
  const [user, setUser] = useState<UserProfile | null>(null)
  const [chatId, setChatId] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [input, setInput] = useState('')
  const [existingPublicIds, setExistingPublicIds] = useState<string[]>([''])
  const [currentStep, setCurrentStep] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [resultComplete, setResultComplete] = useState(false)
  const [results, setResults] = useState<Person[]>([])
  const [draftEmails, setDraftEmails] = useState<DraftEmail[]>([])
  const [params, setParams] = useState<any>({})
  const [emailSubject, setEmailSubject] = useState('')
  const [emailTemplate, setEmailTemplate] = useState('')
  const [currentMailtoLinks, setCurrentMailtoLinks] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { toast } = useToast()
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const userLinkedin = 'https://www.linkedin.com/in/adamshuang/'
  const [draftFilter, setDraftFilter] = useState<'all' | 'undrafted' | 'drafted'>('undrafted')
  const [selectAll, setSelectAll] = useState(false)

  const [schoolResults, setSchoolResults] = useState<Array<{
    school: string;
    school_urn_id: string;
  }>>([]);
  const [schoolResultsRaw, setSchoolResultsRaw] = useState<string>('');
  const [linkedinUrl, setLinkedinUrl] = useState<string>('');
  const [isSchoolDialogOpen, setIsSchoolDialogOpen] = useState(false);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [hasLinkedin, setHasLinkedin] = useState(false);
  const [isLinkedInLoading, setIsLinkedInLoading] = useState(false);
  const [cookies, setCookies] = useState<any>(null)

  const questions = [
    'What senority would you like to target? (ie. Junior, Analyst, Principal, etc.)\n\nIf it doesn\'t matter, just type "any".',
    'Are there specific companies you\'d like to target?',
    'Any preferred regions to focus my search on?',
    'Are you looking for Canadian candidates?',
    'What would you like your subject line to be?',
    'Lastly, can you share any past emails you\'ve written? This will help personalize the emails.'
  ]
  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      }
    };
    
    // Scroll immediately
    scrollToBottom();
    // Also scroll after a short delay to ensure content is rendered
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages]);

  useEffect(() => {
    (async () => {
      try {
        // Check if there is a user session
        const { data: { session } } = await supabase.auth.getSession()
        let profile = null;
        
        if (session) {
          // If there is, grab a profile
          const { data: profileExisiting, error: fetchError } = await supabase
            .from('user_profile')
            .select()
            .eq('id', session.user.id)
            .single()
          profile = profileExisiting
          console.log("Existing profile", profile)

          if (fetchError && fetchError.code === 'PGRST116') {
            // If there is no profile, create one
            const { data: profileNew, error: createError } = await supabase
              .from('user_profile')
              .insert([{ 
                id: session.user.id,
                full_name: session.user.user_metadata.name
              }])
              .select('*')
              .single()

            if (!profileNew) {
              console.error('Error creating user profile.')
              return
            } else {
              console.log('Error creating user profile (if any)', createError)
              profile = profileNew
              console.log("New profile", profile)
              const { data: updateProfileData, error: updateError } = await supabase
                  .from('user_profile')
                  .update({ 
                    monthly_email_limit: 15,
                    email_usage: 0
                  })
                  .eq('id', profile.id)
                  .select('*')
                  .single()
                if (updateProfileData) {
                  console.log('Updated user profile', updateProfileData)
                  setMessages(prev => prev.map(msg => 
                    msg.id === "1" 
                      ? { ...msg, content: message1b, loading: false }
                      : msg
                  ))
                  setUser(updateProfileData)
                }
                if (updateError) {
                  console.error('Error updating user profile:', updateError)
                  setMessages(prev => prev.map(msg => 
                    msg.id === "1" 
                      ? { ...msg, content: "There was an error, please refresh the page.", loading: false }
                      : msg
                  ))
                }
            }
          } else {
            const setUpMessage = (dummyHasLinkedin: boolean) => {
              if (!dummyHasLinkedin) {
                setMessages(prev => prev.map(msg => 
                  msg.id === "1" 
                    ? { ...msg, content: message1b, loading: false }
                    : msg
                ))
              } else {
                setMessages(prev => prev.map(msg => 
                  msg.id === "1" 
                    ? { ...msg, content: message1, loading: false }
                    : msg
                ))
              }
            }
            // If there is a profile, grab it
            console.log('User profile exists', profile)
            setCookies(profile.cookies)
            let dummyHasLinkedin = false
            if (profile?.cookies && profile?.cookies.length > 0
              && profile?.linkedin_email && profile?.linkedin_password
            ) setHasLinkedin(true); dummyHasLinkedin = true;

            console.log('Has linkedin', dummyHasLinkedin)

            if (profile?.monthly_refresh_date) {
              // we manually set the refresh date when paid customer signs up
              // we manually set the email limit to 100 when paid customer signs up
              const today = new Date().toISOString().split('T')[0]
              console.log('Today is', today)
              console.log('Monthly refresh date is', profile.monthly_refresh_date)

              if (today >= profile.monthly_refresh_date) {
                console.log('Monthly refresh date has passed')
                const updatedRefreshDate = new Date(profile.monthly_refresh_date)
                updatedRefreshDate.setMonth(updatedRefreshDate.getMonth() + 1)
                console.log('Next monthly refresh date is', updatedRefreshDate)

                const { data: updateData, error: updateError } = await supabase
                  .from('user_profile')
                  .update({ 
                    monthly_refresh_date: updatedRefreshDate.toISOString().split('T')[0],
                    email_usage: 0
                  })
                  .eq('id', profile.id)
                  .select('*')
                  .single()
                if (updateError) {
                  console.error('Error updating user profile:', updateError)
                } else {
                  console.log('Successfully updated user profile usage set to 0, monthly refresh date updated to next month', updateData)
                  setUser(updateData)
                  setUpMessage(dummyHasLinkedin)
                }
              } else {
                if (profile?.email_usage === profile?.monthly_email_limit) { // If no monthly_email_limit is set, meaning new user
                  setIsProcessing(true)
                  setUser(profile)
                  setMessages(prev => prev.map(msg => 
                    msg.id === "1" 
                      ? { ...msg, content: paidUserMessage, loading: false }
                      : msg
                  ))  
                } else {
                  setUser(profile)
                  setUpMessage(dummyHasLinkedin)
                }
              }

            } else {
              if (!profile?.monthly_email_limit) { // If no monthly_email_limit is set, meaning new user
                const { data: updateProfileData, error: updateError } = await supabase
                  .from('user_profile')
                  .update({ 
                    monthly_email_limit: 15,
                    email_usage: 0
                  })
                  .eq('id', profile.id)
                  .select('*')
                  .single()
                if (updateProfileData) {
                  console.log('Updated user profile', updateProfileData)
                  setUpMessage(dummyHasLinkedin)
                  setUser(updateProfileData)
                }
                if (updateError) {
                  console.error('Error updating user profile:', updateError)
                  setMessages(prev => prev.map(msg => 
                    msg.id === "1" 
                      ? { ...msg, content: "There was an error, please refresh the page.", loading: false }
                      : msg
                  ))
                }
              } else {
                if (profile?.email_usage === profile?.monthly_email_limit) { // If no monthly_email_limit is set, meaning new user
                  setIsProcessing(true)
                  setUser(profile)
                  setMessages(prev => prev.map(msg => 
                    msg.id === "1" 
                      ? { ...msg, content: freeTrialMessage, loading: false }
                      : msg
                  ))  
                } else {
                  setUser(profile)
                  console.log('here')
                  setUpMessage(dummyHasLinkedin)
                }
              }
            }

            const { data: draftData, error: draftError } = await supabase
              .from('draft_emails')
              .select('*')
              .eq('user_profile_id', profile.id)
              // .eq('draft_count', 0)
            if (draftError) {
              console.error('Error fetching draft emails:', draftError)
            } else {
              console.log('Draft emails fetched', draftData)
              setDraftEmails(draftData)
              setExistingPublicIds(
                draftData.filter(draft => draft.public_id !== null)
                .map(draft => draft.public_id)
              )
            }
          }
        } else {
          router.push('/login')
        }
      } catch (err) {
        console.error('Error checking user profile:', err)
      } finally {
      }
    })()
  }, [router])

  const handleSubmitMessage = async () => {
    if (!input.trim()) return

    const userMessageId = Date.now().toString()
    const assistantMessageId = (Date.now() + 1).toString()
    let chatIdLocal = chatId

    setMessages(prev => [...prev, {
      id: userMessageId,
      content: input,
      type: 'user'
    }])

    setInput('')
    setIsProcessing(true)

    setMessages(prev => [...prev, {
      id: assistantMessageId,
      content: '',
      type: 'assistant',
      loading: true
    }])

    await new Promise(resolve => setTimeout(resolve, 1000))

    if (currentStep < questions.length) {
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { ...msg, content: questions[currentStep], loading: false }
          : msg
      ))
      setCurrentStep(prev => prev + 1)
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    } else {
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
      setEmailTemplate(userMessages[6])
      setEmailSubject(userMessages[5])
      console.log('Sample email content:', emailContent)

      const promptText = {
        prompt_content: emailContent,
        subject_line: userMessages[5],
        email_template: userMessages[6]
      }
      console.log('Prompt text:', promptText)

      const { data, error } = await supabase
        .from('chat_history')
        .insert([
          {
            user_profile_id: user?.id,
            prompt_text: JSON.stringify(promptText),
            existing_public_ids: existingPublicIds
          }
        ])
        .select("*")
      if (data) {
        console.log('Chat history inserted', data)
        setChatId(data[0].id)
        chatIdLocal = data[0].id
      }
      if (error) {
        console.error('Error inserting chat history:', error)
      }

      const { data: profile, error: updateError } = await supabase
        .from('user_profile')
        .update({
          email_template_last_input: userMessages[6]
        })
        .eq('id', user?.id)
        .select('*')
        .single()
      if (profile) {
        setUser(profile)
      }
      if (updateError) {
        console.error('Error updating user profile:', updateError)
      }

      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { ...msg, content: 'Thinking of search terms...', loading: true }
          : msg
      ))
      
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
      
      const targetsCleaned = []
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { ...msg, content: 'Structuring search query...', loading: true }
          : msg
      ))
      for (const target of parmsAndTargets.targets) {
        const response = await fetch(`${url}/get-company-locations-id`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ "input": target, "cookies": cookies })
        })
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const output = await response.text()
        const parsedOutput = JSON.parse(output)
        console.log('Output:', parsedOutput)
        const listOfCompanies = parsedOutput.targets.map((company: any) => company[0])
        if (listOfCompanies.includes('') || listOfCompanies.includes('Error finding company')) {
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
      console.log('Existing Public IDs:', existingPublicIds)

      const people = []

      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { ...msg, content: 'Running search...', loading: true }
          : msg
      ))
      
      for (const targetSet of targetsReady) {
        const limit = targetSet[0]
        const target = targetSet[1]
        const searchCriteria = {
          search_keyword: `${parmsAndTargets.params.keyword_industry} ${parmsAndTargets.params.additional_filters.position}`,
          existing_public_ids: existingPublicIds,
          use_cad: parmsAndTargets.params.additional_filters.include_cad_schools_on_fill_search,
          offset: 0,
          company_name_for_passthrough: target[3], // 2 is the target_count
          company_urn: target[0],
          location_urn: target[1],
          target_count: 10,
          school_urn_id: user?.school_urn_id || "",
          cookies: cookies
        }
        console.log('Search Criteria:', searchCriteria)

        const response = await fetch(`${url}/execute-single-search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(searchCriteria)
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
          searchCriteria.offset = 10
          const response = await fetch(`${url}/execute-single-search`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(searchCriteria)
          })
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const output = await response.text()
          const parsedOutput = JSON.parse(output)
          const secondResponseLength = parsedOutput.result?.length || 0
          if (secondResponseLength > 0) {
            const leftover = limit - firstResponseLength;
            people.push(...parsedOutput.result.slice(0, Math.min(limit,leftover)));
          }
        }
      }
      console.log('Output from email generation:', people)

      if (people.length === 0) {
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: "No matching profiles found based on your criteria as you've most likely sent emails to all available profiles. You can refresh the page and try another search.", loading: false }
            : msg
        ))  
        return
      }

      const actualResults = people.map((person, index) => ({
        id: String(index),
        name: person[0],
        linkedinUrl: person[1],
        companyName: person[2],
        location: person[3]
      }))

      const { error: peopleUpdateError } = await supabase
        .from('chat_history')
        .update({
          people_found_list: JSON.stringify(actualResults),
          people_found_count: actualResults.length
        })
        .eq('id', chatIdLocal)
      if (peopleUpdateError) {
        console.error('Error updating chat history:', peopleUpdateError)
      }

      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { ...msg, content: 'Great! I\'ve found some matching profiles based on your criteria:', loading: false }
          : msg
      ))
      setResults(actualResults)
    }

    setIsProcessing(false)
    setShowResults(true)
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
    setShowResults(false)
    const assistantMessageId = Date.now().toString()

    setMessages(prev => [...prev, {
      id: assistantMessageId,
      content: '',
      type: 'assistant',
      loading: true
    }])

    try {
      const { error: peopleUpdateError } = await supabase
        .from('chat_history')
        .update({
          people_left_list: JSON.stringify(results),
          people_left_count: results.length
        })
        .eq('id', chatId)
      if (peopleUpdateError) {
        console.error('Error updating chat history:', peopleUpdateError)
      }
      const currentEmailUsage = (user?.email_usage || 0) + results.length
      if (currentEmailUsage <= (user?.monthly_email_limit || 0)) {
        const { data: profile, error: userUpdateError } = await supabase
          .from('user_profile')
          .update({
            email_usage: currentEmailUsage
          })
          .eq('id', user?.id)
          .select("*")
          .single()
  
        if (profile) {
          console.log('User profile updated:', profile)
          setUser(profile)
        }
        if (userUpdateError) {
          console.error('Error updating chat history:', userUpdateError)
        } 
      } else {
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: `You tried to use ${results.length} emails, but you have only ${(user?.monthly_email_limit || 0) - (user?.email_usage || 0)} emails left. Please contact support if you need more emails.`, loading: false }
            : msg
        ))
        return
      }

      const updateProgress = (message: string) => {
        console.log('Progress:', message);
      };

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
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { ...msg, content: 'Searching for email addresses...', loading: true }
          : msg
      ))
      const emailFormatAndPattern = []
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
            names: nameList,
          })
        })
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const output = await response.text()
        const parsedOutput = JSON.parse(output)
        const emailResults = parsedOutput.result
        let updatedPersons = null
        if (emailResults.length === 0) {
          console.log('No email addresses found for company', companyName)
          updatedPersons = companySet.persons.map((person, index) => ({
            ...person,
            emailAddress: 'verifying@gmail.com'
          }));
        } else {
          updatedPersons = companySet.persons.map((person, index) => ({
            ...person,
            emailAddress: emailResults[index] || ''
          }));
        }
        emailFormatAndPattern.push(parsedOutput.format)
        
        updatedResultsWithEmail = [...updatedResultsWithEmail, ...updatedPersons];
        console.log('Output from email format generation:', parsedOutput)
      }

      setResults(updatedResultsWithEmail)
      console.log('Updated people after email format generation:', updatedResultsWithEmail)

      const { error: emailFormatSaveError } = await supabase
        .from('chat_history')
        .update({
          email_format_pattern: JSON.stringify(emailFormatAndPattern),
        })
        .eq('id', chatId)
      if (emailFormatSaveError) {
        console.error('Error saving email format:', emailFormatSaveError)
      }

      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { ...msg, content: 'Generating personalized emails...', loading: true }
          : msg
      ))

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
            email_template: emailTemplate,
            cookies: cookies
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
          subjectLine: emailSubject,
          emailBody: email
        }));

        updatedResultsWithBody = [...updatedResultsWithBody, ...chunkEmailsWithPerson];
      }

      const resultsToEmaildraft = updatedResultsWithBody.map(person => ({
        user_profile_id: user?.id,
        public_id: person.linkedinUrl.split('?')[0].split('/')[4] || '',
        linkedin_url: person.linkedinUrl,
        to_email: person.emailAddress || '',
        subject: person.subjectLine || 'Test',
        body: person.emailBody || '',
        draft_count: 0,
      }))
      console.log('Email drafts to be sent:', resultsToEmaildraft)
      const emailToSupabase = resultsToEmaildraft.map(({ ...email }) => email)
      console.log('Emails to be sent to Supabase:', emailToSupabase)
      const { data, error } = await supabase
        .from('draft_emails')
        .insert(emailToSupabase)
        .select('*')

      if (error) {
        console.error('Error inserting email drafts:', error);
        toast({
          title: 'Error',
          description: 'Failed to insert email drafts. Please try again.',
          variant: 'destructive'
        });
      } else {
        console.log('Email drafts inserted successfully:', data);
        setDraftEmails((prevDraftEmails) => [...prevDraftEmails, ...data])
        setExistingPublicIds((prevExisitngPublicIds) => [
          ...prevExisitngPublicIds, 
          ...data.map((email: any) => email.public_id)
        ])
        toast({
          title: 'Success',
          description: 'Email drafts have been inserted successfully.',
        });
        const { error: draftUpdateError } = await supabase
          .from('chat_history')
          .update({
            people_full_drafted: JSON.stringify(data)
          })
          .eq('id', chatId)
        if (draftUpdateError) {
          console.error('Error updating chat history:', draftUpdateError)
        }
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: 'Here! I\'ve drafted personalized emails for each contact.', loading: false }
            : msg
        ))
      }

      setResultComplete(true)
      // setIsProcessing(false)
      // setDraftEmails((prevDraftEmails) => [...prevDraftEmails, ...resultsToEmaildraft])

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate emails. Please try again.',
        variant: 'destructive'
      });
      const { data: errorListString, error: errorListError } = await supabase
        .from('chat_history')
        .select('error_list')
        .eq('id', chatId)
      console.log('Error list:', errorListString)
      if (errorListError) {
        console.error('Error updating chat history:', errorListError)
      }
    } finally {
      setResultComplete(true)
      // setIsProcessing(false);
    }
  }

  const handleCopyEmail = (content: string) => {
    navigator.clipboard.writeText(content)
    toast({
      variant: "default",
      title: "Success!",
      description: "Email content has been copied to your clipboard",
    })
  }

  const handleEmailSelection = (emailId: string) => {
    setDraftEmails(prevEmails => 
      prevEmails.map(email => 
        email.id === emailId ? { ...email, selected: !email.selected } : email
      )
    );
  };

  useEffect(() => {
    if (selectAll) {
      setDraftEmails(prevEmails => 
        prevEmails.map(email => {
          if (
            (draftFilter === 'drafted' && email.draft_count > 0) ||
            (draftFilter === 'undrafted' && email.draft_count === 0) ||
            draftFilter === 'all'
          ) {
            return { ...email, selected: true };
          }
          return email;
        })
      );
    } else {
      setDraftEmails(prevEmails => 
        prevEmails.map(email => {
          if (
            (draftFilter === 'drafted' && email.draft_count > 0) ||
            (draftFilter === 'undrafted' && email.draft_count === 0) ||
            draftFilter === 'all'
          ) {
            return { ...email, selected: false };
          }
          return email;
        })
      );
    }
  }, [selectAll, draftFilter]);

  const handleEmailOpen = async (draftEmails: DraftEmail[], selectedOnly: boolean = false) => {
    const emailsToOpen = selectedOnly 
      ? draftEmails.filter(email => email.selected)
      : draftEmails;

    try {
      // Update draft count for each email individually
      for (const email of emailsToOpen) {
        email.draft_count += 1
        const { data, error } = await supabase
          .from('draft_emails')
          .update({ draft_count: email.draft_count })
          .eq('id', email.id)
          .select('*')

        if (data) {
          setDraftEmails(prevEmails => 
            prevEmails.map(prevEmail => 
              prevEmail.id === email.id ? { ...prevEmail, draft_count: email.draft_count } : prevEmail
            )
          );
        }

        if (error) {
          console.error('Error updating draft count:', error)
          return
        }
      }
    } catch (err) {
      console.error('Error updating draft counts:', err)
      return
    }

    if (emailsToOpen.length === 0) {
      console.log('No emails selected');
      return;
    }

    // Create all mailto links first
    const mailtoLinks = emailsToOpen.map(email => 
      `mailto:${email.to_email}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`
    );

    // Open first email immediately
    window.open(mailtoLinks[0], '_blank', 'noopener=true');

    // Only show dialog if there are more emails
    if (mailtoLinks.length > 1) {
      setCurrentMailtoLinks(mailtoLinks);
      setCurrentIndex(1); // Start from second email
      setIsDialogOpen(true);
    }
  };

  const handleContinue = () => {
    if (currentMailtoLinks.length > 0) {
      // Open all remaining emails
      for (let i = currentIndex; i < currentMailtoLinks.length; i++) {
        setTimeout(() => {
          console.log('Opening email', currentMailtoLinks[i])
          window.open(currentMailtoLinks[i], '_blank');
        }, 500);
      }
      // Close dialog and reload page
      setIsDialogOpen(false);
      // window.location.reload();
    }
  };

  const handleReverse = () => {
    // Find the last two messages (user's message and the previous assistant message)
    const lastTwoMessages = messages.slice(-2);
    if (lastTwoMessages.length === 2) {
      // Remove the last two messages
      setMessages(messages.slice(0, -2));
      // Reset the input to the user's last message
      // setInput(lastTwoMessages[0].content);
      setCurrentStep(currentStep - 1);

      setTimeout(() => {
        textareaRef.current?.focus();
        // const length = textareaRef.current?.value.length ?? 0;
        // textareaRef.current?.setSelectionRange(length, length);
      }, 100);
    }
  };

  return (
    <div className="min-h-screen mt-8">
      {/* <Button
        variant="outline"
        className="fixed top-4 right-4 z-50"
        onClick={handleGenerateEmails}
      >
        Test Post
      </Button> */}
      <div className="mx-auto max-w-5xl space-y-8">
        <Card className="p-6">
          <div className="mb-6 flex justify-between">
            <div className="flex w-full items-center gap-2 text-2xl font-semibold">
              <Image src="/images/automail-large.png" alt="automail logo" width={128} height={32} />
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const linkedinUrlInput = e.currentTarget.linkedinUrlInput;
                const linkedinUrl = linkedinUrlInput.value;
                if (linkedinUrl) {
                  toast({
                    title: 'Loading...',
                    description: 'Please wait while we fetch your school results.',
                    variant: 'default'
                  });
                  const response = await fetch(`${url}/get-school-id`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      linkedin_url: linkedinUrl,
                      cookies: cookies  
                    })
                  });
                  const data = await response.json();
                  if (data.error) {
                    toast({
                      title: 'Error',
                      description: data.error,
                      variant: 'destructive'
                    });
                  }
                  const result = data.result
                  if (result) {
                    const cleanedResults = result.map((school: any) => ({
                      school_urn_id: school.school_urn_id,
                      school: school.school
                    }))
                    setSchoolResults(cleanedResults);
                    setSchoolResultsRaw(JSON.stringify(cleanedResults))
                    setIsSchoolDialogOpen(true);
                  }
                  console.log('School results:', result)
                  setLinkedinUrl(linkedinUrl)
                  linkedinUrlInput.value = '';
                }
              }}
              className="flex w-full gap-2"
            >
              <Input
                type="text"
                name="linkedinUrlInput"
                placeholder={user?.linkedin_url || "Enter LinkedIn URL"}
                className="flex-1"
              />
              <Button type="submit">
                Save
              </Button>
              <Dialog open={isSchoolDialogOpen} onOpenChange={setIsSchoolDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Select School</DialogTitle>
                  <DialogDescription>
                    Choose the school you want to target for your search
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {schoolResults.map((school) => (
                    <div
                      key={school.school_urn_id}
                      className={clsx(
                        'flex items-center justify-between rounded-lg p-4 cursor-pointer transition-colors',
                        selectedSchoolId === school.school_urn_id
                          ? 'bg-primary/10'
                          : 'hover:bg-muted'
                      )}
                      onClick={() => setSelectedSchoolId(school.school_urn_id)}
                    >
                      <div>
                        <h4 className="font-medium">{school.school}</h4>
                      </div>
                      <div className="h-6 w-6 rounded-full border flex items-center justify-center">
                        {selectedSchoolId === school.school_urn_id && (
                          <div className="h-3 w-3 rounded-full bg-primary" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsSchoolDialogOpen(false);
                      setSelectedSchoolId('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      if (selectedSchoolId) {
                        const selectedSchool = schoolResults.find(
                          (s) => s.school_urn_id === selectedSchoolId
                        );
                        if (selectedSchool) {
                          const { data: profile, error } = await supabase
                            .from('user_profile')
                            .update({
                              linkedin_url: linkedinUrl,
                              school_urn_id: selectedSchoolId,
                              school_result_set: schoolResultsRaw
                            })
                            .eq('id', user?.id)
                            .select('*')
                            .single();

                          if (profile) {
                            setUser(profile);
                            console.log('Profile updated', profile);
                            toast({
                              title: 'Success',
                              description: 'School selection saved successfully.',
                            });
                          }
                          if (error) {
                            toast({
                              title: 'Error',
                              description: 'Failed to save school selection.',
                              variant: 'destructive'
                            });
                          }
                        }
                      }
                      setIsSchoolDialogOpen(false);
                      setSelectedSchoolId('');
                    }}
                    disabled={!selectedSchoolId}
                  >
                    Save Selection
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </form>
          </div>
          <div className="space-y-6">
            <ScrollArea ref={scrollAreaRef} className="h-[450px] pr-4">
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
                            <i className="font-sans whitespace-pre-wrap text-muted-foreground">
                              {message.content}
                            </i>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <pre className="font-sans whitespace-pre-wrap">
                              {message.content}
                            </pre>
                            {message.type === 'user' && message.id === messages[messages.length - 2]?.id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 ml-2"
                                onClick={handleReverse}
                              >
                                <Undo2Icon className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <AnimatePresence>
                  {showResults && results.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 ml-4"
                    >
                      <div className="ml-2 p-2 text-sm text-muted-foreground rounded-md border max-w-[20%]">
                        {results.length} Selected
                      </div>
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

            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'inherit';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() && !isProcessing) {
                      handleSubmitMessage();
                      (e.target as HTMLTextAreaElement).style.height = 'inherit';
                    }
                  }
                }}
                placeholder="Type your message... (Shift+Enter for new line)"
                disabled={isProcessing || !hasLinkedin}
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
          <p className="text-xs text-muted-foreground mt-1 text-gray-300"> 
            <i>Remaining Emails: {(user?.monthly_email_limit || 0) - (user?.email_usage || 0)}</i> 
            {/* <i> | Days Left: {user?.monthly_refresh_date - Date.now()}</i> */}
          </p>
        </Card>
      </div>
      
      {draftEmails.length > 0 && (
        <Card
          className={clsx(
            "w-full max-w-5xl mx-auto mt-4",
            // !resultComplete && "text-muted-foreground "
          )}
        >
          <CardContent>
            <div className="space-y-2 mt-4">
              <Button
                variant="outline"
                className="mb-4 mr-2"
                onClick={() => {
                  handleEmailOpen(draftEmails, true);
                }}
              >
                Open Selected Emails
              </Button>
              <div className="mb-4 space-x-2">
                <Button
                  variant={draftFilter === 'undrafted' ? "default" : "outline"}
                  onClick={() => {
                    setDraftFilter('undrafted');
                    setSelectAll(false);
                  }}
                >
                  Undrafted
                </Button>
                <Button
                  variant={draftFilter === 'drafted' ? "default" : "outline"}
                  onClick={() => {
                    setDraftFilter('drafted');
                    setSelectAll(false);
                  }}
                >
                  Drafted
                </Button>
                <Button
                  variant={draftFilter === 'all' ? "default" : "outline"}
                  onClick={() => {
                    setDraftFilter('all');
                    setSelectAll(false);
                  }}
                >
                  All Emails
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px] pr-4">
                      <Checkbox
                        checked={selectAll}
                        onCheckedChange={(checked: boolean) => setSelectAll(checked)}
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
                      if (draftFilter === 'drafted') return email.draft_count > 0;
                      if (draftFilter === 'undrafted') return email.draft_count === 0;
                      return true;
                    })
                    .map((email, index) => (
                      <TableRow 
                        key={email.id}
                        className={email.draft_count > 0 ? "bg-green-100" : ""}
                      >
                        <TableCell className="w-[50px] pr-4">
                          <Checkbox
                            checked={email.selected}
                            onCheckedChange={() => handleEmailSelection(email.id || '')}
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
      <div className="fixed top-4 right-4">
        <div className="flex gap-2 flex-col">
          <Button
            variant="outline"
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/login');
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
          {
            (
              user?.id === '6c8178ed-9919-4a5b-8d15-9b8e70e6c22d' || 
              user?.id === 'de173630-8c83-48d5-b87b-bf9321237ffe'
            ) && 
              <Button
                variant="outline"
                onClick={() => {
                  router.push('/prompt/dashboard');
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                View Dashboard
              </Button>
          }
          <Button
            variant="outline"
            onClick={() => {
              handleCopyEmail(user?.email_template_last_input || 'No previous found')
            }}
          >
            <CopyIcon className="mr-2 h-4 w-4" />
            Copy Last Template
          </Button>
          
        </div>
        <div className="flex gap-2 flex-col mt-2">
          <LinkedinDash 
            userId={user?.id || ""} 
            isLinkedInLoading={isLinkedInLoading}
            setIsLinkedInLoading={setIsLinkedInLoading}
            hasLinkedin={hasLinkedin}
            setHasLinkedin={setHasLinkedin}
            setCookies={setCookies}
            setMessages={setMessages}
          />
        </div>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={() => {}}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Email Draft Progress</DialogTitle>
            <DialogDescription>
              {`Ready to open rest of emails (${currentMailtoLinks.length - 1}/${currentMailtoLinks.length})?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Stop
            </Button>
            <Button onClick={handleContinue}>
              {currentIndex === currentMailtoLinks.length - 1 ? "Open Emails" : "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Toaster />
    </div>
  )
}
