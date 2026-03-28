import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/lib/i18n';
import { Input, Button, Card } from '@/components/ui';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from 'wouter';

function validateIsraeliId(id: string): boolean {
  const padded = id.padStart(9, '0');
  if (padded.length !== 9 || !/^\d+$/.test(padded)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let digit = parseInt(padded[i]) * (i % 2 === 0 ? 1 : 2);
    if (digit > 9) digit -= 9;
    sum += digit;
  }
  return sum % 10 === 0;
}

function validateBusinessId(id: string): boolean {
  return validateIsraeliId(id);
}

const loginSchema = z.object({
  phone: z.string().min(5, 'رقم الهاتف مطلوب'),
  password: z.string().min(4, 'كلمة المرور مطلوبة'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'الاسم مطلوب (حرفان على الأقل)'),
  phone: z.string().min(9, 'رقم الهاتف يجب أن يكون 9 أرقام على الأقل').regex(/^\d+$/, 'يجب أن يحتوي على أرقام فقط'),
  password: z.string().min(6, 'كلمة المرور 6 أحرف على الأقل'),
  role: z.enum(['worker', 'employer']),
  city: z.string().optional(),
  israeliId: z.string().optional().refine(
    (id) => !id || id === '' || validateIsraeliId(id),
    { message: 'رقم الهوية الإسرائيلية غير صحيح' }
  ),
  businessId: z.string().optional().refine(
    (id) => !id || id === '' || validateBusinessId(id),
    { message: 'رقم سجل الأعمال غير صحيح' }
  ),
  termsAccepted: z.boolean().refine(v => v === true, { message: 'يجب الموافقة على الشروط للمتابعة' }),
});

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const { login, register, isLoggingIn, isRegistering } = useAuth();
  const { t, lang, setLang } = useI18n();
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: '', password: '' }
  });

  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      phone: '', password: '', name: '',
      role: 'worker' as const,
      city: '',
      israeliId: '',
      businessId: '',
      termsAccepted: false,
    }
  });

  const selectedRole = registerForm.watch('role');
  const israeliIdValue = registerForm.watch('israeliId') ?? '';
  const businessIdValue = registerForm.watch('businessId') ?? '';

  const israeliIdStatus = israeliIdValue.length > 0
    ? validateIsraeliId(israeliIdValue) ? 'valid' : 'invalid'
    : 'empty';

  const businessIdStatus = businessIdValue.length > 0
    ? validateBusinessId(businessIdValue) ? 'valid' : 'invalid'
    : 'empty';

  const onLogin = async (data: any) => {
    setLoginError('');
    try {
      await login({ data });
    } catch (e: any) {
      const msg = e?.data?.message || e?.message || 'خطأ في تسجيل الدخول';
      setLoginError(msg);
    }
  };

  const onRegister = async (data: any) => {
    setRegisterError('');
    try {
      const payload: any = {
        name: data.name,
        phone: data.phone,
        password: data.password,
        role: data.role,
      };
      if (data.city) payload.city = data.city;
      if (data.israeliId) payload.israeliId = data.israeliId;
      if (data.role === 'employer' && data.businessId) payload.businessId = data.businessId;
      await register({ data: payload });
    } catch (e: any) {
      const msg = e?.data?.message || e?.message || 'خطأ في إنشاء الحساب';
      setRegisterError(msg);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative">
      <div className="absolute top-4 left-4 z-20">
        <button
          onClick={() => setLang(lang === 'ar' ? 'he' : 'ar')}
          className="text-sm font-bold text-primary/70 bg-white/50 backdrop-blur-md px-3 py-1 rounded-full shadow-sm hover:bg-white/80 transition-colors"
        >
          {lang === 'ar' ? 'עברית' : 'عربي'}
        </button>
      </div>

      {/* Hero Section */}
      <div className="hidden md:flex md:w-1/2 bg-primary relative overflow-hidden flex-col justify-center p-12">
        <div className="absolute inset-0">
          <img src={`${import.meta.env.BASE_URL}images/hero-bg.png`} alt="Background" className="w-full h-full object-cover opacity-40 mix-blend-overlay" />
        </div>
        <div className="relative z-10 text-white max-w-md mx-auto text-center">
          <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Logo" className="w-32 h-32 mx-auto mb-8 drop-shadow-2xl brightness-0 invert" />
          <h1 className="text-5xl font-bold mb-4">{t('welcome')}</h1>
          <p className="text-xl text-primary-foreground/80">{t('subtitle')}</p>
          <div className="mt-10 grid grid-cols-2 gap-4 text-right">
            {[
              { icon: '🔍', text: lang === 'ar' ? 'وظائف قريبة منك' : 'עבודה קרובה אליך' },
              { icon: '⚡', text: lang === 'ar' ? 'تقديم بنقرة واحدة' : 'הגשה בלחיצה אחת' },
              { icon: '🤖', text: lang === 'ar' ? 'نشر ذكي بالذكاء الاصطناعي' : 'פרסום חכם עם AI' },
              { icon: '⭐', text: lang === 'ar' ? 'نظام تقييم موثوق' : 'מערכת דירוג אמינה' },
            ].map((item, i) => (
              <div key={i} className="bg-white/10 rounded-xl p-3 flex items-center gap-2 text-sm">
                <span className="text-xl">{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-background overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md py-8"
        >
          <div className="md:hidden text-center mb-8">
            <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Logo" className="w-24 h-24 mx-auto mb-4 drop-shadow-lg" />
            <h1 className="text-3xl font-bold text-primary">{t('welcome')}</h1>
          </div>

          <Card className="p-8 shadow-2xl border-border/50 bg-white/80 backdrop-blur-xl">
            <AnimatePresence mode="wait">
              {isLogin ? (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={loginForm.handleSubmit(onLogin)}
                  className="space-y-5"
                >
                  <h2 className="text-2xl font-bold text-center mb-6">{t('login')}</h2>

                  {loginError && (
                    <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {loginError}
                    </div>
                  )}

                  <Input placeholder={t('phone')} type="tel" inputMode="numeric" {...loginForm.register('phone')} error={loginForm.formState.errors.phone?.message as string} />
                  <Input type="password" placeholder={t('password')} {...loginForm.register('password')} error={loginForm.formState.errors.password?.message as string} />
                  <Button type="submit" className="w-full" size="lg" isLoading={isLoggingIn}>{t('login')}</Button>
                  <p className="text-center text-muted-foreground mt-4">
                    {t('noAccount')}{' '}
                    <button type="button" onClick={() => { setIsLogin(false); setLoginError(''); }} className="text-accent font-bold hover:underline">{t('register')}</button>
                  </p>
                </motion.form>
              ) : (
                <motion.form
                  key="register"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onSubmit={registerForm.handleSubmit(onRegister)}
                  className="space-y-4"
                >
                  <h2 className="text-2xl font-bold text-center mb-2">{t('register')}</h2>

                  {registerError && (
                    <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {registerError}
                    </div>
                  )}

                  {/* Role Selector */}
                  <div className="flex gap-2 p-1 bg-secondary rounded-xl">
                    {(['worker', 'employer'] as const).map((role) => (
                      <button key={role} type="button"
                        onClick={() => registerForm.setValue('role', role)}
                        className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${registerForm.watch('role') === role ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:bg-white/50'}`}
                      >
                        {t(role)}
                      </button>
                    ))}
                  </div>

                  <Input placeholder={t('name')} {...registerForm.register('name')} error={registerForm.formState.errors.name?.message as string} />
                  <Input placeholder={t('phone')} type="tel" inputMode="numeric" {...registerForm.register('phone')} error={registerForm.formState.errors.phone?.message as string} />
                  <Input type="password" placeholder={t('password')} {...registerForm.register('password')} error={registerForm.formState.errors.password?.message as string} />
                  <Input placeholder={`${t('city')} (${t('optional')})`} {...registerForm.register('city')} />

                  {/* Israeli ID */}
                  <div className="space-y-1">
                    <div className="relative">
                      <Input placeholder={t('israeliIdOptional')} inputMode="numeric" maxLength={9} {...registerForm.register('israeliId')} />
                      {israeliIdStatus !== 'empty' && (
                        <div className={`absolute left-3 top-1/2 -translate-y-1/2 ${israeliIdStatus === 'valid' ? 'text-green-500' : 'text-destructive'}`}>
                          {israeliIdStatus === 'valid' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        </div>
                      )}
                    </div>
                    {israeliIdStatus === 'invalid' && israeliIdValue.length >= 5 && (
                      <p className="text-xs text-destructive px-1">{t('israeliIdError')}</p>
                    )}
                  </div>

                  {/* Business ID for employers */}
                  {selectedRole === 'employer' && (
                    <div className="space-y-1">
                      <div className="relative">
                        <Input placeholder={t('businessIdOptional')} inputMode="numeric" maxLength={9} {...registerForm.register('businessId')} />
                        {businessIdStatus !== 'empty' && (
                          <div className={`absolute left-3 top-1/2 -translate-y-1/2 ${businessIdStatus === 'valid' ? 'text-green-500' : 'text-destructive'}`}>
                            {businessIdStatus === 'valid' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                          </div>
                        )}
                      </div>
                      {businessIdStatus === 'invalid' && businessIdValue.length >= 5 && (
                        <p className="text-xs text-destructive px-1">{t('businessIdError')}</p>
                      )}
                    </div>
                  )}

                  {/* Profile Completion */}
                  <ProfileCompletionBar form={registerForm} role={selectedRole} t={t} />

                  {/* Terms */}
                  <div className="space-y-1">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" {...registerForm.register('termsAccepted')} className="mt-1 w-4 h-4 accent-primary flex-shrink-0" />
                      <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                        {t('termsAgree')}{' '}
                        <Link href="/terms" className="text-accent hover:underline font-medium" target="_blank">
                          {lang === 'ar' ? 'الشروط' : 'תנאי שימוש'}
                        </Link>
                        {' '}&{' '}
                        <Link href="/privacy" className="text-accent hover:underline font-medium" target="_blank">
                          {lang === 'ar' ? 'الخصوصية' : 'פרטיות'}
                        </Link>
                      </span>
                    </label>
                    {registerForm.formState.errors.termsAccepted && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {registerForm.formState.errors.termsAccepted.message as string}
                      </p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" size="lg" isLoading={isRegistering}>{t('register')}</Button>
                  <p className="text-center text-muted-foreground mt-2">
                    {t('hasAccount')}{' '}
                    <button type="button" onClick={() => { setIsLogin(true); setRegisterError(''); }} className="text-accent font-bold hover:underline">{t('login')}</button>
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>

        {/* Footer Links */}
        <div className="flex gap-4 text-xs text-muted-foreground mt-4 pb-4">
          <Link href="/terms" className="hover:text-primary hover:underline">
            {lang === 'ar' ? 'شروط الاستخدام' : 'תנאי שימוש'}
          </Link>
          <span>•</span>
          <Link href="/privacy" className="hover:text-primary hover:underline">
            {lang === 'ar' ? 'سياسة الخصوصية' : 'מדיניות פרטיות'}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ProfileCompletionBar({ form, role, t }: { form: any; role: string; t: (k: any) => string }) {
  const values = form.watch();
  const fields = [
    !!values.name,
    !!values.phone,
    !!values.password,
    !!values.city,
    !!values.israeliId && validateIsraeliId(values.israeliId),
    role === 'employer' ? (!!values.businessId && validateBusinessId(values.businessId)) : true,
  ];
  const filled = fields.filter(Boolean).length;
  const pct = Math.round((filled / fields.length) * 100);

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span>{t('profileCompletion')}</span>
        <span className="font-bold text-primary">{pct}%</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-l from-accent to-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
