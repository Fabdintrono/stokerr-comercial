import { VariantEditor } from '@/components/products/VariantEditor'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProductVariantsPage({ params }: Props) {
  const { id } = await params
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <VariantEditor productId={id} />
    </div>
  )
}
