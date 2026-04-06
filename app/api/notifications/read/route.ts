import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { GUEST_USER_COOKIE, resolveUserOrGuest } from "@/lib/authz";
import { markNotificationsRead } from "@/lib/service";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const actor = await resolveUserOrGuest(cookieStore.get(GUEST_USER_COOKIE)?.value ?? null);

    if (actor.isGuest) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    await markNotificationsRead({ userId: actor.user.id });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "처리에 실패했습니다." }, { status: 500 });
  }
}
