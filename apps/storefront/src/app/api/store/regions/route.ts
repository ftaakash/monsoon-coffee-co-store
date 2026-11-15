import { route } from "@server/http"
import { REGIONS } from "@server/services/catalog"

export const GET = route(() => ({ regions: REGIONS }))
