import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { requireNamedUser } from "@/lib/authz";
import { deleteCommentByOwner } from "@/lib/service";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ matchId: string; commentId: string }> },
) {
  try {
    const user = await requireNamedUser();
    const { matchId, commentId } = await params;

    await deleteCommentByOwner({
      viewerId: user.id,
      matchId,
      commentId,
    });

    revalidatePath("/");
    revalidatePath("/me");
    revalidatePath(`/matches/${matchId}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "댓글 삭제에 실패했습니다." },
      { status: 400 },
    );
  }
}
