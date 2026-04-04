"use client"
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"

const PAGES = [
  { type: "text", act: "Act I — The Struggle", title: "Selda's Thread", date: "Turkey", narr: "Selda had always worked with her hands.<br><br>For years, she sold her <em>hand-knitted clothing</em> at the Turkish bazaars — small, colorful pieces that people loved.<br><br>It was honest work. It covered her income. It was enough." },
  { type: "img", image_url: "/sample-manga-selda/empty-bazaar.png", caption: "Then the bazaars closed. One by one, the stalls went dark. The Turkish fairs where she sold her mini knit products — <em>gone</em>." },
  { type: "text", narr: "Selda was older now.<br>Fighting was harder.<br>She didn't know what to do.<br><br>The income that had sustained her — <em>vanished</em>.<br><br>She had no option.<br>She had to solve her own problem." },
  { type: "img", image_url: "/sample-manga-selda/discovers-etsy.png", caption: "Then she found it. <em>Etsy.</em> A website where people sold handmade things to the whole world. Her eyes went wide. A lightbulb went on." },
  { type: "text", narr: "There was just one problem.<br><br>Selda didn't know <em>technology</em>.<br><br>She didn't know how to build a shop online. She didn't know how to take product photos. She didn't know how to ship internationally.<br><br>But she knew something else.<br><br>She knew how to <em>not give up</em>." },
  { type: "text", narr: "She had a son.<br>She had a daughter.<br><br>They knew technology.<br><br>So Selda did what any Turkish mother would do.<br><br>She <em>forced them</em>.<br><br>A Turkish mother's nudge is a <em>force of nature</em>." },
  { type: "img", image_url: "/sample-manga-selda/nudging-daughter.png", caption: "She nudged them at breakfast. She nudged them at dinner. She nudged them before bed. The daughter rolled her eyes. The son groaned. Selda <em>did not care</em>." },
  { type: "text", act: "Act II — The Army", title: "The Knitting Circle", narr: "Selda found fellow knitters in the neighborhood. Women like her — older, skilled, and determined. They gathered in living rooms with tea and yarn." },
  { type: "img", image_url: "/sample-manga-selda/knitting-circle.png", caption: "A sisterhood was born. Knitting needles. Colorful yarn. Fierce determination. They were going to conquer this thing called the internet." },
  { type: "img", image_url: "/sample-manga-selda/knitter-army.png", caption: "Together, they became an <em>army</em>. They needed models for Etsy photos. They looked around the neighborhood. They found their answer." },
  { type: "img", image_url: "/sample-manga-selda/grumpy-grandpas.png", caption: "The neighborhood grandfathers. Retired, bored, and slightly grumpy. Selda handed them colorful hand-knitted sweaters. <em>They did not look amused.</em> The photos were perfect." },
  { type: "img", image_url: "/sample-manga-selda/ai-designs.png", caption: "Then her son showed her AI tools. Selda's eyes went wide again. Product descriptions, designs, listings — <em>all of it</em>. Technology had finally become her friend." },
  { type: "img", image_url: "/sample-manga-selda/bad-photos.png", caption: "The first product photos were... not great. Blurry. Bad lighting. The grandpas looked like hostages. But Selda kept going. <em>Every failure was a lesson.</em>" },
  { type: "img", image_url: "/sample-manga-selda/sales-coming.png", caption: "Then the orders started. First one. Then five. Then twenty. A woman in Germany. A man in Canada. A grandmother in Japan. <em>The whole world wanted Selda's knitting.</em>" },
  { type: "img", image_url: "/sample-manga-selda/zelda-triumphant.png", caption: "Selda. Turkish mother. Bazaar survivor. Etsy champion. She didn't wait for the world to change. She changed with it — on her own terms, in her own colors." },
  { type: "climax", quote: "\"I didn't know technology. I just knew I couldn't stop.\"", attr: "Selda — on starting over at 50, with nothing but yarn and stubbornness." },
  { type: "ending", ending_text: "The bazaars are gone.<br>The shop is open.<br>The orders keep coming.<br><br><em>Some people don't retire. They reinvent.</em>", ending_kanji: "糸" },
]

export default function SeldaSamplePage() {
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
        <div className="font-serif text-8xl font-black text-white/90 tracking-widest mb-4">糸</div>
        <div className="text-xs tracking-[8px] uppercase text-white/30 mb-3">Selda's Thread</div>
        <div className="text-xs text-white/15 italic mb-12">A Turkish mother, a dying bazaar, an Etsy shop, and the power of never giving up.</div>
        <button className="border border-white/20 text-white/50 text-[10px] tracking-[4px] uppercase px-10 py-3 hover:bg-white hover:text-black transition-all">Open Book</button>
        <p className="text-[9px] text-white/10 mt-6 tracking-widest">Turkey · Now</p>
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
