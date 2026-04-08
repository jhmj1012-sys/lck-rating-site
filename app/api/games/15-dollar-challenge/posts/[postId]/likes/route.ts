import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/auth";
import { toggleBudgetChallengePostLike } from "@/lib/games/budget-challenge-posts";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { postId } = await params;

  try {
    const post = await toggleBudgetChallengePostLike({
      postId,
      userId: session.user.id,
    });

    return NextResponse.json({ post });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "좋아요 처리에 실패했습니다." },
      { status: 400 },
    );
  }
}
