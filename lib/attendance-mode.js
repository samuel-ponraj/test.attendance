export const ATTENDANCE_MODES = Object.freeze({ SELF: "self", MANAGED: "managed" });

export function getEffectiveAttendanceMode(team, member) {
  const override = member?.attendanceMode;
  if (override === ATTENDANCE_MODES.SELF || override === ATTENDANCE_MODES.MANAGED) return override;
  return team?.defaultAttendanceMode === ATTENDANCE_MODES.MANAGED
    ? ATTENDANCE_MODES.MANAGED
    : ATTENDANCE_MODES.SELF;
}

export const canMarkAttendanceForOthers = (member) => member?.role === "manager";
