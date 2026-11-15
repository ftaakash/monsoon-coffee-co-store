import { route } from "@server/http"
import { listBrews } from "@server/services/catalog"

export const GET = route<{ id: string }>((_req, { id }) => ({ brews: listBrews(id) }))
