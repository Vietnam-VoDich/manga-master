"use client"
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"

const PAGES = [
  { type: "text", act: "Act I — The Middle Child", title: "Hai Duong", date: "Vietnam", narr: "Three children. The eldest gets the authority. The youngest gets the attention. And in the middle — <em>Ms. Duong</em>. Invisible. Overlooked. Eating quietly while the world revolves around everyone else." },
  { type: "img", image_url: "/sample-manga-duong/middle-child.png", caption: "Three children. Two spotlights. One girl in the middle eating her rice very quietly. <em>She noticed everything.</em>" },
  { type: "text", narr: "The middle child learns something<br>the others never do.<br><br>Nobody is coming to help you.<br>Nobody is watching.<br><br><em>You have to build it yourself.</em>" },
  { type: "img", image_url: "/sample-manga-duong/studying-english.png", caption: "Late nights in a small bedroom in Hai Duong. English textbooks. Dictionaries. A world map on the wall. While the province slept, she studied. <em>Word by word. Night after night.</em>" },
  { type: "img", image_url: "/sample-manga-duong/university-gates.png", caption: "She made it. A top university. The girl from Hai Duong walked through the gates carrying nothing but a backpack and <em>everything she'd taught herself</em>." },
  { type: "text", act: "Act II — The Climb", title: "Learning the Game", narr: "At university, she didn't coast.<br><br>She <em>hustled</em>.<br><br>While others socialized, she networked. While others relaxed, she applied for internships.<br><br>The middle child doesn't wait to be chosen.<br>She <em>chooses herself</em>." },
  { type: "img", image_url: "/sample-manga-duong/finance-office.png", caption: "Real estate tax. Blueprints, contracts, property maps, financial models. She was learning the game <em>from the inside</em>. Every document was a lesson. Every deal was a classroom." },
  { type: "img", image_url: "/sample-manga-duong/real-estate-study.png", caption: "Finance taught her the numbers. Real estate taught her the <em>vision</em>. And somewhere between the spreadsheets and the blueprints, an idea began to form." },
  { type: "text", act: "Act III — The Vision", title: "5th Residence", narr: "Vietnam's hospitality was stuck.<br><br>Cheap hotels with no soul. Luxury resorts with no culture.<br><br>She saw the gap. She saw what was <em>missing</em>:<br><br>Modern Vietnamese hospitality.<br>Beautiful. Tasteful. <em>Real.</em>" },
  { type: "img", image_url: "/sample-manga-duong/interior-vision.png", caption: "Her vision: spaces where Vietnamese design meets modern elegance. Bamboo and silk alongside clean minimalism. Lanterns through floor-to-ceiling glass. <em>Not just rooms — an experience.</em>" },
  { type: "img", image_url: "/sample-manga-duong/5th-residence.png", caption: "<em>5th Residence.</em> A modern Vietnamese hospitality company. Her name on the building. Her taste in every detail. Her vision made real." },
  { type: "img", image_url: "/sample-manga-duong/mogul-portrait.png", caption: "She didn't ask for permission. She didn't wait for an invitation. The middle child who was never given authority — <em>took it</em>." },
  { type: "climax", quote: "\"Nobody gave me the spotlight. So I built my own stage.\"", attr: "Ms. Duong — the invisible middle child who became a real estate mogul." },
  { type: "ending", ending_text: "From Hai Duong to Ho Chi Minh City.<br>From invisible to unstoppable.<br>From middle child to mogul.<br><br><em>The quiet ones build empires.</em>", ending_kanji: "居" },
]

export default function DuongSamplePage() {
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
        <div className="font-serif text-8xl font-black text-white/90 tracking-widest mb-4">居</div>
        <div className="text-xs tracking-[8px] uppercase text-white/30 mb-3">5th Residence</div>
        <div className="text-xs text-white/15 italic mb-12">From the invisible middle child in Hai Duong to Vietnam's next real estate mogul.</div>
        <button className="border border-white/20 text-white/50 text-[10px] tracking-[4px] uppercase px-10 py-3 hover:bg-white hover:text-black transition-all">Open Book</button>
        <p className="text-[9px] text-white/10 mt-6 tracking-widest">Vietnam · Now</p>
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
