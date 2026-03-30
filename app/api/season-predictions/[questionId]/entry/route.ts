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
      return NextResponse.json({ error: "Please select an option first." }, { status: 400 });
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
    const message = error instanceof Error ? error.message : "Failed to save season prediction.";
    const status = message === "로그인이 필요합니다." ? 401 : 400;

    return NextResponse.json(
      { error: message },
      { status },
    );
  }
}
