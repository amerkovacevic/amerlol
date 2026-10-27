import type { Metadata } from "next"
import { StyleguideContent } from "@/components/styleguide/styleguide-content"

export const metadata: Metadata = { title: "Styleguide", robots: { index: false } }

export default function StyleguidePage() {
  return <StyleguideContent />
}
