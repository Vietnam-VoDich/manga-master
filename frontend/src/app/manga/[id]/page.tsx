"use client"
import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useUser, UserButton } from "@clerk/nextjs"
import { api } from "@/lib/api"

type MangaPage =
  | { type: "text"; act?: string; ch?: string; title?: string; date?: string; narr?: string }
  | { type: "img"; image_url: string; caption?: string; bubble?: string; narration_url?: string }
  | { type: "climax"; quote: string; attr?: string }
  | { type: "ending"; ending_text?: string; ending_kanji?: string }
  | { type: "upsell" }
  | { type: "after" }

type MangaData = {
  id: string
  title: string
  subject_name: string
  status: string
  is_preview: boolean
  is_public: boolean
  pages: MangaPage[]
  audio_theme_url?: string
  title_jp?: string
  tagline?: string
  user_id?: string
}

const LOAD_STEPS = ["Writing the story", "Drawing the panels", "Recording the narration"]

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
  const [loadStep, setLoadStep] = useState(0)
  const [dbUserId, setDbUserId] = useState("")
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [shareMsg, setShareMsg] = useState("")
  const [error, setError] = useState("")
  const [enhanceText, setEnhanceText] = useState("")
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [isExpanding, setIsExpanding] = useState(false)

  // Animate loading steps
  useEffect(() => {
    if (!polling) return
    const t = setInterval(() => setLoadStep(s => (s + 1) % LOAD_STEPS.length), 2500)
    return () => clearInterval(t)
  }, [polling])

  // Clean up audio on unmount (navigating away)
  useEffect(() => {
    return () => {
      if (audio) { audio.pause(); audio.currentTime = 0 }
    }
  }, [audio])

  // Fetch dbUser for subscribe
  useEffect(() => {
    if (!isLoaded || !user) return
    api.upsertUser({
      clerk_id: user.id,
      email: user.primaryEmailAddress?.emailAddress ?? "",
      name: user.fullName ?? undefined,
    }).then((u: { id: string; is_subscribed: boolean }) => {
      setDbUserId(u.id)
      setIsSubscribed(u.is_subscribed)
    }).catch(() => {})
  }, [isLoaded, user])

  // Helper: fetch manga and update state
  const fetchManga = useCallback(async (userId: string) => {
    try {
      const params = userId ? `?user_id=${userId}` : ""
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/manga/${id}${params}`)
      if (res.status === 403) {
        if (!isLoaded) return
        if (!user) { setError("private"); setPolling(false); return }
        if (!userId) return
        setError("private"); setPolling(false); return
      }
      if (!res.ok) { setError("notfound"); setPolling(false); return }
      const data = await res.json()
      const done = data.status === "preview" || data.status === "complete" || data.status === "error"
      const hasPages = data.pages?.length > 0
      if (done || (hasPages && (data.status === "streaming" || data.status === "generating"))) {
        const pages = [...(data.pages || [])]
        if (done && data.is_preview) pages.push({ type: "upsell" })
        if (done && !data.is_preview && (data.status === "complete" || data.status === "error")) pages.push({ type: "after" })
        setManga(prev => ({ ...data, pages, audio_theme_url: prev?.audio_theme_url || data.audio_theme_url }))
        if (data.audio_theme_url) {
          setAudio(prev => {
            if (prev) return prev
            const a = new Audio(data.audio_theme_url)
            a.loop = true; a.volume = 0.35
            return a
          })
        }
        if (done) setPolling(false)
      }
    } catch {}
  }, [id, isLoaded, user])

  // Poll until manga is ready
  useEffect(() => {
    if (!polling) return
    const timer = setInterval(() => fetchManga(dbUserId), 3000)
    return () => clearInterval(timer)
  }, [polling, dbUserId, fetchManga])

  // Re-fetch with user_id once auth loads so ownership info is present
  useEffect(() => {
    if (dbUserId && manga && !manga.user_id) {
      fetchManga(dbUserId)
    }
  }, [dbUserId, manga, fetchManga])

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
    if (!manga || !dbUserId) return
    if (!manga.is_public) {
      try {
        await api.toggleShare(manga.id, dbUserId)
        setManga(prev => prev ? { ...prev, is_public: true } : prev)
      } catch {}
    }
    const url = `${window.location.origin}/manga/${manga.id}`
    await navigator.clipboard.writeText(url)
    setShareMsg("Link copied!")
    setTimeout(() => setShareMsg(""), 2000)
  }

  const handleUnshare = async () => {
    if (!manga || !dbUserId || !manga.is_public) return
    try {
      await api.toggleShare(manga.id, dbUserId)
      setManga(prev => prev ? { ...prev, is_public: false } : prev)
      setShareMsg("Private again")
      setTimeout(() => setShareMsg(""), 2000)
    } catch {}
  }

  const handleSubscribe = async () => {
    if (!dbUserId) { window.location.href = "/dashboard"; return }
    try {
      const { url } = await api.checkout(dbUserId)
      window.location.href = url
    } catch {
      window.location.href = "/dashboard"
    }
  }

  const handleEnhance = async () => {
    if (!enhanceText.trim() || !dbUserId || !manga) return
    setIsEnhancing(true)
    try {
      await api.enhanceManga(manga.id, dbUserId, enhanceText)
      setEnhanceText("")
      setCur(manga.pages.length - 2) // go back to ending page (before "after")
      setPolling(true)
    } catch {}
    setIsEnhancing(false)
  }

  const handleExpand = async () => {
    if (!dbUserId || !manga) return
    setIsExpanding(true)
    try {
      await api.expandManga(manga.id, dbUserId)
      setCur(0)
      setPolling(true)
    } catch {}
    setIsExpanding(false)
  }

  const startBook = () => {
    setShowCover(false)
    if (audio) { audio.play().catch(() => {}); setAudioOn(true) }
  }

  // Auto-play music once audio loads if cover was already dismissed
  useEffect(() => {
    if (audio && !showCover && !audioOn) {
      audio.play().catch(() => {})
      setAudioOn(true)
    }
  }, [audio, showCover])

  // Error screen
  if (error === "private") {
    return (
      <div className="bg-black min-h-screen flex flex-col items-center justify-center text-center px-8">
        <div className="font-serif text-5xl text-white/10 mb-6">鍵</div>
        <p className="text-xs tracking-widest text-white/30 uppercase mb-4">This manga is private</p>
        <p className="text-[10px] text-white/15 mb-8">Sign in to view your manga.</p>
        <Link href={`/sign-in?redirect_url=/manga/${id}`} className="border border-white/20 text-white/40 text-[10px] tracking-[4px] uppercase px-8 py-3 hover:bg-white hover:text-black transition-all">
          Sign In
        </Link>
      </div>
    )
  }

  if (error === "notfound") {
    return (
      <div className="bg-black min-h-screen flex flex-col items-center justify-center text-center px-8">
        <p className="text-xs tracking-widest text-white/20 uppercase mb-4">Manga not found</p>
        <Link href="/create" className="text-[10px] tracking-widest uppercase text-white/20 hover:text-white/40 transition-colors">Create a new manga →</Link>
      </div>
    )
  }

  // Loading screen
  if (!manga) {
    const LEFT_FACTS = [
      { jp: "絵巻物", en: "12th century — the first picture scrolls" },
      { jp: "北斎", en: "Hokusai coined 'manga' in 1814" },
      { jp: "手塚治虫", en: "Tezuka invented modern manga in 1952" },
      { jp: "少年", en: "Shōnen Jump launched in 1968" },
    ]
    const RIGHT_FACTS = [
      { jp: "漫画", en: "means 'whimsical sketches'" },
      { jp: "ONE PIECE", en: "520 million copies — best-selling manga" },
      { jp: "DRAGON BALL", en: "260 million copies worldwide" },
      { jp: "四割", en: "40% of books sold in Japan are manga" },
    ]
    return (
      <div className="bg-black min-h-screen relative flex items-center justify-center">
        {/* Left facts — desktop only */}
        <div className="hidden lg:flex flex-col gap-8 absolute left-12 xl:left-20 top-1/2 -translate-y-1/2 text-right">
          {LEFT_FACTS.map((f, i) => (
            <div key={i} className="opacity-[0.06] hover:opacity-[0.14] transition-opacity duration-500">
              <div className="font-serif text-sm text-white/80 tracking-widest mb-0.5">{f.jp}</div>
              <div className="text-[9px] tracking-[2px] text-white/50 max-w-[160px] ml-auto">{f.en}</div>
            </div>
          ))}
        </div>

        {/* Center */}
        <div className="flex flex-col items-center">
          <div className="font-serif text-6xl text-white/10 animate-pulse mb-8">漫</div>
          <p className="text-xs tracking-widest text-white/20 uppercase mb-10">Generating your manga...</p>
          <div className="space-y-4">
            {LOAD_STEPS.map((s, i) => (
              <div key={s} className={`flex items-center gap-3 transition-all duration-700 ${i === loadStep ? "opacity-100" : "opacity-15"}`}>
                <div className={`w-1.5 h-1.5 rounded-full transition-all duration-700 ${i === loadStep ? "bg-white/60" : "bg-white/20"}`} />
                <span className="text-[10px] tracking-[3px] uppercase text-white/40">{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right facts — desktop only */}
        <div className="hidden lg:flex flex-col gap-8 absolute right-12 xl:right-20 top-1/2 -translate-y-1/2 text-left">
          {RIGHT_FACTS.map((f, i) => (
            <div key={i} className="opacity-[0.06] hover:opacity-[0.14] transition-opacity duration-500">
              <div className="font-serif text-sm text-white/80 tracking-widest mb-0.5">{f.jp}</div>
              <div className="text-[9px] tracking-[2px] text-white/50 max-w-[160px]">{f.en}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Cover screen — image background if available
  if (showCover) {
    const coverImg = manga.pages.find(p => p.type === "img") as Extract<MangaPage, { type: "img" }> | undefined
    return (
      <div className="bg-black min-h-screen flex items-center justify-center cursor-pointer relative overflow-hidden" onClick={startBook}>
        {coverImg && (
          <>
            <img
              src={coverImg.image_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: "brightness(0.22) contrast(1.2)" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20" />
          </>
        )}
        <div className="relative text-center px-8">
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

  const page = manga.pages[cur]

  return (
    <div
      className="bg-black min-h-screen flex items-center justify-center relative"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top-left: back to dashboard */}
      <div className="fixed top-3 left-3 z-50">
        <Link href={isLoaded && user ? "/dashboard" : "/"} className="text-[9px] tracking-widest uppercase text-white/25 hover:text-white/60 transition-colors">
          ← {isLoaded && user ? "Dashboard" : "Home"}
        </Link>
      </div>

      {/* Top bar */}
      <div className="fixed top-3 right-3 z-50 flex items-center gap-3">
        {shareMsg && <span className="text-[9px] tracking-widest text-white/40">{shareMsg}</span>}
        {/* Share controls — only for owner */}
        {isLoaded && user && dbUserId && manga.user_id === dbUserId && (
          manga.is_public ? (
            <button onClick={handleUnshare} className="text-[9px] tracking-widest uppercase text-green-400/80 hover:text-white/60 transition-colors">
              Shared ✓
            </button>
          ) : (
            <button onClick={handleShare} className="text-[9px] tracking-widest uppercase text-white/60 hover:text-white/90 transition-colors">
              Share
            </button>
          )
        )}
        {audio && (
          <button onClick={toggleAudio} className="text-white/20 hover:text-white/50 transition-colors text-[11px]">
            {audioOn ? "♫" : "♪"}
          </button>
        )}
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
                <div
                  className="absolute top-3 left-3 bg-[#e8e6df] text-[#111] rounded-xl px-3 py-2 text-xs font-semibold max-w-[180px] leading-snug shadow-lg"
                  dangerouslySetInnerHTML={{ __html: page.bubble }}
                />
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

        {page.type === "after" && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center gap-7 overflow-y-auto">
            <div>
              {manga.status === "error" ? (
                <>
                  <div className="font-serif text-5xl text-[#181818] tracking-widest mb-2">!</div>
                  <p className="text-[9px] tracking-[5px] uppercase text-red-400/50">Generation incomplete</p>
                </>
              ) : (
                <>
                  <div className="font-serif text-5xl text-[#181818] tracking-widest mb-2">終</div>
                  <p className="text-[9px] tracking-[5px] uppercase text-[#252525]">The End</p>
                </>
              )}
            </div>
            {/* Retry button for error mangas */}
            {manga.status === "error" && isLoaded && user && dbUserId && manga.user_id === dbUserId && isSubscribed && (
              <button
                onClick={handleExpand}
                disabled={isExpanding}
                className="text-[10px] tracking-[3px] uppercase text-white/40 hover:text-white/70 border border-white/15 hover:border-white/30 px-6 py-3 transition-all w-full max-w-[240px] disabled:opacity-50"
              >
                {isExpanding ? "Retrying..." : "Retry generation →"}
              </button>
            )}
            <div className="flex flex-col gap-2 w-full max-w-[240px]">
              {isLoaded && user && dbUserId && manga.user_id === dbUserId && (
                manga.is_public ? (
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/manga/${manga.id}`
                        navigator.clipboard.writeText(url)
                        setShareMsg("Link copied!")
                        setTimeout(() => setShareMsg(""), 2000)
                      }}
                      className="text-[10px] tracking-[3px] uppercase text-white/40 hover:text-white/70 border border-white/15 hover:border-white/30 px-6 py-3 transition-all w-full"
                    >
                      {shareMsg || "Copy share link"}
                    </button>
                    <button
                      onClick={handleUnshare}
                      className="text-[9px] tracking-[2px] uppercase text-white/15 hover:text-white/30 transition-colors"
                    >
                      Make private
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleShare}
                    className="text-[10px] tracking-[3px] uppercase text-white/40 hover:text-white/70 border border-white/15 hover:border-white/30 px-6 py-3 transition-all w-full"
                  >
                    {shareMsg || "Share this book"}
                  </button>
                )
              )}
              <Link
                href="/create"
                className="text-[10px] tracking-[3px] uppercase text-white/15 hover:text-white/35 border border-white/5 hover:border-white/15 px-6 py-3 transition-all block"
              >
                Create another →
              </Link>
            </div>
            {isLoaded && user && dbUserId && manga.user_id === dbUserId && (
              <div className="w-full max-w-[280px]">
                <p className="text-[9px] tracking-[3px] uppercase text-[#252525] mb-3">Continue the story</p>
                {isSubscribed ? (
                  <>
                    <textarea
                      className="w-full bg-[#0c0c0c] border border-[#1a1a1a] focus:border-white/15 text-white/50 text-xs px-3 py-2 resize-none outline-none placeholder:text-[#252525] transition-colors"
                      rows={3}
                      placeholder="What should happen next?"
                      value={enhanceText}
                      onChange={e => setEnhanceText(e.target.value)}
                    />
                    <button
                      onClick={handleEnhance}
                      disabled={!enhanceText.trim() || isEnhancing}
                      className="mt-2 w-full text-[9px] tracking-[3px] uppercase border border-white/10 text-white/25 hover:text-white/60 hover:border-white/25 py-2.5 transition-all disabled:opacity-20"
                    >
                      {isEnhancing ? "Working..." : "Apply →"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleSubscribe}
                    className="w-full text-[9px] tracking-[3px] uppercase border border-white/10 text-white/25 hover:text-white/60 hover:border-white/25 py-2.5 transition-all"
                  >
                    Subscribe to continue →
                  </button>
                )}
              </div>
            )}
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
                  isSubscribed ? (
                    <>
                      <p className="text-[9px] tracking-[4px] uppercase text-white/20 mb-3">Subscription active</p>
                      <p className="font-serif text-xl sm:text-2xl text-white/80 font-semibold mb-3 leading-snug">Expand your story</p>
                      <p className="text-xs text-white/30 mb-6 max-w-[220px] leading-relaxed">
                        Unlock the full 20+ page story with voice narration and soundtrack.
                      </p>
                      <button
                        onClick={handleExpand}
                        disabled={isExpanding}
                        className="bg-white text-black text-[10px] tracking-[4px] uppercase px-8 py-3 font-semibold hover:bg-white/90 transition-all mb-3 w-full max-w-[220px] disabled:opacity-50"
                      >
                        {isExpanding ? "Expanding..." : "Expand Full Story →"}
                      </button>
                      <Link href="/create" className="text-[9px] tracking-widest uppercase text-white/20 hover:text-white/40 transition-colors">
                        Create another manga →
                      </Link>
                    </>
                  ) : (
                  <>
                    <p className="text-[9px] tracking-[4px] uppercase text-white/20 mb-3">Your manga is saved</p>
                    <p className="font-serif text-xl sm:text-2xl text-white/80 font-semibold mb-3 leading-snug">The story continues...</p>
                    <p className="text-xs text-white/30 mb-6 max-w-[220px] leading-relaxed">
                      Unlock the full 20+ page story, voice narration, and cinematic soundtrack.
                    </p>
                    <button
                      onClick={handleSubscribe}
                      className="bg-white text-black text-[10px] tracking-[4px] uppercase px-8 py-3 font-semibold hover:bg-white/90 transition-all mb-3 w-full max-w-[220px]"
                    >
                      Subscribe $12/mo
                    </button>
                    <Link
                      href="/dashboard"
                      className="text-[9px] tracking-widest uppercase text-white/20 hover:text-white/40 transition-colors mb-4 block"
                    >
                      Go to Dashboard →
                    </Link>
                    <Link href="/create" className="text-[9px] tracking-widest uppercase text-white/10 hover:text-white/25 transition-colors">
                      Create another manga →
                    </Link>
                  </>
                  )
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
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-3 opacity-50 hover:opacity-100 transition-opacity z-30">
        <button onClick={() => go(-1)} disabled={cur === 0} className="w-8 h-8 rounded-full border border-white/15 bg-black/80 text-white/40 text-xs flex items-center justify-center disabled:opacity-20 hover:text-white/70 hover:border-white/30 transition-colors">◀</button>
        <span className="text-[9px] text-white/30 tracking-widest">{cur + 1} / {manga.pages.length}</span>
        <button onClick={() => go(1)} disabled={cur === manga.pages.length - 1} className="w-8 h-8 rounded-full border border-white/15 bg-black/80 text-white/40 text-xs flex items-center justify-center disabled:opacity-20 hover:text-white/70 hover:border-white/30 transition-colors">▶</button>
      </div>
    </div>
  )
}
