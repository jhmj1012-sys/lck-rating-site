import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { requireNamedUser } from "@/lib/authz";
import { createBudgetChallengePost } from "@/lib/games/budget-challenge-posts";

export async function POST(request: Request) {
  try {
    const user = await requireNamedUser();
    const body = (await request.json()) as {
      title?: string;
      body?: string;
      encodedSelection?: string;
    };

    const post = await createBudgetChallengePost({
      authorId: user.id,
      authorNickname: user.nickname ?? "소환사",
      title: body.title ?? "",
      body: body.body ?? "",
      encodedSelection: body.encodedSelection ?? "",
    });

    revalidatePath("/games/15-dollar-challenge");

    return NextResponse.json({ ok: true, post });
  } catch (error) {
    const message = error instanceof Error ? error.message : "게시글 저장에 실패했습니다.";
    const status = message === "로그인이 필요합니다." || message === "닉네임을 먼저 설정해 주세요." ? 401 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
