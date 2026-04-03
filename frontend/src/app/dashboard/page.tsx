"use client"
import { useUser, UserButton } from "@clerk/nextjs"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api"

type Manga = { id: string; title: string; subject_name: string; status: string; is_preview: boolean; created_at: string }
type DBUser = { id: string; is_subscribed: boolean }

export default function DashboardPage() {
  const { user, isLoaded } = useUser()
  const params = useSearchParams()
  const [mangas, setMangas] = useState<Manga[]>([])
  const [dbUser, setDbUser] = useState<DBUser | null>(null)

  useEffect(() => {
    if (!isLoaded || !user) return
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

  if (!isLoaded) return (
    <div className="bg-black min-h-[100dvh] flex items-center justify-center">
      <div className="font-serif text-5xl text-white/10 animate-pulse">漫</div>
    </div>
  )

  return (
    <main className="bg-black min-h-[100dvh] text-white">
      {/* Nav */}
      <nav className="border-b border-white/5 px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="font-serif text-base tracking-widest text-white/50 hover:text-white/70 transition-colors">漫画</Link>
        <div className="flex items-center gap-3 sm:gap-4">
          {dbUser?.is_subscribed ? (
            <button onClick={handleBilling} className="text-[9px] tracking-widest uppercase text-white/20 hover:text-white/40 transition-colors hidden sm:block">Billing</button>
          ) : (
            <button onClick={handleSubscribe} className="text-[9px] tracking-widest uppercase border border-white/20 px-3 py-2 hover:bg-white hover:text-black transition-all">
              Upgrade $12/mo
            </button>
          )}
          <UserButton appearance={{ elements: { avatarBox: "w-7 h-7" } }} />
        </div>
      </nav>

      <div className="px-4 sm:px-6 py-8 sm:py-12 max-w-5xl mx-auto">

        {params.get("subscribed") === "true" && (
          <div className="border border-white/10 px-4 py-3 text-[10px] text-white/40 tracking-widest mb-6">
            Subscription active — unlimited full mangas unlocked.
          </div>
        )}

        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[9px] tracking-[5px] uppercase text-white/20 mb-1">Your stories</p>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white/80">{user?.firstName ?? "Hello"}</h1>
          </div>
          <Link href="/create" className="bg-white text-black text-[9px] sm:text-[10px] tracking-[3px] sm:tracking-[4px] uppercase px-4 sm:px-6 py-3 font-semibold hover:bg-white/90 active:bg-white/80 transition-all">
            + New
          </Link>
        </div>

        {mangas.length === 0 ? (
          <div className="border border-white/5 py-16 text-center">
            <div className="font-serif text-5xl text-white/5 mb-4">漫</div>
            <p className="text-xs text-white/20 tracking-widest mb-6">No mangas yet</p>
            <Link href="/create" className="text-[10px] tracking-widest uppercase text-white/25 hover:text-white/50 transition-colors border border-white/10 px-6 py-3 inline-block">
              Create your first
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
            {mangas.map(m => (
              <Link key={m.id} href={`/manga/${m.id}`} className="group border border-white/5 p-4 sm:p-5 hover:border-white/15 active:border-white/20 transition-all">
                <div className="font-serif text-2xl sm:text-3xl text-white/20 group-hover:text-white/40 transition-colors mb-3">漫</div>
                <div className="text-[11px] font-semibold text-white/50 group-hover:text-white/70 transition-colors mb-1 truncate">
                  {m.title || m.subject_name}
                </div>
                <div className="text-[9px] tracking-widest uppercase text-white/15">
                  {m.status === "generating" ? "generating..." : m.is_preview ? "preview" : "full"}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Mobile subscribe bar */}
      {!dbUser?.is_subscribed && (
        <div className="fixed bottom-0 left-0 right-0 sm:hidden border-t border-white/10 bg-black px-4 py-3 flex items-center justify-between">
          <p className="text-[9px] text-white/30 tracking-widest">Unlock full stories</p>
          <button onClick={handleSubscribe} className="bg-white text-black text-[9px] tracking-[3px] uppercase px-5 py-2 font-semibold">
            $12/mo
          </button>
        </div>
      )}
    </main>
  )
}
