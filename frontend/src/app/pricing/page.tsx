"use client"
import Link from "next/link"

export default function PricingPage() {
  return (
    <main className="bg-black text-white min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <p className="text-[9px] tracking-[6px] uppercase text-white/20 mb-12">Pricing</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-1 w-full max-w-2xl">

        {/* Free */}
        <div className="border border-white/10 p-10">
          <div className="font-serif text-4xl font-black text-white/50 mb-1">Free</div>
          <div className="text-xs tracking-widest text-white/20 mb-8">forever</div>
          <ul className="text-xs text-white/30 space-y-3 mb-10">
            {["2 preview pages", "1 manga at a time", "No narration", "No soundtrack"].map(f => (
              <li key={f} className="flex items-center gap-3"><span className="text-white/10">—</span>{f}</li>
            ))}
          </ul>
          <Link href="/create" className="block border border-white/10 text-white/40 text-xs tracking-[4px] uppercase px-6 py-3 text-center hover:border-white/30 hover:text-white/60 transition-all">
            Start Free
          </Link>
        </div>

        {/* Pro */}
        <div className="border border-white/30 p-10 relative">
          <div className="absolute top-3 right-4 text-[9px] tracking-widest uppercase text-white/30">Most popular</div>
          <div className="font-serif text-4xl font-black text-white mb-1">$12</div>
          <div className="text-xs tracking-widest text-white/20 mb-8">per month</div>
          <ul className="text-xs text-white/50 space-y-3 mb-10">
            {["Unlimited mangas", "Full story — 20–25 pages", "Voice narration", "Cinematic soundtrack", "Mobile + desktop reader", "Share with anyone", "Download PDF"].map(f => (
              <li key={f} className="flex items-center gap-3"><span className="text-white/20">—</span>{f}</li>
            ))}
          </ul>
          <Link href="/create" className="block bg-white text-black text-xs tracking-[4px] uppercase px-6 py-3 text-center font-semibold hover:bg-white/90 transition-all">
            Get Started
          </Link>
        </div>
      </div>
    </main>
  )
}
