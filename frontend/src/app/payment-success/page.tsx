"use client"
import { useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function PaymentSuccessPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()

  // If already logged in, go straight to dashboard
  useEffect(() => {
    if (isLoaded && user) {
      router.replace("/dashboard?subscribed=true")
    }
  }, [isLoaded, user, router])

  if (!isLoaded) return null

  // Not logged in — show friendly page
  return (
    <div className="bg-black min-h-screen flex items-center justify-center">
      <div className="text-center px-8 max-w-sm">
        <div className="font-serif text-7xl text-white/90 tracking-widest mb-6">絵巻</div>
        <div className="w-8 h-px bg-white/10 mx-auto mb-6" />
        <p className="text-[9px] tracking-[5px] uppercase text-white/30 mb-3">Payment confirmed</p>
        <h1 className="font-serif text-2xl text-white/80 font-semibold mb-3 leading-snug">
          Your subscription is active.
        </h1>
        <p className="text-xs text-white/30 mb-10 leading-relaxed">
          Sign in to unlock your full manga stories, voice narration, and cinematic soundtrack.
        </p>
        <Link
          href="/login?redirect_url=/dashboard?subscribed=true"
          className="bg-white text-black text-[10px] tracking-[4px] uppercase px-10 py-3 font-semibold hover:bg-white/90 transition-all inline-block"
        >
          Sign in to Dashboard
        </Link>
      </div>
    </div>
  )
}
