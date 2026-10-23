import { createHash } from 'node:crypto';

import { prisma } from './prisma';
import { bangkokDate, eligibleMissionSlots, suggestMission, summarizeSales, type MissionSuggestion } from './sales-mission';

const dayMs = 86_400_000;
const bangkokOffsetMs = 7 * 3_600_000;
let running = false;

export function completedBangkokDay(now = new Date()) {
  const today = bangkokDate(now);
  const end = new Date(`${today}T00:00:00+07:00`);
  const start = new Date(end.getTime() - dayMs);
  const date = bangkokDate(start);
  return { date, analysisDate: new Date(`${date}T00:00:00.000Z`), start, end };
}

export function millisecondsUntilBangkokMidnight(now = new Date()) {
  const local = now.getTime() + bangkokOffsetMs;
  return (Math.floor(local / dayMs) + 1) * dayMs - local;
}

export function pickDailyMerchant<T>(candidates: T[], date: string, provinceId: number): T {
  const hash = createHash('sha256').update(`${date}:${provinceId}`).digest();
  return candidates[hash.readUInt32BE(0) % candidates.length];
}

export function nextMissionWindow(suggestion: MissionSuggestion, now = new Date()) {
  const midnight = new Date(`${bangkokDate(now)}T00:00:00+07:00`);
  for (let daysAhead = 1; daysAhead <= 7; daysAhead++) {
    const start = new Date(midnight.getTime() + daysAhead * dayMs + suggestion.startHour * 3_600_000);
    const weekday = new Date(start.getTime() + bangkokOffsetMs).getUTCDay();
    if ((weekday === 0 || weekday === 6) === (suggestion.dayType === 'weekend')) {
      return { start, end: new Date(start.getTime() + (suggestion.endHour - suggestion.startHour) * 3_600_000) };
    }
  }
  throw new Error('No matching day for suggested mission');
}

async function createAutomaticMission(analysisId: number, merchantId: number, suggestion: MissionSuggestion) {
  const { start, end } = nextMissionWindow(suggestion);
  try {
    await prisma.missions.upsert({
      where: { Daily_Analysis_ID: analysisId },
      create: {
        Daily_Analysis_ID: analysisId,
        Target_Merchant_ID: merchantId,
        Mission_Name: suggestion.missionName,
        Description: suggestion.description,
        Max_Recipients: 50,
        Start_DateTime: start,
        End_DateTime: end,
        Status: 'ACTIVE',
      },
      update: {},
    });
  } catch (error) {
    if ((error as { code?: string }).code !== 'P2002' || !await prisma.missions.findUnique({ where: { Daily_Analysis_ID: analysisId } })) throw error;
  }
}

export async function runDailyMissionAnalysis(now = new Date()) {
  if (running) return;
  running = true;
  try {
    const { date, analysisDate, start, end } = completedBangkokDay(now);
    const provinces = await prisma.provinces.findMany({ orderBy: { Prov_ID: 'asc' } });
    await prisma.daily_mission_analyses.createMany({
      data: provinces.map(province => ({ Analysis_Date: analysisDate, Province_ID: province.Prov_ID, Status: 'PENDING' })),
      skipDuplicates: true,
    });
    const existing = await prisma.daily_mission_analyses.findMany({ where: { Analysis_Date: analysisDate }, include: { mission: true } });
    const unfinished = provinces.filter(province => {
      const row = existing.find(item => item.Province_ID === province.Prov_ID);
      return row?.Status === 'PENDING' || row?.Status === 'ERROR' || (row?.Status === 'READY' && !row.mission);
    });
    if (!unfinished.length) return;

    const merchants = await prisma.merchants.findMany({
      select: { Mch_ID: true, Shop_Name: true, Category: true, districts: { select: { Prov_ID: true } } },
      orderBy: { Mch_ID: 'asc' },
    });
    const sales = await prisma.sales_transactions.findMany({
      where: { Status: { in: ['COMPLETED', 'completed'] }, Tx_Timestamp: { gte: start, lt: end } },
      select: { Merchant_ID: true, Tx_Timestamp: true, Total_Amount: true },
    });
    const salesByMerchant = new Map<number, typeof sales>();
    for (const sale of sales) {
      const rows = salesByMerchant.get(sale.Merchant_ID) ?? [];
      rows.push(sale);
      salesByMerchant.set(sale.Merchant_ID, rows);
    }
    for (const province of unfinished) {
      const where = { Analysis_Date_Province_ID: { Analysis_Date: analysisDate, Province_ID: province.Prov_ID } };
      const saved = existing.find(row => row.Province_ID === province.Prov_ID)!;
      if (saved.mission) {
        await prisma.daily_mission_analyses.update({ where, data: { Status: 'READY', Message: null } });
        continue;
      }
      if (saved.Merchant_ID && saved.Suggestion) {
        try {
          await createAutomaticMission(saved.Analysis_ID, saved.Merchant_ID, saved.Suggestion as MissionSuggestion);
          await prisma.daily_mission_analyses.update({ where, data: { Status: 'READY', Message: null } });
        } catch (error) {
          console.error(`Automatic mission creation failed for province ${province.Prov_ID}`, error);
          await prisma.daily_mission_analyses.update({ where, data: { Status: 'ERROR', Message: 'สร้างภารกิจอัตโนมัติไม่สำเร็จ' } });
        }
        continue;
      }
      const localMerchants = merchants.filter(merchant => merchant.districts.Prov_ID === province.Prov_ID);
      if (!localMerchants.length) {
        await prisma.daily_mission_analyses.update({ where, data: { Status: 'NO_MERCHANT', Message: 'จังหวัดนี้ยังไม่มีร้านค้า' } });
        continue;
      }
      const candidates = localMerchants.flatMap(merchant => {
        const summary = summarizeSales(salesByMerchant.get(merchant.Mch_ID) ?? []);
        return summary.transactionCount >= 4 && eligibleMissionSlots(summary).length >= 2 ? [{ merchant, summary }] : [];
      });
      if (!candidates.length) {
        await prisma.daily_mission_analyses.update({ where, data: { Status: 'INSUFFICIENT_DATA', Message: 'เมื่อวานไม่มีร้านที่มีอย่างน้อย 4 บิลและ 2 ช่วงเวลาขายที่เปรียบเทียบได้' } });
        continue;
      }
      const { merchant, summary } = pickDailyMerchant(candidates, date, province.Prov_ID);
      try {
        const suggestion = await suggestMission(merchant.Shop_Name, merchant.Category, summary, date);
        await prisma.daily_mission_analyses.update({
          where,
          data: { Status: 'PENDING', Message: null, Merchant_ID: merchant.Mch_ID, Shop_Name: merchant.Shop_Name, Summary: summary, Suggestion: suggestion },
        });
        await createAutomaticMission(saved.Analysis_ID, merchant.Mch_ID, suggestion);
        await prisma.daily_mission_analyses.update({ where, data: { Status: 'READY', Message: null } });
      } catch (error) {
        console.error(`Daily mission analysis failed for province ${province.Prov_ID}`, error);
        await prisma.daily_mission_analyses.update({
          where, data: { Status: 'ERROR', Message: error instanceof Error && error.message.includes('Ollama') ? 'วิเคราะห์ด้วย Ollama ไม่สำเร็จ' : 'วิเคราะห์หรือสร้างภารกิจไม่สำเร็จ', Merchant_ID: merchant.Mch_ID, Shop_Name: merchant.Shop_Name },
        });
      }
    }
    console.log(`Daily mission analysis completed for ${date}: ${provinces.length} provinces`);
  } finally {
    running = false;
  }
}

export function startDailyMissionScheduler() {
  const schedule = () => {
    setTimeout(() => {
      schedule();
      void runDailyMissionAnalysis().catch(error => console.error('Daily mission job failed', error));
    }, millisecondsUntilBangkokMidnight());
  };
  schedule();
  void runDailyMissionAnalysis().catch(error => console.error('Daily mission startup job failed', error));
}
