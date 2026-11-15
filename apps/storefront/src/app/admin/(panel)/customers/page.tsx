import { adminApi } from "@lib/admin/api"
import { Card, Empty, inr, PageHeader, shortDate, Table, td, th } from "@modules/admin/ui"

type Customer = {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string
  created_at: string
  order_count: number
  total_spent: number
}

export default async function AdminCustomers() {
  const { customers } = await adminApi<{ customers: Customer[] }>("/customers")

  return (
    <>
      <PageHeader kicker={`${customers.length} account${customers.length === 1 ? "" : "s"}`} title="Customers" />
      <Card>
        {customers.length ? (
          <Table>
            <thead>
              <tr>
                <th className={th}>Name</th>
                <th className={th}>Email</th>
                <th className={th}>Phone</th>
                <th className={th}>Joined</th>
                <th className={`${th} text-right`}>Orders</th>
                <th className={`${th} text-right`}>Spent</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td className={td}>{`${c.first_name} ${c.last_name}`.trim() || "—"}</td>
                  <td className={td}>{c.email}</td>
                  <td className={td}>{c.phone || "—"}</td>
                  <td className={td}>{shortDate(c.created_at)}</td>
                  <td className={`${td} text-right tabular-nums`}>{c.order_count}</td>
                  <td className={`${td} text-right tabular-nums`}>{inr(c.total_spent)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Empty>No customer accounts yet.</Empty>
        )}
        <p className="mt-4 text-xs text-ink/60">Guest orders aren&apos;t listed here; find them under Orders by email.</p>
      </Card>
    </>
  )
}
