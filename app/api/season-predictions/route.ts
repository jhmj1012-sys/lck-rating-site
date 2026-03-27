import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/authz";
import { getSeasonPredictionListData } from "@/lib/service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const user = await getCurrentUser();
    const data = await getSeasonPredictionListData(user?.id ?? null, {
      category: searchParams.get("category") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "시즌예측 목록을 불러오지 못했습니다." },
      { status: 400 },
    );
  }
}
