import sanitizeHtml from 'sanitize-html';

export const sanitizePlainText = (value: string) =>
  sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();

export const sanitizeRichText = (value: string) =>
  sanitizeHtml(value, {
    allowedTags: ['p','br','strong','em','ul','ol','li','h2','h3','h4','blockquote','a'],
    allowedAttributes: { a: ['href','title','target','rel'] },
    allowedSchemes: ['http','https','mailto'],
    transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer nofollow' }) },
  }).trim();

export function sanitizeContentObject<T extends Record<string, unknown>>(input: T): T {
  const copy = { ...input };
  for (const [key, value] of Object.entries(copy)) {
    if (typeof value !== 'string') continue;
    if (['description','body','longDescription'].includes(key)) copy[key as keyof T] = sanitizeRichText(value) as T[keyof T];
    if (['name','title','subtitle','shortDescription','seoTitle','seoDescription','note'].includes(key)) copy[key as keyof T] = sanitizePlainText(value) as T[keyof T];
  }
  return copy;
}
