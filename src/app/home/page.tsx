"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Download, LogOut, Upload } from 'lucide-react'
import { supabase } from "@/lib/db/supabase"
import { User } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"

export default function ExcelHandler() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<string>("")
  const [user, setUser] = useState<User | null>(null)

  const handleDownload = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('user_files')
        .download('template/template.xlsx')

      if (error) {
        console.error('Error downloading file:', error.message)
        return
      }

      // Create and trigger download
      const blob = new Blob([data])
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'template.xlsx'
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error downloading file:', err)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0])
    }
  }

  const handleUpload = async () => {
    const folderName = user?.user_metadata.name.split(" ").join("_")
    // console.log(`${user?.id}-${name}`)
    if (file) {
      try {
        const { error } = await supabase.storage
          .from('user_files')
          .upload(`uploads/${folderName}/${file.name}`, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (error) {
          setUploadStatus(`Error uploading file: ${error.message}`)
          return
        }

        setUploadStatus(`File "${file.name}" uploaded successfully!`)
        // Reset the file input
        setFile(null)
        const fileInput = document.getElementById("excel-file") as HTMLInputElement
        if (fileInput) fileInput.value = ""
      } catch (err) {
        setUploadStatus('An unexpected error occurred during upload')
        console.error('Upload error:', err)
      }
    } else {
      setUploadStatus("Please select a file to upload.")
    }
  }

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user)
      }
    })();
  }, [])

  return (
    <div className="container mx-auto p-4 mt-40">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Excel File Handler</CardTitle>
          <CardDescription>Download or upload Excel files</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <CardTitle className="text-lg mb-2">Download Excel</CardTitle>
            <Button onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" /> Download Sample Excel
            </Button>
          </div>
          <div>
            <CardTitle className="text-lg mb-2">Upload Excel</CardTitle>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="excel-file">Excel File</Label>
              <Input id="excel-file" type="file" accept=".xlsx, .xls" onChange={handleFileChange} />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-4">
          <Button onClick={handleUpload} disabled={!file}>
            <Upload className="mr-2 h-4 w-4" /> Upload Excel
          </Button>
          {uploadStatus && <p className="text-sm text-muted-foreground">{uploadStatus}</p>}
        </CardFooter>
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

