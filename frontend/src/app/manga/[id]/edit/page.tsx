"use client"
import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { api } from "@/lib/api"

type MangaPage =
  | { type: "text"; act?: string; title?: string; date?: string; narr?: string }
  | { type: "img"; image_url: string; caption?: string; bubble?: string }
  | { type: "climax"; quote: string; attr?: string }
  | { type: "ending"; ending_text?: string; ending_kanji?: string }

type MangaData = {
  id: string
  title: string
  subject_name: string
  status: string
  is_preview: boolean
  pages: MangaPage[]
  title_jp?: string
  tagline?: string
}

type ChatMessage = { role: "user" | "assistant"; content: string }

const SUGGESTIONS = [
  "Add a dramatic new scene",
  "Make the ending more emotional",
  "Add more pages about their struggles",
  "Add a funny moment",
  "Make Act II more intense",
]

function PageCard({ page, index }: { page: MangaPage; index: number }) {
  return (
    <div className="mb-2 border border-white/5 bg-[#080808] relative">
      {/* Subtle page number */}
      <span className="absolute top-2 right-2 text-[8px] tracking-widest text-white/10 select-none z-10">
        {String(index + 1).padStart(2, "0")}
      </span>

      {page.type === "img" && (
        <div>
          <div className="relative overflow-hidden bg-[#050505]">
            <img
              src={page.image_url}
              alt=""
              className="w-full object-cover"
              style={{ filter: "contrast(1.05)", maxHeight: "340px" }}
            />
            {page.bubble && (
              <div className="absolute top-3 left-3 bg-[#e8e6df] text-[#111] rounded-xl px-3 py-2 text-[11px] font-semibold max-w-[60%] leading-snug shadow-lg">
                {page.bubble}
              </div>
            )}
          </div>
          {page.caption && (
            <div
              className="px-4 py-3 text-[11px] leading-relaxed text-white/30 text-center border-t border-white/5"
              dangerouslySetInnerHTML={{ __html: page.caption }}
            />
          )}
        </div>
      )}

      {page.type === "text" && (
        <div className="px-5 py-6 text-center">
          {page.act && (
            <p className="text-[8px] tracking-[5px] uppercase text-white/15 mb-1">{page.act}</p>
          )}
          {page.title && (
            <h3 className="font-serif text-lg font-bold text-white/60 leading-snug mb-2">{page.title}</h3>
          )}
          {page.date && (
            <p className="text-[9px] text-white/20 tracking-widest mb-3">{page.date}</p>
          )}
          {page.narr && (
            <div
              className="font-serif text-[13px] leading-[2.1] text-white/35 max-w-sm mx-auto"
              dangerouslySetInnerHTML={{ __html: page.narr }}
            />
          )}
        </div>
      )}

      {page.type === "climax" && (
        <div
          className="px-5 py-8 text-center"
          style={{ background: "radial-gradient(ellipse at center, #0e0800 0%, #050505 100%)" }}
        >
          <p className="text-[8px] tracking-[5px] uppercase text-[#2a1a00] mb-4">The Moment</p>
          <div
            className="font-serif text-[15px] leading-[2.2] text-[#c8a96e] font-bold max-w-sm mx-auto"
            dangerouslySetInnerHTML={{ __html: page.quote }}
          />
          {page.attr && (
            <p className="text-[9px] text-white/15 mt-4 tracking-widest">{page.attr}</p>
          )}
        </div>
      )}

      {page.type === "ending" && (
        <div className="px-5 py-8 text-center">
          <div className="w-6 h-px bg-white/10 mx-auto mb-5" />
          {page.ending_text && (
            <div
              className="font-serif text-[13px] text-white/25 leading-[2.2]"
              dangerouslySetInnerHTML={{ __html: page.ending_text }}
            />
          )}
          <div className="font-serif text-2xl text-white/10 mt-6 tracking-widest">
            {page.ending_kanji || "終"}
          </div>
        </div>
      )}
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.9s" }}
        />
      ))}
    </div>
  )
}

export default function MangaEditPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user, isLoaded } = useUser()

  const [manga, setManga] = useState<MangaData | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [dbUserId, setDbUserId] = useState<string>("")

  const leftPanelRef = useRef<HTMLDivElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Scroll chat to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  // Scroll left panel to bottom when new pages are added
  const prevPageCount = useRef(0)
  useEffect(() => {
    if (!manga) return
    if (manga.pages.length > prevPageCount.current && prevPageCount.current > 0) {
      // New pages were added — scroll left panel to show them
      if (leftPanelRef.current) {
        leftPanelRef.current.scrollTo({ top: leftPanelRef.current.scrollHeight, behavior: "smooth" })
      }
    }
    prevPageCount.current = manga.pages.length
  }, [manga?.pages.length])

  // On mount: load manga, upsert user, guard subscription
  useEffect(() => {
    if (!isLoaded || !user) return

    api.upsertUser({
      clerk_id: user.id,
      email: user.primaryEmailAddress?.emailAddress ?? "",
      name: user.fullName ?? undefined,
    }).then(async (u: { id: string; is_subscribed: boolean }) => {
      if (!u.is_subscribed) {
        router.push("/dashboard")
        return
      }
      setDbUserId(u.id)
      const m = await api.getManga(id as string)
      setManga(m)
    }).catch(console.error)
  }, [isLoaded, user, id])

  const sendMessage = async (text?: string) => {
    const instruction = (text ?? input).trim()
    if (!instruction || !manga || !dbUserId || loading) return

    setInput("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"

    setMessages((prev) => [...prev, { role: "user", content: instruction }])
    setLoading(true)

    try {
      // Kick off async enhance — returns immediately with { status: "enhancing" }
      await api.enhanceManga(manga.id, dbUserId, instruction)

      // Poll manga until status is no longer "enhancing"
      let updatedManga: MangaData | null = null
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 3000))
        const m = await api.getManga(manga.id) as MangaData & { enhance_message?: string }
        if (m.status !== "enhancing") {
          updatedManga = m
          const msg = m.enhance_message || "Story updated."
          setMessages((prev) => [...prev, { role: "assistant", content: msg }])
          setManga(m)
          break
        }
      }
      if (!updatedManga) {
        throw new Error("Timed out waiting for enhancement")
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    // Auto-expand textarea
    e.target.style.height = "auto"
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px"
  }

  // Loading skeleton
  if (!manga) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center">
        <div className="font-serif text-5xl text-white/10 animate-pulse">漫</div>
      </div>
    )
  }

  return (
    <div className="bg-black h-screen flex flex-col overflow-hidden">
      {/* ── Top bar ── */}
      <div className="flex-shrink-0 h-11 border-b border-white/5 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/manga/${manga.id}`}
            className="text-[9px] tracking-widest uppercase text-white/20 hover:text-white/50 transition-colors"
          >
            ← Back
          </Link>
          <span className="text-white/10 text-xs">|</span>
          <span className="font-serif text-sm text-white/40 truncate max-w-[180px] sm:max-w-xs">
            {manga.title || manga.subject_name}
          </span>
        </div>
        <Link
          href="/"
          className="font-serif text-base tracking-widest text-white/20 hover:text-white/40 transition-colors"
        >
          絵巻
        </Link>
      </div>

      {/* ── Two-column layout ── */}
      <div className="flex flex-1 min-h-0">

        {/* ── LEFT: Manga pages list ── */}
        <div
          ref={leftPanelRef}
          className="w-1/2 border-r border-white/5 overflow-y-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {/* Column header */}
          <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-sm border-b border-white/5 px-4 py-3">
            <p className="text-[8px] tracking-[5px] uppercase text-white/15">
              {manga.pages.length} pages
            </p>
            <h2 className="font-serif text-sm text-white/40 leading-tight mt-0.5 truncate">
              {manga.title || manga.subject_name}
            </h2>
          </div>

          <div className="p-3">
            {manga.pages.map((page, i) => (
              <PageCard key={i} page={page} index={i} />
            ))}

            {/* Bottom padding so last card isn't flush against bottom */}
            <div className="h-8" />
          </div>
        </div>

        {/* ── RIGHT: Chat panel ── */}
        <div className="w-1/2 flex flex-col min-h-0">

          {/* Chat header */}
          <div className="flex-shrink-0 border-b border-white/5 px-5 py-4">
            <h2 className="font-serif text-base text-white/60 font-semibold">Enhance Story</h2>
            <p className="text-[9px] tracking-widest text-white/20 mt-0.5 uppercase">
              Give instructions to expand or modify your manga
            </p>
          </div>

          {/* Chat messages */}
          <div
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
            style={{ scrollbarWidth: "none" }}
          >
            {messages.length === 0 && (
              <div className="text-center pt-8">
                <div className="font-serif text-3xl text-white/5 mb-3">語</div>
                <p className="text-[10px] text-white/15 tracking-widest">
                  Your story is ready to grow.
                </p>
                <p className="text-[9px] text-white/10 mt-1">
                  Try one of the suggestions below or write your own.
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[82%] px-3 py-2.5 text-[12px] leading-relaxed rounded-sm ${
                    msg.role === "user"
                      ? "bg-white/8 text-white/60 border border-white/10"
                      : "bg-[#0d0d0d] text-white/40 border border-white/5"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <span className="text-[8px] tracking-[4px] uppercase text-white/15 block mb-1">
                      Emaki
                    </span>
                  )}
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#0d0d0d] border border-white/5 rounded-sm">
                  <TypingDots />
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input area */}
          <div className="flex-shrink-0 border-t border-white/5 px-4 pt-3 pb-4">
            {/* Quick suggestion chips — shown when chat is empty */}
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    disabled={loading}
                    className="text-[9px] tracking-wide text-white/25 border border-white/8 px-2.5 py-1 hover:border-white/20 hover:text-white/45 transition-all disabled:opacity-40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder="Add a scene where..."
                rows={1}
                disabled={loading}
                className="flex-1 bg-[#0a0a0a] border border-white/8 text-white/60 placeholder:text-white/15 text-[12px] px-3 py-2.5 resize-none outline-none focus:border-white/20 transition-colors leading-relaxed disabled:opacity-50"
                style={{ minHeight: "40px", maxHeight: "140px" }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="flex-shrink-0 bg-white/8 hover:bg-white/15 disabled:opacity-30 text-white/50 text-[10px] tracking-widest uppercase px-4 h-10 border border-white/10 hover:border-white/20 transition-all disabled:cursor-not-allowed"
              >
                {loading ? "..." : "Send"}
              </button>
            </div>

            <p className="text-[8px] text-white/10 mt-2 tracking-wide">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
