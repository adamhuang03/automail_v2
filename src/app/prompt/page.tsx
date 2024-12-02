'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { supabase } from '@/lib/db/supabase'
import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { User } from '@supabase/supabase-js'

interface DraftEmail {
  id: string
  user_profile_id: string
  user_prompt_id: string
  linkedin_url: string
  to_email: string
  subject: string
  body: string
  draft_count: number
  created_at: string
  selected?: boolean
}

export default function PromptEmailPage() {
  const [user, setUser] = useState<User | null>(null)
  const [personPrompt, setPersonPrompt] = useState('')
  const [emailTemplate, setEmailTemplate] = useState('')
  const [draftEmails, setDraftEmails] = useState<DraftEmail[]>([])
  const [selectAll, setSelectAll] = useState(false)
  // const [loading, setLoading] = useState(false)
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentMailtoLinks, setCurrentMailtoLinks] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        // Check if there is a profile
        const { data: profile, error: checkError } = await supabase
          .from('user_profile')
          .select("*")
          .eq('id', session.user.id)
          .single()

        if (checkError) {
          console.error('Error checking user profile:', checkError)
          return
        }

        if (!profile.user_prompt_id) {
          // If user_prompt_id is null, save the new prompt
          console.log('Available to save', profile)

          //
          const { error } = await supabase
            .from('user_prompt')
            .insert([
              {
                user_profile_id: profile.id,
                prompt: personPrompt,
                template: emailTemplate
              }
            ])
  
          if (error) {
            console.error('Error saving prompts:', error)
            return
          }
          
          // Grab the latest prompt
          const { data: promptData, error: promptError } = await supabase
            .from('user_prompt')
            .select('id')
            .order('created_at', { ascending: false })
            .limit(1)

          if (promptError) {
            console.error('Error fetching latest prompt:', promptError)
            return
          }
  
          // Update user_profile with the latest prompts
          const { error: updateError } = await supabase
            .from('user_profile')
            .update({
              user_prompt_id: promptData ? promptData[0]?.id : null
            })
            .eq('id', session.user.id)
  
          if (updateError) {
            console.error('Error updating user profile:', updateError)
            return
          }
  
          // Reset form on successful save
          setPersonPrompt('')
          setEmailTemplate('')
        } else {
          alert('Prompt already exists, wait for system to generate emails')
        }

      }
    } catch (err) {
      console.error('Error submitting prompts:', err)
    }
  }

  useEffect(() => {
    (async () => {
      try {
        // Check if there is a user session
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          // If there is, grab a profile
          const { data: profile, error: fetchError } = await supabase
            .from('user_profile')
            .select()
            .eq('id', session.user.id)
            .single()

          if (fetchError && fetchError.code === 'PGRST116') {
            // If there is no profile, create one
            const { error: insertError } = await supabase
              .from('user_profile')
              .insert([{ 
                id: session.user.id,
                full_name: session.user.user_metadata.name
              }])

            if (insertError) {
              console.error('Error creating user profile:', insertError)
            }
          } else {
            // If there is a profile, grab it
            console.log('User profile exists', profile)
            setUser(profile)

            // Check if there are any completed prompts
            const { data: donePromptIds, error: promptError } = await supabase
              .from('user_prompt')
              .select('id')
              .eq('user_profile_id', profile.id)
              .eq('completed', true)
            
            if (donePromptIds?.length && donePromptIds.length > 0) {
              // If there are, grab the draft emails
              // grab the ones that have a draft_count of 0
              const { data: draftData, error: draftError } = await supabase
                .from('draft_emails')
                .select('*')
                .in('user_prompt_id', donePromptIds.map(prompt => prompt.id))
                // .eq('draft_count', 0)
              
              if (draftError) {
                console.error('Error fetching draft emails:', draftError)
              } else {
                console.log('Draft emails fetched', draftData)
                setDraftEmails(draftData)
              }
            } else {
              // If there are no completed prompts, check if the user prompt exists
              console.log('No completed prompts')
              if (profile.user_prompt_id) {
                console.log('User prompt exists, and in progress', profile.user_prompt_id)
              } else {
                console.log('User prompt does not exist, is ready for new prompt')
              }
            }
          }
        }
      } catch (err) {
        console.error('Error checking user profile:', err)
      } finally {
      }
    })()
  }, [])

  useEffect(() => {
    setDraftEmails(prevEmails => 
      prevEmails.map(email => ({
        ...email,
        selected: selectAll
      }))
    );
  }, [selectAll]);

  const handleEmailSelection = (index: number) => {
    setDraftEmails(prevEmails => 
      prevEmails.map((email, i) => 
        i === index ? { ...email, selected: !email.selected } : email
      )
    );
  };

  const handleEmailOpen = async (draftEmails: DraftEmail[], selectedOnly: boolean = false) => {
    const emailsToOpen = selectedOnly 
      ? draftEmails.filter(email => email.selected)
      : draftEmails;

    try {
      // Update draft count for each email individually
      for (const email of emailsToOpen) {
        email.draft_count += 1
        const { error } = await supabase
          .from('draft_emails')
          .update({ draft_count: email.draft_count })
          .eq('id', email.id)

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
    } else {
      window.location.reload();
    }
  };

  const handleContinue = () => {
    if (currentMailtoLinks.length > 0) {
      // Open all remaining emails
      for (let i = currentIndex; i < currentMailtoLinks.length; i++) {
        console.log('Opening email', currentMailtoLinks[i])
        window.open(currentMailtoLinks[i], '_blank');
      }
      // Close dialog and reload page
      setIsDialogOpen(false);
      window.location.reload();
    }
  };

  return (
    <>
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

      <div className="container mx-auto p-4 mt-[50px]">
        <Card className="w-full max-w-2xl mx-auto py-4">
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="person-prompt">Prompt</Label>
                <Textarea
                  id="person-prompt"
                  placeholder="Describe the person you want to search for..."
                  value={personPrompt}
                  onChange={(e) => setPersonPrompt(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-template">Email Template</Label>
                <Textarea
                  id="email-template"
                  placeholder="Paste your reference email template here..."
                  value={emailTemplate}
                  onChange={(e) => setEmailTemplate(e.target.value)}
                  className="min-h-[150px]"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full">Submit</Button>
            </CardFooter>
          </form>
        </Card>
        <Card className="w-full max-w-8xl mx-auto mt-4">
          <CardContent>
            <div className="space-y-2 mt-4">
              <Button
                variant="outline"
                className="mb-4"
                onClick={() => {
                  handleEmailOpen(draftEmails, true);
                }}
              >
                Open Selected Emails
              </Button>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px] pr-4">
                      <Checkbox
                        checked={selectAll}
                        onCheckedChange={(checked) => setSelectAll(checked as boolean)}
                      />
                    </TableHead>
                    <TableHead className="pr-4">Email</TableHead>
                    <TableHead className="pr-4">Subject</TableHead>
                    <TableHead className="pr-4">Body</TableHead>
                    <TableHead>LinkedIn</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {draftEmails.map((email, index) => (
                    <TableRow 
                      key={email.id}
                      className={email.draft_count > 0 ? "bg-green-100" : ""}
                    >
                      <TableCell className="w-[50px] pr-4">
                        <Checkbox
                          checked={email.selected}
                          onCheckedChange={() => handleEmailSelection(index)}
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
        <div className="fixed top-4 right-4">
          <div className="flex gap-2">
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
              onClick={async () => {
                await supabase.auth.signOut();
                router.push('/login');
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

