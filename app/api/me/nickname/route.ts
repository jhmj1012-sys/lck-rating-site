import { NextResponse } from "next/server";

import { requireUser, updateUserNickname } from "@/lib/authz";

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as { nickname?: string };
    const nickname = (body.nickname ?? "").trim();

    await updateUserNickname(user.id, nickname);
    return NextResponse.json({ ok: true, nickname });
  } catch (error) {
    const message = error instanceof Error ? error.message : "닉네임 변경에 실패했습니다.";
    const status = message === "로그인이 필요합니다." ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
