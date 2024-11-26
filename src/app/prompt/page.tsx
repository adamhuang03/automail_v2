'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { supabase } from '@/lib/db/supabase'
import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function PromptEmailPage() {
  const [personPrompt, setPersonPrompt] = useState('')
  const [emailTemplate, setEmailTemplate] = useState('')
  // const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
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
          console.log('Has ID', profile)
          const { error } = await supabase
            .from('user_prompt')
            .insert([
              {
                prompt: personPrompt,
                template: emailTemplate
              }
            ])
  
          if (error) {
            console.error('Error saving prompts:', error)
            return
          }
          
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
        
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          // Check if user exists in user_profile
          const { error: fetchError } = await supabase
            .from('user_profile')
            .select()
            .eq('id', session.user.id)
            .single()

          if (fetchError && fetchError.code === 'PGRST116') {
            // User doesn't exist, create profile
            const { error: insertError } = await supabase
              .from('user_profile')
              .insert([
                { 
                  id: session.user.id,
                  full_name: session.user.user_metadata.name
                }
              ])

            if (insertError) {
              console.error('Error creating user profile:', insertError)
            }
          }
        }
      } catch (err) {
        console.error('Error checking user profile:', err)
      } finally {
      }
    })()
  }, [])

  return (
    <div className="container mx-auto p-4">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Automail AI</CardTitle>
          <CardDescription>Enter a description of the person you want to search for and an email template you liked.</CardDescription>
        </CardHeader>
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
      <div className="fixed top-4 right-4">
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
  )
}

