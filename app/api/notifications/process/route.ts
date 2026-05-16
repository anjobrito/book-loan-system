import { NextResponse } from "next/server";
import { processPendingReturnNotifications } from "@/lib/notifications";

export async function POST(request: Request) {
  const secret = process.env.NOTIFICATION_PROCESS_SECRET;

  if (secret) {
    const authorization = request.headers.get("authorization");

    if (authorization !== `Bearer ${secret}`) {
      return NextResponse.json(
        {
          success: false,
          message: "Não autorizado.",
        },
        { status: 401 }
      );
    }
  }

  const result = await processPendingReturnNotifications();

  return NextResponse.json({
    success: true,
    ...result,
  });
}
