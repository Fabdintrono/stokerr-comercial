// scripts/i18n/mergeMissing.mjs
export function missingKeys(base, target, prefix = '') {
  const out = []
  for (const [k, v] of Object.entries(base)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object') {
      const sub = (target && typeof target === 'object' ? target[k] : undefined) ?? {}
      out.push(...missingKeys(v, sub, key))
    } else if (!target || !(k in target)) {
      out.push(key)
    }
  }
  return out
}

// translate(dottedKey, baseValue) => translatedString
export function mergeMissing(base, target, translate, prefix = '') {
  const result = Array.isArray(base) ? [] : { ...(target ?? {}) }
  for (const [k, v] of Object.entries(base)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object') {
      result[k] = mergeMissing(v, (target && target[k]) ?? {}, translate, key)
    } else if (!target || !(k in target)) {
      result[k] = translate(key, v)
    }
  }
  return result
}
