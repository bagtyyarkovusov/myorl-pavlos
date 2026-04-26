/**
 * Next.js App Router: load ``slug_redirects_next.json`` (data/manifests generator output)
 * and resolve redirects in middleware. Adjust import path when you copy the JSON
 * into your Next app (e.g. ``import manifest from '../data/manifests/slug_redirects_next.json' assert { type: 'json' }``).
 *
 * Match keys with decoded paths: normalize request pathname (decodeURIComponent)
 * before lookup. Prefer 308 for permanent method-preserving redirects.
 */

import { NextResponse } from 'next/server'

/** @param {string} pathname */
export function normalizePathnameForRedirectLookup(pathname) {
  try {
    return decodeURIComponent(pathname)
  } catch {
    return pathname
  }
}

/**
 * @param {import('next/server').NextRequest} request
 * @param {{ redirects: Array<{ fromPathVariants: string[], toPath: string }> }} manifest
 */
export function redirectFromSlugManifest(request, manifest) {
  const pathname = normalizePathnameForRedirectLookup(request.nextUrl.pathname)
  const trimmed = pathname.replace(/\/$/, '') || '/'

  for (const row of manifest.redirects || []) {
    for (const fromPath of row.fromPathVariants || []) {
      const fromNorm = (fromPath.replace(/\/$/, '') || '/').toLowerCase()
      const pathNorm = trimmed.toLowerCase()
      if (fromNorm === pathNorm) {
        const url = request.nextUrl.clone()
        url.pathname = row.toPath
        url.search = ''
        return NextResponse.redirect(url, 308)
      }
    }
  }
  return null
}
