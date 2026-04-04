import { SignUp } from "@clerk/nextjs"
import { dark } from "@clerk/themes"

export default function SignUpPage() {
  return (
    <main className="bg-black min-h-screen flex flex-col items-center justify-center px-6">
      <div className="font-serif text-4xl font-black text-white/80 tracking-widest mb-8">絵巻</div>
      <SignUp
        forceRedirectUrl="/dashboard"
        appearance={{
          baseTheme: dark,
          variables: {
            colorBackground: "#0a0a0a",
            colorInputBackground: "#0f0f0f",
            colorInputText: "#ffffff",
            colorText: "#ffffff",
            colorTextSecondary: "rgba(255,255,255,0.35)",
            colorPrimary: "#ffffff",
            colorNeutral: "#ffffff",
            borderRadius: "0px",
            fontFamily: "inherit",
          },
          elements: {
            card: "shadow-none border border-white/10",
            headerTitle: "!text-white font-serif tracking-widest",
            headerSubtitle: "!text-white/40",
            socialButtonsBlockButton: "!border-white/10 !text-white/70",
            socialButtonsBlockButtonText: "!text-white/70",
            formButtonPrimary: "!bg-white !text-black font-semibold tracking-widest uppercase text-xs",
            formFieldInput: "!bg-[#111] !text-white !border-white/10 placeholder:!text-white/20",
            formFieldLabel: "!text-white/50",
            footerActionText: "!text-white/30",
            footerActionLink: "!text-white hover:!text-white/70",
            dividerText: "!text-white/20",
            dividerLine: "!bg-white/10",
          },
        }}
      />
    </main>
  )
}
