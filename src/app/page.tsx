import { SiteNavbar } from "@/components/landingpage/navbar"
import { HeroSection } from "@/components/landingpage/hero-section"
import { ModelCardsSection } from "@/components/landingpage/model-cards-section"
import { WorkflowSection } from "@/components/landingpage/workflow-section"
import { FeaturesSection } from "@/components/landingpage/features-section"

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <SiteNavbar />
      <ModelCardsSection />
      <FeaturesSection />
      <WorkflowSection />
    </main>
  )
}