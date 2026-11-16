import { redirect } from "next/navigation"

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ yearId?: string }>
}) {
  const { yearId } = await searchParams
  redirect(
    yearId
      ? `/settings/advisors?yearId=${encodeURIComponent(yearId)}`
      : "/settings/advisors"
  )
}
