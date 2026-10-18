import { prisma } from '../lib/prisma';

export const DEFAULT_POLICY = { Policy_ID: null, Gov_Pay_Ratio: '0.4000', User_Pay_Ratio: '0.6000', Grant_Amount: '1000.00', Note: 'นโยบายเริ่มต้นของระบบ' };
export const currentPolicyOrder = [{ Effective_From: 'desc' as const }, { Policy_ID: 'desc' as const }];
export async function getCurrentPolicy() {
  return await prisma.grant_policy.findFirst({ where: { Effective_From: { lte: new Date() } }, orderBy: currentPolicyOrder }) ?? DEFAULT_POLICY;
}
export function validatePolicy(body: { Gov_Pay_Ratio?: unknown; Grant_Amount?: unknown; Note?: unknown }) {
  const { Gov_Pay_Ratio: ratio, Grant_Amount: amount, Note: note } = body;
  if (typeof ratio !== 'number' || !Number.isFinite(ratio) || ratio <= 0 || ratio >= 1 || Math.abs(ratio * 10000 - Math.round(ratio * 10000)) > 0.000001) return 'อัตรารัฐช่วยจ่ายต้องมากกว่า 0 และน้อยกว่า 100% (ทศนิยมไม่เกิน 2 ตำแหน่งของเปอร์เซ็นต์)';
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || amount > 9999999999.99 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.0001) return 'วงเงินสิทธิ์ต้องเป็นจำนวนบวกและมีทศนิยมไม่เกิน 2 ตำแหน่ง';
  if (typeof note !== 'string' || !note.trim() || note.length > 255) return 'กรุณาระบุเหตุผลหรือเลขที่อ้างอิงไม่เกิน 255 ตัวอักษร';
  return null;
}
