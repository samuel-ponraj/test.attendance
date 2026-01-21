// app/api/teams/list/route.js
import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where } from "firebase/firestore"

export async function POST(req) {
  try {
    const { userId } = await req.json()

    const q = query(
      collection(db, "teams"),
      where("admin.userId", "==", userId)
    )

    const snapshot = await getDocs(q)

    const teams = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json({ teams })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to fetch teams" }, { status: 500 })
  }
}



