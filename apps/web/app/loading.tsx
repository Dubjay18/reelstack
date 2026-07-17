import { ReelstackLoading } from '@/components/ui/reelstack-loading'

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
      <ReelstackLoading size={140} />
    </div>
  )
}
