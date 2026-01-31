import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) return new Response(JSON.stringify({ error: "Missing userId" }), { status: 400 });

    const timestamp = Math.floor(Date.now() / 1000);
    const public_id = `avatars/${userId}`;

    const signature = cloudinary.utils.api_sign_request(
      { timestamp, public_id, overwrite: true },
      process.env.CLOUDINARY_API_SECRET
    );

    return new Response(JSON.stringify({ signature, timestamp, public_id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
