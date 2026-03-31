import { NextResponse } from "next/server";

import { requireUser, updateUserBio } from "@/lib/authz";

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as { bio?: string };
    const bio = (body.bio ?? "").trim();

    await updateUserBio(user.id, bio);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "소개문구 저장에 실패했습니다.";
    const status = message === "로그인이 필요합니다." ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
