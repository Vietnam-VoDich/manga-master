"use client"
import Link from "next/link"
import { useEffect, useState } from "react"

const SAMPLES = [
  {
    kanji: "不屈",
    title: "The Stubborn Romantic",
    sub: "Churchill vs Halifax. Three days that saved Britain.",
    era: "London · 1940",
    cover: "/sample-manga-churchill/churchill-portrait.png",
  },
  {
    kanji: "胡",
    title: "He Who Enlightens",
    sub: "Kitchen boy to president. Thirty years wandering the world.",
    era: "Vietnam · 1890–1945",
    cover: "/sample-manga-hcm/hcm-portrait.png",
  },
]

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener("scroll", fn)
    return () => window.removeEventListener("scroll", fn)
  }, [])

  return (
    <main className="bg-black text-white min-h-screen">

      {/* NAV */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-black/80 backdrop-blur border-b border-white/5" : ""}`}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-serif text-lg tracking-widest text-white/80">漫画 MASTER</span>
          <div className="flex items-center gap-6">
            <Link href="/pricing" className="text-xs tracking-widest uppercase text-white/30 hover:text-white/60 transition-colors hidden sm:block">Pricing</Link>
            <Link href="/login" className="text-xs tracking-widest uppercase border border-white/10 px-4 py-2 hover:bg-white hover:text-black transition-all">Sign In</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-14">
        <p className="text-xs tracking-[8px] uppercase text-white/20 mb-6">Turn anyone into</p>
        <h1 className="font-serif text-8xl md:text-[140px] font-black tracking-widest text-white leading-none mb-4">漫画</h1>
        <p className="text-xs tracking-[6px] uppercase text-white/20 mb-10">A Manga Story</p>
        <p className="text-white/40 text-sm leading-relaxed max-w-md mb-12">
          Upload a photo. Describe someone — your friend, your boss, yourself.
          We generate a real manga about their life, with voice narration and a cinematic soundtrack.
        </p>
        <Link href="/create" className="bg-white text-black text-xs tracking-[6px] uppercase px-10 py-4 font-semibold hover:bg-white/90 transition-all">
          Create Your Manga
        </Link>
        <p className="text-white/15 text-xs mt-5 tracking-widest">2 pages free · No credit card needed</p>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-4xl mx-auto px-6 py-24 border-t border-white/5">
        <p className="text-xs tracking-[6px] uppercase text-white/20 text-center mb-16">How it works</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          {[
            { n: "01", title: "Upload a photo", desc: "A selfie, a friend's pic — the manga character will resemble the person." },
            { n: "02", title: "Tell their story", desc: "Type or record a voice note. Their job, their quirks, their dreams, their disasters." },
            { n: "03", title: "Get your manga", desc: "A cinematic manga — AI images, narrated voice, looping soundtrack. Share instantly." },
          ].map(s => (
            <div key={s.n}>
              <div className="text-6xl font-serif font-black text-white/5 mb-4">{s.n}</div>
              <div className="text-sm font-semibold text-white/70 mb-3 tracking-wide">{s.title}</div>
              <div className="text-xs text-white/30 leading-relaxed">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SAMPLE MANGAS */}
      <section className="px-6 py-24 border-t border-white/5">
        <p className="text-xs tracking-[6px] uppercase text-white/20 text-center mb-4">Sample stories</p>
        <p className="text-white/20 text-xs text-center mb-16 tracking-widest">Real mangas generated with this exact system</p>
        <div className="max-w-2xl mx-auto grid grid-cols-2 gap-1">
          {SAMPLES.map(s => (
            <div key={s.title} className="group relative aspect-[2/3] overflow-hidden bg-zinc-950">
              <div
                className="absolute inset-0 bg-cover bg-center transition-all duration-500 group-hover:scale-105"
                style={{ backgroundImage: `url(${s.cover})`, filter: "brightness(0.2) contrast(1.3)" }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-10">
                <div className="font-serif text-5xl font-black text-white/90 mb-3 group-hover:text-white transition-colors">{s.kanji}</div>
                <div className="text-[10px] tracking-[4px] uppercase text-white/30 mb-2 group-hover:text-white/50 transition-colors">{s.title}</div>
                <div className="text-[10px] text-white/15 leading-relaxed italic max-w-[160px] group-hover:text-white/30 transition-colors">{s.sub}</div>
              </div>
              <div className="absolute bottom-3 left-0 right-0 text-center text-[9px] tracking-widest text-white/10 group-hover:text-white/20 transition-colors">{s.era}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING TEASER */}
      <section className="max-w-sm mx-auto px-6 py-24 text-center border-t border-white/5">
        <p className="text-xs tracking-[6px] uppercase text-white/20 mb-10">Simple pricing</p>
        <div className="border border-white/10 p-10">
          <div className="font-serif text-6xl font-black text-white mb-1">$12</div>
          <div className="text-xs tracking-widest text-white/20 mb-10">per month</div>
          <ul className="text-xs text-white/40 space-y-3 mb-10 text-left">
            {["Unlimited mangas", "Full story — 20–25 pages", "Voice narration", "Cinematic soundtrack", "Mobile + desktop reader", "Share with anyone"].map(f => (
              <li key={f} className="flex items-center gap-3"><span className="text-white/15">—</span>{f}</li>
            ))}
          </ul>
          <Link href="/create" className="block bg-white text-black text-xs tracking-[4px] uppercase px-8 py-3 font-semibold hover:bg-white/90 transition-all">
            Start Free — 2 Pages
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-8 text-center text-[9px] tracking-widest uppercase text-white/10">
        漫画 Master · Turn lives into manga · Made with Claude + Gemini + ElevenLabs
      </footer>

    </main>
  )
}
