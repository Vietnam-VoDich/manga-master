"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useUser, UserButton } from "@clerk/nextjs"
import { api } from "@/lib/api"

type MangaPage =
  | { type: "text"; act?: string; title?: string; date?: string; narr?: string }
  | { type: "img"; image_url: string; caption?: string; bubble?: string }
  | { type: "climax"; quote: string; attr?: string }
  | { type: "ending"; ending_text?: string; ending_kanji?: string }

type PhotoMeta = { url: string; caption: string }

type MangaData = {
  id: string
  title: string
  title_jp?: string
  tagline?: string
  subject_name: string
  subject_description: string
  status: string
  is_preview: boolean
  is_public: boolean
  pages: MangaPage[]
  photos?: PhotoMeta[]
  photo_url?: string
  user_id?: string
}

export default function MangaDetailsPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [manga, setManga] = useState<MangaData | null>(null)
  const [dbUserId, setDbUserId] = useState("")

  useEffect(() => {
    if (!isLoaded || !user) return
    api.upsertUser({
      clerk_id: user.id,
      email: user.primaryEmailAddress?.emailAddress ?? "",
      name: user.fullName ?? undefined,
    }).then(async (u: { id: string }) => {
      setDbUserId(u.id)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/manga/${id}?user_id=${u.id}`)
      if (!res.ok) { router.push("/dashboard"); return }
      const m = await res.json()
      setManga(m)
    }).catch(() => router.push("/dashboard"))
  }, [isLoaded, user, id])

  if (!manga) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center">
        <div className="font-serif text-5xl text-white/10 animate-pulse">漫</div>
      </div>
    )
  }

  const photos = manga.photos?.length ? manga.photos : (manga.photo_url ? [{ url: manga.photo_url, caption: "" }] : [])

  return (
    <main className="bg-black min-h-screen text-white">
      {/* Nav */}
      <nav className="border-b border-white/5 px-4 sm:px-6 h-12 flex items-center justify-between">
        <Link href="/dashboard" className="text-[9px] tracking-widest uppercase text-white/25 hover:text-white/60 transition-colors">
          ← Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <Link href={`/manga/${manga.id}`} className="text-[9px] tracking-widest uppercase text-white/25 hover:text-white/60 transition-colors">
            Read
          </Link>
          {!manga.is_preview && manga.status === "complete" && (
            <Link href={`/manga/${manga.id}/edit`} className="text-[9px] tracking-widest uppercase text-white/25 hover:text-white/60 transition-colors">
              Edit
            </Link>
          )}
          {isLoaded && user && <UserButton appearance={{ elements: { avatarBox: "w-6 h-6" } }} />}
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

        {/* Title section */}
        <div className="text-center mb-10">
          <div className="font-serif text-4xl text-white/15 mb-2">{manga.title_jp || "漫"}</div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white/80 mb-1">{manga.title || manga.subject_name}</h1>
          {manga.tagline && <p className="text-xs text-white/30 italic">{manga.tagline}</p>}
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className={`text-[9px] tracking-widest uppercase ${manga.is_preview ? "text-amber-500/60" : manga.status === "error" ? "text-red-500/50" : "text-green-500/60"}`}>
              {manga.status === "error" ? "error" : manga.is_preview ? "preview" : "complete"}
            </span>
            <span className="text-white/10">|</span>
            <span className="text-[9px] tracking-widest text-white/20">{manga.pages.length} pages</span>
          </div>
        </div>

        {/* Input section — what the user provided */}
        <div className="border border-white/5 bg-[#060606] p-5 sm:p-6 mb-8">
          <p className="text-[8px] tracking-[5px] uppercase text-white/20 mb-4">Your input</p>

          {/* Photos */}
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-5">
              {photos.map((p, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div className="w-[100px] h-[133px] border border-white/10 overflow-hidden">
                    <img src={p.url} className="w-full h-full object-cover" alt="" />
                  </div>
                  {p.caption && <span className="text-[9px] text-white/30 text-center max-w-[100px] truncate">{p.caption}</span>}
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-[8px] tracking-[4px] uppercase text-white/15 block mb-1">Name</span>
              <span className="text-sm text-white/60">{manga.subject_name}</span>
            </div>
            <div>
              <span className="text-[8px] tracking-[4px] uppercase text-white/15 block mb-1">Description</span>
              <span className="text-sm text-white/40 leading-relaxed">{manga.subject_description}</span>
            </div>
          </div>
        </div>

        {/* All pages */}
        <div className="mb-8">
          <p className="text-[8px] tracking-[5px] uppercase text-white/20 mb-4">All pages</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {manga.pages.map((page, i) => (
              <div key={i} className="border border-white/5 bg-[#080808] overflow-hidden group hover:border-white/15 transition-all">
                {/* Page number */}
                <div className="px-2 py-1 border-b border-white/5 flex items-center justify-between">
                  <span className="text-[8px] tracking-widest text-white/20">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-[7px] tracking-wider uppercase text-white/10">{page.type}</span>
                </div>

                {page.type === "img" && (
                  <div>
                    <div className="aspect-[3/4] overflow-hidden">
                      <img src={page.image_url} className="w-full h-full object-cover" alt="" />
                    </div>
                    {page.caption && (
                      <div className="px-2 py-1.5 text-[8px] text-white/25 leading-relaxed" dangerouslySetInnerHTML={{ __html: page.caption }} />
                    )}
                    {page.bubble && (
                      <div className="px-2 pb-1.5 text-[8px] text-white/40 italic">"{page.bubble}"</div>
                    )}
                  </div>
                )}

                {page.type === "text" && (
                  <div className="px-3 py-4 text-center">
                    {page.act && <p className="text-[7px] tracking-[3px] uppercase text-white/10 mb-1">{page.act}</p>}
                    {page.title && <h3 className="font-serif text-sm font-bold text-white/50 mb-1">{page.title}</h3>}
                    {page.date && <p className="text-[8px] text-white/15 tracking-widest mb-2">{page.date}</p>}
                    {page.narr && (
                      <div className="font-serif text-[10px] leading-[1.8] text-white/25" dangerouslySetInnerHTML={{ __html: page.narr }} />
                    )}
                  </div>
                )}

                {page.type === "climax" && (
                  <div className="px-3 py-5 text-center" style={{ background: "radial-gradient(ellipse at center, #0e0800 0%, #080808 100%)" }}>
                    <p className="text-[7px] tracking-[3px] uppercase text-[#8a6a30] mb-2">The Moment</p>
                    <div className="font-serif text-[11px] leading-[1.8] text-[#c8a96e] font-bold" dangerouslySetInnerHTML={{ __html: page.quote }} />
                  </div>
                )}

                {page.type === "ending" && (
                  <div className="px-3 py-5 text-center">
                    {page.ending_text && (
                      <div className="font-serif text-[10px] text-white/20 leading-[1.8]" dangerouslySetInnerHTML={{ __html: page.ending_text }} />
                    )}
                    <div className="font-serif text-xl text-white/10 mt-3">{page.ending_kanji || "終"}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 justify-center pb-12">
          <Link href={`/manga/${manga.id}`} className="text-[9px] tracking-[3px] uppercase text-white/30 hover:text-white/60 border border-white/10 hover:border-white/25 px-5 py-2.5 transition-all">
            Read manga
          </Link>
          {!manga.is_preview && manga.status === "complete" && (
            <Link href={`/manga/${manga.id}/edit`} className="text-[9px] tracking-[3px] uppercase text-white/30 hover:text-white/60 border border-white/10 hover:border-white/25 px-5 py-2.5 transition-all">
              Edit story
            </Link>
          )}
        </div>
      </div>
    </main>
  )
}
