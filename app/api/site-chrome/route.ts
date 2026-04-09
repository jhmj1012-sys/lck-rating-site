import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/authz";
import { getSiteChromeData } from "@/lib/service";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const data = await getSiteChromeData(user?.id ?? null);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({
      notifications: [],
      unreadNotificationCount: 0,
    });
  }
}
