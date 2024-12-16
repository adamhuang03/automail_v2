'use client'

import { useEffect, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { generateCsv } from '@/lib/actions/generateCsv'
import { supabase } from '@/lib/db/supabase'
import { useRouter } from 'next/navigation'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"

export interface UserProfile {
    id: string
    user_prompt_id: string
    full_name: string
  }

export default function UserCsvDownload() {
  const [selectedUser, setSelectedUser] = useState<string | undefined>()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [csvData, setCsvData] = useState<string | null>(null)
  const [emailTemplate, setEmailTemplate] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [keywordIndustry, setKeywordIndustry] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
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
    <div className="container mx-auto p-4 max-w-2xl">
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
          className="mr-4"
        >
          Download CSV
        </Button>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!selectedUser}>Confirm Completion</Button>
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
        <Separator className="my-4" />
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="keywordIndustryRole" className="text-sm font-medium text-gray-700">Keyword Industry Role</Label>
            <Input
              type="text"
              id="keywordIndustryRole"
              placeholder="Investment Banking"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={keywordIndustry}
              onChange={(e) => setKeywordIndustry(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedin" className="text-sm font-medium text-gray-700">LinkedIn Profile URL</Label>
            <Input
              type="url"
              id="linkedin"
              placeholder="https://linkedin.com/in/username"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emailTemplate" className="text-sm font-medium text-gray-700">Email Template</Label>
            <Textarea
              id="emailTemplate"
              placeholder="Enter your email template here..."
              className="w-full min-h-[200px] px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
              value={emailTemplate}
              onChange={(e) => setEmailTemplate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="csvUpload" className="text-sm font-medium text-gray-700">Upload CSV</Label>
            <Input
              type="file"
              id="csvUpload"
              accept=".csv"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  const file = e.target.files[0];
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    if (e.target?.result) {
                      setCsvData(e.target.result as string);
                    }
                  };
                  reader.readAsText(file);
                }
              }}
              className="w-full min-h-[50px] px-3 items-center border border-gray-300 rounded-md file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          <Button 
            variant="outline"
            disabled={isProcessing} 
            onClick={async () => {
              try {
                // Validate required CSV data
                if (!csvData) {
                  alert('Please upload a CSV file first');
                  return;
                }

                setIsProcessing(true);

                // Helper functions for progress and error handling
                const updateProgress = (message: string) => {
                  // TODO: Replace with UI progress indicator (e.g., toast or progress bar)
                  console.log('Progress:', message);
                };
                
                const showError = (message: string) => {
                  // TODO: Replace with UI error display (e.g., toast or alert)
                  console.error('Error:', message);
                };

                // Helper function to download CSV data
                const downloadCSV = (csvData: string) => {
                  // Add UTF-8 BOM
                  const BOM = '\uFEFF';
                  const csvWithBOM = BOM + csvData;
                  const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.setAttribute('href', url);
                  link.setAttribute('download', `export_${new Date().toISOString()}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url); // Clean up the URL object
                };

                // Split CSV into chunks of 5 rows
                const splitCsvIntoChunks = (csvData: string, chunkSize: number = 5) => {
                  const lines = csvData.split('\n');
                  const header = lines[0];
                  const dataRows = lines.slice(1);
                  const chunks: string[] = [];
                  
                  for (let i = 0; i < dataRows.length-1; i += chunkSize) {
                    const chunk = [header, ...dataRows.slice(i, i + chunkSize)].join('\n');
                    chunks.push(chunk);
                  }
                  
                  return chunks;
                };

                // Process a single chunk and return the result
                const processChunk = async (csvChunk: string): Promise<string> => {
                  const dataObject = {
                    csv_data: csvChunk,
                    keyword_industry: keywordIndustry,
                    user_linkedin_url: linkedinUrl,
                    email_template: JSON.stringify(emailTemplate)
                  };

                  const url = 'https://automail-ai-apple.vercel.app';
                  const response = await fetch(`${url}/process-data`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(dataObject)
                  });

                  if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                  }

                  const reader = response.body?.getReader();
                  if (!reader) {
                    throw new Error('Failed to get response reader');
                  }

                  const decoder = new TextDecoder();
                  let resultCsvData = '';

                  while (true) {
                    const {value, done} = await reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value);
                    const updates = chunk.split('\n').filter(Boolean);
                    
                    try {
                      for (const update of updates) {
                        const data = JSON.parse(update);
                        
                        switch (data.status) {
                          case 'completed':
                            resultCsvData = data.csv_data;
                            break;
                          case 'started':
                            updateProgress(`Started processing chunk`);
                            break;
                          case 'drafting':
                            updateProgress(`Drafting: ${data.message}`);
                            break;
                          case 'progress':
                            updateProgress(`Progress: ${data.message}`);
                            break;
                          case 'error':
                            showError(data.message);
                            throw new Error(data.message);
                        }
                      }
                    } catch (error) {
                      showError(error instanceof Error ? error.message : 'An unexpected error occurred');
                      throw error;
                    }
                  }

                  return resultCsvData;
                };

                try {
                  // Split CSV into chunks
                  const chunks = splitCsvIntoChunks(csvData);
                  console.log('Chunks:', chunks);
                  let finalCsvData = '';

                  // Process each chunk sequentially
                  for (let i = 0; i < chunks.length; i++) {
                    updateProgress(`Processing chunk ${i + 1} of ${chunks.length}`);
                    const chunkResult = await processChunk(chunks[i]);
                    
                    if (i === 0) {
                      // For first chunk, keep the header
                      finalCsvData = chunkResult;
                    } else {
                      // For subsequent chunks, skip the header and append only data rows
                      const dataRows = chunkResult.split('\n').slice(1).join('\n');
                      finalCsvData += dataRows;
                    }
                  }

                  // Download the final combined CSV
                  updateProgress('Downloading combined results');
                  downloadCSV(finalCsvData);

                } catch (error) {
                  console.error('Error:', error);
                  alert('An error occurred while processing the request');
                } finally {
                  setIsProcessing(false);
                }
              } catch (error) {
                console.error('Error:', error);
                alert('An error occurred while processing the request');
                setIsProcessing(false);
              }
            }}
          >
            {isProcessing ? 'Processing...' : 'Run AI'}
          </Button>
        </div>
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
