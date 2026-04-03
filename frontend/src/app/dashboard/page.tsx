"use client"
import { useUser, UserButton } from "@clerk/nextjs"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api"

type Manga = {
  id: string
  title: string
  subject_name: string
  status: string
  is_preview: boolean
  created_at: string
}

type DBUser = { id: string; is_subscribed: boolean }

export default function DashboardPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const params = useSearchParams()
  const [mangas, setMangas] = useState<Manga[]>([])
  const [dbUser, setDbUser] = useState<DBUser | null>(null)

  useEffect(() => {
    if (!isLoaded || !user) return
    // Sync user to our DB, then load their mangas
    api.upsertUser({
      clerk_id: user.id,
      email: user.primaryEmailAddress?.emailAddress ?? "",
      name: user.fullName ?? undefined,
    }).then((u: DBUser) => {
      setDbUser(u)
      return api.listMangas(u.id)
    }).then(setMangas).catch(console.error)
  }, [isLoaded, user])

  const handleSubscribe = async () => {
    if (!dbUser) return
    const { url } = await api.checkout(dbUser.id)
    window.location.href = url
  }

  const handleBilling = async () => {
    if (!dbUser) return
    const { url } = await api.billingPortal(dbUser.id)
    window.location.href = url
  }

  if (!isLoaded) return <div className="bg-black min-h-screen flex items-center justify-center"><div className="font-serif text-4xl text-white/10 animate-pulse">漫</div></div>

  return (
    <main className="bg-black min-h-screen text-white">
      {/* Nav */}
      <nav className="border-b border-white/5 px-6 h-14 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/" className="font-serif text-lg tracking-widest text-white/60 hover:text-white/80 transition-colors">漫画 MASTER</Link>
        <div className="flex items-center gap-4">
          {dbUser?.is_subscribed ? (
            <button onClick={handleBilling} className="text-xs tracking-widest uppercase text-white/20 hover:text-white/40 transition-colors">Billing</button>
          ) : (
            <button onClick={handleSubscribe} className="text-xs tracking-widest uppercase border border-white/20 px-4 py-2 hover:bg-white hover:text-black transition-all">
              Upgrade $12/mo
            </button>
          )}
          <UserButton appearance={{ elements: { avatarBox: "w-7 h-7" } }} />
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Subscribed banner */}
        {params.get("subscribed") === "true" && (
          <div className="border border-white/10 px-5 py-3 text-xs text-white/40 tracking-widest mb-8">
            Subscription active — you now have unlimited full mangas.
          </div>
        )}

        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-[9px] tracking-[6px] uppercase text-white/20 mb-1">Your stories</p>
            <h1 className="font-serif text-3xl font-bold text-white/80">{user?.firstName ?? "Hello"}</h1>
          </div>
          <Link href="/create" className="bg-white text-black text-xs tracking-[4px] uppercase px-6 py-3 font-semibold hover:bg-white/90 transition-all">
            + New Manga
          </Link>
        </div>

        {/* Empty state */}
        {mangas.length === 0 && (
          <div className="border border-white/5 py-20 text-center">
            <div className="font-serif text-5xl text-white/5 mb-4">漫</div>
            <p className="text-xs text-white/20 tracking-widest mb-6">No mangas yet</p>
            <Link href="/create" className="text-xs tracking-widest uppercase text-white/30 hover:text-white/50 transition-colors border border-white/10 px-6 py-2">
              Create your first manga
            </Link>
          </div>
        )}

        {/* Manga grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
          {mangas.map(m => (
            <Link key={m.id} href={`/manga/${m.id}`} className="group border border-white/5 p-5 hover:border-white/15 transition-all">
              <div className="font-serif text-3xl text-white/20 group-hover:text-white/40 transition-colors mb-3">漫</div>
              <div className="text-xs font-semibold text-white/50 group-hover:text-white/70 transition-colors mb-1 truncate">
                {m.title || m.subject_name}
              </div>
              <div className="text-[9px] tracking-widest uppercase text-white/15">
                {m.status === "generating" ? "generating..." : m.is_preview ? "preview" : "full"}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
