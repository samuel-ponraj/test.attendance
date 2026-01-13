import { SectionCards } from "@/components/dashboard/section-cards"
import TeamCardLayout from "@/components/dashboard/team-card"

export default function Page() {
  return (
    <>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <SectionCards />
      </div>

      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <h2 className="px-6">Your Teams</h2>
        <TeamCardLayout />
      </div>
    </>
  )
}
