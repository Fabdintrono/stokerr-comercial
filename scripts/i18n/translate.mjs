// scripts/i18n/translate.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mergeMissing } from './mergeMissing.mjs'
import { makeTranslator } from './provider.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LOCALES_DIR = join(__dirname, '../../locales')
const TARGETS = ['pt', 'en']
const force = process.argv.includes('--force')

const read = (l) => JSON.parse(readFileSync(join(LOCALES_DIR, `${l}.json`), 'utf8'))
const write = (l, data) => writeFileSync(join(LOCALES_DIR, `${l}.json`), JSON.stringify(data, null, 2) + '\n')

const base = read('es')

for (const locale of TARGETS) {
  const existing = force ? {} : read(locale)
  const translate = makeTranslator(locale)
  const merged = await mergeMissingAsync(base, existing, translate)
  write(locale, merged)
  console.log(`[i18n] ${locale}.json updated`)
}

// async variant that awaits the translator per key (keeps provider.mjs simple)
async function mergeMissingAsync(baseObj, target, translate, prefix = '') {
  const result = { ...(target ?? {}) }
  for (const [k, v] of Object.entries(baseObj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object') {
      result[k] = await mergeMissingAsync(v, (target && target[k]) ?? {}, translate, key)
    } else if (!target || !(k in target)) {
      result[k] = await translate(key, v)
    }
  }
  return result
}

// (mergeMissing imported for parity with the tested pure helper; async path used at runtime.)
void mergeMissing
