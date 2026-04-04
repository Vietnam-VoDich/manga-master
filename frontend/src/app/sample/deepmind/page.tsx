"use client"
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"

const PAGES = [
  { type: "text", act: "Act I — The Idealist", title: "Project Mario", date: "London · 2010", narr: "Two men in a pub in King's Cross. One a neuroscientist who learned chess at 4 and wrote a game at 13. One a philosopher who believed AI was the most important problem in history.<br><br>They decided to solve it. Together. With safety baked in from day one." },
  { type: "img", image_url: "/sample-manga-mario/pub-plotting.png", caption: "The King's Cross pub where DeepMind was conceived. Demis Hassabis and Shane Legg sketching their plan on napkins. <em>The world had no idea what was coming.</em>" },
  { type: "img", image_url: "/sample-manga-mario/childhood.png", caption: "Demis Hassabis at 13: chess prodigy, game developer, Cambridge scholar. A mind that could hold entire systems at once. <em>Already preparing for something bigger than chess.</em>" },
  { type: "img", image_url: "/sample-manga-mario/asilomar-hotel.png", caption: "Asilomar Conference, 1975 — the blueprint. Scientists pausing DNA research to ask: should we? Demis read everything about it. Safety wasn't an afterthought. <em>It was the founding principle.</em>" },
  { type: "text", act: "Act II — The Acquisition", title: "Google Arrives", date: "2014", narr: "Google offered half a billion dollars.<br><br>DeepMind said yes — but with conditions. An ethics board. A clause that the technology could never be used for weapons or surveillance without consent.<br><br>They put safety in writing, in a contract, with the most powerful company on earth.<br><br><em>That clause was never honored.</em>" },
  { type: "img", image_url: "/sample-manga-mario/hoffman-billion.png", caption: "The boardroom. The handshake. The cheque. Reid Hoffman brokered the deal. Larry Page signed. Demis Hassabis became the most well-funded AI researcher alive. <em>And the most constrained.</em>" },
  { type: "img", image_url: "/sample-manga-mario/idealist-realist.png", caption: "The transformation begins. Idealism meets corporate reality. Research timelines meet product deadlines. The safety board never meets. The clause sits in a drawer." },
  { type: "img", image_url: "/sample-manga-mario/altman-betrayal.png", caption: "OpenAI launches. The race begins. Safety as competitive disadvantage. Demis watches from Google DeepMind as the rules he believed in get rewritten in public — by people who used to share his values.", bubble: "\"Speed is the new safety.\"" },
  { type: "text", act: "Act III — The Reckoning", title: "Gemini", date: "2023", narr: "Gemini launches. The world compares it to GPT-4.<br><br>The reviews are not kind.<br><br>Inside DeepMind, brilliant people asking brilliant questions about whether being right matters if you're second." },
  { type: "img", image_url: "/sample-manga-mario/war-room.png", caption: "The war room. Every major AI lab racing. DeepMind's safety-first culture now a liability in the press, a punchline in Silicon Valley. <em>The idealist is now a realist. The question is: what does he do with that?</em>" },
  { type: "img", image_url: "/sample-manga-mario/two-paths.png", caption: "Two paths. Stay and fight from inside. Or leave and build the thing you actually believe in. Mustafa Suleyman already chose. Now it's Demis's turn." },
  { type: "climax", quote: "\"The race to build AGI is the most consequential project in human history. And almost nobody is thinking carefully about it.\"", attr: "Demis Hassabis — still the idealist, wearing a realist's suit." },
  { type: "ending", ending_text: "DeepMind changed what machines can do.<br>AlphaFold solved protein folding. AlphaGo beat Go.<br>The safety board never met.<br><br><em>History will decide if the science was worth the compromise.</em>", ending_kanji: "知" },
]

export default function DeepMindSamplePage() {
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
        <div className="font-serif text-8xl font-black text-white/90 tracking-widest mb-4">知</div>
        <div className="text-xs tracking-[8px] uppercase text-white/30 mb-3">Project Mario</div>
        <div className="text-xs text-white/15 italic mb-12">How DeepMind's dream of safe AI met the reality of the race to AGI.</div>
        <button className="border border-white/20 text-white/50 text-[10px] tracking-[4px] uppercase px-10 py-3 hover:bg-white hover:text-black transition-all">Open Book</button>
        <p className="text-[9px] text-white/10 mt-6 tracking-widest">London · 2010–Now</p>
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
            <div className="font-serif text-[15px] leading-[2.2] text-[#c8a96e] font-bold max-w-sm" dangerouslySetInnerHTML={{ __html: page.quote }} />
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
