<<<<<<< HEAD
export const runtime = "nodejs";

=======
>>>>>>> c39aa9d3570ced9499a5f3473f6b937ca0c693a8
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export async function POST(req) {
  try {
    const { name, description, userId, email } = await req.json();

    if (!name || !userId || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const docRef = await addDoc(collection(db, "teams"), {
      name,
      description,
      admin: { userId, email },
      createdAt: serverTimestamp(),
      present: 0,
      absent: 0,
<<<<<<< HEAD
=======
      members: []
>>>>>>> c39aa9d3570ced9499a5f3473f6b937ca0c693a8
    });

    return NextResponse.json({ id: docRef.id });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
