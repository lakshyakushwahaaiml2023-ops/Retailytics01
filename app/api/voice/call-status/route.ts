import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const callStatus = formData.get("CallStatus") as string;
    const callSid = formData.get("CallSid") as string;

    console.log(`📞 Call ${callSid} status: ${callStatus}`);

    // Log failed/no-answer calls for dashboard display
    if (callStatus === "no-answer" || callStatus === "failed" || callStatus === "busy") {
      console.log(`⚠️ Call not answered — owner may need to check dashboard manually`);
    }

    return NextResponse.json({ received: true, status: callStatus });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
