"use client";

import styles from "./HomePage.module.css";
import { ArrowRight, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";

const HomePage = () => {
	const router = useRouter();

	const { user, userData, loading } = useAuth();

	const handleRecordAttendance = () => {
		if (loading) return; 

		if (!user) {
			router.push("/login");
			return;
		}

		if (userData?.role === "admin") {
			router.push("/admin");
		} else if (userData?.role === "member") {
			router.push("/member"); // or your member route
		} else {
			router.push("/login"); // fallback
		}
	};

	return (
		<div className={styles.homePagecontainer}>
			<section className={styles.heroSection}>
				<p>✨ Simple & Efficient Attendance Management</p>

				<h1>
					Track Attendance with{" "}
					<span style={{ color: "var(--primary)" }}>
						Ease & Precision
					</span>
				</h1>

				<p>
					Streamline your team's attendance tracking. Add teams,
					manage members, and record attendance in just a few clicks.
				</p>

				<div className={styles.heroButtons}>
					<button
						className={styles.homeBtn1}
						onClick={handleRecordAttendance}
					>
						Record Attendance <ArrowRight />
					</button>

					<Link href='#features'>
						<button className={styles.homeBtn2}>Learn More</button>
					</Link>
				</div>

				<div className={styles.highlights}>
					{["Real-time tracking", "Team management", "Easy to use"].map(
						(text) => (
							<div key={text} className={styles.highlight}>
								<CheckCircle
									style={{ color: "var(--primary)" }}
								/>
								<span>{text}</span>
							</div>
						)
					)}
				</div>
			</section>
		</div>
	);
};

export default HomePage;
