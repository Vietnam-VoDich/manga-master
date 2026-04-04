"use client"
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"

const PAGES = [
  {
    type: "text",
    act: "Act I — The Wanderer",
    title: "He Who Had No Country",
    date: "Saigon · 1911",
    narr: "He left Vietnam as a kitchen boy on a French steamship. He left with nothing — no money, no connections, no country. He would spend the next <em>thirty years</em> wandering the world looking for the right idea to bring home. He found it in a Paris café, between a croissant and a pamphlet.",
  },
  {
    type: "img",
    image_url: "/sample-manga-hcm/hcm-portrait.png",
    caption: "Nguyễn Sinh Cung. Later: Nguyễn Ái Quốc. Later still: <em>Hồ Chí Minh</em>. He Who Enlightens. He changed his name like other men change coats.",
  },
  {
    type: "img",
    image_url: "/sample-manga-hcm/leaving-ship.png",
    caption: "Marseille, 1911. Age 21. He scrubs dishes, peels potatoes, dreams. The ship sails. Vietnam shrinks behind him. He does not look back.",
  },
  {
    type: "img",
    image_url: "/sample-manga-hcm/paris-petition.png",
    caption: "Paris, 1919. The Peace Conference. He shows up in a rented suit with a petition demanding Vietnamese rights. Nobody reads it. He takes notes.",
    bubble: "\"If you do not fight for it, no one will give it to you.\"",
  },
  {
    type: "img",
    image_url: "/sample-manga-hcm/reading-lenin.png",
    caption: "He reads Lenin's Theses on the National Question. And suddenly — <em>everything makes sense</em>. The colonies. The workers. The path home.",
  },
  {
    type: "img",
    image_url: "/sample-manga-hcm/colonial-village.png",
    caption: "He travels. Moscow. China. Thailand. Always moving. Always organising. The French put a price on his head. He grows a beard.",
  },
  {
    type: "img",
    image_url: "/sample-manga-hcm/declaration.png",
    caption: "Hanoi, September 2nd 1945. He steps to the microphone in Ba Đình Square. He begins: <em>\"All men are created equal...\"</em> — words he borrowed from Thomas Jefferson.",
  },
  {
    type: "img",
    image_url: "/sample-manga-hcm/ba-dinh-crowd.png",
    caption: "Four hundred thousand people. Looking up. A kitchen boy from the Mekong Delta, standing where emperors once stood.",
  },
  {
    type: "climax",
    quote: "\"Nothing is more precious than independence and freedom.\"",
    attr: "Hồ Chí Minh, 1966 — words that became the motto of a nation.",
  },
  {
    type: "ending",
    ending_text: "He never married. Never owned property.\nHe lived in a simple wooden house next to a fish pond in Hanoi.\nThe man who freed a country kept nothing for himself.\n<em>Some people are not built for comfort. They are built for history.</em>",
    ending_kanji: "胡",
  },
]

export default function HCMSamplePage() {
  const [cur, setCur] = useState(0)
  const [showCover, setShowCover] = useState(true)
  const [turning, setTurning] = useState(false)
  const [audioOn, setAudioOn] = useState(false)
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)

  useEffect(() => {
    const a = new Audio("/sample-manga-hcm/theme.mp3")
    a.loop = true
    a.volume = 0.35
    setAudio(a)
  }, [])

  const go = useCallback((dir: 1 | -1) => {
    const next = cur + dir
    if (next < 0 || next >= PAGES.length) return
    setTurning(true)
    setTimeout(() => { setCur(next); setTurning(false) }, 150)
  }, [cur])

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

  const startBook = () => {
    setShowCover(false)
    if (audio) { audio.play().catch(() => {}); setAudioOn(true) }
  }

  if (showCover) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center cursor-pointer" onClick={startBook}>
        <div className="text-center px-8">
          <div className="font-serif text-8xl font-black text-white/90 tracking-widest mb-4">胡</div>
          <div className="text-xs tracking-[8px] uppercase text-white/30 mb-3">He Who Enlightens</div>
          <div className="text-xs text-white/15 italic mb-12">Kitchen boy to president. Thirty years wandering.</div>
          <button className="border border-white/20 text-white/50 text-[10px] tracking-[4px] uppercase px-10 py-3 hover:bg-white hover:text-black transition-all">
            Open Book
          </button>
          <p className="text-[9px] text-white/10 mt-6 tracking-widest">Vietnam · 1890–1945</p>
        </div>
      </div>
    )
  }

  const page = PAGES[cur] as any

  return (
    <div
      className="bg-black min-h-screen flex items-center justify-center relative"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <button
        onClick={toggleAudio}
        className="fixed top-3 right-3 z-50 w-7 h-7 rounded-full border border-white/10 bg-black/70 text-white/30 text-xs flex items-center justify-center hover:text-white/60 transition-colors"
      >
        {audioOn ? "♫" : "♪"}
      </button>

      <Link href="/" className="fixed top-3 left-3 z-50 text-[9px] tracking-widest uppercase text-white/20 hover:text-white/50 transition-colors">← Back</Link>

      <div className="absolute top-0 left-0 h-full w-[28%] z-20 cursor-pointer" onClick={() => go(-1)} />
      <div className="absolute top-0 right-0 h-full w-[28%] z-20 cursor-pointer" onClick={() => go(1)} />

      <div className={`w-[92vw] max-w-[520px] h-[90dvh] max-h-[860px] bg-[#0a0a0a] border border-[#151515] flex flex-col overflow-hidden transition-opacity duration-150 ${turning ? "opacity-0" : "opacity-100"}`}>

        {page.type === "img" && (
          <>
            <div className="flex-1 overflow-hidden relative bg-[#080808] min-h-0">
              <img src={page.image_url} className="w-full h-full object-cover" style={{ filter: "contrast(1.05)" }} alt="" />
              {page.bubble && (
                <div className="absolute top-3 left-3 bg-[#e8e6df] text-[#111] rounded-xl px-3 py-2 text-xs font-semibold max-w-[200px] leading-snug shadow-lg">
                  {page.bubble}
                </div>
              )}
            </div>
            {page.caption && (
              <div className="flex-shrink-0 px-5 py-4 border-t border-[#151515] text-[12.5px] leading-relaxed text-[#999] text-center"
                dangerouslySetInnerHTML={{ __html: page.caption }} />
            )}
          </>
        )}

        {page.type === "text" && (
          <div className="flex-1 flex flex-col items-center justify-center px-7 py-8 text-center">
            {page.act && <p className="text-[9px] tracking-[5px] uppercase text-[#333] mb-1">{page.act}</p>}
            {page.title && <h2 className="font-serif text-2xl font-bold text-[#ddd] leading-snug mb-2">{page.title}</h2>}
            {page.date && <p className="text-[10px] text-[#444] tracking-widest mb-4">{page.date}</p>}
            {page.narr && <div className="font-serif text-[15px] leading-[2.2] text-[#888] max-w-sm" dangerouslySetInnerHTML={{ __html: page.narr }} />}
          </div>
        )}

        {page.type === "climax" && (
          <div className="flex-1 flex flex-col items-center justify-center px-7 py-8 text-center" style={{ background: "radial-gradient(ellipse at center, #0e0800 0%, #000 100%)" }}>
            <p className="text-[9px] tracking-[5px] uppercase text-[#2a1a00] mb-5">The Moment</p>
            <div className="font-serif text-[17px] leading-[2.2] text-[#c8a96e] font-bold max-w-sm" dangerouslySetInnerHTML={{ __html: page.quote }} />
            {page.attr && <p className="text-[9px] text-[#333] mt-5 tracking-widest">{page.attr}</p>}
          </div>
        )}

        {page.type === "ending" && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
            <div className="w-8 h-px bg-[#1a1a1a] mb-6" />
            {page.ending_text && <div className="font-serif text-[14px] text-[#555] leading-[2.2]" dangerouslySetInnerHTML={{ __html: page.ending_text.replace(/\n/g, "<br/>") }} />}
            <div className="font-serif text-3xl text-[#222] mt-8 tracking-widest">{page.ending_kanji}</div>
            <Link href="/create" className="mt-8 bg-white text-black text-[10px] tracking-[4px] uppercase px-8 py-3 font-semibold hover:bg-white/90 transition-all">
              Create Your Manga
            </Link>
          </div>
        )}
      </div>

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-3 opacity-30 hover:opacity-100 transition-opacity z-30">
        <button onClick={() => go(-1)} disabled={cur === 0} className="w-7 h-7 rounded-full border border-[#1a1a1a] bg-black/70 text-[#444] text-xs flex items-center justify-center disabled:opacity-15">◀</button>
        <span className="text-[9px] text-[#222] tracking-widest">{cur + 1} / {PAGES.length}</span>
        <button onClick={() => go(1)} disabled={cur === PAGES.length - 1} className="w-7 h-7 rounded-full border border-[#1a1a1a] bg-black/70 text-[#444] text-xs flex items-center justify-center disabled:opacity-15">▶</button>
      </div>
    </div>
  )
}
