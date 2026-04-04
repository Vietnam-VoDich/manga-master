"use client"
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"

const PAGES = [
  { type: "text", act: "Act I — The Rise", title: "The Little Corporal", date: "Corsica · 1769", narr: "He was born on an island nobody cared about, to a family with pretensions but no money. He was short, foreign, and spoke French with an accent. He would become the most powerful man in the world.<br><br>History has a sense of humor." },
  { type: "img", image_url: "/sample-manga-napoleon/napoleon-eyes.png", caption: "The eyes of a man who has already decided. Napoleon Bonaparte, age 26. Already a General. Already rewriting what was possible." },
  { type: "img", image_url: "/sample-manga-napoleon/napoleon-crown.png", caption: "Paris, 1804. He takes the crown from the Pope's hands — and places it on his own head. The message is clear: <em>no one gave me this. I took it.</em>", bubble: "\"Impossible is a word found only in the dictionary of fools.\"" },
  { type: "text", act: "Act II — The Empire", title: "Master of Europe", date: "1804–1812", narr: "He rewrote the laws of France. He rewrote the map of Europe. He introduced the metric system, the Civil Code, the modern university.<br><br>He also started a lot of wars.<br><br>Nobody is perfect." },
  { type: "img", image_url: "/sample-manga-napoleon/napoleon-battlefield.png", caption: "Austerlitz, 1805. His greatest victory. 73,000 French troops against 85,000 Austro-Russians. He lured them into a trap they couldn't see. <em>The sun of Austerlitz</em> — his favorite memory, forever." },
  { type: "img", image_url: "/sample-manga-napoleon/napoleon-shadow.png", caption: "But power casts long shadows. The Continental System. The Spanish ulcer. The slow bleed of endless war. Even genius has limits." },
  { type: "text", act: "Act III — The Fall", title: "Russia", date: "1812", narr: "600,000 men marched into Russia.<br><br>100,000 came back.<br><br>Russia didn't fight him. Russia just <em>waited</em>. And burned everything. And let the winter finish the work." },
  { type: "img", image_url: "/sample-manga-napoleon/napoleon-russia.png", caption: "Moscow was empty and on fire when they arrived. No victory. No surrender. Just ash and cold. The Grande Armée turned around. And the world turned against him." },
  { type: "img", image_url: "/sample-manga-napoleon/napoleon-exile.png", caption: "Saint Helena. A small island in the middle of nowhere. The former master of Europe, pacing a garden, dictating his memoirs, waiting to die. He was 51." },
  { type: "climax", quote: "\"Glory is fleeting, but obscurity is forever.\"", attr: "Napoleon Bonaparte — the man who was both." },
  { type: "ending", ending_text: "He conquered more of Europe than anyone since Rome.<br>He died alone on a rock in the Atlantic.<br>His legal code still governs 40+ countries.<br><br><em>Legacy is complicated. Greatness always is.</em>", ending_kanji: "皇" },
]

export default function NapoleonSamplePage() {
  const [cur, setCur] = useState(0)
  const [showCover, setShowCover] = useState(true)
  const [turning, setTurning] = useState(false)

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

  if (showCover) return (
    <div className="bg-black min-h-screen flex items-center justify-center cursor-pointer" onClick={() => setShowCover(false)}>
      <div className="text-center px-8">
        <div className="font-serif text-8xl font-black text-white/90 tracking-widest mb-4">皇</div>
        <div className="text-xs tracking-[8px] uppercase text-white/30 mb-3">The Little Corporal</div>
        <div className="text-xs text-white/15 italic mb-12">From Corsican outsider to Emperor of Europe. The rise and fall of Napoleon Bonaparte.</div>
        <button className="border border-white/20 text-white/50 text-[10px] tracking-[4px] uppercase px-10 py-3 hover:bg-white hover:text-black transition-all">Open Book</button>
        <p className="text-[9px] text-white/10 mt-6 tracking-widest">France · 1769–1821</p>
      </div>
    </div>
  )

  const page = PAGES[cur] as any
  return (
    <div className="bg-black min-h-screen flex items-center justify-center relative" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <Link href="/" className="fixed top-3 left-3 z-50 text-[9px] tracking-widest uppercase text-white/20 hover:text-white/50 transition-colors">← Back</Link>
      <div className="absolute top-0 left-0 h-full w-[28%] z-20 cursor-pointer" onClick={() => go(-1)} />
      <div className="absolute top-0 right-0 h-full w-[28%] z-20 cursor-pointer" onClick={() => go(1)} />
      <div className={`w-[92vw] max-w-[520px] h-[90dvh] max-h-[860px] bg-[#0a0a0a] border border-[#151515] flex flex-col overflow-hidden transition-opacity duration-150 ${turning ? "opacity-0" : "opacity-100"}`}>
        {page.type === "img" && (
          <>
            <div className="flex-1 overflow-hidden relative bg-[#080808] min-h-0">
              <img src={page.image_url} className="w-full h-full object-cover" style={{ filter: "contrast(1.05)" }} alt="" />
              {page.bubble && <div className="absolute top-3 left-3 bg-[#e8e6df] text-[#111] rounded-xl px-3 py-2 text-xs font-semibold max-w-[200px] leading-snug shadow-lg">{page.bubble}</div>}
            </div>
            {page.caption && <div className="flex-shrink-0 px-5 py-4 border-t border-[#151515] text-[12.5px] leading-relaxed text-[#999] text-center" dangerouslySetInnerHTML={{ __html: page.caption }} />}
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
            <div className="font-serif text-[14px] text-[#555] leading-[2.2]" dangerouslySetInnerHTML={{ __html: page.ending_text }} />
            <div className="font-serif text-3xl text-[#222] mt-8 tracking-widest">{page.ending_kanji}</div>
            <Link href="/create" className="mt-8 bg-white text-black text-[10px] tracking-[4px] uppercase px-8 py-3 font-semibold hover:bg-white/90 transition-all">Create Your Manga</Link>
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
