# scripts/i18n — auto-traducción

`locales/es.json` es la fuente de verdad. Este script rellena las claves **faltantes**
en `pt.json` y `en.json` sin pisar las existentes.

## Uso

    # solo faltantes (idempotente)
    node scripts/i18n/translate.mjs

    # re-traducir todo
    node scripts/i18n/translate.mjs --force

## Proveedor

`provider.mjs` usa la API de Anthropic (`claude-haiku-4-5`) si `TRANSLATION_API_KEY`
está en el entorno. Sin key, deja el texto fuente como placeholder y avisa (no rompe).
Las traducciones se **commitean** — no se corre en CI todavía.
