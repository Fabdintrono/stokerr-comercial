import { BatchToggle } from '@/components/products/BatchToggle'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProductBatchesPage({ params }: Props) {
  const { id } = await params
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <BatchToggle productId={id} />
    </div>
  )
}
