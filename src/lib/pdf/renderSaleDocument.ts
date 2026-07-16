import { renderToBuffer } from '@react-pdf/renderer'
import { SaleDocumentPdf } from '@/components/pdf/SaleDocumentPdf'
import type { SaleDocumentData } from '@/lib/sales/saleData'
import React from 'react'

export async function renderSaleDocument(data: SaleDocumentData): Promise<Buffer> {
  return renderToBuffer(React.createElement(SaleDocumentPdf, { data }))
}
