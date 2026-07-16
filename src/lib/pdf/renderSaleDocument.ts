import { renderToBuffer } from '@react-pdf/renderer'
import { SaleDocumentPdf } from '@/components/pdf/SaleDocumentPdf'
import type { SaleDocumentData } from '@/lib/sales/saleData'
import React from 'react'

export async function renderSaleDocument(data: SaleDocumentData): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToBuffer(React.createElement(SaleDocumentPdf, { data }) as any)
}
