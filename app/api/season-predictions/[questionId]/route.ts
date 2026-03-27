import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/authz";
import { getSeasonPredictionDetailData } from "@/lib/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ questionId: string }> },
) {
  try {
    const user = await getCurrentUser();
    const { questionId } = await params;
    const data = await getSeasonPredictionDetailData(questionId, user?.id ?? null);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "시즌예측 상세를 불러오지 못했습니다." },
      { status: 400 },
    );
  }
}
