import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/auth";
import { createBudgetChallengePost } from "@/lib/games/budget-challenge-posts";
import { readStore } from "@/lib/store";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const store = await readStore();
  const user = store.users.find((u) => u.id === session.user.id) ?? null;
  if (!user?.nickname) {
    return NextResponse.json({ error: "닉네임을 먼저 설정해 주세요." }, { status: 400 });
  }

  const body = (await request.json()) as { title?: string; body?: string; encodedSelection?: string };

  try {
    const post = await createBudgetChallengePost({
      authorId: user.id,
      authorNickname: user.nickname,
      title: body.title ?? "",
      body: body.body ?? "",
      encodedSelection: body.encodedSelection ?? "",
    });
    return NextResponse.json({ post });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "저장에 실패했습니다." },
      { status: 400 },
    );
  }
}
