import { NextResponse } from "next/server";

import { getGlobalSearchData } from "@/lib/service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? "";
    const limitRaw = searchParams.get("limit");
    const limit = limitRaw ? Number(limitRaw) : undefined;
    const data = await getGlobalSearchData(query, Number.isFinite(limit) ? limit : undefined);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "검색 결과를 불러오지 못했습니다." },
      { status: 400 },
    );
  }
}
