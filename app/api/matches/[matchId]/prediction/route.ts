import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { GUEST_USER_COOKIE, resolveUserOrGuest } from "@/lib/authz";
import { submitPrediction } from "@/lib/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  try {
    const cookieStore = await cookies();
    const actor = await resolveUserOrGuest(cookieStore.get(GUEST_USER_COOKIE)?.value ?? null);
    const { matchId } = await params;
    const body = (await request.json()) as { selectedTeam?: string };

    if (!body.selectedTeam) {
      return NextResponse.json({ error: "예측할 팀을 선택해 주세요." }, { status: 400 });
    }

    await submitPrediction({
      viewerId: actor.user.id,
      matchId,
      selectedTeamCode: body.selectedTeam,
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
      { error: error instanceof Error ? error.message : "예측 저장에 실패했습니다." },
      { status: 400 },
    );
  }
}
