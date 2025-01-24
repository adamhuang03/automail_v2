import { Dispatch, SetStateAction, useState, useEffect } from "react";
// import { ProfileResult } from "./profileList";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import Image from "next/image";
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { supabase } from '@/lib/db/supabase'
// import ConnectionDialog, { Connection } from "@/app/chat/connectionDash";
import { Loader2 } from "lucide-react";
import { Message, message1 } from "./page";

export default function LinkedinDash({
    userId,
    isLinkedInLoading,
    setIsLinkedInLoading,
    hasLinkedin,
    setHasLinkedin,
    setCookies,
    setMessages,
  }: {
    userId: string;
    isLinkedInLoading: boolean;
    setIsLinkedInLoading: Dispatch<SetStateAction<boolean>>;
    hasLinkedin: boolean;
    setHasLinkedin: Dispatch<SetStateAction<boolean>>;
    setCookies: Dispatch<SetStateAction<any>>;
    setMessages: Dispatch<SetStateAction<Message[]>>
  }) {
    const { toast } = useToast()
    const [open, setOpen] = useState(false)
    const [openLogin, setOpenLogin] = useState(false)
    const [completedLoginSave, setCompletedLoginSave] = useState(false)
    const [showLoginSave, setShowLoginSave] = useState(false)
    const [counter, setCounter] = useState(50)
    const [message, setMessage] = useState('Verifying login ...')
    const [cookiesReceived, setCookiesReceived] = useState(false)

    const [linkedInEmail, setLinkedInEmail] = useState('')
    const [linkedInPassword, setLinkedInPassword] = useState('')


    useEffect(() => {
      if (completedLoginSave) {
          const intervalId = setInterval(() => {
              if (cookiesReceived) {
                  setCounter(0);
                  return;
              }
              setCounter(prev => prev - 1);
          }, 1000);
          return () => clearInterval(intervalId);
      }
  }, [completedLoginSave, cookiesReceived]);

  // Add a new effect to handle counter stages
  useEffect(() => {
    switch (counter) {
        case 45:
            console.log("5 seconds passed");
            setMessage('Preparing LinkedIn verification ...')
            break;
        case 30:
            console.log("20 seconds passed");
            // Do something at 30 seconds remaining
            setShowLoginSave(true);
            break;
        case 20:
            console.log("30 seconds passed");
            // Do something at 20 seconds remaining
            break;
        case 10:
            console.log("40 seconds passed");
            // Do something at 10 seconds remaining
            break;
        case 1:
            setMessage('Wait for server response ...')
            setShowLoginSave(false);
            break;
    }
}, [counter]);

    return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
          <Button
          variant="outline"
          onClick={() => setOpen(true)}
          disabled={hasLinkedin}
          >
          <Image
              height={15}
              width={15}
              src="https://www.vectorlogo.zone/logos/linkedin/linkedin-icon.svg"
              alt="LinkedIn logo"
              className="mr-2"
          />
          { hasLinkedin ? 'Linkedin Available' : 'LinkedIn Login' }
          </Button>
      </DialogTrigger>
      {!hasLinkedin && (
        <DialogContent>  
            <DialogHeader>
              <DialogTitle>LinkedIn Login</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                  id="email"
                  type="email"
                  value={linkedInEmail}
                  onChange={(e) => setLinkedInEmail(e.target.value)}
                  placeholder="Enter your LinkedIn email"
                  />
              </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
              id="password"
              type="password"
              value={linkedInPassword}
              onChange={(e) => setLinkedInPassword(e.target.value)}
              placeholder="Enter your LinkedIn password"
              />
            </div>
            <Button
                className="w-full"
                disabled={!linkedInEmail || !linkedInPassword || isLinkedInLoading} 
                onClick={async () => {
                  setIsLinkedInLoading(true);
                  setOpenLogin(true);

                const responseEct = await fetch(`chat/api/ect`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                    id: userId,
                    email: linkedInEmail,
                    password: linkedInPassword
                    })
                });

                setCompletedLoginSave(true);

                console.log(responseEct);
                // const accessCode = process.env.NEXT_PUBLIC_ACCESS_CODE;

                const response = await fetch(`chat/api/playwright-nj?id=${userId}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json"}
                });
                let data = {} as { cookies?: string, error?: string };
                try {
                  data = await response.json();
                } catch (error) {
                  console.error(error);
                  setIsLinkedInLoading(false);
                  setShowLoginSave(false);
                  setCompletedLoginSave(false);
                  setCounter(50)
                  setCookiesReceived(true);
                  setOpenLogin(false);
          
                  toast({
                    title: 'LinkedIn Login',
                    description: "Error logging in",
                  })
                  setCookiesReceived(false);
                  setMessage('Verifying login ...')
                  return
                }

                if ("error" in data) {
                    toast({
                    title: 'LinkedIn Login',
                    description: "Error logging in",
                    })
                    setIsLinkedInLoading(false);
                    setShowLoginSave(false);
                    setCompletedLoginSave(false);
                    setCounter(50)
                    setCookiesReceived(false);
                    setOpenLogin(false);
                    setHasLinkedin(true);
                    setOpen(true)
                    setMessage('Verifying login ...')
                } else {
                    setIsLinkedInLoading(false);
                    setShowLoginSave(false);
                    setCompletedLoginSave(false);
                    setCounter(50)
                    setCookiesReceived(false);
                    setOpenLogin(false);
                    setHasLinkedin(true);
                    setOpen(false)
                    setMessage('Verifying login ...')
                    toast({
                    title: 'LinkedIn Login',
                    description: "Successfully logged in",
                    })
                    console.log(data);
                    console.log(data.cookies);
                    console.log(typeof data.cookies);
                    setCookies(data.cookies);
                    setMessages(prev => prev.map(msg => 
                      msg.id === "1" 
                        ? { ...msg, content: message1, loading: false }
                        : msg
                    ))

                    const { data: inserted_linkedin, error } = await supabase
                    .from("user_profile")
                    .update({
                        cookies: data.cookies
                    })
                    .eq("id", userId)
                }
                }}
            >
                Login
            </Button>
            </div>
          </DialogContent>
        )}
        {openLogin && (<Dialog open={true}>
          <DialogHeader>
            <DialogTitle>Notice</DialogTitle>
          </DialogHeader>
          <DialogContent>
            {!showLoginSave && (
              <div className="flex flex-row items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p>{message}</p>
              </div>
            )}
            {showLoginSave && (
              <div className="flex flex-col items-center justify-center">
                <p>Human verification required, please check your linkedin on mobile.</p>
                <p>Time remaining: {counter}</p>
              </div>
            )}
          </DialogContent>
        </Dialog>)}
    </Dialog>
    )
  }