'use client'

import { useEffect, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { generateCsv } from '@/lib/actions/generateCsv'
import { supabase } from '@/lib/db/supabase'
import { useRouter } from 'next/navigation'

export interface UserProfile {
    id: string
    user_prompt_id: string
    full_name: string
  }

export default function UserCsvDownload() {
  const [selectedUser, setSelectedUser] = useState<string | undefined>()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const router = useRouter()

  const handleDownload = async () => {
    if (!selectedUser) return
  
    try {
      const selectedUserProfile = users.find(user => user.id === selectedUser);
      const csvContent = await generateCsv(selectedUser, selectedUserProfile?.user_prompt_id || '')
      
      // Add UTF-8 BOM explicitly
      const BOM = '\uFEFF'
      const csvWithBOM = BOM + csvContent
      
      const blob = new Blob([csvWithBOM], { 
        type: 'text/csv;charset=utf-8'
      })
      
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute(
        'download',
        `user_${selectedUserProfile?.full_name.replace(' ', '_')}_${selectedUser}_inputsheet.csv`
      )
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error generating CSV:', error)
    }
  }

  const handleConfirmation = async() => {
    // Here you would typically send a request to your server to mark the task as completed
    const selectedUserProfile = users.find(user => user.id === selectedUser);
    if (selectedUser) {
        const userPromptId = selectedUserProfile?.user_prompt_id;
        const { error:profileError } = await supabase
            .from('user_profile')
            .update({ user_prompt_id: null})
            .eq('id', selectedUser)

        if (profileError) {
            console.error('Error updating user profile:', profileError)
        }

        const { error: promptError } = await supabase
            .from('user_prompt')
            .update({ completed: true })
            .eq('id', userPromptId)

        if (promptError) {
            console.error('Error updating user prompt:', promptError)
        }
    }
    alert(`Confirmed completion for user ${selectedUserProfile?.full_name}`)
    window.location.reload()
    setIsDialogOpen(false)
  }

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('user_profile')
          .select('id, user_prompt_id, full_name')
          .not('user_prompt_id', 'is', null)
          .order('full_name')

        if (error) {
          console.error('Error fetching users:', error)
          return
        }

        if (data) {
          setUsers(data)
        }
      } catch (err) {
        console.error('Error:', err)
      }
    }

    fetchUsers()
  }, [])

  return (
    <div className="container mx-auto p-4 max-w-md">
      <h1 className="text-2xl font-bold mb-4">Pending User Prompts</h1>
      <div className="space-y-4">
        <Select onValueChange={setSelectedUser}>
          <SelectTrigger>
            <SelectValue placeholder="Select a user" />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button 
          onClick={handleDownload} 
          disabled={!selectedUser}
          className="w-full"
        >
          Download CSV
        </Button>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full" disabled={!selectedUser}>Confirm Completion</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Completion</DialogTitle>
              <DialogDescription>
                Are you sure you want to mark this task as completed for the selected user?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleConfirmation}>Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
        <div className="fixed top-4 right-4">
          <Button
            variant="outline"
            onClick={() => router.push('/prompt')}
          >
            Return
          </Button>
        </div>
    </div>
  )
}

