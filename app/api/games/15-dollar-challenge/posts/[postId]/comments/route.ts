import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/auth";
import { addBudgetChallengePostComment } from "@/lib/games/budget-challenge-posts";
import { readStore } from "@/lib/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const store = await readStore();
  const user = store.users.find((item) => item.id === session.user.id) ?? null;
  if (!user?.nickname) {
    return NextResponse.json({ error: "닉네임을 먼저 설정해 주세요." }, { status: 400 });
  }

  const { postId } = await params;
  const body = (await request.json()) as { body?: string };

  try {
    const post = await addBudgetChallengePostComment({
      postId,
      userId: user.id,
      userNickname: user.nickname,
      body: body.body ?? "",
    });

    return NextResponse.json({ post });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "댓글 저장에 실패했습니다." },
      { status: 400 },
    );
  }
}
