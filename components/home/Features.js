import { Users, ClipboardCheck, BarChart3, Shield, Clock, Smartphone } from 'lucide-react';
import styles from './Features.module.css'

const features = [
  {
    icon: Users,
    title: 'Team Management',
    description: 'Create and organize multiple teams with ease. Add or remove members as your organization grows.',
  },
  {
    icon: ClipboardCheck,
    title: 'Quick Attendance',
    description: 'Mark attendance with a single click. Present or absent status is recorded instantly.',
  },
  {
    icon: BarChart3,
    title: 'Visual Dashboard',
    description: 'Get a clear overview of all teams and their attendance status at a glance.',
  },
  {
    icon: Shield,
    title: 'Admin Controls',
    description: 'Secure admin access ensures only authorized personnel can manage attendance records.',
  },
  {
    icon: Clock,
    title: 'Real-time Updates',
    description: 'Attendance records are updated in real-time, keeping everyone on the same page.',
  },
  {
    icon: Smartphone,
    title: 'Responsive Design',
    description: 'Access the platform from any device — desktop, tablet, or mobile phone.',
  },
];

const Features = () => {
  return (
    <section id="features" className={`py-24 ${styles.featuresSection}`}>
      <div className={`container mx-auto px-4 ${styles.container} `}>
        <div className="text-center mb-16">
          <span className={styles.badge}>Features</span>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Everything You Need
          </h2>
          <p className={` max-w-2xl mx-auto ${styles.headingDescription}`}>
            Powerful features designed to make attendance tracking simple and efficient for teams of any size.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className=" rounded-xl p-6 shadow-card hover:shadow-medium transition-all duration-300 hover:-translate-y-1 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s`, boxShadow: 'rgba(149, 157, 165, 0.2) 0px 8px 24px' }}
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${styles.icon}`}>
                <feature.icon className="w-6 h-6  " />
              </div>

              <h3 className="text-xl font-semibold mb-2">
                {feature.title}
              </h3>
              <p className={styles.featureDescription}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
