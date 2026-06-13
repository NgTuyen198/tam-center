'use client';

import { useState, useEffect } from 'react';
import { Star, X } from 'lucide-react';
import { submitTeacherReview, getMyReview } from '@/app/actions/reviewActions';

interface ReviewModalProps {
  classId: string;
  teacherName: string;
  courseName: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function ReviewModal({ classId, teacherName, courseName, onClose, onSaved }: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const existing = await getMyReview(classId);
        if (existing) {
          setRating(existing.rating);
          setComment(existing.comment || '');
        }
      } catch {
        // bỏ qua, coi như chưa đánh giá
      }
      setLoading(false);
    })();
  }, [classId]);

  const handleSubmit = async () => {
    if (rating === 0) { setError('Vui lòng chọn số sao đánh giá.'); return; }
    setSaving(true); setError('');
    try {
      await submitTeacherReview(classId, rating, comment);
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  const labels = ['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Tuyệt vời'];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-surface rounded-3xl w-full max-w-md shadow-2xl zoom-in">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-foreground">Đánh Giá Giáo Viên</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={24} /></button>
        </div>

        <div className="p-6">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 mb-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">Giáo viên: <span className="font-bold text-foreground">{teacherName}</span></p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Lớp: <span className="font-bold text-blue-600 dark:text-blue-400">{courseName}</span></p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">* Đánh giá của bạn được bảo mật, chỉ dùng để cải thiện chất lượng giảng dạy.</p>
          </div>

          {loading ? (
            <div className="text-center py-8 text-slate-400">Đang tải...</div>
          ) : (
            <>
              <div className="flex flex-col items-center mb-6">
                <div className="flex gap-2 mb-2">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button
                      key={s}
                      type="button"
                      onMouseEnter={() => setHover(s)}
                      onMouseLeave={() => setHover(0)}
                      onClick={() => setRating(s)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        size={40}
                        className={(hover || rating) >= s ? 'text-yellow-400' : 'text-slate-300 dark:text-slate-600'}
                        fill={(hover || rating) >= s ? 'currentColor' : 'none'}
                      />
                    </button>
                  ))}
                </div>
                <span className="text-sm font-bold text-yellow-500 h-5">{labels[hover || rating]}</span>
              </div>

              <textarea
                rows={4}
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Chia sẻ cảm nhận của bạn về giáo viên (không bắt buộc)..."
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-foreground rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-500 resize-none mb-2"
              />

              {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

              <button
                onClick={handleSubmit}
                disabled={saving}
                className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition shadow-lg disabled:bg-red-400 mt-2"
              >
                {saving ? 'Đang gửi...' : 'Gửi Đánh Giá'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
