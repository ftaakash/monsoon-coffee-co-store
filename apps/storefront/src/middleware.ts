import { NextRequest, NextResponse } from "next/server"

// Country codes with a storefront region. Keep in sync with REGIONS in
// src/lib/mock/catalog.ts (middleware runs on the edge and can't import it).
const COUNTRY_CODES = ["in"]
const DEFAULT_REGION = process.env.NEXT_PUBLIC_DEFAULT_REGION || "in"

function getCountryCode(request: NextRequest) {
  const urlCountryCode = request.nextUrl.pathname.split("/")[1]?.toLowerCase()

  if (urlCountryCode && COUNTRY_CODES.includes(urlCountryCode)) {
    return urlCountryCode
  }
  return COUNTRY_CODES.includes(DEFAULT_REGION) ? DEFAULT_REGION : COUNTRY_CODES[0]
}

/**
 * Prefixes every page URL with a supported country code.
 */
export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.includes(".")) {
    return NextResponse.next()
  }

  const country = getCountryCode(request)
  const firstPathSegment = request.nextUrl.pathname.split("/")[1]?.toLowerCase()

  if (firstPathSegment === country) {
    return NextResponse.next()
  }

  // if the url doesn't have the country, redirect to it
  const redirectPath =
    request.nextUrl.pathname === "/" ? "" : request.nextUrl.pathname
  const queryString = request.nextUrl.search || ""
  const redirectUrl = `${request.nextUrl.origin}/${country}${redirectPath}${queryString}`

  return NextResponse.redirect(redirectUrl, 307)
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|assets|png|svg|jpg|jpeg|gif|webp).*)",
  ],
}
