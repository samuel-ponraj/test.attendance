import Features from "@/components/home/Features";
import HomePage from "../components/home/HomePage"
import UseCasesSection from "@/components/home/UseCase";
import HowItWorksSection from "@/components/home/HowItWorks";

export default function Home() {
  return (
    <div className="">
      <HomePage />
      <Features />
      <HowItWorksSection />
      <UseCasesSection />
    </div>
  );
}
