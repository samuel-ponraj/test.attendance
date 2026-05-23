export const getMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value.seconds) return value.seconds * 1000;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

export const sortTeamsByCreatedAt = (teams = []) =>
  [...teams].sort((a, b) => {
    const createdDiff = getMillis(a.createdAt) - getMillis(b.createdAt);

    if (createdDiff !== 0) return createdDiff;

    return String(a.id || "").localeCompare(String(b.id || ""));
  });

export const splitTeamsByPlanLimit = (teams = [], teamLimit = 0) => {
  const sortedTeams = sortTeamsByCreatedAt(teams);
  const safeLimit = Math.max(Number(teamLimit || 0), 0);
  const unlockedIds = new Set(
    sortedTeams.slice(0, safeLimit).map((team) => team.id)
  );
  const withLockState = teams.map((team) => ({
    ...team,
    isLockedByPlan: !unlockedIds.has(team.id),
  }));

  return {
    allTeams: withLockState,
    unlockedTeams: withLockState.filter((team) => !team.isLockedByPlan),
    lockedTeams: withLockState.filter((team) => team.isLockedByPlan),
  };
};

export const isTeamLockedByPlan = (teams = [], teamId = "", teamLimit = 0) => {
  const { lockedTeams } = splitTeamsByPlanLimit(teams, teamLimit);
  return lockedTeams.some((team) => team.id === teamId);
};
