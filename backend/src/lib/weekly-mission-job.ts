import { prisma } from './prisma';
import { bangkokDate, summarizeSales, type SaleForAnalysis } from './sales-mission';

const dayMs = 86_400_000;
const bangkokOffsetMs = 7 * 3_600_000;
let running = false;

export function campaignWeek(now = new Date(), currentWeek = false) {
  const localDate = bangkokDate(now);
  const midnight = new Date(`${localDate}T00:00:00+07:00`);
  const local = new Date(now.getTime() + bangkokOffsetMs);
  const weekday = local.getUTCDay();
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  const currentMonday = new Date(midnight.getTime() - daysFromMonday * dayMs);
  const start = !currentWeek && weekday === 0 && local.getUTCHours() >= 12 ? new Date(currentMonday.getTime() + 7 * dayMs) : currentMonday;
  const analysisEnd = new Date(start.getTime() - dayMs);
  return { start, end: new Date(start.getTime() + 7 * dayMs), analysisEnd };
}

export function hourlySales(sales: SaleForAnalysis[]) {
  const slots = new Map<number, { dates: Set<string>; revenue: number }>();
  for (const sale of sales) {
    const hour = (sale.Tx_Timestamp.getUTCHours() + 7) % 24;
    const current = slots.get(hour) ?? { dates: new Set<string>(), revenue: 0 };
    current.dates.add(bangkokDate(sale.Tx_Timestamp));
    current.revenue += Number(sale.Total_Amount);
    slots.set(hour, current);
  }
  return [...slots].map(([hour, slot]) => ({ hour, averageRevenue: Math.round(slot.revenue / slot.dates.size * 100) / 100, daysWithSales: slot.dates.size }))
    .sort((a, b) => a.hour - b.hour);
}

export function rankWeeklyMerchants<T extends { id: number; districtId: number; recent: SaleForAnalysis[]; reference: SaleForAnalysis[]; lastMissionAt?: Date | null }>(merchants: T[]) {
  const candidates = merchants.flatMap(merchant => {
    const recent = summarizeSales(merchant.recent);
    const reference = summarizeSales(merchant.reference);
    if (recent.transactionCount < 10 || reference.transactionCount < 10 || recent.daysWithSales < 5 || reference.daysWithSales < 5) return [];
    const recentDaily = merchant.recent.reduce((sum, sale) => sum + Number(sale.Total_Amount), 0) / recent.daysWithSales;
    const referenceDaily = merchant.reference.reduce((sum, sale) => sum + Number(sale.Total_Amount), 0) / reference.daysWithSales;
    const ratio = recentDaily / referenceDaily;
    if (!Number.isFinite(ratio) || ratio > 0.8) return [];
    const slots = new Map<number, { days: number; revenue: number; weekday: boolean; weekend: boolean }>();
    for (const slot of recent.slots) {
      const current = slots.get(slot.startHour) ?? { days: 0, revenue: 0, weekday: false, weekend: false };
      current.days += slot.daysWithSales;
      current.revenue += slot.totalRevenue;
      current[slot.dayType === 'weekend' ? 'weekend' : 'weekday'] = true;
      slots.set(slot.startHour, current);
    }
    const eligible = [...slots].filter(([hour, slot]) => hour < 22 && slot.days >= 4 && slot.weekday && slot.weekend)
      .sort((a, b) => a[1].revenue / a[1].days - b[1].revenue / b[1].days || a[0] - b[0]);
    if (!eligible.length) return [];
    const hourlyHistory = hourlySales(merchant.recent);
    return [{ ...merchant, ratio, recentDaily, referenceDaily, hourlySales: hourlyHistory, startMinute: eligible[0][0] * 60, endMinute: (eligible[0][0] + 2) * 60 }];
  }).sort((a, b) => a.ratio - b.ratio || (a.lastMissionAt?.getTime() ?? 0) - (b.lastMissionAt?.getTime() ?? 0) || a.id - b.id);
  const selected: typeof candidates = [];
  for (const candidate of candidates) {
    if (selected.length === 2) break;
    if (!selected.some(item => item.districtId === candidate.districtId)) selected.push(candidate);
  }
  for (const candidate of candidates) {
    if (selected.length === 2) break;
    if (!selected.includes(candidate)) selected.push(candidate);
  }
  return selected;
}

async function missionText(shopName: string, ratio: number, startMinute: number) {
  const fallback = { name: `ช่วยอุดหนุน${shopName}`, description: `ชวนอุดหนุน${shopName}ในช่วง ${String(startMinute / 60).padStart(2, '0')}:00–${String(startMinute / 60 + 2).padStart(2, '0')}:00 น. ยอดขายเฉลี่ยต่อวันที่มีบิลลดลง ${Math.round((1 - ratio) * 100)}% จากช่วงอ้างอิง` };
  try {
    const response = await fetch('http://127.0.0.1:11434/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({ model: 'qwen3:4b', stream: false, think: false, format: 'json', messages: [{ role: 'user', content: `เขียนชื่อและคำอธิบายภารกิจชวนอุดหนุนร้านชุมชนเป็น JSON {"name":"...","description":"..."} เท่านั้น ร้าน: ${shopName}; ยอดขายเฉลี่ยลดลง ${Math.round((1 - ratio) * 100)}%; ช่วงเวลา ${startMinute / 60}:00-${startMinute / 60 + 2}:00 น. ห้ามสัญญาส่วนลด โควต้า หรือยอดซื้อขั้นต่ำ` }] }),
    });
    if (!response.ok) return fallback;
    const text = JSON.parse((await response.json() as { message?: { content?: string } }).message?.content ?? '{}');
    return typeof text.name === 'string' && text.name.trim() && text.name.length <= 200 && typeof text.description === 'string' && text.description.trim()
      ? { name: text.name.trim(), description: text.description.trim() } : fallback;
  } catch { return fallback; }
}

export async function runWeeklyMissionAnalysis(now = new Date(), refresh = false) {
  if (running) { if (refresh) throw new Error('Analysis is already running'); return; }
  running = true;
  try {
    const { start, end, analysisEnd: scheduledAnalysisEnd } = campaignWeek(now, refresh);
    const analysisEnd = refresh ? new Date(`${bangkokDate(now)}T00:00:00+07:00`) : scheduledAnalysisEnd;
    const local = new Date(now.getTime() + bangkokOffsetMs);
    if ((!refresh && local.getUTCDay() === 0 && local.getUTCHours() < 12) || now >= end) return;
    const weekDate = new Date(`${bangkokDate(start)}T00:00:00.000Z`);
    const from = new Date(analysisEnd.getTime() - 42 * dayMs);
    const recentStart = new Date(analysisEnd.getTime() - 14 * dayMs);
    const merchants = await prisma.merchants.findMany({ select: { Mch_ID: true, Shop_Name: true, Category: true, Dist_ID: true, districts: { select: { Prov_ID: true } } } });
    const sales = await prisma.sales_transactions.findMany({ where: { Status: { in: ['COMPLETED', 'completed'] }, Tx_Timestamp: { gte: from, lt: analysisEnd } }, select: { Merchant_ID: true, Tx_Timestamp: true, Total_Amount: true } });
    const previous = await prisma.missions.findMany({ where: { Campaign_Week_Start: { not: null, lt: weekDate } }, select: { Target_Merchant_ID: true, Start_DateTime: true }, orderBy: { Start_DateTime: 'desc' } });
    const overlapping = await prisma.missions.findMany({ where: { Start_DateTime: { lt: end }, End_DateTime: { gt: start }, Campaign_Week_Start: null, Status: { in: ['ACTIVE', 'active', 'OPEN', 'open'] } }, select: { Target_Merchant_ID: true } });
    const busyMerchants = new Set(overlapping.map(mission => mission.Target_Merchant_ID));
    const byMerchant = new Map<number, typeof sales>();
    for (const sale of sales) byMerchant.set(sale.Merchant_ID, [...(byMerchant.get(sale.Merchant_ID) ?? []), sale]);
    const provinceIds = [...new Set(merchants.map(item => item.districts.Prov_ID))];
    const replacements: { merchantId: number; shopName: string; ratio: number; startMinute: number; endMinute: number; evidence: object }[] = [];
    const policy = await prisma.ai_mission_policy.findFirst({ orderBy: [{ Effective_From: 'desc' }, { Policy_ID: 'desc' }] });
    for (const provinceId of provinceIds) {
      const existing = refresh ? [] : await prisma.missions.findMany({ where: { Campaign_Week_Start: weekDate, merchants: { districts: { Prov_ID: provinceId } } }, select: { Target_Merchant_ID: true } });
      if (existing.length >= 2) continue;
      const existingIds = new Set(existing.map(mission => mission.Target_Merchant_ID));
      const candidates = merchants.filter(item => item.districts.Prov_ID === provinceId && !busyMerchants.has(item.Mch_ID)).map(item => ({
        id: item.Mch_ID, districtId: item.Dist_ID, shopName: item.Shop_Name,
        recent: (byMerchant.get(item.Mch_ID) ?? []).filter(sale => sale.Tx_Timestamp >= recentStart),
        reference: (byMerchant.get(item.Mch_ID) ?? []).filter(sale => sale.Tx_Timestamp < recentStart),
        lastMissionAt: previous.find(mission => mission.Target_Merchant_ID === item.Mch_ID)?.Start_DateTime,
      }));
      for (const selected of rankWeeklyMerchants(candidates).filter(item => !existingIds.has(item.id)).slice(0, 2 - existing.length)) {
        const evidence = { ratio: selected.ratio, recentDaily: selected.recentDaily, referenceDaily: selected.referenceDaily, hourlySales: selected.hourlySales, periodEnd: analysisEnd.toISOString(), analyzedAt: now.toISOString() };
        if (refresh) {
          replacements.push({ merchantId: selected.id, shopName: selected.shopName, ratio: selected.ratio, startMinute: selected.startMinute, endMinute: selected.endMinute, evidence });
          continue;
        }
        const content = await missionText(selected.shopName, selected.ratio, selected.startMinute);
        await prisma.$transaction(async tx => {
            await tx.$queryRaw`SELECT Prov_ID FROM provinces WHERE Prov_ID = ${provinceId} FOR UPDATE`;
            const count = await tx.missions.count({ where: { Campaign_Week_Start: weekDate, merchants: { districts: { Prov_ID: provinceId } } } });
            if (count >= 2) return;
            await tx.missions.create({
              data: {
                Target_Merchant_ID: selected.id, Campaign_Week_Start: weekDate, Daily_Start_Minute: selected.startMinute, Daily_End_Minute: selected.endMinute,
                Start_DateTime: start, End_DateTime: end, Max_Recipients: null, Ai_Daily_Stamp_Limit: policy?.Daily_Stamp_Limit ?? 1,
                Status: 'ACTIVE', Mission_Name: content.name, Description: content.description, Selection_Evidence: evidence,
              },
            });
        }, { isolationLevel: 'ReadCommitted' });
      }
    }
    if (refresh) {
      if (!replacements.length) throw new Error('No merchants qualify for a new analysis');
      const prepared: (typeof replacements[number] & { name: string; description: string })[] = [];
      for (let index = 0; index < replacements.length; index += 6) {
        prepared.push(...await Promise.all(replacements.slice(index, index + 6).map(async item => ({ ...item, ...await missionText(item.shopName, item.ratio, item.startMinute) }))));
      }
      await prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT Prov_ID FROM provinces ORDER BY Prov_ID FOR UPDATE`;
        const latestPolicy = await tx.ai_mission_policy.findFirst({ orderBy: [{ Effective_From: 'desc' }, { Policy_ID: 'desc' }] });
        await tx.missions.updateMany({ where: { Campaign_Week_Start: weekDate, Status: { in: ['ACTIVE', 'active', 'OPEN', 'open'] } }, data: { Status: 'INACTIVE' } });
        for (const item of prepared) await tx.missions.create({ data: {
          Target_Merchant_ID: item.merchantId, Campaign_Week_Start: weekDate, Daily_Start_Minute: item.startMinute, Daily_End_Minute: item.endMinute,
          Start_DateTime: now, End_DateTime: end, Max_Recipients: null, Ai_Daily_Stamp_Limit: latestPolicy?.Daily_Stamp_Limit ?? 1,
          Status: 'ACTIVE', Mission_Name: item.name, Description: item.description, Selection_Evidence: item.evidence,
        } });
      }, { timeout: 120_000 });
      return prepared.length;
    }
  } finally { running = false; }
}

export function startWeeklyMissionScheduler() {
  const schedule = () => {
    const now = new Date();
    const local = new Date(now.getTime() + bangkokOffsetMs);
    const daysUntilSunday = (7 - local.getUTCDay()) % 7;
    const next = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + daysUntilSunday, 12);
    const delay = next - local.getTime() > 0 ? next - local.getTime() : next + 7 * dayMs - local.getTime();
    setTimeout(() => { schedule(); void runWeeklyMissionAnalysis().catch(console.error); }, delay);
  };
  schedule();
  void runWeeklyMissionAnalysis().catch(console.error);
}
