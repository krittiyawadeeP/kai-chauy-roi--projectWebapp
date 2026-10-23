import { Router } from "express";

import { requireAdmin } from "../lib/auth";
import { badRequest, notFound, sendJson, toNumber } from "../lib/http";
import { prisma } from "../lib/prisma";
import { dashboardRoutes } from "../dashboard/dashboard.routes";
import { grantRoutes } from "../grants/grants.routes";
import { policyRoutes } from "../policy/policy.routes";
import { bangkokDate, eligibleMissionSlots, suggestMission, summarizeSales } from "../lib/sales-mission";
import { completedBangkokDay } from "../lib/daily-mission-job";

export const adminRoutes = Router();

adminRoutes.use(requireAdmin);
adminRoutes.use("/dashboard", dashboardRoutes);
adminRoutes.use("/grants", grantRoutes);
adminRoutes.use("/policy", policyRoutes);

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

adminRoutes.get("/merchants", async (_req, res) => {
  const merchants = await prisma.merchants.findMany({
    include: {
      districts: { include: { provinces: true } },
      users: true,
      ai_sales_analysis: {
        orderBy: {
          Analyzed_At: "desc",
        },
        take: 1,
      },
    },
  });

  sendJson(res, merchants);
});

adminRoutes.get('/daily-mission-analyses', async (_req, res) => {
  const { analysisDate } = completedBangkokDay();
  const rows = await prisma.daily_mission_analyses.findMany({
    where: { Analysis_Date: analysisDate },
    include: { provinces: { select: { Prov_Name: true } }, mission: { select: { Mission_ID: true, Start_DateTime: true, End_DateTime: true, Max_Recipients: true, Status: true } } },
    orderBy: { Province_ID: 'asc' },
  });
  sendJson(res, { analysisDate: analysisDate.toISOString().slice(0, 10), rows: rows.map(row => ({
    provinceId: row.Province_ID,
    provinceName: row.provinces.Prov_Name,
    merchantId: row.Merchant_ID,
    shopName: row.Shop_Name,
    status: row.Status,
    message: row.Message,
    summary: row.Summary,
    suggestion: row.Suggestion,
    mission: row.mission ? { id: row.mission.Mission_ID, start: row.mission.Start_DateTime, end: row.mission.End_DateTime, quota: row.mission.Max_Recipients, status: row.mission.Status } : null,
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

adminRoutes.post("/missions", async (req, res) => {
  const {
    Mission_Name,
    Description,
    Target_Merchant_ID,
    Max_Recipients,
    Start_DateTime,
    End_DateTime,
    Status,
  } = req.body;

  if (!Mission_Name || !Target_Merchant_ID || !Max_Recipients || !Start_DateTime || !End_DateTime) {
    return badRequest(
      res,
      "Mission_Name, Target_Merchant_ID, Max_Recipients, Start_DateTime, and End_DateTime are required",
    );
  }

  const start = new Date(Start_DateTime);
  const end = new Date(End_DateTime);
  if (!Number.isInteger(Target_Merchant_ID) || !Number.isInteger(Max_Recipients) || Max_Recipients < 1 ||
      !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
    return badRequest(res, 'Invalid merchant, recipient limit or mission time');
  }

  const merchant = await prisma.merchants.findUnique({ where: { Mch_ID: Target_Merchant_ID }, select: { Mch_ID: true } });
  if (!merchant) return notFound(res, 'Merchant not found');

  const mission = await prisma.missions.create({
    data: {
      Mission_Name,
      Description,
      Target_Merchant_ID,
      Max_Recipients,
      Start_DateTime: start,
      End_DateTime: end,
      Status: Status ?? "ACTIVE",
    },
  });

  sendJson(res, mission, 201);
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

  if (!missionId) {
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
  } = req.body;

  const mission = await prisma.missions.update({
    where: {
      Mission_ID: missionId,
    },
    data: {
      Mission_Name,
      Description,
      Target_Merchant_ID,
      Max_Recipients,
      Start_DateTime: Start_DateTime ? new Date(Start_DateTime) : undefined,
      End_DateTime: End_DateTime ? new Date(End_DateTime) : undefined,
      Status,
    },
  });

  sendJson(res, mission);
});

adminRoutes.post("/stamps", async (req, res) => {
  const { Stamp_Name, District_ID } = req.body;

  if (!Stamp_Name || !District_ID) {
    return badRequest(res, "Stamp_Name and District_ID are required");
  }

  const stamp = await prisma.district_stamps.create({
    data: {
      Stamp_Name,
      District_ID,
    },
  });

  sendJson(res, stamp, 201);
});

adminRoutes.patch("/stamps/:stampId", async (req, res) => {
  const stampId = toNumber(req.params.stampId);

  if (!stampId) {
    return badRequest(res, "Invalid stampId");
  }

  const { Stamp_Name, District_ID } = req.body;

  const stamp = await prisma.district_stamps.update({
    where: {
      Stamp_ID: stampId,
    },
    data: {
      Stamp_Name,
      District_ID,
    },
  });

  sendJson(res, stamp);
});

adminRoutes.post("/rewards", async (req, res) => {
  const { Reward_Name, Reward_Type, Description, Required_Stamp_Count, Status } = req.body;

  if (!Reward_Name || Required_Stamp_Count === undefined) {
    return badRequest(res, "Reward_Name and Required_Stamp_Count are required");
  }

  const reward = await prisma.rewards.create({
    data: {
      Reward_Name,
      Reward_Type,
      Description,
      Required_Stamp_Count,
      Status: Status ?? "ACTIVE",
    },
  });

  sendJson(res, reward, 201);
});

adminRoutes.patch("/rewards/:rewardId", async (req, res) => {
  const rewardId = toNumber(req.params.rewardId);

  if (!rewardId) {
    return badRequest(res, "Invalid rewardId");
  }

  const { Reward_Name, Reward_Type, Description, Required_Stamp_Count, Status } = req.body;

  const reward = await prisma.rewards.update({
    where: {
      Reward_ID: rewardId,
    },
    data: {
      Reward_Name,
      Reward_Type,
      Description,
      Required_Stamp_Count,
      Status,
    },
  });

  sendJson(res, reward);
});
