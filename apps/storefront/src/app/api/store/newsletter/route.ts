import { readJson, route } from "@server/http"
import { subscribeNewsletter } from "@server/services/content"

export const POST = route(async (req) => {
  subscribeNewsletter((await readJson(req)).email)
})
