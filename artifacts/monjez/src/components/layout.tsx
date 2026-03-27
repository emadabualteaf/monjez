import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/lib/i18n';
import { Home, Briefcase, User, PlusCircle, LogOut, Coins, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGetCreditBalance } from '@workspace/api-client-react';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const [location] = useLocation();
  const { data: credits } = useGetCreditBalance({ query: { enabled: !!user } });

  if (!user) return <>{children}</>;

  const workerNav = [
    { href: '/worker', icon: Home, label: t('home') },
    { href: '/worker/applications', icon: Briefcase, label: t('applications') },
    { href: '/profile', icon: User, label: t('profile') },
  ];

  const employerNav = [
    { href: '/employer', icon: Home, label: t('myJobs') },
    { href: '/employer/post', icon: PlusCircle, label: t('postJob') },
    { href: '/profile', icon: User, label: t('profile') },
  ];

  const nav = user.role === 'worker' ? workerNav : employerNav;

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-72 fixed inset-y-0 right-0 border-l border-border bg-card shadow-soft z-10">
        <div className="p-8 flex items-center justify-between">
          <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Monjez" className="h-10 w-auto" />
          <button
            onClick={() => setLang(lang === 'ar' ? 'he' : 'ar')}
            className="text-sm font-bold text-primary/70 hover:text-primary transition-colors bg-secondary px-3 py-1 rounded-full"
          >
            {lang === 'ar' ? 'עב' : 'عربي'}
          </button>
        </div>

        {/* User Info */}
        <div className="px-6 py-3">
          <div className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">{user.name}</p>
              <div className="flex items-center gap-1">
                {user.phoneVerified ? (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    {t('phoneVerified')}
                  </span>
                ) : (
                  <Link href="/verify-phone" className="text-xs text-amber-600 hover:underline flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    {t('phoneNotVerified')}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-2">
          {nav.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className={cn(
                "flex items-center gap-4 px-4 py-4 rounded-xl text-lg font-medium transition-all duration-200",
                isActive ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}>
                <item.icon className="w-6 h-6" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-border space-y-4">
          <Link href="/credits" className="flex items-center justify-between p-4 rounded-xl bg-accent/10 border border-accent/20 hover:bg-accent/20 transition-colors group cursor-pointer">
            <div className="flex items-center gap-3 text-orange-700 font-bold">
              <Coins className="w-5 h-5" />
              <span>{t('credits')}</span>
            </div>
            <span className="bg-accent text-white px-3 py-1 rounded-full font-bold shadow-sm group-hover:scale-105 transition-transform">{credits?.balance || 0}</span>
          </Link>

          <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors font-medium">
            <LogOut className="w-5 h-5" />
            <span>{t('logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:mr-72 pb-24 md:pb-0">
        {/* Mobile Header */}
        <header className="md:hidden glass sticky top-0 z-20 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Monjez" className="h-8 w-auto" />
            {!user.phoneVerified && (
              <Link href="/verify-phone" className="flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 px-2 py-1 rounded-full text-[10px] font-bold">
                <ShieldCheck className="w-3 h-3" />
                {t('phoneNotVerified')}
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/credits" className="flex items-center gap-1.5 bg-accent/15 px-3 py-1.5 rounded-full text-orange-700 font-bold text-sm">
              <Coins className="w-4 h-4" />
              {credits?.balance || 0}
            </Link>
            <button
              onClick={() => setLang(lang === 'ar' ? 'he' : 'ar')}
              className="text-xs font-bold text-primary/70 bg-secondary px-2 py-1 rounded-full"
            >
              {lang === 'ar' ? 'עב' : 'عربي'}
            </button>
          </div>
        </header>

        <div className="p-4 md:p-8 lg:p-10 max-w-5xl mx-auto">
          {children}
        </div>
      </main>

      {/* Bottom Nav for Mobile — with Logout */}
      <nav className="md:hidden glass fixed bottom-0 inset-x-0 z-30 flex justify-around items-center p-2 pb-safe border-t border-border/50">
        {nav.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex flex-col items-center p-2 rounded-xl min-w-[60px] transition-all",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}>
              <div className={cn("p-1.5 rounded-full mb-1 transition-all", isActive && "bg-primary/10")}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-medium">{item.label}</span>
            </Link>
          );
        })}
        {/* Logout button in mobile nav */}
        <button
          onClick={logout}
          className="flex flex-col items-center p-2 rounded-xl min-w-[60px] text-muted-foreground hover:text-destructive transition-all"
        >
          <div className="p-1.5 rounded-full mb-1">
            <LogOut className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-medium">{t('logout')}</span>
        </button>
      </nav>
    </div>
  );
}
