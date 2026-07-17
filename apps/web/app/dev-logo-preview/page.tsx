import { ReelstackLoading } from '@/components/ui/reelstack-loading'

export default function Preview() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <ReelstackLoading size={180} />
    </div>
  )
}
