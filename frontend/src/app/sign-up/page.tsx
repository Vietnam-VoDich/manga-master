import { SignUp } from "@clerk/nextjs"

export default function SignUpPage() {
  return (
    <main className="bg-black min-h-screen flex flex-col items-center justify-center px-6">
      <div className="font-serif text-4xl font-black text-white/80 tracking-widest mb-8">漫画</div>
      <SignUp
        forceRedirectUrl="/dashboard"
        appearance={{
          elements: {
            rootBox: "w-full max-w-sm",
            card: "bg-[#0a0a0a] border border-white/10 shadow-none rounded-none",
            headerTitle: "text-white font-serif tracking-widest",
            headerSubtitle: "text-white/30",
            socialButtonsBlockButton: "border border-white/10 bg-transparent text-white/60 hover:bg-white/5 rounded-none",
            formFieldInput: "bg-transparent border border-white/10 text-white rounded-none focus:border-white/30",
            formFieldLabel: "text-white/30 text-[10px] tracking-widest",
            formButtonPrimary: "bg-white text-black rounded-none hover:bg-white/90 font-semibold tracking-widest uppercase text-xs",
            footerActionLink: "text-white/40 hover:text-white/60",
            identityPreviewText: "text-white/60",
            identityPreviewEditButton: "text-white/30",
            dividerLine: "bg-white/5",
            dividerText: "text-white/20",
          },
        }}
      />
    </main>
  )
}
