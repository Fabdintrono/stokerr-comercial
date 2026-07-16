# Spec — Stocker E: i18n + auto-traducción

**Fecha:** 2026-07-16
**Estado:** Diseño aprobado, pendiente plan de implementación
**Depende de:** — (usa `User.language` + `/api/users/preferences` existentes; engancha con `formatMoney` de A).
**Desbloquea:** producto vendible en es/pt/en; base para más idiomas.

---

## 1. Objetivo

Unificar y completar el i18n de Stocker: **un solo sistema** key-based (`t('clave')`), **3 idiomas
(es base / pt / en)**, traducciones **auto-generadas en build** por script, y **extracción de las
pantallas comerciales** a `t()`. El resto de la app legacy queda con el patrón listo para migrar
incremental.

---

## 2. Alcance

**Incluye:**
- Consolidar en UN solo mecanismo i18n (hoy hay dos + locales duplicados).
- Locales `es` (fuente de verdad) / `pt` / `en`, con namespaces por área.
- Script de auto-traducción idempotente (`scripts/i18n/translate.mjs`).
- Traducciones pt/en del batch inicial generadas y commiteadas.
- Extracción a `t()` de las **pantallas comerciales**: `/billing`, monedas + tasas, módulos
  (catálogo admin + `ModuleGate` + toggles), facturación (clientes, nueva factura, labels del
  comprobante PDF), ajustes de negocio, login + selector de idioma.
- `LanguageSelector` funcional (es/pt/en, cambio en vivo, persistencia en `User.language`).
- Formato de fechas/números por locale (`Intl`).
- Tests: paridad de claves, `t()` (interpolación + fallback), script.

**NO incluye (incremental / futuro):**
- Extraer toda la app legacy (POS/almacén/restaurante/dashboards) — se migra luego con el patrón listo.
- Traducción runtime al vuelo (se eligió build).
- RTL.
- Traducir el contenido dinámico de datos del tenant (nombres de productos, etc.) — solo la UI.

---

## 3. Estado actual (a corregir)
- **Activo:** `src/lib/i18n.tsx` (`I18nProvider` montado en `src/app/providers.tsx` con
  `defaultLocale="pt"`; usado por `AdminHeader`, `Header`, `register`, `admin`). Carga
  `locales/pt.json` + `locales/es.json` (apenas ~5 claves).
- **Muerto (eliminar):** `src/lib/i18n/` (`useTranslation.ts` + `translations.ts`, solo se auto-importan)
  y `src/locales/` (duplicado de `locales/`).
- `User.language` default `"pt-PT"` → se cambia semántica a códigos `es`/`pt`/`en` (default `es`).

---

## 4. Arquitectura del i18n

### 4.1 Provider + hook (un solo sistema, sobre `src/lib/i18n.tsx`)
```ts
type Locale = 'es' | 'pt' | 'en'
// I18nProvider: carga los 3 JSON, expone { locale, setLocale, t }
// t(key: string, vars?: Record<string,string|number>): string
```
- `t('billing.title')` busca en el locale actual → fallback a `es` (base) → fallback a la clave misma.
- Interpolación `{name}`: `t('greeting', { name })` reemplaza `{name}`.
- `setLocale` actualiza el estado, persiste en `localStorage` y hace `PUT /api/users/preferences`
  (`language`), y setea `<html lang>`.
- Default: `User.language` si existe, si no el idioma del navegador acotado a {es,pt,en}, si no `es`.
- Se elimina `defaultLocale="pt"`; el default pasa a `es`.

### 4.2 Estructura de mensajes
`locales/es.json` (fuente), `locales/pt.json`, `locales/en.json`. Claves con **namespace por punto**:
```json
{
  "common": { "save": "Guardar", "cancel": "Cancelar", "loading": "Cargando…" },
  "billing": { "title": "Mi suscripción", "payUsdt": "Pagar en USDT", "status.active": "Activa" },
  "currency": { "title": "Monedas", "base": "Moneda base" },
  "modules": { "notActive": "Módulo no activo" },
  "invoicing": { "newInvoice": "Nueva factura", "customer": "Cliente" },
  "auth": { "login": "Iniciar sesión" }
}
```
- `es.json` se escribe a mano (español real). `pt.json`/`en.json` los llena el script.

### 4.3 Script de auto-traducción
`scripts/i18n/translate.mjs`:
- Lee `locales/es.json`. Para cada locale destino (pt, en): detecta claves presentes en es y **faltantes**
  en el destino, las traduce con un **proveedor** y las escribe (preservando las existentes).
- Idempotente: por defecto solo llena faltantes; `--force` re-traduce todo.
- **Proveedor** aislado (`scripts/i18n/provider.mjs`): usa una API (LLM/DeepL) con
  `TRANSLATION_API_KEY` en env. Si no hay key, el script avisa y no rompe (sale con las traducciones
  existentes intactas).
- Para el batch inicial de este bloque, las traducciones pt/en se generan y **se commitean** (no se
  depende de correr el script en CI todavía).
- Comando: `node scripts/i18n/translate.mjs` (documentado en el README del script).

---

## 5. Extracción — pantallas comerciales

Reemplazar textos hardcoded por `t('...')` en:
- **Billing:** `src/app/billing/page.tsx`, `SubscriptionGate` (banner).
- **Monedas/tasas:** `warehouse/settings/currency`, `warehouse/settings/rates`.
- **Módulos:** `super-admin/modules`, `ModuleGate`, sección de módulos en `licenses`.
- **Facturación:** `warehouse/customers`, `sales/new`, y labels del PDF `SaleDocumentPdf`
  (el PDF recibe labels ya traducidos vía su DTO — se resuelven en el endpoint con el locale del tenant/usuario).
- **Ajustes de negocio:** sección de branding/impuesto en `warehouse/settings`.
- **Auth/selector:** `login`, `LanguageSelector`.

Cada texto nuevo agrega su clave a `es.json`; luego el script (o la generación inicial) llena pt/en.

> Nota PDF: `SaleDocumentPdf` no usa el hook de React (`t`) por render en servidor; el endpoint arma
> el DTO con los labels ya resueltos para el locale correspondiente (función `tServer(locale, key)`
> que lee los JSON — misma fuente que el cliente).

## 6. Selector de idioma
`LanguageSelector`: opciones es/pt/en con bandera/nombre; al elegir, `setLocale` (cambia en vivo +
persiste). Visible en los headers.

## 7. Formato por locale
Helper `formatDate(date, locale)` y `formatNumber(n, locale)` con `Intl`. El dinero ya se formatea por
moneda (A); las fechas/números de UI usan el locale activo.

---

## 8. Testing (TDD)
- **Paridad de claves:** test que carga los 3 JSON y verifica que pt y en tienen exactamente el mismo
  set de claves que es (falla si falta o sobra una) — garantiza que no queden textos sin traducir.
- **`t()`:** clave existente devuelve el texto del locale; interpolación `{var}`; fallback a es cuando
  falta en el locale; fallback a la clave cuando no existe en ningún locale.
- **Script (`translate.mjs`) puro:** función `mergeMissing(base, target)` que dado es + target devuelve
  qué claves faltan; y que no pisa las existentes. (La llamada al proveedor se mockea/omite en test.)

---

## 9. Riesgos / decisiones abiertas
- **Proveedor de traducción:** DeepL da mejor calidad es↔pt/en; un LLM es más flexible. Se abstrae en
  `provider.mjs`; el batch inicial se genera con revisión humana. Key en env (`TRANSLATION_API_KEY`),
  no requerida para runtime (las traducciones se sirven estáticas).
- **`User.language` legacy `pt-PT`/`es-ES`:** se normaliza a `es`/`pt`/`en` al leer (mapear prefijo).
- **PDF server-side:** usa `tServer` (lee los JSON directo), no el hook — evita acoplar react-pdf al Provider.

## 10. Criterios de aceptación
1. Existe un solo sistema i18n; `src/lib/i18n/` y `src/locales/` duplicados eliminados.
2. El selector cambia entre es/pt/en en vivo y persiste en `User.language`.
3. Las pantallas comerciales (billing, monedas, módulos, facturación, ajustes, login) muestran sus
   textos vía `t()` y cambian de idioma correctamente.
4. Los 3 locales tienen el mismo set de claves (test de paridad verde).
5. `node scripts/i18n/translate.mjs` llena claves faltantes en pt/en sin pisar las existentes.
6. El PDF del comprobante sale en el idioma correspondiente.
7. `t()` y la paridad de claves pasan sus tests.
