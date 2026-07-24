import { LoadingBlock } from "@/components/query-state"

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Companies</h1>
        <p className="text-muted-foreground">企業マスタの管理</p>
      </div>
      <LoadingBlock />
    </div>
  )
}
