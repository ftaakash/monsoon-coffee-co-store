import { requireAdmin, route } from "@server/http"

export const GET = route((req) => ({ admin: requireAdmin(req) }))
