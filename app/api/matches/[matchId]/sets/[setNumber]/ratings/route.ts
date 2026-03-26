import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { requireNamedUser } from "@/lib/authz";
import { submitSetPlayerRatings } from "@/lib/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchId: string; setNumber: string }> },
) {
  try {
    const user = await requireNamedUser();
    const { matchId, setNumber } = await params;
    const body = (await request.json()) as {
      ratings?: Array<{ playerId?: string; score?: number }>;
    };

    const ratings = (body.ratings ?? []).filter(
      (rating): rating is { playerId: string; score: number } => typeof rating.playerId === "string" && typeof rating.score === "number",
    );

    if (ratings.length === 0) {
      return NextResponse.json({ error: "저장할 선수 평점이 없습니다." }, { status: 400 });
    }

    await submitSetPlayerRatings({
      viewerId: user.id,
      matchId,
      setNumber: Number(setNumber),
      ratings,
    });

    revalidatePath("/");
    revalidatePath("/me");
    revalidatePath(`/matches/${matchId}`);
    revalidatePath(`/matches/${matchId}/sets/${setNumber}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "세트 평점 저장에 실패했습니다." },
      { status: 400 },
    );
  }
}

