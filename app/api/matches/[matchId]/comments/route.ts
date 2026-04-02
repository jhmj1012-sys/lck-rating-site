import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { requireNamedUser } from "@/lib/authz";
import { submitComment } from "@/lib/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  try {
    const user = await requireNamedUser();
    const { matchId } = await params;
    const body = (await request.json()) as { text?: string; parentId?: string | null };

    const comment = await submitComment({
      viewerId: user.id,
      matchId,
      text: body.text ?? "",
      parentId: body.parentId ?? null,
    });

    revalidatePath("/");
    revalidatePath("/me");
    revalidatePath(`/matches/${matchId}`);
    return NextResponse.json({ ok: true, comment });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "댓글 등록에 실패했습니다." },
      { status: 400 },
    );
  }
}
