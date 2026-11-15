import { route } from "@server/http"
import { notFound } from "@server/errors"
import { findVariant } from "@server/services/catalog"

export const GET = route<{ id: string }>((_req, { id }) => {
  const found = findVariant(id)
  if (!found) throw notFound("Variant not found")
  return { variant: found.variant }
})
