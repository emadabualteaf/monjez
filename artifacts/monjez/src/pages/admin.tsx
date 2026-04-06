import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, Button, Input, Badge } from '@/components/ui';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Briefcase, Flag, TrendingUp, Shield, Trash2, CheckCircle, Search, Ban, BarChart3, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';

const BASE = '/api/admin';

async function adminFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts?.headers }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function StatCard({ icon: Icon, label, value, color }: { icon: any, label: string, value: number | string, color: string }) {
  return (
    <Card className="p-6 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-muted-foreground text-sm">{label}</p>
        <p className="text-3xl font-bold">{value}</p>
      </div>
    </Card>
  );
}

export function AdminDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<'stats' | 'users' | 'jobs' | 'reports' | 'bans'>('stats');
  const [search, setSearch] = useState('');
  const [banReason, setBanReason] = useState<Record<number, string>>({});
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminFetch('/stats'),
    refetchInterval: 30000,
  });

  const { data: usersData } = useQuery({
    queryKey: ['admin-users', search],
    queryFn: () => adminFetch(`/users${search ? `?search=${search}` : ''}`),
    enabled: tab === 'users',
  });

  const { data: jobsData } = useQuery({
    queryKey: ['admin-jobs'],
    queryFn: () => adminFetch('/jobs'),
    enabled: tab === 'jobs',
  });

  const { data: reportsData } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: () => adminFetch('/reports'),
    enabled: tab === 'reports',
    refetchInterval: tab === 'reports' ? 10000 : false,
  });

  const { data: bansData } = useQuery({
    queryKey: ['admin-bans'],
    queryFn: () => adminFetch('/bans'),
    enabled: tab === 'bans',
  });

  const verifyMutation = useMutation({
    mutationFn: (id: number) => adminFetch(`/users/${id}/verify`, { method: 'PATCH' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const banMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number, reason: string }) =>
      adminFetch(`/users/${id}/ban`, { method: 'POST', body: JSON.stringify({ reason }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-bans'] });
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: (id: number) => adminFetch(`/jobs/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-jobs'] }),
  });

  const resolveReportMutation = useMutation({
    mutationFn: (id: number) => adminFetch(`/reports/${id}/resolve`, { method: 'PATCH' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-reports'] }),
  });

  const unbanMutation = useMutation({
    mutationFn: (id: number) => adminFetch(`/bans/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-bans'] }),
  });

  const tabs = [
    { id: 'stats', label: 'الإحصائيات', icon: BarChart3 },
    { id: 'users', label: 'المستخدمون', icon: Users },
    { id: 'jobs', label: 'الوظائف', icon: Briefcase },
    { id: 'reports', label: 'البلاغات', icon: Flag, badge: stats?.pendingReports },
    { id: 'bans', label: 'المحظورون', icon: Ban },
  ] as const;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <Shield className="w-8 h-8" />
            لوحة التحكم الإدارية
          </h1>
          <p className="text-muted-foreground mt-1">منجز Admin — مرحباً {user?.name}</p>
        </div>
        <div className="text-xs bg-green-100 text-green-800 px-3 py-2 rounded-xl font-bold border border-green-200">
          🔒 وصول محمي
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all relative ${tab === t.id
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {(t as any).badge && (t as any).badge > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {(t as any).badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Stats Tab */}
      {tab === 'stats' && stats && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Users} label="المستخدمون" value={stats.totalUsers} color="bg-primary" />
            <StatCard icon={Briefcase} label="الوظائف" value={stats.totalJobs} color="bg-blue-500" />
            <StatCard icon={TrendingUp} label="الطلبات" value={stats.totalApplications} color="bg-green-500" />
            <StatCard icon={Flag} label="البلاغات المعلقة" value={stats.pendingReports} color="bg-orange-500" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-6 space-y-4">
              <h3 className="font-bold text-lg">توزيع المستخدمين</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">عمال</span>
                  <span className="font-bold text-xl">{stats.totalWorkers}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">أصحاب عمل</span>
                  <span className="font-bold text-xl">{stats.totalEmployers}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">محظورون</span>
                  <span className="font-bold text-xl text-destructive">{stats.totalBans}</span>
                </div>
              </div>
            </Card>
            <Card className="p-6 space-y-4">
              <h3 className="font-bold text-lg">🏆 الإيرادات التقديرية</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">وظائف مُعززة</span>
                  <span className="font-bold text-xl text-accent">{stats.boostedJobs}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">إيرادات تقديرية</span>
                  <span className="font-bold text-2xl text-green-600">~{stats.estimatedRevenue} ₪</span>
                </div>
              </div>
            </Card>
          </div>
        </motion.div>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو الهاتف أو المدينة..."
              className="w-full pr-10 pl-4 h-12 border-2 border-border rounded-xl bg-background outline-none focus:border-primary text-sm"
            />
          </div>

          <div className="space-y-3">
            {usersData?.users?.map((u: any) => (
              <Card key={u.id} className="p-4">
                <div className="flex flex-col sm:flex-row justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold">{u.name}</span>
                        <Badge variant={u.role === 'employer' ? 'default' : 'secondary' as any} className="text-[10px]">
                          {u.role === 'employer' ? 'صاحب عمل' : 'عامل'}
                        </Badge>
                        {u.phoneVerified && <Badge variant="success" className="text-[10px]">✓ محقق</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground" dir="ltr">{u.phone}</p>
                      {u.israeliId && <p className="text-xs text-muted-foreground">هوية: {u.israeliId}</p>}
                      {u.businessId && <p className="text-xs text-muted-foreground">سجل تجاري: {u.businessId}</p>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!u.phoneVerified && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => verifyMutation.mutate(u.id)}
                        isLoading={verifyMutation.isPending}
                        className="text-xs"
                      >
                        <CheckCircle className="w-3 h-3 ml-1" />
                        تحقق
                      </Button>
                    )}
                    <div className="flex gap-1">
                      <input
                        placeholder="سبب الحظر..."
                        value={banReason[u.id] || ''}
                        onChange={e => setBanReason(prev => ({ ...prev, [u.id]: e.target.value }))}
                        className="h-8 text-xs border rounded-lg px-2 w-32"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (!banReason[u.id]) return alert('أدخل سبب الحظر');
                          if (confirm(`حظر ${u.name}?`)) {
                            banMutation.mutate({ id: u.id, reason: banReason[u.id] });
                          }
                        }}
                        isLoading={banMutation.isPending}
                        className="text-xs"
                      >
                        <Ban className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* Jobs Tab */}
      {tab === 'jobs' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {jobsData?.jobs?.map((job: any) => (
            <Card key={job.id} className="p-4">
              <div className="flex justify-between items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold">{job.title}</h3>
                    <Badge variant={job.status === 'open' ? 'success' : 'default' as any} className="text-[10px]">
                      {job.status}
                    </Badge>
                    {job.isBoosted && <Badge variant="accent" className="text-[10px]">مُعزز</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{job.city} • {job.salary}₪ • {new Date(job.createdAt).toLocaleDateString('ar')}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (confirm(`حذف وظيفة "${job.title}"?`))
                      deleteJobMutation.mutate(job.id);
                  }}
                  isLoading={deleteJobMutation.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </motion.div>
      )}

      {/* Reports Tab */}
      {tab === 'reports' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {reportsData?.reports?.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">لا توجد بلاغات</Card>
          )}
          {reportsData?.reports?.map((report: any) => (
            <Card key={report.id} className={`p-4 ${report.status === 'pending' ? 'border-orange-200 bg-orange-50/30' : ''}`}>
              <div className="flex justify-between items-start gap-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${report.status === 'pending' ? 'bg-orange-100' : 'bg-secondary'}`}>
                    <AlertTriangle className={`w-4 h-4 ${report.status === 'pending' ? 'text-orange-600' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={report.targetType === 'job' ? 'default' : 'secondary' as any} className="text-[10px]">
                        {report.targetType === 'job' ? 'وظيفة' : 'مستخدم'} #{report.targetId}
                      </Badge>
                      <Badge variant={report.status === 'pending' ? 'warning' : 'success' as any} className="text-[10px]">
                        {report.status === 'pending' ? 'معلق' : 'محلول'}
                      </Badge>
                    </div>
                    <p className="text-sm mt-1">{report.reason}</p>
                    <p className="text-xs text-muted-foreground">{new Date(report.createdAt).toLocaleString('ar')}</p>
                  </div>
                </div>
                {report.status === 'pending' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resolveReportMutation.mutate(report.id)}
                    isLoading={resolveReportMutation.isPending}
                    className="text-xs"
                  >
                    <CheckCircle className="w-3 h-3 ml-1" />
                    حل
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </motion.div>
      )}

      {/* Bans Tab */}
      {tab === 'bans' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {bansData?.bans?.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">لا يوجد مستخدمون محظورون</Card>
          )}
          {bansData?.bans?.map((ban: any) => (
            <Card key={ban.id} className="p-4 border-destructive/20 bg-destructive/5">
              <div className="flex justify-between items-center gap-3">
                <div>
                  <p className="font-bold" dir="ltr">{ban.phone}</p>
                  {ban.israeliId && <p className="text-sm text-muted-foreground">هوية: {ban.israeliId}</p>}
                  <p className="text-sm text-destructive">{ban.reason}</p>
                  <p className="text-xs text-muted-foreground">{new Date(ban.createdAt).toLocaleDateString('ar')}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (confirm('رفع الحظر؟')) unbanMutation.mutate(ban.id);
                  }}
                  isLoading={unbanMutation.isPending}
                  className="text-xs"
                >
                  رفع الحظر
                </Button>
              </div>
            </Card>
          ))}
        </motion.div>
      )}
    </div>
  );
}
