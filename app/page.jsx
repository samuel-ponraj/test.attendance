import Features from "@/components/home/Features";
import HomePage from "../components/home/HomePage"
import UseCasesSection from "@/components/home/UseCase";
import HowItWorksSection from "@/components/home/HowItWorks";
import Mockup from "@/components/home/Mockup";


export const metadata = {
  title: "Smart Attendance App | Kingz Digital Attendance",
  description:
    "Smart Attendance App by Kingz Digital Solutions helps small teams and groups track attendance easily. Mark present or absent with time records and manage multiple teams effortlessly.",
  keywords: [
    "Smart Attendance App",
    "Attendance App",
    "Attendance Tracking App",
    "Small Team Attendance",
    "Group Attendance Management",
    "Class Attendance App",
    "Tuition Attendance App",
    "Sports Team Attendance",
    "Office Attendance App",
    "Kingz Digital Solutions"
  ],
  openGraph: {
    title: "Smart Attendance App | Kingz Digital Attendance",
    description:
      "A simple and smart attendance app for classes, tuition centers, sports teams, and office groups. Track present & absent members with accurate time records.",
    url: "https://attendance.kingzdigitalsolutions.in",
    siteName: "Kingz Digital Attendance",
    images: [
      {
        url: "/logo/kda-meta.png",
        width: 1200,
        height: 630,
        alt: "Smart Attendance App for Small Teams",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Smart Attendance App | Kingz Digital Attendance",
    description:
      "Smart Attendance App makes attendance tracking simple for small teams and groups. Manage multiple teams and view clear attendance records.",
    images: ["/logo/kda-meta.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://attendance.kingzdigitalsolutions.in",
  },
};



export default function Home() {
  return (
    <div className="">
      <HomePage />
      <Features />
      <HowItWorksSection />
      <Mockup />
      <UseCasesSection />
    </div>
  );
}
