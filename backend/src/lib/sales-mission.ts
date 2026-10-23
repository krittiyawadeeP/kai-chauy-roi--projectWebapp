export type SaleForAnalysis = { Tx_Timestamp: Date; Total_Amount: { toString(): string } };

const bangkok = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
  weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

export function bangkokDate(date: Date) {
  const parts = Object.fromEntries(bangkok.formatToParts(date).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function summarizeSales(sales: SaleForAnalysis[]) {
  const days = new Set<string>();
  const buckets = new Map<string, { dayType: string; startHour: number; dates: Set<string>; revenue: number; transactions: number }>();
  let firstBillMinute = Infinity;
  let lastBillMinute = -Infinity;
  for (const sale of sales) {
    const parts = Object.fromEntries(bangkok.formatToParts(sale.Tx_Timestamp).map(part => [part.type, part.value]));
    const date = `${parts.year}-${parts.month}-${parts.day}`;
    const dayType = ['Sat', 'Sun'].includes(parts.weekday) ? 'weekend' : 'weekday';
    const startHour = Math.floor(Number(parts.hour) / 2) * 2;
    const billMinute = Number(parts.hour) * 60 + Number(parts.minute);
    firstBillMinute = Math.min(firstBillMinute, billMinute);
    lastBillMinute = Math.max(lastBillMinute, billMinute);
    const key = `${dayType}-${startHour}`;
    const bucket = buckets.get(key) ?? { dayType, startHour, dates: new Set<string>(), revenue: 0, transactions: 0 };
    bucket.dates.add(date);
    bucket.revenue += Number(sale.Total_Amount);
    bucket.transactions++;
    buckets.set(key, bucket);
    days.add(date);
  }
  return {
    transactionCount: sales.length,
    daysWithSales: days.size,
    observedOpeningTime: Number.isFinite(firstBillMinute) ? `${String(Math.floor(firstBillMinute / 60)).padStart(2, '0')}:${String(firstBillMinute % 60).padStart(2, '0')}` : null,
    observedClosingTime: Number.isFinite(lastBillMinute) ? `${String(Math.floor(lastBillMinute / 60)).padStart(2, '0')}:${String(lastBillMinute % 60).padStart(2, '0')}` : null,
    slots: [...buckets.values()].map(bucket => ({
      dayType: bucket.dayType,
      startHour: bucket.startHour,
      endHour: bucket.startHour + 2,
      daysWithSales: bucket.dates.size,
      transactionCount: bucket.transactions,
      totalRevenue: Math.round(bucket.revenue * 100) / 100,
      averageRevenueOnDaysWithSales: Math.round(bucket.revenue / bucket.dates.size * 100) / 100,
    })).sort((a, b) => a.dayType.localeCompare(b.dayType) || a.startHour - b.startHour),
  };
}

export type MissionSuggestion = {
  dayType: 'weekday' | 'weekend'; startHour: number; endHour: number;
  reason: string; missionName: string; description: string;
};

export function eligibleMissionSlots(summary: ReturnType<typeof summarizeSales>) {
  if (!summary.observedOpeningTime || !summary.observedClosingTime) return [];
  const [openHour, openMinute] = summary.observedOpeningTime.split(':').map(Number);
  const [closeHour, closeMinute] = summary.observedClosingTime.split(':').map(Number);
  const open = openHour * 60 + openMinute;
  const close = closeHour * 60 + closeMinute;
  return summary.slots.filter(slot => slot.startHour * 60 >= open && slot.endHour * 60 <= close);
}

export async function suggestMission(shopName: string, category: string | null, summary: ReturnType<typeof summarizeSales>, analysisDate?: string): Promise<MissionSuggestion> {
  const eligibleSlots = eligibleMissionSlots(summary);
  if (!eligibleSlots.length) throw new Error('No observed two-hour sales slot fits inside the bill-time range');
  const response = await fetch('http://127.0.0.1:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(120000),
    body: JSON.stringify({
      model: 'qwen3:4b', stream: false, think: false,
      messages: [{ role: 'user', content: `You advise Thai community shops. Recommend one low-sales 2-hour slot for a single future mission. Choose dayType, startHour and endHour exactly from one supplied eligible slot. ${analysisDate ? 'These bills are from one completed Bangkok day; compare slots only within that day.' : 'These bills cover 14 days.'} Each eligible slot has sales and fits fully between the earliest and latest bill times of day in this analysis period. Those bill times are not official business hours. Do not infer zero sales from missing slots. Do not invent numbers. Write reason, missionName and description in Thai; do not promise a discount, stamp or minimum spend because those are not configured. Return JSON. Data: ${JSON.stringify({ shopName, category, analysisDate, periodDays: analysisDate ? 1 : 14, observedOpeningTime: summary.observedOpeningTime, observedClosingTime: summary.observedClosingTime, slots: eligibleSlots })}` }],
      format: {
        type: 'object',
        properties: {
          dayType: { type: 'string', enum: ['weekday', 'weekend'] },
          startHour: { type: 'integer' }, endHour: { type: 'integer' },
          reason: { type: 'string' }, missionName: { type: 'string' }, description: { type: 'string' },
        },
        required: ['dayType', 'startHour', 'endHour', 'reason', 'missionName', 'description'],
      },
      options: { temperature: 0 },
    }),
  });
  if (!response.ok) throw new Error(`Ollama request failed (${response.status})`);
  const body = await response.json() as { message?: { content?: string } };
  const text = body.message?.content;
  if (!text) throw new Error('Ollama returned no suggestion');
  const suggestion = JSON.parse(text) as MissionSuggestion;
  if (!eligibleSlots.some(slot => slot.dayType === suggestion.dayType && slot.startHour === suggestion.startHour && slot.endHour === suggestion.endHour)) {
    throw new Error('Ollama suggested a time outside the eligible sales slots');
  }
  if (![suggestion.reason, suggestion.missionName, suggestion.description].every(value => typeof value === 'string' && value.trim().length > 0)) {
    throw new Error('Ollama returned an incomplete suggestion');
  }
  return suggestion;
}
