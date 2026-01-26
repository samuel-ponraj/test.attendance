"use client";

import styles from "./HomePage.module.css";
import { ArrowRight, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";

const HomePage = () => {
	const router = useRouter();

	const handleRecordAttendance = () => {
		onAuthStateChanged(auth, (user) => {
			if (user) {
				router.push("/dashboard");
			} else {
				router.push("/login");
			}
		});
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
