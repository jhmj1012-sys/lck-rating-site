import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { requireNamedUser } from "@/lib/authz";
import { submitPrediction } from "@/lib/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  try {
    const user = await requireNamedUser();
    const { matchId } = await params;
    const body = (await request.json()) as { selectedTeam?: string };

    if (!body.selectedTeam) {
      return NextResponse.json({ error: "예측할 팀을 선택해 주세요." }, { status: 400 });
    }

    await submitPrediction({
      viewerId: user.id,
      matchId,
      selectedTeamCode: body.selectedTeam,
    });

    revalidatePath("/");
    revalidatePath("/me");
    revalidatePath(`/matches/${matchId}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "예측 저장에 실패했습니다." },
      { status: 400 },
    );
  }
}
