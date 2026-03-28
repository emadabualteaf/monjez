import React, { useState } from 'react';
import { Flag } from 'lucide-react';
import { Button } from '@/components/ui';

interface ReportButtonProps {
  targetType: 'job' | 'user';
  targetId: number;
  label?: string;
}

const REASONS = {
  job: [
    'محتوى احتيالي / תוכן מטעה',
    'راتب غير واقعي / שכר לא ריאלי',
    'محتوى مسيء / תוכן פוגעני',
    'وظيفة مكررة / משרה כפולה',
    'أخرى / אחר',
  ],
  user: [
    'سلوك غير لائق / התנהגות בלתי הולמת',
    'معلومات مزيفة / מידע מזויף',
    'احتيال / הונאה',
    'أخرى / אחר',
  ],
};

export function ReportButton({ targetType, targetId, label }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason) return;
    setLoading(true);
    try {
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId, reason }),
      });
      setSent(true);
      setTimeout(() => { setOpen(false); setSent(false); setReason(''); }, 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors py-1 px-2 rounded-lg hover:bg-destructive/10"
      >
        <Flag className="w-3.5 h-3.5" />
        {label || 'بلّغ / דווח'}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            {sent ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">✅</div>
                <p className="font-bold text-green-700">تم إرسال البلاغ</p>
                <p className="text-sm text-muted-foreground">سيراجعه فريقنا قريباً</p>
              </div>
            ) : (
              <>
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Flag className="w-5 h-5 text-destructive" />
                  الإبلاغ عن {targetType === 'job' ? 'وظيفة' : 'مستخدم'}
                </h3>
                <div className="space-y-2 mb-5">
                  {REASONS[targetType].map((r) => (
                    <label key={r} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${reason === r ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                      <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="accent-primary" />
                      <span className="text-sm">{r}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>إلغاء</Button>
                  <Button className="flex-1" onClick={handleSubmit} isLoading={loading} disabled={!reason}>إرسال</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
