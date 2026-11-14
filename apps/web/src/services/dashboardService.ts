import { request } from './request';
import type { DashboardSummary } from '../types/dashboard';

export const dashboardService = {
  /** from/to dạng YYYY-MM-DD (ngày giờ Việt Nam). Bỏ trống = 30 ngày gần nhất. */
  layTongQuan: (q: { from?: string; to?: string; lowStock?: number } = {}) => {
    const p = new URLSearchParams();
    if (q.from) p.set('from', q.from);
    if (q.to) p.set('to', q.to);
    if (q.lowStock !== undefined) p.set('lowStock', String(q.lowStock));
    const qs = p.toString();
    return request<DashboardSummary>(`/dashboard/summary${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },
};
