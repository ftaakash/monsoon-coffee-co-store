"use server"

export type ActionResult = { ok: boolean; error?: string }

// Submit the storefront "Contact Us" form. There is no backend in this build,
// so the message is validated and logged to the server console.
export async function sendContactMessage(input: {
  name: string
  email: string
  subject?: string
  message: string
}): Promise<ActionResult> {
  if (!input.name?.trim() || !input.message?.trim()) {
    return { ok: false, error: "Please fill in your name and message." }
  }
  if (!/^\S+@\S+\.\S+$/.test(input.email ?? "")) {
    return { ok: false, error: "Enter a valid email address." }
  }
  console.info("[contact] message received", {
    name: input.name,
    email: input.email,
    subject: input.subject,
  })
  return { ok: true }
}

// Idempotent newsletter signup.
export async function subscribeNewsletter(
  email: string
): Promise<ActionResult> {
  if (!/^\S+@\S+\.\S+$/.test(email ?? "")) {
    return { ok: false, error: "Enter a valid email address." }
  }
  console.info("[newsletter] subscribed", email)
  return { ok: true }
}
