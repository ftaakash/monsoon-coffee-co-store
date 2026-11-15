import { route } from "@server/http"
import { requestTransfer } from "@server/services/orders"

export const POST = route<{ id: string }>((_req, { id }) => ({ order: requestTransfer(id) }))
