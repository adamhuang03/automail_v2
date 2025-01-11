'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from '@/lib/db/supabase'
import Image from 'next/image'

export default function LoginComponent() {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSocialLogin = async (provider: 'google' | 'github' | 'azure', loginBool: boolean) => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        if (session.expires_at && Date.now() >= session.expires_at * 1000) {
          console.log('Session has expired, please log in again.')
          return
        }
        router.push('/chat')
        return
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          // scopes: provider === 'azure' 
          //   ? 'openid profile offline_access User.Read Mail.Send'
          //   : 'https://www.googleapis.com/auth/gmail.send',
          queryParams: {
            access_type: provider === 'azure' ? 'offline_access' : 'offline',
            prompt: provider === 'azure' ? 'select_account' : 'consent',
          },
          redirectTo: provider === 'azure' 
            ? `${window.location.origin}/api/auth/ms/callback`
            : loginBool 
              ? `${window.location.origin}/api/auth/login/callback`
              : `${window.location.origin}/api/auth/register/callback`
        }
      })

      if (error) {
        setError(error.message)
      }
    } catch (error) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // const handleMsLogin = async (provider: 'azure') => {
  //   try {
  //     setLoading(true)
  //     setError(null)

  //     const { data: { session } } = await supabase.auth.getSession()

  //     if (session) {
  //       if (session.expires_at && Date.now() >= session.expires_at * 1000) {
  //         console.log('Session has expired, please log in again.')
  //         return
  //       }
  //       router.push('/home')
  //       return
  //     }

  //     const { error } = await supabase.auth.signInWithOAuth({
  //       provider,
  //       options: {
  //         scopes: 'openid profile email offline_access',
  //         queryParams: {
  //           access_type: 'offline_access'
  //         },
  //         redirectTo: `${window.location.origin}/api/auth/ms/callback`
  //       }
  //     })

  //     if (error) {
  //       setError(error.message)
  //     }
  //   } catch (err) {
  //     setError('An unexpected error occurred')
  //   } finally {
  //     setLoading(false)
  //   }
  // }

  if (!mounted) {
    return null
  }

  return (
    <div className='flex flex-col justify-center'>
      <div className="flex justify-center mb-8 mt-[120px]">
        <Image
          src="/images/automail-large.png"
          alt="Automail Logo"
          width={300}
          height={100}
          className="block" // Makes sure the image is a block element to align properly
        />
      </div>
      <div className='flex flex-row justify-center'>
        <Card className="w-[350px]">
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>Sign in to your account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-2">
              <Button variant="outline" onClick={() => handleSocialLogin('google', true)} disabled={loading}>
                <Image
                  height={15}
                  width={15}
                  src="https://www.vectorlogo.zone/logos/google/google-icon.svg"
                  alt="Google logo"
                />
                <div className='ml-2'>Log in with Google</div>
              </Button>
                {/* <Button variant="outline" onClick={() => handleMsLogin('azure', true)} disabled={loading}>
                  <img height="15" width="15" src="https://www.vectorlogo.zone/logos/microsoft/microsoft-icon.svg" />
                  <div className='ml-2'>Log in with Microsoft</div>
                </Button> */}
            </div>
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}