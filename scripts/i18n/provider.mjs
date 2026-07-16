// scripts/i18n/provider.mjs
// Translation provider. Uses an LLM/DeepL-style HTTP API when TRANSLATION_API_KEY is set.
// Without a key it returns the source string unchanged and warns (script stays non-breaking).

const LANG_NAMES = { es: 'Spanish', pt: 'Portuguese', en: 'English' }

export function makeTranslator(targetLocale) {
  const key = process.env.TRANSLATION_API_KEY
  if (!key) {
    let warned = false
    return async (_dottedKey, value) => {
      if (!warned) {
        console.warn('[i18n] TRANSLATION_API_KEY not set — leaving source text as placeholder.')
        warned = true
      }
      return value
    }
  }

  // Anthropic Messages API (claude-haiku-4-5) — cheap, good for short UI strings.
  return async (_dottedKey, value) => {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: `Translate this UI string to ${LANG_NAMES[targetLocale]}. `
            + `Keep {placeholders} intact. Reply with ONLY the translation, no quotes:\n\n${value}`,
        }],
      }),
    })
    if (!res.ok) throw new Error(`translate API ${res.status}: ${await res.text()}`)
    const json = await res.json()
    return json.content?.[0]?.text?.trim() ?? value
  }
}
