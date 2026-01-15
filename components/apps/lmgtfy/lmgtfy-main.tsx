"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  Copy, 
  ExternalLink, 
  Sparkles,
  ArrowRight,
  Check,
  Share2
} from "lucide-react"
import { toast } from "sonner"

// Animation steps for the LMGTFY sequence - funnier and slower
const ANIMATION_STEPS = [
  { text: "Hmm...", delay: 1200, emoji: "🤔" },
  { text: "Let me think...", delay: 1500, emoji: "💭" },
  { text: "Oh wait!", delay: 1000, emoji: "💡" },
  { text: "I know!", delay: 800, emoji: "✨" },
  { text: "Let me...", delay: 1200, emoji: "👀" },
  { text: "Let me just...", delay: 1400, emoji: "⌨️" },
  { text: "Let me Google that for you!", delay: 2000, emoji: "🎉" },
]

export function LMGTFYMain() {
  const [query, setQuery] = React.useState("")
  const [shareableLink, setShareableLink] = React.useState("")
  const [copied, setCopied] = React.useState(false)
  const [isAnimating, setIsAnimating] = React.useState(false)
  const [currentStep, setCurrentStep] = React.useState(0)
  const [showRedirect, setShowRedirect] = React.useState(false)
  const searchParams = React.useMemo(() => {
    if (typeof window === "undefined") return null
    return new URLSearchParams(window.location.search)
  }, [])

  // Update meta tags for link preview when query parameter is present
  // Only update if we're on the LMGTFY app page
  React.useEffect(() => {
    // Safety check: only update meta tags if we're on the LMGTFY route
    if (typeof window === "undefined") return
    const pathname = window.location.pathname
    if (!pathname.includes("/a/lmgtfy") && !pathname.includes("/lmgtfy")) return
    
    if (searchParams?.has("q")) {
      const sharedQuery = decodeURIComponent(searchParams.get("q") || "")
      if (sharedQuery) {
        // Update document title and meta tags for social sharing
        document.title = "Hmm, I wonder..."
        
        // Update or create Open Graph meta tags
        const updateMetaTag = (property: string, content: string) => {
          let meta = document.querySelector(`meta[property="${property}"]`) || 
                     document.querySelector(`meta[name="${property}"]`)
          if (!meta) {
            meta = document.createElement("meta")
            meta.setAttribute("property", property)
            document.head.appendChild(meta)
          }
          meta.setAttribute("content", content)
        }
        
        updateMetaTag("og:title", "Hmm, I wonder...")
        updateMetaTag("og:description", sharedQuery)
        updateMetaTag("og:type", "website")
        updateMetaTag("twitter:card", "summary")
        updateMetaTag("twitter:title", "Hmm, I wonder...")
        updateMetaTag("twitter:description", sharedQuery)
        
        // Update description meta tag
        let descMeta = document.querySelector('meta[name="description"]')
        if (!descMeta) {
          descMeta = document.createElement("meta")
          descMeta.setAttribute("name", "description")
          document.head.appendChild(descMeta)
        }
        descMeta.setAttribute("content", sharedQuery)
        
        setQuery(sharedQuery)
        startAnimation(sharedQuery)
      }
    }
  }, [searchParams])

  const startAnimation = (searchQuery: string) => {
    setIsAnimating(true)
    setCurrentStep(0)
    setShowRedirect(false)

    // Play through animation steps
    let stepIndex = 0
    const playStep = () => {
      if (stepIndex < ANIMATION_STEPS.length) {
        const currentDelay = ANIMATION_STEPS[stepIndex].delay
        setCurrentStep(stepIndex)
        setTimeout(() => {
          stepIndex++
          playStep()
        }, currentDelay)
      } else {
        // Show redirect message
        setShowRedirect(true)
        // Redirect to Google after a moment
        setTimeout(() => {
          const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`
          window.location.href = googleUrl
        }, 2500)
      }
    }
    playStep()
  }

  const generateLink = () => {
    if (!query.trim()) {
      toast.error("Please enter a search query")
      return
    }

    // Get the current pathname, or default to /a/lmgtfy if not available
    const pathname = typeof window !== "undefined" 
      ? window.location.pathname 
      : "/a/lmgtfy"
    const baseUrl = typeof window !== "undefined" 
      ? window.location.origin 
      : ""
    const link = `${baseUrl}${pathname}?q=${encodeURIComponent(query.trim())}`
    setShareableLink(link)
    toast.success("Link generated! Copy it to share.")
  }

  const copyLink = async () => {
    if (!shareableLink) {
      toast.error("Please generate a link first")
      return
    }

    try {
      await navigator.clipboard.writeText(shareableLink)
      setCopied(true)
      toast.success("Link copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error("Failed to copy link")
    }
  }

  const shareLink = async () => {
    if (!shareableLink) {
      toast.error("Please generate a link first")
      return
    }

    if (typeof navigator !== "undefined" && "share" in navigator && navigator.share) {
      try {
        await navigator.share({
          title: "Let me Google that for you!",
          text: query,
          url: shareableLink,
        })
        toast.success("Link shared!")
      } catch (error) {
        // User cancelled or error
        if ((error as Error).name !== "AbortError") {
          toast.error("Failed to share link")
        }
      }
    } else {
      // Fallback to copy
      copyLink()
    }
  }

  // If animating, show the animation screen
  if (isAnimating) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-6 md:p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center w-full max-w-4xl mx-auto"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="space-y-8 sm:space-y-10 md:space-y-12"
            >
              <div className="flex items-center justify-center gap-3 sm:gap-4 md:gap-6 px-4">
                <motion.div
                  animate={{ 
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <Search className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 text-blue-500" />
                </motion.div>
                {ANIMATION_STEPS[currentStep]?.emoji && (
                  <motion.span
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 10 }}
                    className="text-5xl sm:text-6xl md:text-7xl"
                  >
                    {ANIMATION_STEPS[currentStep].emoji}
                  </motion.span>
                )}
                <motion.div
                  animate={{ 
                    rotate: [0, -10, 10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.3
                  }}
                >
                  <Sparkles className="h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 text-yellow-400" />
                </motion.div>
              </div>
              
              <motion.div className="space-y-4 sm:space-y-6 px-4">
                <motion.h1
                  key={`text-${currentStep}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent leading-tight px-2"
                >
                  {ANIMATION_STEPS[currentStep]?.text || "Let me Google that for you!"}
                </motion.h1>
                
                {/* Typing indicator for some steps */}
                {currentStep < ANIMATION_STEPS.length - 2 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center gap-1 pt-2"
                  >
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="text-xl sm:text-2xl"
                    >
                      ...
                    </motion.span>
                  </motion.div>
                )}
              </motion.div>

              {showRedirect && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-4 sm:space-y-6 px-4 pt-4"
                >
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-lg sm:text-xl md:text-2xl text-muted-foreground"
                  >
                    Taking you to Google now...
                  </motion.p>
                  <motion.div
                    animate={{ x: [0, 15, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <ArrowRight className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 mx-auto text-blue-500" />
                  </motion.div>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>

          {query && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mt-8 sm:mt-10 md:mt-12 px-4"
            >
              "{query}"
            </motion.p>
          )}
        </motion.div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
          <Search className="h-8 w-8 text-blue-500" />
          Let Me Google That For You
        </h1>
        <p className="text-muted-foreground">
          Generate a shareable link that plays an animation before redirecting to Google search
        </p>
      </div>

      <div className="flex-1 space-y-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Enter Your Search Query</CardTitle>
            <CardDescription>
              Type the question or search term you want to Google
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="query">Search Query</Label>
              <Textarea
                id="query"
                placeholder="e.g., How to make pizza? What is React? Why is the sky blue?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) {
                    generateLink()
                  }
                }}
                className="min-h-[100px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Press Ctrl+Enter to generate link
              </p>
            </div>

            <Button 
              onClick={generateLink} 
              className="w-full"
              disabled={!query.trim()}
            >
              <Search className="h-4 w-4 mr-2" />
              Generate Shareable Link
            </Button>
          </CardContent>
        </Card>

        {/* Shareable Link Section */}
        {shareableLink && (
          <Card>
            <CardHeader>
              <CardTitle>Your Shareable Link</CardTitle>
              <CardDescription>
                Copy this link and send it to anyone who asks a Google-able question
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border">
                <code className="flex-1 text-sm break-all">{shareableLink}</code>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={copyLink}
                  variant="outline"
                  className="flex-1"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </>
                  )}
                </Button>
                
                {typeof navigator !== "undefined" && "share" in navigator && (
                  <Button
                    onClick={shareLink}
                    variant="outline"
                    className="flex-1"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                )}

                <Button
                  onClick={() => {
                    window.open(shareableLink, "_blank")
                  }}
                  variant="outline"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Examples Section */}
        <Card>
          <CardHeader>
            <CardTitle>Example Queries</CardTitle>
            <CardDescription>
              Try these examples or create your own
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {[
                "How to make pizza?",
                "What is React?",
                "Why is the sky blue?",
                "Best restaurants near me",
                "How to tie a tie?",
                "What time is it?",
              ].map((example) => (
                <Badge
                  key={example}
                  variant="secondary"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => {
                    setQuery(example)
                    generateLink()
                  }}
                >
                  {example}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                1
              </div>
              <div>
                <p className="font-medium">Enter a search query</p>
                <p className="text-muted-foreground">
                  Type any question or search term that can be Googled
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                2
              </div>
              <div>
                <p className="font-medium">Generate a shareable link</p>
                <p className="text-muted-foreground">
                  Click the button to create a unique link with your query
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                3
              </div>
              <div>
                <p className="font-medium">Share the link</p>
                <p className="text-muted-foreground">
                  Send the link to anyone who asks a Google-able question
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                4
              </div>
              <div>
                <p className="font-medium">Watch the magic</p>
                <p className="text-muted-foreground">
                  When they open the link, they'll see a fun animation before being redirected to Google
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
