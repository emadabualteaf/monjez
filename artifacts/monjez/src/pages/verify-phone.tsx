import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/lib/i18n';
import { Card, Button } from '@/components/ui';
import { useSendOtp, useVerifyOtp, getGetMeQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Phone, CheckCircle, ShieldCheck } from 'lucide-react';

export function VerifyPhonePage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [cooldown, setCooldown] = useState(0);
  const [sentCode, setSentCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const sendOtpMutation = useSendOtp({
    mutation: {
      onSuccess: (data) => {
        setSentCode(data.otpCode || '');
        setCooldown(60);
        setError('');
      },
      onError: (e: any) => {
        const msg = e?.response?.data?.message || 'خطأ في إرسال الرمز';
        setError(msg);
        const cd = e?.response?.data?.cooldownSeconds;
        if (cd) setCooldown(cd);
      }
    }
  });

  const verifyOtpMutation = useVerifyOtp({
    mutation: {
      onSuccess: (updatedUser) => {
        queryClient.setQueryData(getGetMeQueryKey(), updatedUser);
        setSuccess(true);
      },
      onError: (e: any) => {
        const msg = e?.response?.data?.message || 'رمز التحقق غير صحيح';
        setError(msg);
      }
    }
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError('');
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    if (newOtp.every(d => d !== '') && newOtp.join('').length === 6) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = (code?: string) => {
    const finalCode = code || otp.join('');
    if (finalCode.length !== 6) {
      setError('يرجى إدخال الرمز كاملاً / יש להזין קוד מלא');
      return;
    }
    verifyOtpMutation.mutate({ data: { code: finalCode } });
  };

  if (success || user?.phoneVerified) {
    return (
      <div className="max-w-md mx-auto mt-16">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <Card className="p-10 text-center space-y-5">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-700">{t('phoneVerified')}</h2>
            <p className="text-muted-foreground">يمكنك الآن نشر الوظائف والوصول لجميع الميزات</p>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">{t('verifyPhone')}</h1>
        <p className="text-muted-foreground text-sm">{t('verifyPhoneDesc')}</p>
        {user?.phone && (
          <div className="flex items-center justify-center gap-2 bg-secondary px-4 py-2 rounded-full inline-flex mx-auto">
            <Phone className="w-4 h-4 text-primary" />
            <span className="font-bold text-primary" dir="ltr">{user.phone}</span>
          </div>
        )}
      </div>

      <Card className="p-8 space-y-6">
        {/* Demo note */}
        {sentCode && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center text-sm text-blue-700">
            <p className="font-bold mb-1">🔧 وضع التجربة / Demo Mode</p>
            <p>رمز التحقق: <span className="font-mono font-bold text-lg tracking-widest">{sentCode}</span></p>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        {/* OTP Input */}
        <div>
          <p className="text-sm text-muted-foreground mb-3 text-center">{t('otpCode')}</p>
          <div className="flex justify-center gap-3" dir="ltr">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl outline-none transition-all
                  ${digit ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-background'}
                  focus:border-accent focus:ring-4 focus:ring-accent/10`}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Button
            className="w-full"
            size="lg"
            onClick={() => handleVerify()}
            isLoading={verifyOtpMutation.isPending}
            disabled={otp.join('').length !== 6}
          >
            {t('verifyNow')}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => sendOtpMutation.mutate({})}
            isLoading={sendOtpMutation.isPending}
            disabled={cooldown > 0}
          >
            {cooldown > 0
              ? `${t('resendIn')} ${cooldown} ${t('seconds')}`
              : sendOtpMutation.isSuccess ? t('resendOtp') : t('sendOtp')
            }
          </Button>
        </div>
      </Card>
    </div>
  );
}
