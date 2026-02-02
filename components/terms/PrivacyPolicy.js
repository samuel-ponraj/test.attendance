'use client';

export default function PrivacyPolicy() {
	return (
		<div style={styles.page}>
			<div style={styles.container}>
				<h1 style={styles.heading}>Privacy Policy</h1>
				<p style={styles.updated}>Last updated: January 2026</p>

				<section style={styles.section}>
					<p>
						Kingz Digital Attendance (“we”, “our”, “us”) is committed to protecting
						your privacy. This Privacy Policy explains how your information is
						collected, used, and protected when you use our attendance management
						application.
					</p>
				</section>

				<section style={styles.section}>
					<h2 style={styles.subHeading}>1. Information We Collect</h2>
					<ul style={styles.list}>
						<li><strong>User Information:</strong> Name, email address, and phone number.</li>
						<li><strong>Authentication Data:</strong> Secure login via Firebase Authentication.</li>
						<li><strong>Team & Attendance Data:</strong> Teams and attendance records managed by admins.</li>
					</ul>
				</section>

				<section style={styles.section}>
					<h2 style={styles.subHeading}>2. How We Use Your Information</h2>
					<ul style={styles.list}>
						<li>To authenticate users securely.</li>
						<li>To manage teams and attendance records.</li>
						<li>To restrict access to authorized users only.</li>
						<li>To maintain platform security and reliability.</li>
					</ul>
				</section>

				<section style={styles.section}>
				<h2 style={styles.subHeading}>3. Data Retention</h2>
				<p>
					Attendance records and related team data are stored for a maximum period of
					6 months. Data older than this period is automatically deleted from our
					systems.
				</p>
				</section>


				<section style={styles.section}>
          <h2 style={styles.subHeading}>4. Data Access & Security</h2>
          <p>
            We use Firebase Firestore security rules to ensure strict data protection:
          </p>
          <ul style={styles.list}>
            <li>Only authenticated users can access the application.</li>
            <li>
              Attendance records can be created, updated, and managed only by authorized
              administrators. Individual users do not have permission to mark or modify
              attendance data.
            </li>
          </ul>
        </section>


				<section style={styles.section}>
					<h2 style={styles.subHeading}>5. Data Sharing</h2>
					<p>
						We do not sell or rent your personal data. Information is shared only
						within your team or when legally required.
					</p>
				</section>

				<section style={styles.section}>
					<h2 style={styles.subHeading}>6. Your Rights</h2>
					<ul style={styles.list}>
						<li>Access and update your personal information.</li>
						<li>Request account deletion by contacting support.</li>
					</ul>
				</section>

				<section style={styles.section}>
					<h2 style={styles.subHeading}>7. Policy Updates</h2>
					<p>
						This Privacy Policy may be updated periodically. Changes will be
						reflected on this page.
					</p>
				</section>

				<section style={styles.section}>
					<h2 style={styles.subHeading}>8. Contact Us</h2>
					<p>
						<strong>Kingz Digital Solutions</strong><br />
						Email: contact@kingzdigitalsolutions.in
					</p>
				</section>
			</div>
		</div>
	);
}

const styles = {
	page: {
		minHeight: '100vh',
		width: '100%',
		backgroundColor: '#0D0D0D',
		display: 'flex',
		justifyContent: 'center',
	},
	container: {
		width: '100%',
		maxWidth: '900px',
		padding: '100px 24px',
		color: '#EAEAEA',
		lineHeight: 1.75,
	},
	heading: {
		fontSize: '30px',
		marginBottom: '8px',
		color: '#FFFFFF',
	},
	updated: {
		color: '#9CA3AF',
		marginBottom: '32px',
	},
	section: {
		marginBottom: '28px',
	},
	subHeading: {
		fontSize: '18px',
		marginBottom: '10px',
		color: '#FFFFFF',
	},
	list: {
		paddingLeft: '20px',
	},
};
