<<<<<<< HEAD
export const runtime = "nodejs";

import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { getDateKey } from "../../../../lib/DateKey";

export async function POST(req) {

  const todayKey = getDateKey(new Date());
=======
// app/api/teams/create/route.js
import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"

export async function POST(req) {
>>>>>>> c39aa9d3570ced9499a5f3473f6b937ca0c693a8
  try {
    const body = await req.json()
    const { name, description, admin } = body

    if (!name || !admin?.userId) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 })
    }

    const docRef = await addDoc(collection(db, "teams"), {
      name,
      description,
<<<<<<< HEAD
      admin,
      createdAt: serverTimestamp(),
      totalMembers: 0,
      attendanceSummary: {
        present: 0,
        absent: 0,
        lastUpdatedDate: todayKey,
      },
=======
      present: 0,
      absent: 0,
      admin,
      members: [],
      createdAt: serverTimestamp(),
>>>>>>> c39aa9d3570ced9499a5f3473f6b937ca0c693a8
    })

    return NextResponse.json({
      id: docRef.id,
      team: {
        id: docRef.id,
        name,
        description,
<<<<<<< HEAD
        admin,
        totalMembers: 0,
        attendanceSummary: {
          present: 0,
          absent: 0,
          lastUpdatedDate: todayKey,
        },
=======
        present: 0,
        absent: 0,
        admin,
        members: [],
>>>>>>> c39aa9d3570ced9499a5f3473f6b937ca0c693a8
      },
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to create team" }, { status: 500 })
  }
}
