"use client"
import { useUser, UserButton } from "@clerk/nextjs"
import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api"

type Manga = { id: string; title: string; subject_name: string; status: string; is_preview: boolean; created_at: string; cover_image?: string; title_jp?: string }
type DBUser = { id: string; is_subscribed: boolean }

function DashboardInner() {
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
    }).then(async (u: DBUser) => {
      setDbUser(u)
      // Claim any manga generated as a guest
      const lastId = localStorage.getItem("last_manga_id")
      if (lastId) {
        try { await api.claimManga(lastId, u.id) } catch {}
        localStorage.removeItem("last_manga_id")
      }
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
        <Link href="/" className="font-serif text-base tracking-widest text-white/50 hover:text-white/70 transition-colors">絵巻</Link>
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
              <div key={m.id} className="group border border-white/5 hover:border-white/15 transition-all flex flex-col">
                <Link href={`/manga/${m.id}`} className="block">
                  {/* Cover image area */}
                  <div className="relative aspect-[3/4] overflow-hidden bg-[#080808]">
                    {m.cover_image ? (
                      <>
                        <img
                          src={m.cover_image}
                          alt=""
                          className="w-full h-full object-cover"
                          style={{ filter: "brightness(0.4) contrast(1.2)" }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="font-serif text-4xl sm:text-5xl text-white/80 drop-shadow-lg select-none">
                            {m.title_jp || "漫"}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="font-serif text-2xl sm:text-3xl text-white/20 group-hover:text-white/40 transition-colors">漫</span>
                      </div>
                    )}
                  </div>
                  {/* Card body */}
                  <div className="p-3 sm:p-4">
                    <div className="text-[11px] font-semibold text-white/50 group-hover:text-white/70 transition-colors mb-1 truncate">
                      {m.title || m.subject_name}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {(m.status === "pending" || m.status === "generating") ? (
                        <span className="text-[9px] tracking-widest uppercase text-white/15 animate-pulse">generating...</span>
                      ) : m.status === "enhancing" ? (
                        <span className="text-[9px] tracking-widest uppercase text-white/15 animate-pulse">enhancing...</span>
                      ) : m.status === "error" ? (
                        <span className="text-[9px] tracking-widest uppercase text-red-500/50">error</span>
                      ) : m.is_preview ? (
                        <span className="flex items-center gap-1 text-[9px] tracking-widest uppercase text-amber-500/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500/60 inline-block" />
                          preview
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[9px] tracking-widest uppercase text-green-500/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500/60 inline-block" />
                          complete
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
                {/* Expand / upgrade row */}
                {m.is_preview && (
                  <div className="px-3 sm:px-4 pb-3">
                    {dbUser?.is_subscribed ? (
                      <button
                        onClick={async () => {
                          try { await api.expandManga(m.id, dbUser!.id) } catch {}
                          window.location.href = `/manga/${m.id}`
                        }}
                        className="text-[9px] tracking-widest uppercase text-white/30 hover:text-white/60 transition-colors border border-white/10 hover:border-white/25 px-2 py-1"
                      >
                        Expand →
                      </button>
                    ) : (
                      <span className="text-[9px] tracking-widest uppercase text-white/15">Upgrade to unlock</span>
                    )}
                  </div>
                )}
                {/* Edit story — subscribers only, complete mangas */}
                {!m.is_preview && m.status === "complete" && dbUser?.is_subscribed && (
                  <div className="px-3 sm:px-4 pb-3">
                    <Link href={`/manga/${m.id}/edit`} className="text-[9px] tracking-widest uppercase text-white/30 hover:text-white/60 transition-colors mt-1 block">
                      Edit story →
                    </Link>
                  </div>
                )}
              </div>
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

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="bg-black min-h-[100dvh] flex items-center justify-center"><div className="font-serif text-5xl text-white/10 animate-pulse">漫</div></div>}>
      <DashboardInner />
    </Suspense>
  )
}
