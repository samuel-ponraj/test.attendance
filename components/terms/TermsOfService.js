'use client';

export default function TermsOfService() {
	return (
		<div style={styles.page}>
			<div style={styles.container}>
				<h1 style={styles.heading}>Terms of Service</h1>
				<p style={styles.updated}>Last updated: January 2026</p>

				<section style={styles.section}>
					<p>
						By accessing or using Kingz Digital Attendance (“Service”), you agree
						to comply with and be bound by these Terms of Service. If you do not
						agree to these terms, please do not use the application.
					</p>
				</section>

				<section style={styles.section}>
					<h2 style={styles.subHeading}>1. Eligibility</h2>
					<p>
						You must be authorized by your organization or team admin to use this
						service. You are responsible for maintaining the confidentiality of
						your login credentials.
					</p>
				</section>

				<section style={styles.section}>
					<h2 style={styles.subHeading}>2. User Accounts</h2>
					<ul style={styles.list}>
						<li>You must provide accurate and complete information.</li>
						<li>You are responsible for all activity under your account.</li>
						<li>Unauthorized access or misuse may result in account suspension.</li>
					</ul>
				</section>

				<section style={styles.section}>
            <h2 style={styles.subHeading}>3. Use of the Service</h2>
            <ul style={styles.list}>
              <li>
                The service is intended solely for managing team attendance and related records.
              </li>
              <li>
                Only designated administrators are authorized to create, update, and manage
                attendance records.
              </li>
              <li>
                Any attempt to bypass security controls or gain unauthorized access to data
                is strictly prohibited.
              </li>
            </ul>
          </section>


		  <section style={styles.section}>
			<h2 style={styles.subHeading}>4. Attendance Data Retention</h2>
			<p>
				Attendance records created in the service are stored for a maximum period of 6 months.
				Records older than this period are automatically deleted.
			</p>
			</section>


				<section style={styles.section}>
					<h2 style={styles.subHeading}>5. Data & Privacy</h2>
					<p>
						Your use of the service is subject to our Privacy Policy. Data access
						is controlled through secure authentication and authorization rules.
					</p>
				</section>

				<section style={styles.section}>
					<h2 style={styles.subHeading}>6. Termination</h2>
					<p>
						We reserve the right to suspend or terminate access to the service at
						any time if these terms are violated or if misuse is detected.
					</p>
				</section>

				<section style={styles.section}>
					<h2 style={styles.subHeading}>7. Limitation of Liability</h2>
					<p>
						Kingz Digital Solutions is not liable for any indirect or incidental
						damages arising from the use or inability to use the service.
					</p>
				</section>

				<section style={styles.section}>
					<h2 style={styles.subHeading}>8. Changes to Terms</h2>
					<p>
						We may update these Terms of Service from time to time. Continued use
						of the service after changes indicates acceptance of the updated
						terms.
					</p>
				</section>

				<section style={styles.section}>
					<h2 style={styles.subHeading}>9. Contact Information</h2>
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
