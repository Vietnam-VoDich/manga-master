"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useUser, UserButton } from "@clerk/nextjs"

const SAMPLES = [
  {
    kanji: "不屈",
    title: "The Stubborn Romantic",
    sub: "Churchill vs Halifax. Three days that saved Britain.",
    era: "London · 1940",
    cover: "/sample-manga-churchill/churchill-portrait.png",
    href: "/sample/churchill",
  },
  {
    kanji: "胡",
    title: "He Who Enlightens",
    sub: "Kitchen boy to president. Thirty years wandering.",
    era: "Vietnam · 1890–1945",
    cover: "/sample-manga-hcm/hcm-portrait.png",
    href: "/sample/hcm",
  },
  {
    kanji: "築",
    title: "Blueprints & Bánh Mì",
    sub: "A Vietnamese real estate mogul builds her empire. Will she succeed?",
    era: "Ho Chi Minh City · Now",
    cover: "/sample-manga-hcm/colonial-village.png",
    href: "/manga/9d169d67-d612-4afe-8c99-7b03f19e5f79",
  },
]

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [lastMangaId, setLastMangaId] = useState<string | null>(null)
  const { user, isLoaded } = useUser()
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener("scroll", fn)
    setLastMangaId(localStorage.getItem("last_manga_id"))
    return () => window.removeEventListener("scroll", fn)
  }, [])

  return (
    <main className="bg-black text-white min-h-screen">

      {/* NAV */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-black/90 backdrop-blur border-b border-white/5" : ""}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <span className="font-serif text-base sm:text-lg tracking-widest text-white/80">漫画 MASTER</span>
          <div className="flex items-center gap-3 sm:gap-6">
            {isLoaded && user ? (
              <>
                <Link href="/dashboard" className="text-[10px] tracking-widest uppercase text-white/30 hover:text-white/60 transition-colors hidden sm:block">My Mangas</Link>
                <UserButton appearance={{ elements: { avatarBox: "w-7 h-7" } }} />
              </>
            ) : (
              <>
                <Link href="/pricing" className="text-[10px] tracking-widest uppercase text-white/30 hover:text-white/60 transition-colors hidden sm:block">Pricing</Link>
                <Link href="/login" className="text-[10px] tracking-widest uppercase border border-white/10 px-3 sm:px-4 py-2 hover:bg-white hover:text-black transition-all">Sign In</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-5 pt-14">
        <p className="text-[9px] tracking-[6px] uppercase text-white/20 mb-5">Turn anyone into</p>
        <h1 className="font-serif text-7xl sm:text-8xl md:text-[130px] font-black tracking-widest text-white leading-none mb-4">漫画</h1>
        <p className="text-[9px] sm:text-xs tracking-[5px] uppercase text-white/20 mb-8">A Manga Story</p>
        <p className="text-white/40 text-sm leading-relaxed max-w-xs sm:max-w-md mb-10">
          Upload a photo. Describe someone — your friend, your boss, yourself.
          We generate a real manga about their life, with voice narration and a cinematic soundtrack.
        </p>
        <Link href="/create" className="bg-white text-black text-[10px] tracking-[5px] uppercase px-8 py-4 font-semibold hover:bg-white/90 transition-all w-full sm:w-auto text-center max-w-xs">
          Create Your Manga
        </Link>
        <p className="text-white/15 text-[9px] mt-4 tracking-widest">2 pages free · No credit card needed</p>
        {lastMangaId && (
          <Link href={`/manga/${lastMangaId}`} className="text-[10px] tracking-widest uppercase text-white/25 hover:text-white/50 transition-colors mt-4 block">
            Continue your manga →
          </Link>
        )}
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-4xl mx-auto px-5 sm:px-6 py-16 sm:py-24 border-t border-white/5">
        <p className="text-[9px] tracking-[5px] uppercase text-white/20 text-center mb-12">How it works</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-12 text-center">
          {[
            { n: "01", title: "Upload a photo", desc: "A selfie, a friend's pic — the manga character will resemble the person." },
            { n: "02", title: "Tell their story", desc: "Type or record a voice note. Their job, quirks, dreams, disasters." },
            { n: "03", title: "Get your manga", desc: "AI images, narrated voice, looping soundtrack. Share instantly." },
          ].map(s => (
            <div key={s.n}>
              <div className="text-5xl font-serif font-black text-white/5 mb-3">{s.n}</div>
              <div className="text-sm font-semibold text-white/70 mb-2 tracking-wide">{s.title}</div>
              <div className="text-xs text-white/30 leading-relaxed">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SAMPLE MANGAS */}
      <section className="px-5 sm:px-6 py-16 sm:py-24 border-t border-white/5">
        <p className="text-[9px] tracking-[5px] uppercase text-white/20 text-center mb-3">Sample stories</p>
        <p className="text-white/20 text-[10px] text-center mb-10 tracking-widest">Real mangas generated with this system</p>
        <div className="max-w-sm sm:max-w-3xl mx-auto grid grid-cols-3 gap-1">
          {SAMPLES.map(s => (
            <Link key={s.title} href={s.href} className="group relative aspect-[2/3] overflow-hidden bg-zinc-950 cursor-pointer">
              <div
                className="absolute inset-0 bg-cover bg-center transition-all duration-500 group-hover:scale-105 group-hover:brightness-[0.65]"
                style={{ backgroundImage: `url(${s.cover})`, filter: "brightness(0.5) contrast(1.2)" }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-3 sm:p-6 z-10">
                <div className="font-serif text-3xl sm:text-5xl font-black text-white/90 mb-1 sm:mb-3">{s.kanji}</div>
                <div className="text-[8px] sm:text-[10px] tracking-[2px] sm:tracking-[3px] uppercase text-white/30 mb-1 sm:mb-2">{s.title}</div>
                <div className="text-[8px] sm:text-[10px] text-white/15 leading-relaxed italic max-w-[100px] sm:max-w-[160px] hidden sm:block">{s.sub}</div>
              </div>
              <div className="absolute bottom-2 left-0 right-0 text-center text-[8px] tracking-widest text-white/10">{s.era}</div>
              <div className="absolute inset-0 border border-white/0 group-hover:border-white/10 transition-all z-20" />
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 sm:px-6 py-16 sm:py-20 text-center border-t border-white/5">
        <p className="font-serif text-2xl sm:text-3xl text-white/60 mb-6">Your story deserves a manga.</p>
        <Link href="/create" className="inline-block bg-white text-black text-[10px] tracking-[5px] uppercase px-8 py-4 font-semibold hover:bg-white/90 transition-all w-full sm:w-auto max-w-xs">
          Create for Free
        </Link>
      </section>

      {/* PRICING */}
      <section className="max-w-xs sm:max-w-sm mx-auto px-5 sm:px-6 py-16 sm:py-24 text-center border-t border-white/5">
        <p className="text-[9px] tracking-[5px] uppercase text-white/20 mb-8">Pricing</p>
        <div className="border border-white/10 p-8">
          <div className="font-serif text-5xl font-black text-white mb-1">$12</div>
          <div className="text-[10px] tracking-widest text-white/20 mb-8">per month</div>
          <ul className="text-xs text-white/40 space-y-3 mb-8 text-left">
            {["Unlimited mangas", "Full story — 20–25 pages", "Voice narration", "Cinematic soundtrack", "Mobile + desktop reader", "Share with anyone"].map(f => (
              <li key={f} className="flex items-center gap-3"><span className="text-white/15">—</span>{f}</li>
            ))}
          </ul>
          <Link href="/create" className="block bg-white text-black text-[10px] tracking-[4px] uppercase px-6 py-3 font-semibold hover:bg-white/90 transition-all">
            Start Free — 2 Pages
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-6 text-center text-[9px] tracking-widest uppercase text-white/10 px-4">
        漫画 Master · Turn lives into manga · Claude + Gemini + ElevenLabs
      </footer>

    </main>
  )
}
