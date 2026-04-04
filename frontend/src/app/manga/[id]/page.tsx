"use client"
import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useUser, UserButton } from "@clerk/nextjs"

type MangaPage =
  | { type: "text"; act?: string; ch?: string; title?: string; date?: string; narr?: string }
  | { type: "img"; image_url: string; caption?: string; bubble?: string; narration_url?: string }
  | { type: "climax"; quote: string; attr?: string }
  | { type: "ending"; ending_text?: string; ending_kanji?: string }
  | { type: "upsell" }

type MangaData = {
  id: string
  title: string
  subject_name: string
  status: string
  is_preview: boolean
  pages: MangaPage[]
  audio_theme_url?: string
  title_jp?: string
  tagline?: string
}

export default function MangaReaderPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [manga, setManga] = useState<MangaData | null>(null)
  const [cur, setCur] = useState(0)
  const [turning, setTurning] = useState(false)
  const [audioOn, setAudioOn] = useState(false)
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)
  const [showCover, setShowCover] = useState(true)
  const [polling, setPolling] = useState(true)
  const [copied, setCopied] = useState(false)

  // Poll until manga is ready
  useEffect(() => {
    if (!polling) return
    const timer = setInterval(async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/manga/${id}`)
      const data = await res.json()
      if (data.status === "preview" || data.status === "complete" || data.status === "error") {
        // Build upsell page for preview
        const pages = [...data.pages]
        if (data.is_preview) pages.push({ type: "upsell" })
        setManga({ ...data, pages })
        setPolling(false)
        if (data.audio_theme_url) {
          const a = new Audio(data.audio_theme_url)
          a.loop = true
          a.volume = 0.35
          setAudio(a)
        }
      }
    }, 3000)
    return () => clearInterval(timer)
  }, [id, polling])

  const go = useCallback((dir: 1 | -1) => {
    if (!manga) return
    const next = cur + dir
    if (next < 0 || next >= manga.pages.length) return
    setTurning(true)
    setTimeout(() => { setCur(next); setTurning(false) }, 150)
  }, [cur, manga])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") go(1)
      if (e.key === "ArrowLeft") go(-1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [go])

  // Touch
  let tx = 0
  const onTouchStart = (e: React.TouchEvent) => { tx = e.touches[0].clientX }
  const onTouchEnd = (e: React.TouchEvent) => {
    const d = e.changedTouches[0].clientX - tx
    if (Math.abs(d) > 50) go(d < 0 ? 1 : -1)
  }

  const toggleAudio = () => {
    if (!audio) return
    if (audioOn) { audio.pause(); setAudioOn(false) }
    else { audio.play().catch(() => {}); setAudioOn(true) }
  }

  const handleShare = async () => {
    if (navigator.share && manga) {
      try {
        await navigator.share({ title: manga.title, text: manga.tagline, url: window.location.href })
      } catch {}
    } else {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const startBook = () => {
    setShowCover(false)
    if (audio) { audio.play().catch(() => {}); setAudioOn(true) }
  }

  if (!manga) {
    return (
      <div className="bg-black min-h-screen flex flex-col items-center justify-center">
        <div className="font-serif text-6xl text-white/10 animate-pulse mb-6">漫</div>
        <p className="text-xs tracking-widest text-white/20 uppercase">Generating your manga...</p>
        <p className="text-[10px] text-white/10 mt-3 tracking-widest">Writing story · Drawing panels · Recording narration</p>
      </div>
    )
  }

  const page = manga.pages[cur]

  if (showCover) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center cursor-pointer" onClick={startBook}>
        <div className="text-center px-8">
          <div className="font-serif text-8xl font-black text-white/90 tracking-widest mb-4">{manga.title_jp || "漫"}</div>
          <div className="text-xs tracking-[8px] uppercase text-white/30 mb-3">{manga.title || manga.subject_name}</div>
          <div className="text-xs text-white/15 italic mb-12">{manga.tagline}</div>
          <button className="border border-white/20 text-white/50 text-[10px] tracking-[4px] uppercase px-10 py-3 hover:bg-white hover:text-black transition-all">
            Open Book
          </button>
          {manga.is_preview && (
            <p className="text-[9px] text-white/10 mt-6 tracking-widest">Preview · 2 pages free</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className="bg-black min-h-screen flex items-center justify-center relative"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top bar */}
      <div className="fixed top-3 right-3 z-50 flex items-center gap-2">
        <button
          onClick={handleShare}
          className="w-7 h-7 rounded-full border border-white/10 bg-black/70 text-white/30 text-xs flex items-center justify-center hover:text-white/60 transition-colors"
          title="Share"
        >
          {copied ? <span className="text-[8px] tracking-tight">✓</span> : "↗"}
        </button>
        <button
          onClick={toggleAudio}
          className="w-7 h-7 rounded-full border border-white/10 bg-black/70 text-white/30 text-xs flex items-center justify-center hover:text-white/60 transition-colors"
        >
          {audioOn ? "♫" : "♪"}
        </button>
        {isLoaded && user && (
          <UserButton appearance={{ elements: { avatarBox: "w-7 h-7" } }} />
        )}
      </div>

      {/* Nav zones */}
      <div className="absolute top-0 left-0 h-full w-[28%] z-20 cursor-pointer" onClick={() => go(-1)} />
      <div className="absolute top-0 right-0 h-full w-[28%] z-20 cursor-pointer" onClick={() => go(1)} />

      {/* Page frame */}
      <div
        className={`w-[92vw] max-w-[520px] h-[90dvh] max-h-[860px] bg-[#0a0a0a] border border-[#151515] flex flex-col overflow-hidden transition-opacity duration-150 ${turning ? "opacity-0" : "opacity-100"}`}
      >
        {page.type === "img" && (
          <>
            <div className="flex-1 overflow-hidden relative bg-[#080808] min-h-0">
              <img src={page.image_url} className="w-full h-full object-cover" style={{ filter: "contrast(1.05)" }} alt="" />
              {page.bubble && (
                <div className="absolute top-3 left-3 bg-[#e8e6df] text-[#111] rounded-xl px-3 py-2 text-xs font-semibold max-w-[180px] leading-snug shadow-lg">
                  {page.bubble}
                </div>
              )}
            </div>
            {page.caption && (
              <div
                className="flex-shrink-0 px-5 py-4 border-t border-[#151515] text-[12.5px] leading-relaxed text-[#999] text-center"
                dangerouslySetInnerHTML={{ __html: page.caption }}
              />
            )}
          </>
        )}

        {page.type === "text" && (
          <div className="flex-1 flex flex-col items-center justify-center px-7 py-8 text-center">
            {page.act && <p className="text-[9px] tracking-[5px] uppercase text-[#333] mb-1">{page.act}</p>}
            {page.ch && <p className="text-[9px] tracking-[5px] uppercase text-[#555] mb-2">{page.ch}</p>}
            {page.title && <h2 className="font-serif text-2xl font-bold text-[#ddd] leading-snug mb-2">{page.title}</h2>}
            {page.date && <p className="text-[10px] text-[#444] tracking-widest mb-4">{page.date}</p>}
            {page.narr && (
              <div
                className="font-serif text-[15px] leading-[2.2] text-[#888] max-w-sm"
                dangerouslySetInnerHTML={{ __html: page.narr }}
              />
            )}
          </div>
        )}

        {page.type === "climax" && (
          <div className="flex-1 flex flex-col items-center justify-center px-7 py-8 text-center" style={{ background: "radial-gradient(ellipse at center, #0e0800 0%, #000 100%)" }}>
            <p className="text-[9px] tracking-[5px] uppercase text-[#2a1a00] mb-5">The Moment</p>
            <div
              className="font-serif text-[17px] leading-[2.2] text-[#c8a96e] font-bold max-w-sm"
              dangerouslySetInnerHTML={{ __html: page.quote }}
            />
            {page.attr && <p className="text-[9px] text-[#333] mt-5 tracking-widest">{page.attr}</p>}
          </div>
        )}

        {page.type === "ending" && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
            <div className="w-8 h-px bg-[#1a1a1a] mb-6" />
            {page.ending_text && (
              <div
                className="font-serif text-[14px] text-[#555] leading-[2.2]"
                dangerouslySetInnerHTML={{ __html: page.ending_text }}
              />
            )}
            <div className="font-serif text-3xl text-[#222] mt-8 tracking-widest">{page.ending_kanji || "終"}</div>
          </div>
        )}

        {page.type === "upsell" && (() => {
          const lastImg = [...manga.pages].reverse().find(p => p.type === "img") as any
          return (
            <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
              {/* Left — manga preview */}
              <div className="relative sm:w-1/2 h-48 sm:h-auto overflow-hidden flex-shrink-0">
                {lastImg ? (
                  <img src={lastImg.image_url} className="w-full h-full object-cover" style={{ filter: "brightness(0.4) contrast(1.1)" }} alt="" />
                ) : (
                  <div className="w-full h-full bg-[#050505]" />
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                  <div className="font-serif text-4xl sm:text-5xl font-black text-white/90 mb-2">{manga.title_jp || "続"}</div>
                  <div className="text-[9px] tracking-[4px] uppercase text-white/40 mb-1">{manga.title || manga.subject_name}</div>
                  <div className="text-[9px] text-white/20 italic">{manga.tagline}</div>
                </div>
              </div>
              {/* Right — CTA */}
              <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center bg-[#050505]">
                {isLoaded && user ? (
                  <>
                    <p className="text-[9px] tracking-[4px] uppercase text-white/20 mb-3">Your manga is saved</p>
                    <p className="font-serif text-xl sm:text-2xl text-white/80 font-semibold mb-3 leading-snug">The story continues...</p>
                    <p className="text-xs text-white/30 mb-8 max-w-[220px] leading-relaxed">
                      Subscribe to unlock the full 20+ page story, voice narration, and cinematic soundtrack.
                    </p>
                    <Link
                      href="/dashboard"
                      className="bg-white text-black text-[10px] tracking-[4px] uppercase px-8 py-3 font-semibold hover:bg-white/90 transition-all mb-3 block w-full max-w-[220px]"
                    >
                      Go to Dashboard
                    </Link>
                    <Link href="/create" className="text-[9px] tracking-widest uppercase text-white/10 hover:text-white/25 transition-colors">
                      Create another manga →
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-[9px] tracking-[4px] uppercase text-white/20 mb-3">Your manga is ready</p>
                    <p className="font-serif text-xl sm:text-2xl text-white/80 font-semibold mb-3 leading-snug">The story continues...</p>
                    <p className="text-xs text-white/30 mb-8 max-w-[220px] leading-relaxed">
                      Sign up free to save and share this manga. Subscribe to unlock the full 20+ pages.
                    </p>
                    <Link
                      href="/sign-up"
                      className="bg-white text-black text-[10px] tracking-[4px] uppercase px-8 py-3 font-semibold hover:bg-white/90 transition-all mb-3 block w-full max-w-[220px]"
                    >
                      Sign up free
                    </Link>
                    <Link
                      href="/login"
                      className="text-[10px] tracking-widest uppercase text-white/20 hover:text-white/40 transition-colors mb-6 block"
                    >
                      Already have an account →
                    </Link>
                    <Link href="/create" className="text-[9px] tracking-widest uppercase text-white/10 hover:text-white/25 transition-colors">
                      Create another manga →
                    </Link>
                  </>
                )}
              </div>
            </div>
          )
        })()}
      </div>

      {/* Nav bar (desktop) */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-3 opacity-30 hover:opacity-100 transition-opacity z-30">
        <button onClick={() => go(-1)} disabled={cur === 0} className="w-7 h-7 rounded-full border border-[#1a1a1a] bg-black/70 text-[#444] text-xs flex items-center justify-center disabled:opacity-15">◀</button>
        <span className="text-[9px] text-[#222] tracking-widest">{cur + 1} / {manga.pages.length}</span>
        <button onClick={() => go(1)} disabled={cur === manga.pages.length - 1} className="w-7 h-7 rounded-full border border-[#1a1a1a] bg-black/70 text-[#444] text-xs flex items-center justify-center disabled:opacity-15">▶</button>
      </div>
    </div>
  )
}
