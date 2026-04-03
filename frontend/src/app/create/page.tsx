"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"

type Step = "photo" | "story" | "generating"

export default function CreatePage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("photo")
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [recording, setRecording] = useState(false)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
    setStep("story")
  }

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mr = new MediaRecorder(stream)
    chunksRef.current = []
    mr.ondataavailable = e => chunksRef.current.push(e.data)
    mr.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" })
      // TODO: send to whisper transcription endpoint
      setDescription(prev => prev + " [voice note transcribed]")
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
    setStep("generating")

    const fd = new FormData()
    fd.append("subject_name", name)
    fd.append("description", description)
    fd.append("user_id", "guest") // TODO: real auth
    if (photo) fd.append("photo", photo)

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/manga/create`, { method: "POST", body: fd })
    const data = await res.json()
    router.push(`/manga/${data.manga_id}`)
  }

  return (
    <main className="bg-black text-white min-h-screen flex flex-col items-center justify-center px-6 py-16">

      {/* Header */}
      <p className="text-[9px] tracking-[6px] uppercase text-white/20 mb-8">Create Manga</p>

      {/* STEP: PHOTO */}
      {step === "photo" && (
        <div className="w-full max-w-sm text-center">
          <div className="font-serif text-3xl text-white/80 mb-3">Step 1</div>
          <p className="text-sm text-white/40 mb-10">Upload a photo of the person</p>
          <label className="group border border-white/10 aspect-[2/3] max-w-[200px] mx-auto flex flex-col items-center justify-center cursor-pointer hover:border-white/30 transition-all block">
            <span className="text-4xl text-white/10 group-hover:text-white/30 transition-colors mb-3">+</span>
            <span className="text-[10px] tracking-widest uppercase text-white/20 group-hover:text-white/40 transition-colors">Choose photo</span>
            <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </label>
          <button onClick={() => setStep("story")} className="mt-8 text-[10px] tracking-widest uppercase text-white/15 hover:text-white/30 transition-colors">
            Skip — no photo
          </button>
        </div>
      )}

      {/* STEP: STORY */}
      {step === "story" && (
        <div className="w-full max-w-md">
          <div className="font-serif text-3xl text-white/80 mb-3 text-center">Step 2</div>
          <p className="text-sm text-white/40 mb-10 text-center">Tell us about them</p>

          {photoPreview && (
            <div className="w-16 h-20 mx-auto mb-8 overflow-hidden border border-white/10">
              <img src={photoPreview} className="w-full h-full object-cover" style={{ filter: "grayscale(0.3) contrast(1.1)" }} alt="preview" />
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="text-[9px] tracking-[4px] uppercase text-white/30 block mb-2">Their name</label>
              <input
                className="w-full bg-transparent border border-white/10 px-4 py-3 text-sm text-white/80 focus:outline-none focus:border-white/30 placeholder:text-white/15"
                placeholder="e.g. Ata"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[9px] tracking-[4px] uppercase text-white/30 block mb-2">Their story</label>
              <textarea
                className="w-full bg-transparent border border-white/10 px-4 py-3 text-sm text-white/80 focus:outline-none focus:border-white/30 placeholder:text-white/15 resize-none h-36"
                placeholder="Who are they? What do they do? Their quirks, dreams, disasters... The more specific the better."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            {/* Voice recording */}
            <div className="flex items-center gap-3">
              <button
                onClick={recording ? stopRecording : startRecording}
                className={`flex items-center gap-2 text-[10px] tracking-widest uppercase border px-4 py-2 transition-all ${recording ? "border-red-500/50 text-red-400" : "border-white/10 text-white/30 hover:border-white/30 hover:text-white/50"}`}
              >
                <span className={`w-2 h-2 rounded-full ${recording ? "bg-red-400 animate-pulse" : "bg-white/20"}`} />
                {recording ? "Stop recording" : "Record voice note"}
              </button>
              <span className="text-[9px] text-white/15">We transcribe it automatically</span>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!name || !description}
              className="w-full bg-white text-black text-xs tracking-[4px] uppercase py-4 font-semibold hover:bg-white/90 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
            >
              Generate My Manga
            </button>
            <p className="text-[9px] text-white/15 text-center tracking-widest">You get 2 pages free. Subscribe for the full story.</p>
          </div>
        </div>
      )}

      {/* STEP: GENERATING */}
      {step === "generating" && (
        <div className="text-center">
          <div className="font-serif text-6xl text-white/10 animate-pulse mb-8">漫</div>
          <p className="text-sm text-white/40 mb-3">Generating your manga...</p>
          <p className="text-[10px] text-white/20 tracking-widest">Writing the story · Drawing the panels · Recording the narration</p>
        </div>
      )}

    </main>
  )
}
