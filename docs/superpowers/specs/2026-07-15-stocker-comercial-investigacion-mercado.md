# Stocker Comercial — Investigación de Mercado y Posicionamiento

**Fecha:** 2026-07-15
**Método:** Deep-research harness (5 ángulos, 24 fuentes, 109 claims, 25 verificados con votación adversaria 3-votos, 21 confirmados).

## Resumen ejecutivo

Venezuela es la cuña de entrada, no Brasil. Los grandes de LatAm (Alegra, Siigo) **no** cubren
facturación electrónica de Venezuela ni de Brasil — ese es el hueco. Multi-moneda con tasa diaria
es baseline esperado; **cobrar la suscripción en USDT es el diferenciador real** (nadie lo hace y
USDT está normalizado en VE). Banda de precio de referencia: **$15–50/mes** (fijada por CACHICAMO).

## Hallazgos verificados (alta confianza)

1. **SENIAT — homologación obligatoria desde marzo 2025.** Solo software homologado emite facturas
   válidas en VE (226 empresas / 307 apps homologadas). La factura fiscal exige número de control de
   impresora digital + número consecutivo, y cálculo automático de IGTF/IVA/ISLR. Multi-moneda con
   tasa diaria es lo mínimo.
   - Fuentes: cachicamo.app, edicomgroup.com/blog/digital-invoicing-venezuela
2. **Competidor directo en VE: CACHICAMO** — homologado SENIAT, multi-moneda diaria, IGTF/IVA/ISLR.
   Precios **$15 / $25 / $50 al mes**. Referencia de la banda de precio.
3. **Alegra y Siigo NO cubren VE ni Brasil** en facturación electrónica. Alegra opera CO/MX/AR/PE/EC/
   CR/DO/PA/CL/GT/BO/SV; Siigo CO/MX/EC/PE/UY/CL. Alegra además gatea multimoneda en planes altos.
4. **USDT = diferenciador validado.** Ningún competidor cobra en cripto. USDT es 90.2% del P2P de
   Binance en VES; $17.9B de volumen retail en VE en Q1-2026 (rank 17 mundial). Cobro recurrente
   viable vía NOWPayments (auto-débito de balance prefondeado, 300+ activos).
   - Fuentes: nowpayments.io/crypto-subscriptions, gncrypto.news, cnbc.com
5. **Brasil = fase posterior.** NF-e + ICP-Brasil + validación en tiempo real de SEFAZ es un lift
   mucho mayor. No es el primer mercado.

## Caveats / no verificado

- Detalle de precios y features de Loyverse, Square, Odoo, Bind ERP, Contífico, Fudo, Bsale, Colppy
  **no** fue verificado (recortado por presupuesto del workflow).
- Keywords SEO exactas y competencia de Google Ads **no** verificadas — pendiente para el subsistema
  de Landing/SEO (un agente experto en SEO lo hará).
- Stats de cripto son foto de Q1-2026; reglas fiscales VE son recientes (marzo 2025).

## Decisión de posicionamiento (tomada con el usuario)

**Stocker = gestión interna + comprobante NO fiscal.** No emite factura fiscal homologada; controla
inventario, ventas, reportes y emite comprobantes/documentos no fiscales. El cliente factura legal
con su máquina fiscal aparte. Ventaja: sin trámite de homologación, vendible en cualquier país desde
el día uno. La capa fiscal SENIAT queda como posible módulo futuro por cliente.

## Diferenciadores de Stocker

1. **Multi-moneda nativa con tasa diaria** (Bs / R$ / USD) — no gateado a plan alto.
2. **Suscripción cobrada en USDT** (vía NOWPayments) — nadie más lo hace.
3. **Módulos opcionales por cliente** sin afectar a otros tenants.
4. **i18n / auto-traducción** (es/pt + más).
5. **Vendible en cualquier país** por no atarse a homologación fiscal.

## Módulos opcionales candidatos (a priorizar)

Del research + gaps de mercado, candidatos por cliente: Finanzas/contabilidad ligera, BI/analytics,
CRM, e-commerce, RRHH. Priorización pendiente al diseñar el subsistema de módulos.
