import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { requireNamedUser } from "@/lib/authz";
import { submitPlayerRating } from "@/lib/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  try {
    const user = await requireNamedUser();
    const { matchId } = await params;
    const body = (await request.json()) as {
      playerId?: string;
      score?: number;
      comment?: string;
    };

    if (!body.playerId || typeof body.score !== "number") {
      return NextResponse.json({ error: "선수와 점수를 모두 입력해 주세요." }, { status: 400 });
    }

    await submitPlayerRating({
      viewerId: user.id,
      matchId,
      playerId: body.playerId,
      score: body.score,
      comment: body.comment ?? "",
    });

    revalidatePath("/");
    revalidatePath("/me");
    revalidatePath(`/matches/${matchId}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "평점 등록에 실패했습니다." },
      { status: 400 },
    );
  }
}
