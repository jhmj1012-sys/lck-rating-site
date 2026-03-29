import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { GUEST_USER_COOKIE, resolveUserOrGuest } from "@/lib/authz";
import { submitPlayerRating } from "@/lib/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  try {
    const cookieStore = await cookies();
    const actor = await resolveUserOrGuest(cookieStore.get(GUEST_USER_COOKIE)?.value ?? null);
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
      viewerId: actor.user.id,
      matchId,
      playerId: body.playerId,
      score: body.score,
      comment: body.comment ?? "",
    });

    revalidatePath("/");
    revalidatePath("/me");
    revalidatePath(`/matches/${matchId}`);
    const response = NextResponse.json({ ok: true });
    if (actor.isGuest && actor.guestToken) {
      response.cookies.set(GUEST_USER_COOKIE, actor.guestToken, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 180,
      });
    }
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "평점 등록에 실패했습니다." },
      { status: 400 },
    );
  }
}
