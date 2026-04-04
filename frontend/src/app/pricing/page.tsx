import Link from "next/link"

export default function PricingPage() {
  return (
    <main className="bg-black text-white min-h-[100dvh] flex flex-col items-center justify-center px-5 py-16">
      <Link href="/" className="font-serif text-2xl tracking-widest text-white/30 mb-10 hover:text-white/50 transition-colors">絵巻</Link>
      <p className="text-[9px] tracking-[5px] uppercase text-white/20 mb-10">Pricing</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 w-full max-w-xl">
        {/* Free */}
        <div className="border border-white/10 p-8">
          <div className="font-serif text-4xl font-black text-white/40 mb-1">Free</div>
          <div className="text-[10px] tracking-widest text-white/15 mb-8">forever</div>
          <ul className="text-xs text-white/25 space-y-3 mb-8">
            {["2 preview pages", "1 manga at a time", "No narration", "No soundtrack"].map(f => (
              <li key={f} className="flex items-center gap-3"><span className="text-white/10">—</span>{f}</li>
            ))}
          </ul>
          <Link href="/create" className="block border border-white/10 text-white/30 text-[10px] tracking-[3px] uppercase px-6 py-3 text-center hover:border-white/30 hover:text-white/50 transition-all active:bg-white/5">
            Start Free
          </Link>
        </div>

        {/* Pro */}
        <div className="border border-white/30 p-8 relative">
          <div className="absolute top-3 right-4 text-[8px] tracking-widest uppercase text-white/25">Most popular</div>
          <div className="font-serif text-4xl font-black text-white mb-1">$12</div>
          <div className="text-[10px] tracking-widest text-white/20 mb-8">per month</div>
          <ul className="text-xs text-white/50 space-y-3 mb-8">
            {["Unlimited mangas", "Full story — 20–25 pages", "Voice narration", "Cinematic soundtrack", "Mobile + desktop reader", "Share with anyone"].map(f => (
              <li key={f} className="flex items-center gap-3"><span className="text-white/20">—</span>{f}</li>
            ))}
          </ul>
          <Link href="/create" className="block bg-white text-black text-[10px] tracking-[3px] uppercase px-6 py-3 text-center font-semibold hover:bg-white/90 active:bg-white/80 transition-all">
            Get Started
          </Link>
        </div>
      </div>

      <Link href="/" className="mt-10 text-[9px] tracking-widest uppercase text-white/15 hover:text-white/30 transition-colors">← Back</Link>
    </main>
  )
}
