// app/api/teams/create/route.js
import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"

export async function POST(req) {
  try {
    const body = await req.json()
    const { name, description, admin } = body

    if (!name || !admin?.userId) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 })
    }

    const docRef = await addDoc(collection(db, "teams"), {
      name,
      description,
      present: 0,
      absent: 0,
      admin,
      members: [],
      createdAt: serverTimestamp(),
    })

    return NextResponse.json({
      id: docRef.id,
      team: {
        id: docRef.id,
        name,
        description,
        present: 0,
        absent: 0,
        admin,
        members: [],
      },
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to create team" }, { status: 500 })
  }
}
