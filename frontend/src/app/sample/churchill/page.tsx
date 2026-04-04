"use client"
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"

const PAGES = [
  {
    type: "text",
    act: "Act I — The Brink",
    title: "The Man Who Would Not Negotiate",
    date: "London · May 1940",
    narr: "Five days. That's all it took. Five days for the world to decide whether it would <em>bend</em> or <em>break</em>. Winston Churchill had just become Prime Minister, and already the wolves were at the door — wearing pinstripes and carrying briefcases.",
  },
  {
    type: "img",
    image_url: "/sample-manga-churchill/churchill-portrait.png",
    caption: "Winston Leonard Spencer Churchill. Sixty-five years old. Four scotches before lunch. <em>Absolutely</em> not interested in your peace terms.",
  },
  {
    type: "img",
    image_url: "/sample-manga-churchill/war-cabinet-room.png",
    caption: "The War Cabinet, May 26th. Halifax wants to contact Mussolini. Ask Hitler what he wants. Churchill stares at the ceiling for a very long time.",
  },
  {
    type: "img",
    image_url: "/sample-manga-churchill/halifax-speaks.png",
    caption: "Lord Halifax — brilliant, reasonable, <em>terrifying</em> in his calmness. \"We could get better terms now than after defeat.\" The words hang in the air like smoke.",
  },
  {
    type: "img",
    image_url: "/sample-manga-churchill/soldiers-at-dunkirk.png",
    caption: "330,000 men. Standing in the sea. Waiting. The whole British Army, <em>gone</em> if Churchill blinks.",
  },
  {
    type: "img",
    image_url: "/sample-manga-churchill/churchill-refuses.png",
    caption: "Then Churchill stands. And the room goes very quiet.",
    bubble: "\"If this long island story of ours is to end at last, let it end only when each one of us lies choking in his own blood.\"",
  },
  {
    type: "img",
    image_url: "/sample-manga-churchill/ministers-cheer.png",
    caption: "Twenty-five ministers. On their feet. Banging the table. Some weeping. The deal is dead. The war goes on. <em>Britain fights.</em>",
  },
  {
    type: "img",
    image_url: "/sample-manga-churchill/dunkirk-boats.png",
    caption: "Operation Dynamo. 933 ships. Fishermen, pleasure boats, ferries — crossing the Channel into hell to bring the boys home.",
  },
  {
    type: "climax",
    quote: "\"We shall never surrender.\"",
    attr: "Churchill, to the House of Commons, June 4, 1940 — three days after Dunkirk.",
  },
  {
    type: "ending",
    ending_text: "Halifax resigned six months later. Churchill served until victory.\nThe island held.\nSometimes the most important decision in history is simply the decision <em>not</em> to pick up the phone.",
    ending_kanji: "不屈",
  },
]

export default function ChurchillSamplePage() {
  const [cur, setCur] = useState(0)
  const [showCover, setShowCover] = useState(true)
  const [turning, setTurning] = useState(false)
  const [audioOn, setAudioOn] = useState(false)
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)

  useEffect(() => {
    const a = new Audio("/sample-manga-churchill/theme.mp3")
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
          <div className="font-serif text-8xl font-black text-white/90 tracking-widest mb-4">不屈</div>
          <div className="text-xs tracking-[8px] uppercase text-white/30 mb-3">The Stubborn Romantic</div>
          <div className="text-xs text-white/15 italic mb-12">Churchill vs Halifax. Three days that saved Britain.</div>
          <button className="border border-white/20 text-white/50 text-[10px] tracking-[4px] uppercase px-10 py-3 hover:bg-white hover:text-black transition-all">
            Open Book
          </button>
          <p className="text-[9px] text-white/10 mt-6 tracking-widest">London · 1940</p>
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
