import { useState } from 'react';
import type { HourlySalesPoint } from '../../../../shared/mission-history';

const amount = (value: number) => value.toLocaleString('th-TH', { maximumFractionDigits: 2 });
const hourLabel = (hour: number) => `${String(hour).padStart(2, '0')}:00`;

export function HourlySalesChart({ points, label, caption, showOverlap = false }: { points: HourlySalesPoint[]; label: string; caption: string; showOverlap?: boolean }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const maximum = Math.max(1, ...points.map(point => point.revenue ?? 0));
  const hours: HourlySalesPoint[] = Array.from({ length: 24 }, (_, hour) => points.find(point => point.hour === hour) ?? { hour, revenue: null, mission: false });
  const maximumOverlap = Math.max(1, ...points.map(point => point.missionCount ?? 0));
  const describe = (point: HourlySalesPoint) => `${hourLabel(point.hour)}–${hourLabel(point.hour + 1)} · ${point.revenue == null ? 'ไม่มีข้อมูลบิล' : `${amount(point.revenue)} บาท`}${point.mission ? showOverlap ? ` · ภารกิจ ${point.missionCount ?? 1} ร้าน` : ' · ชั่วโมงภารกิจ' : ''}`;
  return <figure aria-label={label} className="min-w-0">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
      <div className="flex gap-4"><span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-slate-400" />ยอดขาย (บาท)</span><span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-amber-500" />ชั่วโมงภารกิจ</span></div>
      <span aria-live="polite">{hovered == null ? 'ชี้แท่งกราฟเพื่อดูยอดขาย' : describe(hours[hovered])}</span>
    </div>
    {showOverlap && <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-amber-800"><span>ภารกิจซ้อนในชั่วโมงเดียวกัน</span><span>1 ร้าน</span><span className="h-2.5 w-24 rounded bg-gradient-to-r from-amber-100 to-amber-500" /><span>{maximumOverlap} ร้าน</span><span className="text-slate-500">ยิ่งซ้อนหลายร้าน สีไฮไลต์ยิ่งเข้ม</span></div>}
    <div className="overflow-x-auto" onMouseLeave={() => setHovered(null)}>
      <svg viewBox="0 0 960 300" className="w-full min-w-[700px]" role="img" aria-label={label}>
        {[0, 1, 2, 3, 4].map(step => {
          const y = 250 - step * 54;
          return <g key={step}><line x1="64" x2="952" y1={y} y2={y} stroke="#e2e8f0" strokeDasharray={step ? '3 4' : undefined} /><text x="56" y={y + 4} textAnchor="end" fontSize="10" fill="#64748b">{amount(maximum * step / 4)}</text></g>;
        })}
        {hours.map(point => {
          const x = 64 + point.hour * 37;
          const height = (point.revenue ?? 0) / maximum * 216;
          return <g key={point.hour} tabIndex={0} aria-label={describe(point)} onMouseEnter={() => setHovered(point.hour)} onFocus={() => setHovered(point.hour)} onBlur={() => setHovered(null)}>
            <title>{describe(point)}</title>
            <rect x={x + 1} y="27" width="35" height="223" rx="3" fill={point.mission ? showOverlap ? '#f59e0b' : '#fef3c7' : 'transparent'} fillOpacity={showOverlap && point.mission ? 0.14 + 0.56 * (point.missionCount ?? 1) / maximumOverlap : 1} />
            <rect x={x + 8} y={250 - Math.max(height, 1)} width="22" height={Math.max(height, 1)} rx="3" fill={point.mission ? '#d99a22' : '#94a3b8'} opacity={point.revenue == null ? 0.25 : 1} stroke={hovered === point.hour ? '#334155' : 'none'} />
            <text x={x + 19} y="271" textAnchor="middle" fontSize="11" fill={point.mission ? '#92400e' : '#64748b'} fontWeight={point.mission ? 700 : 400}>{String(point.hour).padStart(2, '0')}</text>
          </g>;
        })}
        <text x="952" y="293" textAnchor="end" fontSize="10" fill="#64748b">ชั่วโมง (เวลาไทย)</text>
      </svg>
    </div>
    <figcaption className="mt-2 text-[11px] leading-5 text-slate-500">{caption}</figcaption>
  </figure>;
}
