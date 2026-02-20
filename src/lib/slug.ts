import { slugify as transliterateSlugify } from "transliteration";

/**
 * Генерирует URL-безопасный слаг из строки (в т.ч. на русском).
 * Кириллица транслитерируется в латиницу.
 * @example generateSlug("Молоко 3.2%") => "moloko-3-2"
 */
export function generateSlug(name: string): string {
  if (!name || typeof name !== "string") return "";
  return transliterateSlugify(name.trim(), {
    lowercase: true,
    separator: "-",
    trim: true,
  });
}

/**
 * Генерирует слаг из названия и при необходимости добавляет суффикс (-2, -3, …),
 * пока слаг не станет уникальным (checkExists возвращает false).
 */
export async function generateUniqueSlug(
  name: string,
  checkExists: (slug: string) => Promise<boolean>,
): Promise<string> {
  let base = generateSlug(name);
  if (!base) return "slug";
  let slug = base;
  let n = 2;
  while (await checkExists(slug)) {
    slug = `${base}-${n}`;
    n++;
  }
  return slug;
}
