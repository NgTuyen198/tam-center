'use client';

import { actionTypeBadge, roleBadge } from '@/lib/status';
import type { ActivityLog } from '@/lib/types';

interface LogTableProps {
  logs: ActivityLog[];
  /** Hiển thị cột Người dùng + Vai trò (cho Admin/Staff) */
  showUser?: boolean;
}

/** Bảng nhật ký dùng chung cho mọi dashboard (đồng bộ sáng/tối) */
export default function LogTable({ logs, showUser = false }: LogTableProps) {
  const colSpan = showUser ? 5 : 3;

  return (
    <div className="flex-1 bg-surface rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col min-h-0">
      <div className="overflow-y-auto flex-1">
        <table className="w-full text-left relative">
          <thead className="bg-slate-50 dark:bg-slate-800/70 sticky top-0 z-10 backdrop-blur">
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="p-4 text-slate-500 dark:text-slate-400 font-bold text-sm">Thời gian</th>
              {showUser && <th className="p-4 text-slate-500 dark:text-slate-400 font-bold text-sm">Người thao tác</th>}
              {showUser && <th className="p-4 text-slate-500 dark:text-slate-400 font-bold text-sm">Vai trò</th>}
              <th className="p-4 text-slate-500 dark:text-slate-400 font-bold text-sm">Loại lệnh</th>
              <th className="p-4 text-slate-500 dark:text-slate-400 font-bold text-sm">Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                <td className="p-4 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">{new Date(log.created_at).toLocaleString('vi-VN')}</td>
                {showUser && <td className="p-4 font-bold text-foreground whitespace-nowrap">{log.profiles?.full_name || 'Hệ Thống'}</td>}
                {showUser && (
                  <td className="p-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-bold rounded uppercase tracking-wider ${roleBadge(log.role)}`}>{log.role}</span>
                  </td>
                )}
                <td className="p-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-widest ${actionTypeBadge(log.action_type)}`}>{log.action_type}</span>
                </td>
                <td className="p-4 text-sm text-slate-700 dark:text-slate-300">{log.description}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="text-center py-10 text-slate-500 dark:text-slate-400">Chưa có bản ghi hoạt động nào.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
