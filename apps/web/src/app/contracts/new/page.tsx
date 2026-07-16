import { redirect } from "next/navigation"

/**
 * Contract creation moved inline to Yearly Company Detail
 * (spec/frontend.md#Yearly Company Detail).
 */
export default async function NewContractRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ yearlyCompanyId?: string }>
}) {
  const { yearlyCompanyId } = await searchParams
  if (yearlyCompanyId) {
    redirect(`/yearly-companies/${yearlyCompanyId}`)
  }
  redirect("/yearly-companies")
}
