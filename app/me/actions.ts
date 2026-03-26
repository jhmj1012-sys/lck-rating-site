'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser, updateUserNickname } from "@/lib/authz";
import { equipProfileStoreItem, purchaseProfileStoreItem } from "@/lib/service";

function encodeMessage(value: string) {
  return encodeURIComponent(value);
}

export async function saveNicknameAction(formData: FormData) {
  const user = await requireUser();
  const nickname = (formData.get("nickname") as string) ?? "";

  try {
    await updateUserNickname(user.id, nickname);
    revalidatePath("/");
    revalidatePath("/me");
    redirect("/me?success=" + encodeMessage("닉네임을 저장했습니다."));
  } catch (error) {
    const message = error instanceof Error ? error.message : "닉네임 저장에 실패했습니다.";
    redirect("/me?setup=1&error=" + encodeMessage(message));
  }
}

export async function purchaseStoreItemAction(formData: FormData) {
  const user = await requireUser();
  const storeItemId = (formData.get("storeItemId") as string) ?? "";

  try {
    await purchaseProfileStoreItem({ userId: user.id, storeItemId });
    revalidatePath("/me");
    redirect("/me?success=" + encodeMessage("아이템을 구매했습니다."));
  } catch (error) {
    const message = error instanceof Error ? error.message : "아이템 구매에 실패했습니다.";
    redirect("/me?error=" + encodeMessage(message));
  }
}

export async function equipStoreItemAction(formData: FormData) {
  const user = await requireUser();
  const storeItemId = (formData.get("storeItemId") as string) ?? "";

  try {
    await equipProfileStoreItem({ userId: user.id, storeItemId });
    revalidatePath("/");
    revalidatePath("/me");
    redirect("/me?success=" + encodeMessage("프로필에 적용했습니다."));
  } catch (error) {
    const message = error instanceof Error ? error.message : "아이템 적용에 실패했습니다.";
    redirect("/me?error=" + encodeMessage(message));
  }
}
