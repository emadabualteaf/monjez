import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/lib/i18n';
import { Input, Button, Card } from '@/components/ui';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';

const loginSchema = z.object({
  phone: z.string().min(5, "رقم الهاتف مطلوب"),
  password: z.string().min(4, "كلمة المرور مطلوبة"),
});

const registerSchema = loginSchema.extend({
  name: z.string().min(2, "الاسم مطلوب"),
  role: z.enum(['worker', 'employer']),
});

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const { login, register, isLoggingIn, isRegistering } = useAuth();
  const { t, lang, setLang } = useI18n();

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: '', password: '' }
  });

  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { phone: '', password: '', name: '', role: 'worker' as const }
  });

  const onLogin = async (data: any) => {
    try {
      await login({ data });
    } catch (e) {
      alert("خطأ في تسجيل الدخول / Error logging in");
    }
  };

  const onRegister = async (data: any) => {
    try {
      await register({ data });
    } catch (e) {
      alert("خطأ في التسجيل / Error registering");
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative">
      <div className="absolute top-4 left-4 z-20">
         <button 
            onClick={() => setLang(lang === 'ar' ? 'he' : 'ar')}
            className="text-sm font-bold text-primary/70 bg-white/50 backdrop-blur-md px-3 py-1 rounded-full shadow-sm"
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
        </div>
      </div>

      {/* Form Section */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="md:hidden text-center mb-8">
            <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Logo" className="w-24 h-24 mx-auto mb-4 drop-shadow-lg" />
            <h1 className="text-3xl font-bold text-primary">{t('welcome')}</h1>
          </div>

          <Card className="p-8 shadow-2xl border-border/50 bg-white/80 backdrop-blur-xl">
            {isLogin ? (
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-5">
                <h2 className="text-2xl font-bold text-center mb-6">{t('login')}</h2>
                <Input 
                  placeholder={t('phone')} 
                  {...loginForm.register('phone')} 
                  error={loginForm.formState.errors.phone?.message as string} 
                />
                <Input 
                  type="password" 
                  placeholder={t('password')} 
                  {...loginForm.register('password')} 
                  error={loginForm.formState.errors.password?.message as string} 
                />
                <Button type="submit" className="w-full" size="lg" isLoading={isLoggingIn}>
                  {t('login')}
                </Button>
                <p className="text-center text-muted-foreground mt-4">
                  {t('noAccount')} <button type="button" onClick={() => setIsLogin(false)} className="text-accent font-bold hover:underline">{t('register')}</button>
                </p>
              </form>
            ) : (
              <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-5">
                <h2 className="text-2xl font-bold text-center mb-6">{t('register')}</h2>
                <Input 
                  placeholder={t('name')} 
                  {...registerForm.register('name')} 
                  error={registerForm.formState.errors.name?.message as string} 
                />
                <Input 
                  placeholder={t('phone')} 
                  {...registerForm.register('phone')} 
                  error={registerForm.formState.errors.phone?.message as string} 
                />
                <Input 
                  type="password" 
                  placeholder={t('password')} 
                  {...registerForm.register('password')} 
                  error={registerForm.formState.errors.password?.message as string} 
                />
                
                <div className="flex gap-4 p-1 bg-secondary rounded-xl">
                  {(['worker', 'employer'] as const).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => registerForm.setValue('role', role)}
                      className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${registerForm.watch('role') === role ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:bg-white/50'}`}
                    >
                      {t(role)}
                    </button>
                  ))}
                </div>

                <Button type="submit" className="w-full" size="lg" isLoading={isRegistering}>
                  {t('register')}
                </Button>
                <p className="text-center text-muted-foreground mt-4">
                  {t('hasAccount')} <button type="button" onClick={() => setIsLogin(true)} className="text-accent font-bold hover:underline">{t('login')}</button>
                </p>
              </form>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
