import { redirect } from "next/navigation"

import { mockSponsorshipContracts } from "@/lib/mock/sponsorship-contracts"

/**
 * Contract Detail is retired — Yearly Company Detail is the core screen
 * (spec/frontend.md#Yearly Company Detail). Keep this URL as a redirect.
 */
export default async function ContractDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const contract = mockSponsorshipContracts.find((c) => c.id === id)
  if (contract) {
    redirect(`/yearly-companies/${contract.yearlyCompanyId}`)
  }
  redirect("/yearly-companies")
}
