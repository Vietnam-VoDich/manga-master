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
            headerTitle: "font-serif tracking-widest",
            socialButtonsBlockButton: "border-white/10",
            formButtonPrimary: "text-black font-semibold tracking-widest uppercase text-xs",
            footerActionLink: "text-white/40 hover:text-white/70",
          },
        }}
      />
    </main>
  )
}
