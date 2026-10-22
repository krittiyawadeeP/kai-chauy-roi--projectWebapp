import { MerchantCategory } from "../generated/prisma/client";

export const merchantCategories = {
  "อาหารและเครื่องดื่ม": MerchantCategory.FOOD_DRINK,
  "ของใช้ทั่วไป": MerchantCategory.GENERAL,
  "หัตถกรรม/ของฝาก": MerchantCategory.HANDICRAFT,
  "บริการชุมชน": MerchantCategory.COMMUNITY_SERVICE,
  "ผลไม้/เกษตรแปรรูป": MerchantCategory.AGRICULTURE,
  "เสื้อผ้าและเครื่องแต่งกาย": MerchantCategory.CLOTHING,
  "สุขภาพและความงาม": MerchantCategory.HEALTH_BEAUTY,
  "บ้านและเครื่องใช้": MerchantCategory.HOME_LIVING,
} as const;

export function merchantCategory(value: unknown): MerchantCategory | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return typeof value === "string" ? merchantCategories[value as keyof typeof merchantCategories] : undefined;
}
