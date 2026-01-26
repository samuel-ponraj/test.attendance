export const runtime = "nodejs";

import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { getDateKey } from "../../../../lib/DateKey";

export async function POST(req) {

  const todayKey = getDateKey(new Date());
  try {
    const body = await req.json()
    const { name, description, admin } = body

    if (!name || !admin?.userId) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 })
    }

    const docRef = await addDoc(collection(db, "teams"), {
      name,
      description,
      admin,
      createdAt: serverTimestamp(),
      totalMembers: 0,
      attendanceSummary: {
        present: 0,
        absent: 0,
        lastUpdatedDate: todayKey,
      },
    })

    return NextResponse.json({
      id: docRef.id,
      team: {
        id: docRef.id,
        name,
        description,
        admin,
        totalMembers: 0,
        attendanceSummary: {
          present: 0,
          absent: 0,
          lastUpdatedDate: todayKey,
        },
      },
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to create team" }, { status: 500 })
  }
}
