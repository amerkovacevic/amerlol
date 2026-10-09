"use client"

import * as React from "react"
import { ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const APP_STORE_URL =
  "https://apps.apple.com/us/app/flickfeed-social/id6755321974"

function isIOSDevice() {
  const userAgent = window.navigator.userAgent
  const isAppleMobileDevice = /iPad|iPhone|iPod/.test(userAgent)
  const isModernIPad =
    window.navigator.platform === "MacIntel" &&
    window.navigator.maxTouchPoints > 1

  return isAppleMobileDevice || isModernIPad
}

export function IOSAppPromotion() {
  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    setIsOpen(isIOSDevice())
  }, [])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-2xl border-primary/20 p-0 shadow-2xl">
        <div className="h-2 bg-primary" />
        <div className="space-y-6 p-6 pt-3 sm:p-8 sm:pt-5">
            <DialogTitle className="font-space-grotesk text-2xl font-bold leading-tight sm:text-3xl">
              Came from that other movie app?
            </DialogTitle>
            <DialogDescription className="text-base leading-relaxed">
              Didn&apos;t love it? Log your next watch with FlickFeed instead.
            </DialogDescription>

          <DialogFooter className="gap-2 sm:space-x-0">
            <DialogClose asChild>
              <Button variant="ghost">Maybe later</Button>
            </DialogClose>
            <Button asChild>
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Try FlickFeed
                <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
