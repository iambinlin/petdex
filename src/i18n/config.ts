export const locales = ["en", "es", "zh"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export function hasLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}
