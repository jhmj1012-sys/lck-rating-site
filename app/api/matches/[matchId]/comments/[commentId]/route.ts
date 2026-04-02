import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { requireNamedUser } from "@/lib/authz";
import { deleteCommentByOwner, updateCommentByOwner } from "@/lib/service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ matchId: string; commentId: string }> },
) {
  try {
    const user = await requireNamedUser();
    const { matchId, commentId } = await params;
    const body = (await request.json()) as { text?: string };

    const comment = await updateCommentByOwner({
      viewerId: user.id,
      matchId,
      commentId,
      text: body.text ?? "",
    });

    revalidatePath("/");
    revalidatePath("/me");
    revalidatePath(`/matches/${matchId}`);
    return NextResponse.json({ ok: true, comment });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "댓글 수정에 실패했습니다." },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ matchId: string; commentId: string }> },
) {
  try {
    const user = await requireNamedUser();
    const { matchId, commentId } = await params;

    const result = await deleteCommentByOwner({
      viewerId: user.id,
      matchId,
      commentId,
    });

    revalidatePath("/");
    revalidatePath("/me");
    revalidatePath(`/matches/${matchId}`);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "댓글 삭제에 실패했습니다." },
      { status: 400 },
    );
  }
}
