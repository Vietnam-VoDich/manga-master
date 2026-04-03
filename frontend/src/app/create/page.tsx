"use client"
import { useUser } from "@clerk/nextjs"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"

type Step = "photo" | "story" | "generating"

export default function CreatePage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [step, setStep] = useState<Step>("photo")
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [recording, setRecording] = useState(false)
  const [dbUserId, setDbUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    if (!isLoaded || !user) return
    api.upsertUser({
      clerk_id: user.id,
      email: user.primaryEmailAddress?.emailAddress ?? "",
      name: user.fullName ?? undefined,
    }).then((u: { id: string }) => setDbUserId(u.id)).catch(console.error)
  }, [isLoaded, user])

  const handlePhoto = (file: File) => {
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
    setStep("story")
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith("image/")) handlePhoto(file)
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
      if (userId) fd.append("user_id", userId)
      if (photo) fd.append("photo", photo)
      const data = await api.createManga(fd)
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
        <span className="font-serif text-base tracking-widest text-white/40">漫画</span>
        <span className="text-[9px] tracking-[4px] uppercase text-white/20">
          {step === "photo" ? "1 / 2" : step === "story" ? "2 / 2" : "..."}
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">

        {/* STEP 1: PHOTO */}
        {step === "photo" && (
          <div className="w-full max-w-sm text-center">
            <h2 className="font-serif text-2xl sm:text-3xl text-white/80 mb-2">Upload a photo</h2>
            <p className="text-sm text-white/30 mb-8">The manga character will resemble this person</p>

            <label
              className="group border border-white/10 w-full aspect-[3/4] max-w-[240px] mx-auto flex flex-col items-center justify-center cursor-pointer hover:border-white/30 active:border-white/40 transition-all block"
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
            >
              <span className="text-4xl text-white/10 group-hover:text-white/30 transition-colors mb-3">+</span>
              <span className="text-[10px] tracking-widest uppercase text-white/20 group-hover:text-white/40 transition-colors">Drop photo or click</span>
              <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handlePhoto(f) }} />
            </label>

            <button
              onClick={() => setStep("story")}
              className="mt-6 text-[10px] tracking-widest uppercase text-white/15 hover:text-white/40 transition-colors py-3 w-full"
            >
              Skip — describe only
            </button>
          </div>
        )}

        {/* STEP 2: STORY */}
        {step === "story" && (
          <div className="w-full max-w-md">
            <h2 className="font-serif text-2xl sm:text-3xl text-white/80 mb-2 text-center">Tell their story</h2>
            <p className="text-sm text-white/30 mb-8 text-center">The more specific, the funnier the manga</p>

            {photoPreview && (
              <div className="w-14 h-18 mx-auto mb-6 overflow-hidden border border-white/10">
                <img src={photoPreview} className="w-full h-full object-cover grayscale" alt="preview" />
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-[9px] tracking-[4px] uppercase text-white/30 block mb-2">Their name</label>
                <input
                  className="w-full bg-transparent border border-white/10 px-4 py-3 text-base text-white/80 focus:outline-none focus:border-white/40 placeholder:text-white/15"
                  placeholder="e.g. Ata"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[9px] tracking-[4px] uppercase text-white/30 block mb-2">Their story</label>
                <textarea
                  className="w-full bg-transparent border border-white/10 px-4 py-3 text-base text-white/80 focus:outline-none focus:border-white/40 placeholder:text-white/15 resize-none h-32 sm:h-40"
                  placeholder="Who are they? Their job, quirks, dreams, disasters... The more specific the better."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
                <div className="flex justify-end mt-1">
                  <span className="text-[9px] text-white/15">{description.length} chars</span>
                </div>
              </div>

              {/* Voice recording */}
              <button
                onClick={recording ? stopRecording : startRecording}
                className={`flex items-center gap-2 text-[10px] tracking-widest uppercase border px-4 py-3 transition-all w-full justify-center ${
                  recording
                    ? "border-red-500/50 text-red-400 bg-red-500/5"
                    : "border-white/10 text-white/30 hover:border-white/30 active:border-white/40"
                }`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${recording ? "bg-red-400 animate-pulse" : "bg-white/20"}`} />
                {recording ? "Tap to stop recording" : "Record a voice note instead"}
              </button>

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
          <div className="text-center px-5">
            <div className="font-serif text-7xl text-white/10 animate-pulse mb-8">漫</div>
            <p className="text-sm text-white/40 mb-6">Generating your manga...</p>
            <div className="space-y-2 text-[10px] text-white/15 tracking-widest">
              <p>Writing the story</p>
              <p>Drawing the panels</p>
              <p>Recording the narration</p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
