import { route } from "@server/http"
import { getCoffeeProfile } from "@server/services/catalog"

export const GET = route<{ id: string }>((_req, { id }) => ({ coffee_profile: getCoffeeProfile(id) }))
