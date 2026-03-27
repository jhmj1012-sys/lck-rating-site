import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { requireNamedUser } from "@/lib/authz";
import { submitSeasonPredictionEntry } from "@/lib/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ questionId: string }> },
) {
  try {
    const user = await requireNamedUser();
    const { questionId } = await params;
    const body = (await request.json()) as { selectedOptionId?: string };
    if (!body.selectedOptionId) {
      return NextResponse.json({ error: "선택지를 먼저 골라 주세요." }, { status: 400 });
    }

    await submitSeasonPredictionEntry({
      viewerId: user.id,
      questionId,
      selectedOptionId: body.selectedOptionId,
    });

    revalidatePath("/");
    revalidatePath("/season-predictions");
    revalidatePath(`/season-predictions/${questionId}`);
    revalidatePath("/me");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "시즌예측 저장에 실패했습니다." },
      { status: 400 },
    );
  }
}
