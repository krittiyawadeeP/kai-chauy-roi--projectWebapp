import { Router } from "express";

import { requireAdmin, revokeUserSessions } from "../lib/auth";
import { badRequest, notFound, sendJson, toNumber } from "../lib/http";
import { prisma } from "../lib/prisma";
import { dashboardRoutes } from "../dashboard/dashboard.routes";
import { missionHistoryRoutes } from '../dashboard/mission-history.routes';
import { grantRoutes } from "../grants/grants.routes";
import { policyRoutes } from "../policy/policy.routes";
import { bangkokDate, eligibleMissionSlots, suggestMission, summarizeSales } from "../lib/sales-mission";
import { completedBangkokDay } from "../lib/daily-mission-job";
import { requiredDistrictStamps } from '../lib/otop-reward';
import { hourlySales, runWeeklyMissionAnalysis } from '../lib/weekly-mission-job';
import { merchantCategory } from '../lib/merchant-category';
import { hashPassword, validPassword } from '../lib/password';
import { hashPin, validPin } from '../lib/pin';

export const adminRoutes = Router();

adminRoutes.use(requireAdmin);
adminRoutes.use("/dashboard", dashboardRoutes);
adminRoutes.use('/mission-history', missionHistoryRoutes);
adminRoutes.use("/grants", grantRoutes);
adminRoutes.use("/policy", policyRoutes);

adminRoutes.get('/users', async (_req, res) => {
  const users = await prisma.users.findMany({
    where: { Role: { in: ['USER', 'MERCHANT'] } },
    select: {
      User_ID: true, Name: true, Phone: true, Role: true, Subsidy_Eligible: true,
      merchants: { select: { Mch_ID: true, Shop_Name: true, Owner_Name: true } },
    },
    orderBy: { User_ID: 'desc' },
  });
  sendJson(res, users.map(user => ({ ...user, accountType: user.Role.toUpperCase() === 'MERCHANT' || user.merchants.length ? 'MERCHANT' : 'USER' })));
});

adminRoutes.patch('/users/:userId', async (req, res) => {
  const userId = Number(req.params.userId);
  const body = req.body;
  const allowed = ['Password', 'Pin', 'Subsidy_Eligible'];
  if (!Number.isInteger(userId) || userId < 1 || userId > 2_147_483_647 || !body || typeof body !== 'object' || Array.isArray(body) ||
      !Object.keys(body).length || Object.keys(body).some(key => !allowed.includes(key))) return badRequest(res, 'ข้อมูลบัญชีไม่ถูกต้อง');
  const { Password, Pin, Subsidy_Eligible } = body;
  if (Password !== undefined && !validPassword(Password)) return badRequest(res, 'รหัสผ่านต้องยาว 6–128 ตัวอักษร และไม่มีช่องว่างหัวท้าย');
  if (Pin !== undefined && !validPin(Pin)) return badRequest(res, 'PIN ต้องเป็นตัวเลข 6 หลัก');
  if (Subsidy_Eligible !== undefined && typeof Subsidy_Eligible !== 'boolean') return badRequest(res, 'สถานะสิทธิ์ 60/40 ไม่ถูกต้อง');
  const current = await prisma.users.findUnique({ where: { User_ID: userId }, select: { User_ID: true, Role: true } });
  if (!current || !['USER', 'MERCHANT'].includes(current.Role.toUpperCase())) return notFound(res, 'ไม่พบบัญชีประชาชนหรือเจ้าของร้าน');
  const user = await prisma.users.update({
    where: { User_ID: userId },
    data: { Password: Password === undefined ? undefined : hashPassword(Password), Pin_Hash: Pin === undefined ? undefined : hashPin(Pin), Subsidy_Eligible },
    select: { User_ID: true, Subsidy_Eligible: true },
  });
  if (Password !== undefined || Pin !== undefined) revokeUserSessions(userId);
  sendJson(res, user);
});

adminRoutes.get('/ai-mission-policy', async (_req, res) => {
  const current = await prisma.ai_mission_policy.findFirst({ orderBy: [{ Effective_From: 'desc' }, { Policy_ID: 'desc' }] });
  sendJson(res, { dailyStampLimit: current?.Daily_Stamp_Limit ?? 1, updatedAt: current?.Effective_From ?? null });
});

adminRoutes.get('/weekly-ai-missions', async (req, res) => {
  const weeks = await prisma.missions.findMany({
    where: { Campaign_Week_Start: { not: null } },
    distinct: ['Campaign_Week_Start'],
    select: { Campaign_Week_Start: true },
    orderBy: { Campaign_Week_Start: 'desc' },
    take: 12,
  });
  const availableWeeks = weeks.map(row => row.Campaign_Week_Start!.toISOString().slice(0, 10));
  const requestedWeek = req.query.week;
  if (requestedWeek !== undefined && (typeof requestedWeek !== 'string' || !availableWeeks.includes(requestedWeek))) {
    return badRequest(res, 'Unknown campaign week');
  }
  const selectedWeek = requestedWeek ?? availableWeeks[0] ?? null;
  const missions = await prisma.missions.findMany({
    where: selectedWeek ? { Campaign_Week_Start: new Date(`${selectedWeek}T00:00:00.000Z`) } : { Mission_ID: -1 },
    include: { merchants: { include: { districts: { include: { provinces: true } } } }, _count: { select: { user_stamps: true } } },
    orderBy: [{ Start_DateTime: 'asc' }, { Mission_ID: 'asc' }],
  });
  const missingCharts = missions.filter(mission => !Array.isArray((mission.Selection_Evidence as { hourlySales?: unknown } | null)?.hourlySales));
  const charts = new Map<number, ReturnType<typeof hourlySales>>();
  if (selectedWeek && missingCharts.length) {
    const monday = new Date(`${selectedWeek}T00:00:00+07:00`);
    const periods = new Map(missingCharts.map(mission => {
      const savedEnd = (mission.Selection_Evidence as { periodEnd?: string } | null)?.periodEnd;
      const end = savedEnd ? new Date(savedEnd) : mission.Start_DateTime > monday
        ? new Date(`${bangkokDate(mission.Start_DateTime)}T00:00:00+07:00`)
        : new Date(monday.getTime() - 86_400_000);
      return [mission.Mission_ID, { start: new Date(end.getTime() - 14 * 86_400_000), end }] as const;
    }));
    const rows = await prisma.sales_transactions.findMany({
      where: { Merchant_ID: { in: [...new Set(missingCharts.map(mission => mission.Target_Merchant_ID))] }, Status: { in: ['COMPLETED', 'completed'] }, Tx_Timestamp: { gte: new Date(Math.min(...[...periods.values()].map(period => period.start.getTime()))), lt: new Date(Math.max(...[...periods.values()].map(period => period.end.getTime()))) } },
      select: { Merchant_ID: true, Tx_Timestamp: true, Total_Amount: true },
    });
    const salesByMerchant = new Map<number, typeof rows>();
    for (const row of rows) salesByMerchant.set(row.Merchant_ID, [...(salesByMerchant.get(row.Merchant_ID) ?? []), row]);
    for (const mission of missingCharts) {
      const period = periods.get(mission.Mission_ID)!;
      charts.set(mission.Mission_ID, hourlySales((salesByMerchant.get(mission.Target_Merchant_ID) ?? []).filter(sale => sale.Tx_Timestamp >= period.start && sale.Tx_Timestamp < period.end)));
    }
  }
  sendJson(res, { weeks: availableWeeks, selectedWeek, missions: missions.map(mission => ({
    id: mission.Mission_ID, merchantId: mission.Target_Merchant_ID, name: mission.Mission_Name, description: mission.Description,
    shopName: mission.merchants.Shop_Name, provinceName: mission.merchants.districts.provinces.Prov_Name,
    districtName: mission.merchants.districts.Dist_Name, start: mission.Start_DateTime, end: mission.End_DateTime,
    dailyStartMinute: mission.Daily_Start_Minute, dailyEndMinute: mission.Daily_End_Minute,
    recipients: mission._count.user_stamps, status: mission.Status, dailyStampLimit: mission.Ai_Daily_Stamp_Limit,
    evidence: { ...(mission.Selection_Evidence && typeof mission.Selection_Evidence === 'object' && !Array.isArray(mission.Selection_Evidence) ? mission.Selection_Evidence : {}), hourlySales: (mission.Selection_Evidence as { hourlySales?: unknown } | null)?.hourlySales ?? charts.get(mission.Mission_ID) ?? [] },
  })) });
});

adminRoutes.post('/weekly-ai-missions/refresh', async (_req, res) => {
  try {
    const created = await runWeeklyMissionAnalysis(new Date(), true);
    sendJson(res, { created });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Analysis failed';
    sendJson(res, { message }, message === 'Analysis is already running' ? 409 : message === 'No merchants qualify for a new analysis' ? 422 : 500);
  }
});

adminRoutes.post('/ai-mission-policy', async (req, res) => {
  const limit = req.body?.dailyStampLimit;
  if (!Number.isInteger(limit) || limit < 1 || limit > 2_147_483_647) return badRequest(res, 'dailyStampLimit must be a positive integer');
  const adminReq = req as import('../lib/auth').AuthRequest;
  const policy = await prisma.$transaction(async tx => {
    const saved = await tx.ai_mission_policy.create({ data: { Daily_Stamp_Limit: limit, Created_By: adminReq.user!.userId } });
    await tx.missions.updateMany({ where: { Campaign_Week_Start: { not: null }, Status: { in: ['ACTIVE', 'active', 'OPEN', 'open'] }, End_DateTime: { gt: new Date() } }, data: { Ai_Daily_Stamp_Limit: limit } });
    return saved;
  });
  sendJson(res, { dailyStampLimit: policy.Daily_Stamp_Limit, updatedAt: policy.Effective_From }, 201);
});

adminRoutes.get("/ai/analysis", async (_req, res) => {
  const analysis = await prisma.ai_sales_analysis.findMany({
    include: {
      merchants: true,
    },
    orderBy: {
      Analyzed_At: "desc",
    },
  });

  sendJson(res, analysis);
});

const merchantDetails = {
  districts: { include: { provinces: true } },
  users: { select: { User_ID: true, Name: true, Phone: true } },
} as const;

adminRoutes.get('/merchants', async (_req, res) => {
  const now = new Date();
  const monthStart = new Date(`${bangkokDate(now).slice(0, 7)}-01T00:00:00+07:00`);
  const [merchants, totals, monthly] = await Promise.all([
    prisma.merchants.findMany({ include: merchantDetails, orderBy: { Mch_ID: 'desc' } }),
    prisma.sales_transactions.groupBy({
      by: ['Merchant_ID'], where: { Status: { in: ['COMPLETED', 'completed'] }, Tx_Timestamp: { lt: now } },
      _sum: { Total_Amount: true }, _count: { _all: true }, _max: { Tx_Timestamp: true },
    }),
    prisma.sales_transactions.groupBy({
      by: ['Merchant_ID'], where: { Status: { in: ['COMPLETED', 'completed'] }, Tx_Timestamp: { gte: monthStart, lt: now } },
      _sum: { Total_Amount: true },
    }),
  ]);
  const byMerchant = new Map(totals.map(row => [row.Merchant_ID, row]));
  const monthlyByMerchant = new Map(monthly.map(row => [row.Merchant_ID, row]));
  sendJson(res, merchants.map(merchant => {
    const total = byMerchant.get(merchant.Mch_ID);
    return { ...merchant, income: {
      totalRevenue: Number(total?._sum.Total_Amount ?? 0),
      monthRevenue: Number(monthlyByMerchant.get(merchant.Mch_ID)?._sum.Total_Amount ?? 0),
      transactionCount: total?._count._all ?? 0,
      lastSaleAt: total?._max.Tx_Timestamp ?? null,
    } };
  }));
});

adminRoutes.patch('/merchants/:merchantId', async (req, res) => {
  const merchantId = Number(req.params.merchantId);
  if (!Number.isSafeInteger(merchantId) || merchantId < 1 || merchantId > 2_147_483_647) return badRequest(res, 'รหัสร้านค้าไม่ถูกต้อง');
  const body = req.body;
  const fields = ['Shop_Name', 'Owner_Name', 'Category', 'Dist_ID', 'Lat', 'Lng'];
  if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).length || Object.keys(body).some(key => !fields.includes(key))) {
    return badRequest(res, 'ข้อมูลร้านค้าไม่ถูกต้อง');
  }
  const { Shop_Name, Owner_Name, Category, Dist_ID, Lat, Lng } = body;
  const category = merchantCategory(Category);
  if (Shop_Name !== undefined && (typeof Shop_Name !== 'string' || !Shop_Name.trim() || Shop_Name.length > 200) ||
      Owner_Name !== undefined && Owner_Name !== null && (typeof Owner_Name !== 'string' || Owner_Name.length > 200) ||
      Category !== undefined && category === undefined ||
      Dist_ID !== undefined && (!Number.isSafeInteger(Dist_ID) || Dist_ID < 1 || Dist_ID > 2_147_483_647) ||
      Lat !== undefined && Lat !== null && (typeof Lat !== 'number' || !Number.isFinite(Lat) || Lat < -90 || Lat > 90) ||
      Lng !== undefined && Lng !== null && (typeof Lng !== 'number' || !Number.isFinite(Lng) || Lng < -180 || Lng > 180)) {
    return badRequest(res, 'กรุณาตรวจชื่อร้าน เจ้าของ ประเภท พื้นที่ และพิกัด');
  }
  if (!await prisma.merchants.findUnique({ where: { Mch_ID: merchantId }, select: { Mch_ID: true } })) return notFound(res, 'ไม่พบร้านค้า');
  if (Dist_ID !== undefined && !await prisma.districts.findUnique({ where: { Dist_ID }, select: { Dist_ID: true } })) return badRequest(res, 'ไม่พบอำเภอ / เขตที่เลือก');
  const merchant = await prisma.merchants.update({
    where: { Mch_ID: merchantId },
    data: { Shop_Name: Shop_Name?.trim(), Owner_Name: Owner_Name === undefined ? undefined : Owner_Name?.trim() || null, Category: category, Dist_ID, Lat, Lng },
    include: merchantDetails,
  });
  sendJson(res, merchant);
});

adminRoutes.get('/daily-mission-analyses', async (_req, res) => {
  const { analysisDate } = completedBangkokDay();
  const include = { provinces: { select: { Prov_Name: true } }, mission: { select: { Mission_ID: true, Mission_Name: true, Description: true, Start_DateTime: true, End_DateTime: true, Max_Recipients: true, Status: true } } } as const;
  const currentRows = await prisma.daily_mission_analyses.findMany({
    where: { Analysis_Date: analysisDate },
    include,
    orderBy: { Province_ID: 'asc' },
  });
  const previousReady = await prisma.daily_mission_analyses.findMany({
    where: { Status: 'READY', Analysis_Date: { lt: analysisDate }, mission: { isNot: null } },
    include,
    orderBy: { Analysis_Date: 'desc' },
    distinct: ['Province_ID'],
  });
  const byProvince = new Map(currentRows.map(row => [row.Province_ID, row]));
  for (const row of previousReady) {
    if (byProvince.get(row.Province_ID)?.Status !== 'READY') byProvince.set(row.Province_ID, row);
  }
  const rows = [...byProvince.values()].sort((a, b) => a.Province_ID - b.Province_ID);
  sendJson(res, { analysisDate: analysisDate.toISOString().slice(0, 10), rows: rows.map(row => ({
    analyzedDate: row.Analysis_Date.toISOString().slice(0, 10),
    provinceId: row.Province_ID,
    provinceName: row.provinces.Prov_Name,
    merchantId: row.Merchant_ID,
    shopName: row.Shop_Name,
    status: row.Status,
    message: row.Message,
    summary: row.Summary,
    suggestion: row.Suggestion,
    mission: row.mission ? { id: row.mission.Mission_ID, name: row.mission.Mission_Name, description: row.mission.Description, start: row.mission.Start_DateTime, end: row.mission.End_DateTime, quota: row.mission.Max_Recipients, status: row.mission.Status } : null,
    updatedAt: row.Updated_At,
  })) });
});

adminRoutes.post('/provinces/:provinceId/daily-mission-suggestion', async (req, res) => {
  const provinceId = toNumber(req.params.provinceId);
  if (!provinceId || !Number.isInteger(provinceId) || provinceId < 1) return badRequest(res, 'Invalid provinceId');
  const province = await prisma.provinces.findUnique({ where: { Prov_ID: provinceId } });
  if (!province) return notFound(res, 'Province not found');
  const merchants = await prisma.merchants.findMany({
    where: { districts: { is: { Prov_ID: provinceId } } },
    select: { Mch_ID: true, Shop_Name: true, Category: true },
  });
  if (!merchants.length) return sendJson(res, { message: 'จังหวัดนี้ยังไม่มีร้านค้า' }, 422);

  const merchantIds = merchants.map(merchant => merchant.Mch_ID);
  const completedDayStart = new Date(`${bangkokDate(new Date())}T00:00:00+07:00`);
  const latestSale = await prisma.sales_transactions.findFirst({
    where: { Merchant_ID: { in: merchantIds }, Status: { in: ['COMPLETED', 'completed'] }, Tx_Timestamp: { lt: completedDayStart } },
    orderBy: { Tx_Timestamp: 'desc' },
    select: { Tx_Timestamp: true },
  });
  if (!latestSale) return sendJson(res, { message: 'จังหวัดนี้ยังไม่มีบิลในวันที่จบแล้ว' }, 422);

  const analysisDate = bangkokDate(latestSale.Tx_Timestamp);
  const periodStart = new Date(`${analysisDate}T00:00:00+07:00`);
  const periodEnd = new Date(periodStart.getTime() + 86400000);
  const sales = await prisma.sales_transactions.findMany({
    where: { Merchant_ID: { in: merchantIds }, Status: { in: ['COMPLETED', 'completed'] }, Tx_Timestamp: { gte: periodStart, lt: periodEnd } },
    select: { Merchant_ID: true, Tx_Timestamp: true, Total_Amount: true },
  });
  const salesByMerchant = new Map<number, typeof sales>();
  for (const sale of sales) {
    const rows = salesByMerchant.get(sale.Merchant_ID) ?? [];
    rows.push(sale);
    salesByMerchant.set(sale.Merchant_ID, rows);
  }
  const candidates = merchants.flatMap(merchant => {
    const summary = summarizeSales(salesByMerchant.get(merchant.Mch_ID) ?? []);
    return summary.transactionCount >= 4 && eligibleMissionSlots(summary).length >= 2 ? [{ merchant, summary }] : [];
  });
  if (!candidates.length) return sendJson(res, { message: `วันที่ ${analysisDate} ไม่มีร้านที่มีอย่างน้อย 4 บิลและ 2 ช่วงเวลาขายที่เปรียบเทียบได้ในจังหวัดนี้` }, 422);

  const { merchant, summary } = candidates[Math.floor(Math.random() * candidates.length)];
  try {
    const suggestion = await suggestMission(merchant.Shop_Name, merchant.Category, summary, analysisDate);
    sendJson(res, { provinceId, provinceName: province.Prov_Name, analysisDate, merchantId: merchant.Mch_ID, shopName: merchant.Shop_Name, periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString(), summary, suggestion });
  } catch (error) {
    console.error('Daily mission suggestion failed', error);
    sendJson(res, { message: 'Ollama วิเคราะห์ไม่สำเร็จ ตรวจว่าเปิด Ollama และมีโมเดล qwen3:4b แล้ว' }, 502);
  }
});

adminRoutes.post('/merchants/:merchantId/mission-suggestion', async (req, res) => {
  const merchantId = toNumber(req.params.merchantId);
  if (!merchantId || !Number.isInteger(merchantId) || merchantId < 1) return badRequest(res, 'Invalid merchantId');
  const merchant = await prisma.merchants.findUnique({ where: { Mch_ID: merchantId } });
  if (!merchant) return notFound(res, 'Merchant not found');
  const periodEnd = new Date();
  const since = new Date(periodEnd.getTime() - 14 * 86400000);
  const sales = await prisma.sales_transactions.findMany({
    where: { Merchant_ID: merchantId, Status: { in: ['COMPLETED', 'completed'] }, Tx_Timestamp: { gte: since, lte: periodEnd } },
    select: { Tx_Timestamp: true, Total_Amount: true },
  });
  const summary = summarizeSales(sales);
  if (summary.daysWithSales < 5 || summary.transactionCount < 10 || summary.slots.length < 2) {
    return sendJson(res, { message: 'ต้องมีอย่างน้อย 10 บิลใน 5 วันที่ต่างกัน และอย่างน้อย 2 ช่วงเวลา จึงจะวิเคราะห์ได้' }, 422);
  }
  if (!eligibleMissionSlots(summary).length) {
    return sendJson(res, { message: 'ไม่มีช่วงขาย 2 ชั่วโมงที่อยู่ภายในเวลาบิลแรกถึงบิลสุดท้ายของช่วงวิเคราะห์' }, 422);
  }
  try {
    const suggestion = await suggestMission(merchant.Shop_Name, merchant.Category, summary);
    sendJson(res, { merchantId, shopName: merchant.Shop_Name, periodStart: since.toISOString(), periodEnd: periodEnd.toISOString(), summary, suggestion });
  } catch (error) {
    console.error('Mission suggestion failed', error);
    sendJson(res, { message: 'Ollama วิเคราะห์ไม่สำเร็จ ตรวจว่าเปิด Ollama และมีโมเดล qwen3:4b แล้ว' }, 502);
  }
});

adminRoutes.post("/missions", (_req, res) => {
  res.set('Allow', 'GET');
  sendJson(res, { message: 'ภารกิจสร้างจากผลวิเคราะห์รายวันเท่านั้น' }, 405);
});

adminRoutes.get("/missions", async (_req, res) => {
  const missions = await prisma.missions.findMany({
    include: {
      merchants: true,
      user_stamps: true,
    },
    orderBy: {
      Start_DateTime: "desc",
    },
  });

  sendJson(res, missions);
});

adminRoutes.get("/missions/:missionId", async (req, res) => {
  const missionId = toNumber(req.params.missionId);

  if (!missionId) {
    return badRequest(res, "Invalid missionId");
  }

  const mission = await prisma.missions.findUnique({
    where: {
      Mission_ID: missionId,
    },
    include: {
      merchants: true,
      user_stamps: true,
    },
  });

  if (!mission) {
    return notFound(res, "Mission not found");
  }

  sendJson(res, mission);
});

adminRoutes.patch("/missions/:missionId", async (req, res) => {
  const missionId = toNumber(req.params.missionId);

  if (!missionId || !Number.isInteger(missionId) || missionId < 1) {
    return badRequest(res, "Invalid missionId");
  }

  const {
    Mission_Name,
    Description,
    Target_Merchant_ID,
    Max_Recipients,
    Start_DateTime,
    End_DateTime,
    Status,
    Daily_Start_Minute,
    Daily_End_Minute,
  } = req.body;

  const current = await prisma.missions.findUnique({ where: { Mission_ID: missionId } });
  if (!current) return notFound(res, 'Mission not found');
  const start = Start_DateTime === undefined ? current.Start_DateTime : new Date(Start_DateTime);
  const end = End_DateTime === undefined ? current.End_DateTime : new Date(End_DateTime);
  if ((Mission_Name !== undefined && (typeof Mission_Name !== 'string' || !Mission_Name.trim() || Mission_Name.length > 200)) ||
      (Description !== undefined && typeof Description !== 'string') ||
      (Max_Recipients !== undefined && (!Number.isInteger(Max_Recipients) || Max_Recipients < 1 || Boolean(current.Campaign_Week_Start))) ||
      (Target_Merchant_ID !== undefined && (!Number.isInteger(Target_Merchant_ID) || Target_Merchant_ID < 1)) ||
      (Status !== undefined && (typeof Status !== 'string' || !Status.trim() || Status.length > 30)) ||
      (Daily_Start_Minute !== undefined && (!Number.isInteger(Daily_Start_Minute) || Daily_Start_Minute < 0 || Daily_Start_Minute >= 1440)) ||
      (Daily_End_Minute !== undefined && (!Number.isInteger(Daily_End_Minute) || Daily_End_Minute < 1 || Daily_End_Minute > 1440)) ||
      (current.Campaign_Week_Start && (Daily_End_Minute ?? current.Daily_End_Minute ?? 0) <= (Daily_Start_Minute ?? current.Daily_Start_Minute ?? 0)) ||
      !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
    return badRequest(res, 'Invalid mission details');
  }
  if (Max_Recipients !== undefined) {
    const recipients = await prisma.user_stamps.count({ where: { Mission_ID: missionId } });
    if (Max_Recipients < recipients) return badRequest(res, 'Recipient limit cannot be lower than the number already issued');
  }
  if (Target_Merchant_ID !== undefined && !await prisma.merchants.findUnique({ where: { Mch_ID: Target_Merchant_ID }, select: { Mch_ID: true } })) {
    return notFound(res, 'Merchant not found');
  }

  const mission = await prisma.missions.update({
    where: {
      Mission_ID: missionId,
    },
    data: {
      Mission_Name: Mission_Name === undefined ? undefined : Mission_Name.trim(),
      Description,
      Target_Merchant_ID,
      Max_Recipients,
      Start_DateTime: Start_DateTime === undefined ? undefined : start,
      End_DateTime: End_DateTime === undefined ? undefined : end,
      Status,
      Daily_Start_Minute,
      Daily_End_Minute,
    },
  });

  sendJson(res, mission);
});

const stampDetails = {
  districts: { include: { provinces: true } },
  _count: { select: { user_stamps: true } },
} as const;

adminRoutes.get('/stamps', async (_req, res) => {
  const districts = await prisma.districts.findMany({
    include: {
      provinces: true,
      district_stamps: { orderBy: { Stamp_ID: 'asc' }, select: { Stamp_Name: true, _count: { select: { user_stamps: true } } } },
    },
    orderBy: [{ Prov_ID: 'asc' }, { Dist_Name: 'asc' }],
  });
  sendJson(res, districts.map(district => ({
    districtId: district.Dist_ID,
    districtName: district.Dist_Name,
    provinceId: district.Prov_ID,
    provinceName: district.provinces.Prov_Name,
    stampName: district.district_stamps[0]?.Stamp_Name ?? `แสตมป์${district.Dist_Name}`,
    minSpend: Number(district.Stamp_Min_Spend),
    rewardCount: district.Stamp_Reward_Count,
    issuedCount: district.district_stamps.reduce((total, stamp) => total + stamp._count.user_stamps, 0),
  })));
});

adminRoutes.patch('/stamps/districts/:districtId', async (req, res) => {
  const districtId = toNumber(req.params.districtId);
  const { minSpend, rewardCount } = req.body ?? {};
  if (!districtId || !Number.isSafeInteger(districtId) || districtId <= 0) return badRequest(res, 'รหัสอำเภอไม่ถูกต้อง');
  if (typeof minSpend !== 'number' || !Number.isFinite(minSpend) || minSpend <= 0 || minSpend > 9999999999.99 || Math.abs(minSpend * 100 - Math.round(minSpend * 100)) > 0.0001) {
    return badRequest(res, 'ยอดขั้นต่ำต้องมากกว่า 0 และมีทศนิยมไม่เกิน 2 ตำแหน่ง');
  }
  if (!Number.isSafeInteger(rewardCount) || rewardCount < 1 || rewardCount > 100) return badRequest(res, 'จำนวนแสตมป์ต้องเป็นจำนวนเต็ม 1–100 ดวง');
  if (!await prisma.districts.findUnique({ where: { Dist_ID: districtId } })) return notFound(res, 'ไม่พบอำเภอ');
  const district = await prisma.districts.update({
    where: { Dist_ID: districtId }, data: { Stamp_Min_Spend: minSpend, Stamp_Reward_Count: rewardCount },
  });
  sendJson(res, { districtId: district.Dist_ID, minSpend: Number(district.Stamp_Min_Spend), rewardCount: district.Stamp_Reward_Count });
});

adminRoutes.post("/stamps", async (req, res) => {
  const { Stamp_Name, District_ID } = req.body ?? {};
  const name = typeof Stamp_Name === 'string' ? Stamp_Name.trim() : '';
  if (!name || name.length > 200) return badRequest(res, 'ชื่อแสตมป์ต้องมีความยาว 1–200 ตัวอักษร');
  if (!Number.isSafeInteger(District_ID) || District_ID <= 0) return badRequest(res, 'กรุณาเลือกอำเภอ / เขตที่ถูกต้อง');
  if (!await prisma.districts.findUnique({ where: { Dist_ID: District_ID } })) {
    return badRequest(res, 'ไม่พบอำเภอ / เขตที่เลือก');
  }

  const stamp = await prisma.district_stamps.create({
    data: {
      Stamp_Name: name,
      District_ID,
    },
    include: stampDetails,
  });

  sendJson(res, stamp, 201);
});

adminRoutes.patch("/stamps/:stampId", async (req, res) => {
  const stampId = toNumber(req.params.stampId);

  if (!stampId || !Number.isSafeInteger(stampId) || stampId <= 0) {
    return badRequest(res, "Invalid stampId");
  }

  const current = await prisma.district_stamps.findUnique({ where: { Stamp_ID: stampId } });
  if (!current) return notFound(res, 'ไม่พบแสตมป์');
  const { Stamp_Name, District_ID } = req.body ?? {};
  if (District_ID !== undefined && District_ID !== current.District_ID) {
    return badRequest(res, 'ไม่สามารถย้ายอำเภอของแสตมป์ได้ กรุณาสร้างแสตมป์สำหรับอำเภอใหม่');
  }
  const name = Stamp_Name === undefined ? current.Stamp_Name : typeof Stamp_Name === 'string' ? Stamp_Name.trim() : '';
  if (!name || name.length > 200) return badRequest(res, 'ชื่อแสตมป์ต้องมีความยาว 1–200 ตัวอักษร');

  const stamp = await prisma.district_stamps.update({
    where: {
      Stamp_ID: stampId,
    },
    data: {
      Stamp_Name: name,
    },
    include: stampDetails,
  });

  sendJson(res, stamp);
});

adminRoutes.get('/rewards', async (_req, res) => {
  const rewards = await prisma.rewards.findMany({ include: { provinces: true }, orderBy: { Reward_ID: 'desc' } });
  sendJson(res, rewards);
});

adminRoutes.get('/rewards/provinces', async (_req, res) => {
  const provinces = await prisma.provinces.findMany({
    select: { Prov_ID: true, Prov_Name: true, _count: { select: { districts: true } } },
    orderBy: { Prov_Name: 'asc' },
  });
  sendJson(res, provinces.map(province => ({
    id: province.Prov_ID, name: province.Prov_Name, districtCount: province._count.districts,
    requiredStampCount: requiredDistrictStamps(province._count.districts),
  })));
});

function validWebUrl(value: unknown) {
  if (value == null || value === '') return true;
  if (typeof value !== 'string' || value.length > 2048) return false;
  try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; }
}

async function rewardInput(body: Record<string, unknown>, current?: { Reward_Name: string; Reward_Type: string | null; Province_ID: number | null; Source_URL: string | null; Required_Stamp_Count: number; Status: string }) {
  const type = body.Reward_Type === undefined ? current?.Reward_Type : body.Reward_Type;
  const name = body.Reward_Name === undefined ? current?.Reward_Name : body.Reward_Name;
  const provinceId = body.Province_ID === undefined ? current?.Province_ID : Number(body.Province_ID);
  const sourceUrl = body.Source_URL === undefined ? current?.Source_URL : body.Source_URL;
  if (typeof name !== 'string' || !name.trim() || name.length > 200 ||
      !validWebUrl(body.Image_URL) || !validWebUrl(sourceUrl) ||
      (type === 'OTOP_PRODUCT' && (!Number.isInteger(provinceId) || !provinceId))) return null;
  const districtCount = type === 'OTOP_PRODUCT' ? await prisma.districts.count({ where: { Prov_ID: provinceId! } }) : 0;
  if (type === 'OTOP_PRODUCT' && !districtCount) return null;
  const required = body.Required_Stamp_Count === undefined
    ? current?.Required_Stamp_Count ?? (type === 'OTOP_PRODUCT' ? requiredDistrictStamps(districtCount) : undefined)
    : body.Required_Stamp_Count;
  if (typeof required !== 'number' || !Number.isInteger(required) || required < 1 || required > 2_147_483_647 ||
      (type === 'OTOP_PRODUCT' && required > districtCount)) return null;
  return {
    Reward_Name: name.trim(), Reward_Type: type as string | null | undefined,
    Description: body.Description as string | null | undefined,
    Required_Stamp_Count: required, Status: (body.Status ?? current?.Status ?? 'ACTIVE') as string,
    Province_ID: type === 'OTOP_PRODUCT' ? provinceId : null,
    Image_URL: (body.Image_URL || null) as string | null,
    Source_URL: (sourceUrl || null) as string | null,
  };
}

adminRoutes.post('/rewards', async (req, res) => {
  const data = await rewardInput(req.body);
  if (!data) return badRequest(res, 'Invalid reward, province or image/source URL');
  sendJson(res, await prisma.rewards.create({ data: { ...data, Reward_Type: data.Reward_Type ?? null } }), 201);
});

adminRoutes.patch('/rewards/:rewardId', async (req, res) => {
  const rewardId = toNumber(req.params.rewardId);
  if (!rewardId || !Number.isInteger(rewardId)) return badRequest(res, 'Invalid rewardId');
  const current = await prisma.rewards.findUnique({ where: { Reward_ID: rewardId } });
  if (!current) return notFound(res, 'Reward not found');
  const data = await rewardInput(req.body, current);
  if (!data) return badRequest(res, 'Invalid reward, province or image/source URL');
  sendJson(res, await prisma.rewards.update({ where: { Reward_ID: rewardId }, data: {
    ...data,
    Description: req.body.Description === undefined ? undefined : data.Description,
    Status: req.body.Status === undefined ? undefined : data.Status,
    Image_URL: req.body.Image_URL === undefined ? undefined : data.Image_URL,
  } }));
});
