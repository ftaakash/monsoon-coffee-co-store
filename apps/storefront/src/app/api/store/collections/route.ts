import { route } from "@server/http"
import { listCollections } from "@server/services/catalog"

export const GET = route(() => ({ collections: listCollections() }))
