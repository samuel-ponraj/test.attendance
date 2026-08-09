import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";


admin.initializeApp();
const db = admin.firestore();

// Keeps team summaries correct for web API, mobile self-punch, admin manual,
// and manager-marked attendance without trusting clients to edit aggregates.
export const syncAttendanceSummary = onDocumentWritten(
  "teams/{teamId}/attendance/{dateKey}/punches/{memberId}",
  async (event) => {
    const { teamId, dateKey } = event.params;
    const punches = await db.collection("teams").doc(teamId)
      .collection("attendance").doc(dateKey).collection("punches").get();
    const summary = { present: 0, halfday: 0, absent: 0 };
    punches.forEach((punch) => {
      const status = punch.data().status as keyof typeof summary;
      if (status in summary) summary[status] += 1;
    });
    await db.collection("teams").doc(teamId).set({
      attendanceSummary: {
        ...summary,
        dateKey,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    }, { merge: true });
  },
);


/**
 * Auto cleanup attendance
 * basic -> 30 days
 * pro   -> 365 days
 */
export const cleanupOldAttendance = onSchedule(
  {
    schedule: "0 2 * * *", 
    timeZone: "Asia/Kolkata",
  },
  async () => {
    const teamsSnap = await db.collection("teams").get();
    const now = new Date();

    for (const teamDoc of teamsSnap.docs) {
      const teamData = teamDoc.data();
      const adminUserId = teamData?.admin?.userId;
      if (!adminUserId) continue;

      // One-time licence: retain attendance history without a plan cutoff.
      const daysAllowed = Number.MAX_SAFE_INTEGER;

      const cutoffDate = new Date();
      cutoffDate.setDate(now.getDate() - daysAllowed);

      // 2. ONLY fetch records that are actually old (Server-side filtering)
      const oldAttendanceSnap = await teamDoc.ref
        .collection("attendance")
        .where("updatedDate", "<", cutoffDate)
        .get();

      if (oldAttendanceSnap.empty) continue;

      let batch = db.batch();
      let opCount = 0;

      for (const doc of oldAttendanceSnap.docs) {
        batch.delete(doc.ref);
        opCount++;

        if (opCount === 450) {
          await batch.commit();
          batch = db.batch();
          opCount = 0;
        }
      }

      if (opCount > 0) await batch.commit();
      console.log(`🧹 Deleted ${oldAttendanceSnap.size} records for team ${teamDoc.id}`);
    }
  }
);




export const createMemberAccount = onCall(async (request) => {
  // 1. Security Check: Is the requester logged in?
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const { email, firstName, lastName, teamId, contact, customData } = request.data;
  const password = "123456"; 
  let createdUid: string | null = null;

  try {
    if (teamId) {
      const email = String(request.auth.token.email || "").trim().toLowerCase();
      const mappingSnap = email ? await db.doc(`allMembers/${email}`).get() : null;
      const managerId = mappingSnap?.data()?.memberId || request.auth.uid;
      if (!mappingSnap?.exists || mappingSnap.data()?.teamId !== teamId || managerId !== request.auth.uid) {
        throw new HttpsError("permission-denied", "Manager team mapping not found");
      }
      const managerSnap = await db.doc(`teams/${teamId}/members/${managerId}`).get();
      if (!managerSnap.exists || managerSnap.data()?.role !== "manager") {
        throw new HttpsError("permission-denied", "Manager access denied");
      }
    }

    // 2. Create the User in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: email.toLowerCase(),
      password: password,
      displayName: `${firstName} ${lastName}`,
    });
    createdUid = userRecord.uid;

    // Managers create regular members through this trusted path. Salary and
    // billing fields are deliberately never accepted from the client.
    if (teamId) {
      const normalizedEmail = email.toLowerCase();
      const batch = db.batch();
      batch.set(db.doc(`teams/${teamId}/members/${userRecord.uid}`), {
        id: userRecord.uid,
        firstName: String(firstName || "").trim(),
        lastName: String(lastName || "").trim(),
        email: normalizedEmail,
        contact: String(contact || "").trim(),
        role: "member",
        customData: customData || {},
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      batch.set(db.doc(`allMembers/${normalizedEmail}`), {
        teamId,
        email: normalizedEmail,
        memberId: userRecord.uid,
        role: "member",
      });
      batch.update(db.doc(`teams/${teamId}`), {
        totalMembers: admin.firestore.FieldValue.increment(1),
      });
      await batch.commit();
    }

    // 3. Return the new UID to the frontend
    return { uid: userRecord.uid };
    
  } catch (error: any) {
    if (createdUid) await admin.auth().deleteUser(createdUid).catch(() => undefined);
    console.error("Error creating user:", error);
    
    if (error instanceof HttpsError) throw error;
    if (error.code === 'auth/email-already-in-use') {
      throw new HttpsError("already-exists", "This email is already registered.");
    }
    
    throw new HttpsError("internal", error.message || "Failed to create account");
  }
});


export const removeMembers = onCall({ cors: true }, async (request) => {
  
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const { teamId, memberIds } = request.data as { 
    teamId: string; 
    memberIds: string[]; 
  };

  const adminUid = request.auth.uid;
  const teamRef = db.doc(`teams/${teamId}`);
  const userRef = db.doc(`users/${adminUid}`);

  try {
    const teamSnap = await teamRef.get();
    if (!teamSnap.exists || teamSnap.data()?.admin?.userId !== adminUid) {
      throw new HttpsError("permission-denied", "Unauthorized");
    }

    // ✅ This array will store the UIDs for Auth deletion
    const finalUidsToDelete: string[] = [];

    await db.runTransaction(async (tx) => {
      const emailsToDelete: string[] = [];

      // 1. READ PHASE
      for (const id of memberIds) {
        const memberRef = db.doc(`teams/${teamId}/members/${id}`);
        const memberSnap = await tx.get(memberRef);
        
        if (memberSnap.exists) {
          finalUidsToDelete.push(id);
          
          const email = memberSnap.data()?.email;
          if (email) emailsToDelete.push(email.toLowerCase());
        }
      }

      // 2. WRITE PHASE
      for (const id of memberIds) {
        tx.delete(db.doc(`teams/${teamId}/members/${id}`));
      }

      for (const email of emailsToDelete) {
        tx.delete(db.doc(`allMembers/${email}`));
      }

      const count = memberIds.length;
      const decrementAmount = -1 * count;

      tx.update(teamRef, { totalMembers: admin.firestore.FieldValue.increment(decrementAmount) });
      tx.update(userRef, { memberCount: admin.firestore.FieldValue.increment(decrementAmount) });
    });

    // 3. AUTH DELETION
    // We use the UIDs we confirmed existed in the database
    if (finalUidsToDelete.length > 0) {
      try {
        await admin.auth().deleteUsers(finalUidsToDelete);
        console.log(`Successfully deleted ${finalUidsToDelete.length} users from Auth:`, finalUidsToDelete);
      } catch (authError) {
        console.error("Auth Deletion Error:", authError);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error("Remove Members Error: ", err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError("internal", err.message || "Failed to remove members");
  }
});

export const deleteUserAccount = onCall(
  { 
    memory: "512MiB", 
    timeoutSeconds: 120 
  }, 
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User not logged in");
    }

    const uid = request.auth.uid;

    try {
      // 1️⃣ Find all teams where user is admin
      const teamsSnap = await db
        .collection("teams")
        .where("admin.userId", "==", uid)
        .get();

      for (const teamDoc of teamsSnap.docs) {
        const teamId = teamDoc.id;

        // 2️⃣ Clean up 'allMembers' (Top-level collection)
        // We find documents where teamId matches the team being deleted
        const allMembersSnap = await db
          .collection("allMembers")
          .where("teamId", "==", teamId)
          .get();

        if (!allMembersSnap.empty) {
          const batch = db.batch();
          allMembersSnap.docs.forEach((doc) => {
            batch.delete(doc.ref);
          });
          await batch.commit();
        }

        // 3️⃣ Recursively delete the team (and its subcollections)
        await admin.firestore().recursiveDelete(teamDoc.ref);
      }

      // 4️⃣ Delete the user's personal document
      await db.collection("users").doc(uid).delete();

      // 5️⃣ Delete the Auth user
      await admin.auth().deleteUser(uid);

      return { success: true };

    } catch (error: any) {
      console.error("Deletion Error:", error);
      throw new HttpsError("internal", error.message || "Deletion failed");
    }
  }
);

export const verifyOtpAndDeleteTeam = onCall(
  {
    memory: "512MiB",
    timeoutSeconds: 120,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User not logged in");
    }

    const uid = request.auth.uid;
    const { teamId, otp } = request.data;

    try {
      // 1. Verify OTP
      const otpRef = db.collection("deleteTeamOtps").doc(uid).collection("teams").doc(teamId);
      const otpSnap = await otpRef.get();
      const otpData = otpSnap.data();

      if (!otpSnap.exists || !otpData || otp !== otpData.otp || Date.now() > otpData.expiresAt) {
        throw new HttpsError("invalid-argument", "Invalid or expired OTP");
      }

      // 2. Team Validation
      const teamRef = db.collection("teams").doc(teamId);
      const teamSnap = await teamRef.get();
      if (!teamSnap.exists) throw new HttpsError("not-found", "Team not found");
      
      const teamData = teamSnap.data();
      if (teamData?.admin?.userId !== uid) {
        throw new HttpsError("permission-denied", "Not team admin");
      }

      // 3. Get Members for Auth Deletion & Stats
      const membersSnap = await teamRef.collection("members").get();
      const memberUids: string[] = [];
      
      membersSnap.forEach(doc => {
        const mData = doc.data();
        // Ensure we only grab valid string UIDs
        if (mData.id && typeof mData.id === 'string') {
          memberUids.push(mData.id);
        }
      });


      // 4. DELETE FROM FIREBASE AUTH
      if (memberUids.length > 0) {
        try {
          // Note: deleteUsers handles up to 1000 IDs per call
          await admin.auth().deleteUsers(memberUids);
        } catch (authError) {
          console.error("Auth Deletion Error:", authError);
          // We continue anyway to clean up DB, or you can throw here
        }
      }

      // 5. Cleanup DB with Batch
      const batch = db.batch();

      // Delete from allMembers collection
      const allMembersSnap = await db
        .collection("allMembers")
        .where("teamId", "==", teamId)
        .get();

      allMembersSnap.docs.forEach((doc) => batch.delete(doc.ref));

      // Update Admin Stats
      const userRef = db.collection("users").doc(uid);
      const decrementAmount = -1 * memberUids.length; // Force negative number

      batch.update(userRef, {
        teamCount: admin.firestore.FieldValue.increment(-1),
        memberCount: admin.firestore.FieldValue.increment(decrementAmount),
      });

      await batch.commit();

      // 6. Final Recursive Delete & OTP Cleanup
      await admin.firestore().recursiveDelete(teamRef);
      await otpRef.delete();

      return { success: true };

    } catch (error: any) {
      console.error("Critical Deletion Error:", error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", error.message || "Operation failed");
    }
  }
);
