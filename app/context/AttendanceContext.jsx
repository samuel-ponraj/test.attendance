"use client";

import { createContext, useContext, useState } from "react";

const AttendanceContext = createContext(null);

export const AttendanceProvider = ({ children }) => {
  const [teams, setTeams] = useState([]);

  const addTeam = (name, description) => {
    const newTeam = {
      id: crypto.randomUUID(),
      name,
      description,
      members: [],
      attendance: [],
      createdAt: new Date(),
    };

    setTeams((prev) => [...prev, newTeam]);
  };

  return (
    <AttendanceContext.Provider
      value={{
        teams,
        addTeam,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendance = () => {
  const context = useContext(AttendanceContext);

  if (!context) {
    throw new Error(
      "useAttendance must be used within AttendanceProvider"
    );
  }

  return context;
};
