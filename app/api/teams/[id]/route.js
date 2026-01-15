import { db } from "@/lib/firebase";
import { doc, deleteDoc } from "firebase/firestore";

export async function DELETE(req, { params }) {
  try {
    const { id } = await params; 
    if (!id) return new Response("Missing ID", { status: 400 });

    const teamRef = doc(db, "teams", id);
    await deleteDoc(teamRef);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error("Delete team error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
