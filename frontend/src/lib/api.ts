/**
 * API client — always attaches Clerk session token to requests.
 */
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

async function getToken(): Promise<string | null> {
  // Clerk exposes this globally on the window after init
  if (typeof window === "undefined") return null
  try {
    // @ts-ignore
    const token = await window.Clerk?.session?.getToken()
    return token ?? null
  } catch {
    return null
  }
}

async function req(path: string, opts: RequestInit = {}) {
  const token = await getToken()
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      ...(opts.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
  return res.json()
}

export const api = {
  // Auth
  upsertUser: (body: { clerk_id: string; email: string; name?: string }) =>
    req("/auth/upsert", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),

  getMe: (clerkId: string) => req(`/auth/me/${clerkId}`),

  // Manga
  createManga: (fd: FormData) => req("/manga/create", { method: "POST", body: fd }),

  getManga: (id: string) => req(`/manga/${id}`),

  listMangas: (userId: string) => req(`/manga/user/${userId}`),

  // Stripe
  checkout: (userId: string) =>
    req("/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: userId }) }),

  billingPortal: (userId: string) =>
    req("/stripe/portal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: userId }) }),
}
