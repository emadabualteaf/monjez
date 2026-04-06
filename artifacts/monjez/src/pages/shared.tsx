import React, { useState } from 'react';
import { useGetCreditBalance, getGetCreditBalanceQueryKey, useUpdateMe, getGetMeQueryKey } from '@workspace/api-client-react';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/lib/i18n';
import { Card, Button, Input, Textarea } from '@/components/ui';
import { Coins, Zap, ShieldCheck, Bell, BellDot, CheckCheck, User, Edit2, Save, X } from 'lucide-react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';

// ─── Credits Page ──────────────────────────────────────────────────────────────

export function CreditsPage() {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const { data: credits, refetch } = useGetCreditBalance();
  const [loading, setLoading] = useState<number | null>(null);

  // Check if returned from Stripe success
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === '1') {
      const amount = parseInt(params.get('amount') || '0');
      if (amount) {
        // Confirm purchase in demo mode
        const token = localStorage.getItem('monjez_token');
        fetch('/api/credits/confirm-purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ amount }),
        }).then(() => refetch());
      }
      window.history.replaceState({}, '', '/credits');
    }
  }, []);

  const packages = [
    { amount: 10, price: 50, popular: false },
    { amount: 50, price: 200, popular: true },
    { amount: 100, price: 350, popular: false },
  ];

  const handleBuy = async (amount: number) => {
    setLoading(amount);
    try {
      const token = localStorage.getItem('monjez_token');
      const res = await fetch('/api/credits/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.demo) {
        // Demo mode — already credited
        refetch();
        alert(`✅ تم إضافة ${amount} رصيد (وضع التجربة)`);
      }
    } catch (e) {
      alert('حدث خطأ في الدفع');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4 mb-12">
        <div className="inline-flex items-center justify-center p-4 bg-accent/10 rounded-full mb-2">
          <Coins className="w-12 h-12 text-accent" />
        </div>
        <h1 className="text-4xl font-bold text-primary">{t('buyCredits')}</h1>
        <p className="text-xl text-muted-foreground">
          رصيدك الحالي: <span className="font-bold text-foreground">{credits?.balance || 0}</span>
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {packages.map((pkg, i) => (
          <Card key={i} className={`relative p-8 flex flex-col text-center transition-all hover:shadow-xl hover:-translate-y-1 ${pkg.popular ? 'border-accent shadow-lg shadow-accent/10 ring-2 ring-accent/20' : ''}`}>
            {pkg.popular && (
              <div className="absolute -top-3 inset-x-0 flex justify-center">
                <span className="bg-accent text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">الأكثر مبيعاً</span>
              </div>
            )}
            <div className="mb-6 space-y-2">
              <h3 className="text-5xl font-bold text-primary">{pkg.amount}</h3>
              <p className="text-muted-foreground font-medium uppercase">رصيد</p>
            </div>
            <div className="text-3xl font-bold mb-8">
              {pkg.price} <span className="text-lg text-muted-foreground font-normal">₪</span>
            </div>
            <ul className="space-y-3 mb-8 text-sm text-right flex-1">
              <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-accent" /> ترويج الوظائف للقمة</li>
              <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-accent" /> كشف أرقام العمال</li>
            </ul>
            <Button
              variant={pkg.popular ? 'accent' : 'outline'}
              size="lg"
              className="w-full font-bold"
              isLoading={loading === pkg.amount}
              onClick={() => handleBuy(pkg.amount)}
            >
              شراء الآن
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Profile Page ──────────────────────────────────────────────────────────────

export function ProfilePage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', bio: '', city: '' });

  React.useEffect(() => {
    if (user) setForm({ name: user.name || '', bio: user.bio || '', city: user.city || '' });
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: async (data: { name: string; bio: string; city: string }) => {
      const token = localStorage.getItem('monjez_token');
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(getGetMeQueryKey(), data);
      setEditing(false);
    },
  });

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-primary mb-8">{t('profile')}</h1>
      <Card className="p-8">
        <div className="flex items-center gap-6 mb-8 border-b border-border pb-8">
          <div className="w-24 h-24 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-4xl font-bold shadow-lg">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1">
            {editing ? (
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="text-2xl font-bold w-full border-b-2 border-primary outline-none bg-transparent mb-1"
              />
            ) : (
              <h2 className="text-2xl font-bold">{user.name}</h2>
            )}
            <p className="text-muted-foreground mb-2">{user.phone}</p>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-secondary text-sm font-semibold">
              {t(user.role as any)}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
            {editing ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-6 text-center mb-8">
          <div className="p-4 bg-secondary/50 rounded-xl">
            <p className="text-muted-foreground mb-1">الرصيد</p>
            <p className="text-2xl font-bold text-accent">{user.creditBalance}</p>
          </div>
          <div className="p-4 bg-secondary/50 rounded-xl">
            <p className="text-muted-foreground mb-1">نقاط الثقة</p>
            <p className="text-2xl font-bold text-primary">{user.trustScore?.toFixed(1) || '0.0'} / 5.0</p>
          </div>
        </div>

        {editing && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-muted-foreground mb-1 block">المدينة</label>
              <input
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                placeholder="مدينتك"
                className="w-full h-11 rounded-xl border-2 border-border bg-background px-4 text-sm outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-muted-foreground mb-1 block">نبذة عنك</label>
              <textarea
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                placeholder="اكتب نبذة عن نفسك..."
                rows={3}
                className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary transition-colors resize-none"
              />
            </div>
            <Button
              className="w-full"
              isLoading={updateMutation.isPending}
              onClick={() => updateMutation.mutate(form)}
            >
              <Save className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              حفظ التغييرات
            </Button>
          </div>
        )}

        {!editing && user.bio && (
          <div className="mt-4 p-4 bg-secondary/30 rounded-xl">
            <p className="text-sm text-muted-foreground leading-relaxed">{user.bio}</p>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Notifications Page ────────────────────────────────────────────────────────

async function fetchNotifications() {
  const token = localStorage.getItem('monjez_token');
  const res = await fetch('/api/notifications', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

async function markAllRead() {
  const token = localStorage.getItem('monjez_token');
  await fetch('/api/notifications/read-all', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function markOneRead(id: number) {
  const token = localStorage.getItem('monjez_token');
  await fetch(`/api/notifications/${id}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
}

const NOTIF_ICONS: Record<string, string> = {
  application_received: '📋',
  application_accepted: '✅',
  application_rejected: '❌',
  contact_revealed: '📞',
  job_boosted: '⚡',
  credits_purchased: '💰',
  rating_received: '⭐',
};

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    refetchInterval: 30000,
  });

  const handleMarkAll = async () => {
    await markAllRead();
    refetch();
  };

  const handleMarkOne = async (id: number) => {
    await markOneRead(id);
    refetch();
  };

  const notifications = data?.notifications || [];
  const unread = data?.unreadCount || 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
          {unread > 0 ? <BellDot className="w-8 h-8 text-accent" /> : <Bell className="w-8 h-8" />}
          الإشعارات
          {unread > 0 && <span className="bg-accent text-white text-sm font-bold px-2 py-0.5 rounded-full">{unread}</span>}
        </h1>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAll}>
            <CheckCheck className="w-4 h-4 mr-1 rtl:ml-1 rtl:mr-0" />
            قراءة الكل
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div></div>
      ) : notifications.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground border-dashed">
          <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-lg">لا توجد إشعارات بعد</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n: any) => (
            <Card
              key={n.id}
              className={`p-4 cursor-pointer transition-all hover:shadow-md flex items-start gap-4 ${!n.isRead ? 'border-accent/40 bg-accent/5' : ''}`}
              onClick={() => !n.isRead && handleMarkOne(n.id)}
            >
              <div className="text-2xl shrink-0">{NOTIF_ICONS[n.type] || '🔔'}</div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold ${!n.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>{n.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(n.createdAt).toLocaleDateString('ar-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {!n.isRead && <div className="w-2.5 h-2.5 rounded-full bg-accent shrink-0 mt-1.5" />}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
