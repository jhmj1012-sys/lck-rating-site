import { NextResponse } from "next/server";

import { requireUser } from "@/lib/authz";
import { deleteUserAccount } from "@/lib/service";

export async function DELETE() {
  try {
    const user = await requireUser();

    if (user.role === "admin") {
      return NextResponse.json(
        { error: "관리자 계정은 이 화면에서 탈퇴할 수 없습니다." },
        { status: 403 },
      );
    }

    await deleteUserAccount(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "회원탈퇴 처리에 실패했습니다.";
    const status = message === "로그인이 필요합니다." ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
