import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import type { SaleDocumentData } from '@/lib/sales/saleData'

const s = StyleSheet.create({
  page: { padding: 32, fontSize: 10, color: '#18181b' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  logo: { width: 48, height: 48, marginRight: 8 },
  h1: { fontSize: 16, fontWeight: 700 },
  muted: { color: '#6b7280' },
  box: { marginTop: 16, borderTop: '1 solid #e5e7eb', paddingTop: 8 },
  th: { flexDirection: 'row', borderBottom: '1 solid #e5e7eb', paddingBottom: 4, marginTop: 12, fontWeight: 700 },
  td: { flexDirection: 'row', paddingVertical: 3, borderBottom: '0.5 solid #f3f4f6' },
  cDesc: { flex: 4 }, cQty: { flex: 1, textAlign: 'right' }, cPrice: { flex: 2, textAlign: 'right' }, cTot: { flex: 2, textAlign: 'right' },
  totals: { marginTop: 12, alignSelf: 'flex-end', width: 220 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  grand: { fontSize: 13, fontWeight: 700 },
  footer: { marginTop: 'auto', borderTop: '1 solid #e5e7eb', paddingTop: 8, textAlign: 'center', color: '#6b7280', fontSize: 9 },
})

export function SaleDocumentPdf({ data }: { data: SaleDocumentData }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.row}>
          <View style={{ flexDirection: 'row' }}>
            {data.business.logoUrl ? <Image src={data.business.logoUrl} style={s.logo} /> : null}
            <View>
              <Text style={s.h1}>{data.business.name}</Text>
              {data.business.address ? <Text style={s.muted}>{data.business.address}</Text> : null}
              {data.business.phone ? <Text style={s.muted}>{data.business.phone}</Text> : null}
              {data.business.taxId ? <Text style={s.muted}>{data.business.taxId}</Text> : null}
            </View>
          </View>
          <View style={{ textAlign: 'right' }}>
            <Text style={s.h1}>COMPROBANTE</Text>
            <Text>{data.docNumber}</Text>
            <Text style={s.muted}>{data.issuedAt}</Text>
          </View>
        </View>

        {data.customer ? (
          <View style={s.box}>
            <Text style={{ fontWeight: 700 }}>Cliente</Text>
            <Text>{data.customer.name}{data.customer.taxId ? ` — ${data.customer.taxId}` : ''}</Text>
            {data.customer.address ? <Text style={s.muted}>{data.customer.address}</Text> : null}
          </View>
        ) : null}

        <View style={s.th}>
          <Text style={s.cDesc}>Descripción</Text>
          <Text style={s.cQty}>Cant</Text>
          <Text style={s.cPrice}>Precio</Text>
          <Text style={s.cTot}>Total</Text>
        </View>
        {data.lines.map((l, i) => (
          <View style={s.td} key={i}>
            <Text style={s.cDesc}>{l.description}</Text>
            <Text style={s.cQty}>{l.quantity}</Text>
            <Text style={s.cPrice}>{l.unitPrice}</Text>
            <Text style={s.cTot}>{l.total}</Text>
          </View>
        ))}

        <View style={s.totals}>
          <View style={s.totalRow}><Text>Subtotal</Text><Text>{data.subtotal}</Text></View>
          {data.tax !== '0' ? <View style={s.totalRow}><Text>{data.taxLabel}</Text><Text>{data.tax}</Text></View> : null}
          <View style={s.totalRow}><Text style={s.grand}>Total</Text><Text style={s.grand}>{data.total}</Text></View>
          {data.totalSecondary ? <View style={s.totalRow}><Text style={s.muted}>Equiv. {data.secondaryCurrency}</Text><Text style={s.muted}>{data.totalSecondary}</Text></View> : null}
          {data.rate ? <View style={s.totalRow}><Text style={s.muted}>Tasa</Text><Text style={s.muted}>{data.rate}</Text></View> : null}
        </View>

        <Text style={s.footer}>Documento no fiscal — {data.business.name}</Text>
      </Page>
    </Document>
  )
}
