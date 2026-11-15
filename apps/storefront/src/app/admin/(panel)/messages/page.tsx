import { setMessageStatusAction } from "@lib/admin/actions"
import { adminApi } from "@lib/admin/api"
import { Button, Card, Empty, Notice, PageHeader, shortDate, StatusBadge } from "@modules/admin/ui"

type Message = {
  id: string
  name: string
  email: string
  subject: string | null
  message: string
  status: "new" | "read"
  created_at: string
}

export default async function AdminMessages({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [{ messages }, notice] = await Promise.all([adminApi<{ messages: Message[] }>("/messages"), searchParams])
  const unread = messages.filter((m) => m.status === "new").length

  return (
    <>
      <PageHeader kicker={`${unread} new`} title="Messages" />
      <Notice {...notice} />
      {messages.length ? (
        <ul className="flex flex-col gap-4">
          {messages.map((m) => (
            <li key={m.id}>
              <Card className={m.status === "new" ? "" : "opacity-80"}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-family-heading text-base font-bold">{m.subject || "(no subject)"}</p>
                    <p className="break-words text-sm text-ink/70">
                      {m.name} ·{" "}
                      <a href={`mailto:${m.email}`} className="underline underline-offset-4">
                        {m.email}
                      </a>{" "}
                      · {shortDate(m.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm">{m.message}</p>
                <form action={setMessageStatusAction} className="mt-4">
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="status" value={m.status === "new" ? "read" : "new"} />
                  <Button type="submit" variant="outline">
                    {m.status === "new" ? "Mark as read" : "Mark as new"}
                  </Button>
                </form>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <Card>
          <Empty>No messages yet. Messages sent from the store&apos;s Contact page appear here.</Empty>
        </Card>
      )}
    </>
  )
}
