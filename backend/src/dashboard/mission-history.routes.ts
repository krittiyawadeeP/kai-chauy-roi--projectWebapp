import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { badRequest, sendJson } from '../lib/http';
import { bangkokDate } from '../lib/sales-mission';
import { buildMissionHistory, missionDay } from './mission-history';

export const missionHistoryRoutes = Router();

missionHistoryRoutes.get('/', async (req, res) => {
  const now = new Date();
  const date = req.query.date === undefined ? bangkokDate(now) : req.query.date;
  const scope = req.query.scope ?? (req.query.date === undefined ? 'plan' : 'day');
  if (scope !== 'plan' && scope !== 'day') return badRequest(res, 'scope must be plan or day');
  if (typeof date !== 'string') return badRequest(res, 'date must be YYYY-MM-DD');
  const day = missionDay(date);
  if (!day) return badRequest(res, 'date must be a valid YYYY-MM-DD date');
  const stampsUntil = scope === 'day' ? new Date(Math.min(now.getTime(), day.end.getTime())) : now;
  const missions = await prisma.missions.findMany({
    where: {
      OR: [{ Daily_Analysis_ID: { not: null } }, { Campaign_Week_Start: { not: null } }],
      ...(scope === 'plan'
        ? { Status: { in: ['ACTIVE', 'active', 'OPEN', 'open'] }, Start_DateTime: { lte: now }, End_DateTime: { gt: now } }
        : { Start_DateTime: { lt: day.end }, End_DateTime: { gt: day.start } }),
    },
    include: {
      merchants: { select: { Shop_Name: true, districts: { select: { provinces: { select: { Prov_Name: true } } } } } },
      daily_mission_analysis: { select: { Analysis_Date: true, provinces: { select: { Prov_Name: true } } } },
      _count: { select: { user_stamps: { where: { Earned_At: { ...(scope === 'day' ? { gte: day.start } : {}), lt: stampsUntil } } } } },
    },
    orderBy: [{ Start_DateTime: 'asc' }, { Mission_ID: 'asc' }],
  });
  if (!missions.length) return sendJson(res, buildMissionHistory(date, [], [], [], now, scope));
  const merchantIds = [...new Set(missions.map(mission => mission.Target_Merchant_ID))];
  const from = new Date((scope === 'day' ? day.start.getTime() : Math.min(...missions.map(mission => missionDay(bangkokDate(mission.Start_DateTime))!.start.getTime()))) - 28 * 86_400_000);
  const to = new Date(Math.min(now.getTime(), scope === 'day' ? day.end.getTime() : Math.max(...missions.map(mission => mission.End_DateTime.getTime()))));
  const [sales, windows] = await Promise.all([
    from < to ? prisma.sales_transactions.findMany({
      where: { Merchant_ID: { in: merchantIds }, Status: { in: ['COMPLETED', 'completed'] }, Tx_Timestamp: { gte: from, lt: to } },
      select: { Merchant_ID: true, Tx_Timestamp: true, Total_Amount: true },
    }) : [],
    prisma.missions.findMany({
      where: { Target_Merchant_ID: { in: merchantIds }, Start_DateTime: { lt: new Date(Math.max(...missions.map(mission => mission.End_DateTime.getTime()))) }, End_DateTime: { gt: from } },
      select: { Mission_ID: true, Target_Merchant_ID: true, Start_DateTime: true, End_DateTime: true, Status: true },
    }),
  ]);
  sendJson(res, buildMissionHistory(date, missions, sales, windows, now, scope));
});
