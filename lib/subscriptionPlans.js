export const PLAN_IDS = {
  BASIC: "basic",
  PRO: "pro",
};

export const SUBSCRIPTION_PLANS = [
  {
    id: PLAN_IDS.BASIC,
    name: "Basic",
    price: "₹0",
    period: "forever",
    limits: {
      teams: 2,
      membersPerTeam: 20,
      customForms: 2,
      attendanceHistoryDays: 30,
      canExportAttendancePdf: false,
      hasMemberDashboard: false,
    },
    features: [
      { text: "Up to 2 Teams", included: true },
      { text: "Up to 20 Members per Team", included: true },
      { text: "30-Day Attendance History", included: true },
      { text: "Excel Members Import", included: true },
      { text: "Up to 2 Custom Forms", included: true },
    ],
  },
  {
    id: PLAN_IDS.PRO,
    name: "Pro",
    price: "₹499",
    period: "/month",
    popular: true,
    limits: {
      teams: 5,
      membersPerTeam: 50,
      customForms: 10,
      attendanceHistoryDays: 365,
      canExportAttendancePdf: true,
      hasMemberDashboard: true,
    },
    features: [
      { text: "Up to 5 Teams", included: true },
      { text: "Up to 50 Members per Team", included: true },
      { text: "1-Year Attendance History", included: true },
      { text: "Excel Members Import", included: true },
      { text: "Up to 10 Custom Forms", included: true },
      { text: "Attendance Report Export (PDF)", included: true },
      { text: "Dedicated Member Dashboard", included: true },
    ],
  },
];

export const getPlan = (planId) =>
  SUBSCRIPTION_PLANS.find((plan) => plan.id === planId) ||
  SUBSCRIPTION_PLANS[0];

export const createPlanLimitError = (message) => {
  const error = new Error(message);
  error.code = "plan-limit";
  return error;
};
