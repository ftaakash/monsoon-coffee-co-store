"use server"

export type Locale = {
  code: string
  name: string
}

/**
 * Available storefront locales. Returns null when localisation isn't
 * configured, which hides the language picker.
 */
export const listLocales = async (): Promise<Locale[] | null> => null
