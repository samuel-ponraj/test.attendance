// app/api/teams/delete/route.js
import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { doc, deleteDoc } from "firebase/firestore"

export async function POST(req) {
  try {
    const { teamId } = await req.json()

    await deleteDoc(doc(db, "teams", teamId))

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to delete team" }, { status: 500 })
  }
}
