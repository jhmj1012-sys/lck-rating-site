import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { requireNamedUser } from "@/lib/authz";
import { togglePredictionCommentLike } from "@/lib/service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ matchId: string; predictionId: string }> },
) {
  try {
    const user = await requireNamedUser();
    const { matchId, predictionId } = await params;

    const result = await togglePredictionCommentLike({
      viewerId: user.id,
      matchId,
      predictionId,
    });

    revalidatePath(`/matches/${matchId}`);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "공감 처리에 실패했습니다." },
      { status: 400 },
    );
  }
}
