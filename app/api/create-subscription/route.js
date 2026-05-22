import Razorpay from "razorpay";

const razorpay = new Razorpay({
	key_id: process.env.RAZORPAY_KEY_ID,
	key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export async function POST(req) {
	try {
		const body = await req.json();

		const subscription = await razorpay.subscriptions.create({
			plan_id: body.planId,
			customer_notify: 1,
			total_count: 12, 
		});

		return Response.json(subscription);
	} catch (err) {
		return Response.json(
			{ error: err.message },
			{ status: 500 }
		);
	}
}