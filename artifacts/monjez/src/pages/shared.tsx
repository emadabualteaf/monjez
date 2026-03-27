import React from 'react';
import { useGetCreditBalance, usePurchaseCredits, getGetCreditBalanceQueryKey } from '@workspace/api-client-react';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/lib/i18n';
import { Card, Button } from '@/components/ui';
import { Coins, Zap, ShieldCheck } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export function CreditsPage() {
  const { t } = useI18n();
  const { data: credits } = useGetCreditBalance();
  const queryClient = useQueryClient();

  const purchaseMutation = usePurchaseCredits({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCreditBalanceQueryKey() });
        alert("تم الشراء بنجاح! / Purchase successful!");
      }
    }
  });

  const packages = [
    { amount: 10, price: 50, popular: false },
    { amount: 50, price: 200, popular: true },
    { amount: 100, price: 350, popular: false },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4 mb-12">
        <div className="inline-flex items-center justify-center p-4 bg-accent/10 rounded-full mb-2">
           <Coins className="w-12 h-12 text-accent" />
        </div>
        <h1 className="text-4xl font-bold text-primary">{t('buyCredits')}</h1>
        <p className="text-xl text-muted-foreground">رصيدك الحالي: <span className="font-bold text-foreground">{credits?.balance || 0}</span></p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {packages.map((pkg, i) => (
          <Card key={i} className={`relative p-8 flex flex-col text-center transition-all hover:shadow-xl hover:-translate-y-1 ${pkg.popular ? 'border-accent shadow-lg shadow-accent/10 ring-2 ring-accent/20' : ''}`}>
            {pkg.popular && (
              <div className="absolute -top-3 inset-x-0 flex justify-center">
                <span className="bg-accent text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  الأكثر مبيعاً
                </span>
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
              isLoading={purchaseMutation.isPending}
              onClick={() => purchaseMutation.mutate({ data: { amount: pkg.amount } })}
            >
              شراء الآن
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { user } = useAuth();
  const { t } = useI18n();

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-primary mb-8">{t('profile')}</h1>
      <Card className="p-8">
        <div className="flex items-center gap-6 mb-8 border-b border-border pb-8">
          <div className="w-24 h-24 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-4xl font-bold shadow-lg">
            {user.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{user.name}</h2>
            <p className="text-muted-foreground mb-2">{user.phone}</p>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-secondary text-sm font-semibold">
              {t(user.role as any)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 text-center">
          <div className="p-4 bg-secondary/50 rounded-xl">
            <p className="text-muted-foreground mb-1">الرصيد</p>
            <p className="text-2xl font-bold text-accent">{user.creditBalance}</p>
          </div>
          <div className="p-4 bg-secondary/50 rounded-xl">
            <p className="text-muted-foreground mb-1">نقاط الثقة</p>
            <p className="text-2xl font-bold text-primary">{user.trustScore?.toFixed(1) || '0.0'} / 5.0</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
