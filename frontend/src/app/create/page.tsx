"use client"
import { useUser } from "@clerk/nextjs"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"

type Step = "photo" | "story" | "generating"
const LOAD_STEPS = ["Writing the story", "Drawing the panels", "Recording the narration"]

export default function CreatePage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [step, setStep] = useState<Step>("photo")
  const [photos, setPhotos] = useState<{ file: File; preview: string; caption: string }[]>([])
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [tone, setTone] = useState<"emotional" | "humorous" | "roast">("humorous")
  const [recording, setRecording] = useState(false)
  const [dbUserId, setDbUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadStep, setLoadStep] = useState(0)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    if (step !== "generating") return
    const t = setInterval(() => setLoadStep(s => (s + 1) % LOAD_STEPS.length), 2500)
    return () => clearInterval(t)
  }, [step])

  useEffect(() => {
    if (!isLoaded || !user) return
    api.upsertUser({
      clerk_id: user.id,
      email: user.primaryEmailAddress?.emailAddress ?? "",
      name: user.fullName ?? undefined,
    }).then((u: { id: string }) => setDbUserId(u.id)).catch(console.error)
  }, [isLoaded, user])

  const addPhoto = (file: File) => {
    if (photos.length >= 5) return
    setPhotos(prev => [...prev, { file, preview: URL.createObjectURL(file), caption: "" }])
    if (step === "photo") setStep("story")
  }

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const updateCaption = (index: number, caption: string) => {
    setPhotos(prev => prev.map((p, i) => i === index ? { ...p, caption } : p))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"))
    files.slice(0, 5 - photos.length).forEach(addPhoto)
  }

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mr = new MediaRecorder(stream)
    chunksRef.current = []
    mr.ondataavailable = e => chunksRef.current.push(e.data)
    mr.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" })
      const fd = new FormData()
      fd.append("audio", blob, "voice.webm")
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/transcribe/`, { method: "POST", body: fd })
        const { text } = await res.json()
        setDescription(prev => (prev ? prev + " " + text : text))
      } catch {}
    }
    mr.start()
    mediaRef.current = mr
    setRecording(true)
  }

  const stopRecording = () => {
    mediaRef.current?.stop()
    setRecording(false)
  }

  const handleSubmit = async () => {
    if (!name || !description) return
    setError(null)
    setStep("generating")
    try {
      // Try to get user_id if signed in, but don't require it
      let userId = dbUserId
      if (!userId && user) {
        try {
          const u = await api.upsertUser({
            clerk_id: user.id,
            email: user.primaryEmailAddress?.emailAddress ?? "",
            name: user.fullName ?? undefined,
          })
          userId = u.id
          setDbUserId(u.id)
        } catch {}
      }
      const fd = new FormData()
      fd.append("subject_name", name)
      fd.append("description", description)
      fd.append("tone", tone)
      if (userId) fd.append("user_id", userId)
      photos.forEach(p => fd.append("photos", p.file))
      fd.append("captions", JSON.stringify(photos.map(p => p.caption)))
      const data = await api.createManga(fd)
      localStorage.setItem("last_manga_id", data.manga_id)
      router.push(`/manga/${data.manga_id}`)
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong. Please try again.")
      setStep("story")
    }
  }

  return (
    <main className="bg-black text-white min-h-[100dvh] flex flex-col">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 h-14 border-b border-white/5">
        <span className="font-serif text-base tracking-widest text-white/40">絵巻</span>
        <span className="text-[9px] tracking-[4px] uppercase text-white/20">
          {step === "photo" ? "1 / 2" : step === "story" ? "2 / 2" : "..."}
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">

        {/* STEP 1: PHOTO */}
        {step === "photo" && (
          <div className="w-full max-w-sm text-center">
            <h2 className="font-serif text-2xl sm:text-3xl text-white/80 mb-2">Upload a photo</h2>
            <p className="text-sm text-white/30 mb-8">The manga characters will resemble the photo</p>

            {photos.length === 0 ? (
              /* First photo — big upload box */
              <label
                className="group border border-white/10 w-full aspect-[3/4] max-w-[240px] mx-auto flex flex-col items-center justify-center cursor-pointer hover:border-white/30 active:border-white/40 transition-all block"
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
              >
                <span className="text-4xl text-white/10 group-hover:text-white/30 transition-colors mb-3">+</span>
                <span className="text-[10px] tracking-widest uppercase text-white/20 group-hover:text-white/40 transition-colors">Drop photo or click</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) addPhoto(f) }} />
              </label>
            ) : (
              /* Photos uploaded — show them big with add more */
              <div className="flex flex-col items-center gap-4">
                <div className="flex flex-wrap justify-center gap-3">
                  {photos.map((p, i) => (
                    <div key={i} className="relative w-[140px] h-[187px] border border-white/20 overflow-hidden group">
                      <img src={p.preview} className="w-full h-full object-cover" alt="" />
                      <button onClick={() => removePhoto(i)} className="absolute top-1 right-1 w-5 h-5 bg-black/80 text-white/70 text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">✕</button>
                    </div>
                  ))}
                  {photos.length < 5 && (
                    <label
                      className="group border border-dashed border-white/15 w-[140px] h-[187px] flex flex-col items-center justify-center cursor-pointer hover:border-white/30 transition-all"
                      onDragOver={e => e.preventDefault()}
                      onDrop={handleDrop}
                    >
                      <span className="text-3xl text-white/10 group-hover:text-white/30 transition-colors mb-1">+</span>
                      <span className="text-[9px] tracking-widest uppercase text-white/15 group-hover:text-white/35 transition-colors">Add another</span>
                      <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) addPhoto(f) }} />
                    </label>
                  )}
                </div>
                <p className="text-[9px] text-white/20 tracking-widest">{photos.length} / 5 photos</p>
              </div>
            )}

            <button
              onClick={() => setStep("story")}
              className="mt-6 text-[10px] tracking-widest uppercase text-white/15 hover:text-white/40 transition-colors py-3 w-full"
            >
              {photos.length > 0 ? "Continue →" : "Skip — describe only"}
            </button>
          </div>
        )}

        {/* STEP 2: STORY */}
        {step === "story" && (
          <div className="w-full max-w-md">
            <h2 className="font-serif text-2xl sm:text-3xl text-white/80 mb-2 text-center">Tell their story</h2>
            <p className="text-sm text-white/30 mb-8 text-center">The more specific, the funnier the manga</p>

            {/* Photo strip with captions */}
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              {photos.map((p, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div className="relative w-[150px] h-[200px] border border-white/15 overflow-hidden group">
                    <img src={p.preview} className="w-full h-full object-cover" alt="" />
                    <button onClick={() => removePhoto(i)} className="absolute top-1 right-1 w-5 h-5 bg-black/80 text-white/70 text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">✕</button>
                  </div>
                  <input
                    className="w-[150px] bg-transparent border-b border-white/10 text-[10px] text-white/50 text-center py-1 focus:outline-none focus:border-white/30 placeholder:text-white/15"
                    placeholder="e.g. This is Ata"
                    value={p.caption}
                    onChange={e => updateCaption(i, e.target.value)}
                  />
                </div>
              ))}
              {photos.length < 5 && (
                <label
                  className="group border border-dashed border-white/10 w-[150px] h-[200px] flex flex-col items-center justify-center cursor-pointer hover:border-white/25 transition-all"
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleDrop}
                >
                  <span className="text-3xl text-white/10 group-hover:text-white/25 transition-colors">+</span>
                  <span className="text-[9px] text-white/15 group-hover:text-white/30 transition-colors mt-1">Add photo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) addPhoto(f) }} />
                </label>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[9px] tracking-[4px] uppercase text-white/30 block mb-2">Name</label>
                <input
                  className="w-full bg-transparent border border-white/10 px-4 py-3 text-base text-white/80 focus:outline-none focus:border-white/40 placeholder:text-white/15"
                  placeholder="e.g. Ata"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[9px] tracking-[4px] uppercase text-white/30 block mb-2">The story</label>
                <textarea
                  className="w-full bg-transparent border border-white/10 px-4 py-3 text-base text-white/80 focus:outline-none focus:border-white/40 placeholder:text-white/15 resize-none h-24 sm:h-28"
                  placeholder="Who are they? A person, a pet, a duo? Their quirks, habits, dreams... The more specific the better."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
                <div className="flex justify-end mt-1">
                  <span className="text-[9px] text-white/15">{description.length} chars</span>
                </div>
              </div>

              {/* Tone selector */}
              <div>
                <label className="text-[9px] tracking-[4px] uppercase text-white/30 block mb-2">Story tone</label>
                <div className="grid grid-cols-3 gap-1">
                  {([
                    { value: "emotional" as const, label: "Emotional", desc: "Heartfelt & moving" },
                    { value: "humorous" as const, label: "Humorous", desc: "Light & funny" },
                    { value: "roast" as const, label: "Roast", desc: "Savage & hilarious" },
                  ]).map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTone(t.value)}
                      className={`border px-2 py-2.5 transition-all text-center ${
                        tone === t.value
                          ? "border-white/40 bg-white/5 text-white/80"
                          : "border-white/10 text-white/25 hover:border-white/20 hover:text-white/40"
                      }`}
                    >
                      <div className="text-[10px] tracking-widest uppercase font-semibold">{t.label}</div>
                      <div className="text-[8px] tracking-wider mt-0.5 opacity-60">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-[10px] text-red-400/70 text-center tracking-widest">{error}</p>}
              <button
                onClick={handleSubmit}
                disabled={!name || !description}
                className="w-full bg-white text-black text-[10px] tracking-[4px] uppercase py-4 font-semibold hover:bg-white/90 active:bg-white/80 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
              >
                Generate Manga
              </button>
              <p className="text-[9px] text-white/15 text-center tracking-widest">2 pages free · Subscribe for the full story</p>
            </div>
          </div>
        )}

        {/* GENERATING */}
        {step === "generating" && (
          <div className="relative w-full flex items-center justify-center min-h-[60vh]">
            {/* Left facts */}
            <div className="hidden lg:flex flex-col gap-8 absolute left-0 xl:left-8 top-1/2 -translate-y-1/2 text-right">
              {[
                { jp: "絵巻物", en: "12th century — the first picture scrolls" },
                { jp: "北斎", en: "Hokusai coined 'manga' in 1814" },
                { jp: "手塚治虫", en: "Tezuka invented modern manga in 1952" },
                { jp: "少年", en: "Shōnen Jump launched in 1968" },
              ].map((f, i) => (
                <div key={i} className="opacity-[0.06] hover:opacity-[0.14] transition-opacity duration-500">
                  <div className="font-serif text-sm text-white/80 tracking-widest mb-0.5">{f.jp}</div>
                  <div className="text-[9px] tracking-[2px] text-white/50 max-w-[160px] ml-auto">{f.en}</div>
                </div>
              ))}
            </div>

            <div className="text-center px-5">
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

            {/* Right facts */}
            <div className="hidden lg:flex flex-col gap-8 absolute right-0 xl:right-8 top-1/2 -translate-y-1/2 text-left">
              {[
                { jp: "漫画", en: "means 'whimsical sketches'" },
                { jp: "ONE PIECE", en: "520 million copies — best-selling manga" },
                { jp: "DRAGON BALL", en: "260 million copies worldwide" },
                { jp: "四割", en: "40% of books sold in Japan are manga" },
              ].map((f, i) => (
                <div key={i} className="opacity-[0.06] hover:opacity-[0.14] transition-opacity duration-500">
                  <div className="font-serif text-sm text-white/80 tracking-widest mb-0.5">{f.jp}</div>
                  <div className="text-[9px] tracking-[2px] text-white/50 max-w-[160px]">{f.en}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
