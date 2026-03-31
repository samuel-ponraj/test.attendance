export const runtime = "nodejs";

import { ThemeProvider } from "@/components/theme-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
	SidebarInset,
	SidebarProvider,
} from "@/components/ui/sidebar";
import { UIProvider } from "../context/uiContext";
import { TeamsProvider } from "../context/TeamsContext";
import FooterNav from "../../components/footer/FooterNav";
import SplashLoader from "../../components/SplashLoader";
import { MembersProvider } from "../context/MembersContext";
import { AttendanceProvider } from "../context/attendanceContext";
import { UserProvider } from "../context/userContext";
import ProtectedRoute from "../../components/ProtectedRoute";

export const metadata = {
  title: "Kingz Digital Attendance",
};

function DashboardContent({ children }) {

	return (
		<>

			<SidebarProvider
				style={{
					"--sidebar-width": "calc(var(--spacing) * 72)",
					"--header-height": "calc(var(--spacing) * 16)",
				}}
			>
				<AppSidebar variant="inset" />

				<SidebarInset>
					<SiteHeader />

					<div className="flex flex-1 flex-col">
						<div className="@container/main flex flex-1 flex-col gap-2 pb-16 md:pb-0">
							{children}
						</div>
					</div>

					<FooterNav />
				</SidebarInset>
			</SidebarProvider>
		</>
	);
}

const isMaintenance =
	process.env.NEXT_PUBLIC_MAINTENANCE === "true";


export default function MemberLayout({ children }) {
	
	
	if (isMaintenance) {
		return (
			<div
				className="min-h-screen flex items-center justify-center text-center text-white"
				style={{
					background:
						"radial-gradient(circle at center, #5a0000 0%, #3a0000 18%, #000 45%)",
					fontFamily: "system-ui, sans-serif",
				}}
			>
				<div className="flex flex-col items-center px-4">
					<img
						src="/logo/KDA-logo-white.png"
						alt="KDS Logo"
						width={180}
						height={100}
						className="mb-4"
					/>

					<h1 className="tracking-[4px] text-[28px] sm:text-[42px] opacity-90">
						Under Maintenance
					</h1>

					<p className="mt-3 opacity-70">
						We're currently updating the dashboard. Please check back soon!
					</p>
				</div>
			</div>
		);
	}

	return (
		<ProtectedRoute allowedRole="member">
		<ThemeProvider
			attribute="class"
			defaultTheme="system"
			enableSystem
			disableTransitionOnChange
		>
			<UIProvider>
			<MembersProvider>
			<AttendanceProvider>
				<TeamsProvider>
				
				<UserProvider>
				
					<DashboardContent>{children}</DashboardContent>
				
				</UserProvider>
				</TeamsProvider>
				</AttendanceProvider>
				</MembersProvider>
			</UIProvider>
		</ThemeProvider>
		</ProtectedRoute>
	);
}

