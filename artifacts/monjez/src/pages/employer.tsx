import React, { useState } from 'react';
import { useListJobs, useParseJobWithAI, useCreateJob, useGetJob, useGetJobApplications, useRevealContact, useBoostJob, getGetJobApplicationsQueryKey, getGetCreditBalanceQueryKey } from '@workspace/api-client-react';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/lib/i18n';
import { Card, Badge, Button, Input, Textarea, Dialog } from '@/components/ui';
import { useForm } from 'react-hook-form';
import { useLocation } from 'wouter';
import { Wand2, Users, Phone, Zap, Star, CheckCircle, XCircle, Briefcase } from 'lucide-react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/utils';

export function EmployerDashboard() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const { data, isLoading } = useListJobs();
  const [closingId, setClosingId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const closeJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      const token = localStorage.getItem('monjez_token');
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'closed' }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      setClosingId(null);
    },
  });

  if (isLoading) return <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div></div>;

  const myJobs = data?.jobs?.filter(j => j.employer.id === user?.id) || [];
  const openJobs = myJobs.filter(j => j.status === 'open');
  const closedJobs = myJobs.filter(j => j.status !== 'open');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-primary">{t('myJobs')}</h1>
        <Button onClick={() => setLocation('/employer/post')} variant="accent" className="hidden sm:flex shadow-lg shadow-accent/20">
          <Wand2 className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />
          {t('postJob')}
        </Button>
      </div>

      {myJobs.length === 0 ? (
        <Card className="p-12 text-center border-dashed flex flex-col items-center justify-center gap-4">
          <Briefcase className="w-12 h-12 text-muted-foreground/30" />
          <p className="text-lg text-muted-foreground">لم تقم بنشر أي وظائف بعد</p>
          <Button onClick={() => setLocation('/employer/post')} variant="outline">نشر وظيفة جديدة</Button>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Open Jobs */}
          {openJobs.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-muted-foreground mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                وظائف مفتوحة ({openJobs.length})
              </h2>
              <div className="grid gap-4">
                {openJobs.map((job) => (
                  <Card key={job.id} className="p-5 hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-xl">{job.title}</h3>
                          <Badge variant="success">{t('open' as any)}</Badge>
                          {job.isBoosted && <Badge variant="accent" className="animate-pulse">مُمولة</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{job.city} • {formatCurrency(job.salary)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="bg-secondary px-4 py-2 rounded-xl text-center">
                          <p className="text-2xl font-bold text-primary">{job.applicantCount}</p>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">متقدمين</p>
                        </div>
                        <Button onClick={() => setLocation(`/employer/jobs/${job.id}`)}>إدارة</Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setClosingId(job.id)}
                          className="text-destructive border-destructive/30 hover:bg-destructive/10"
                        >
                          إغلاق
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Closed Jobs */}
          {closedJobs.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-muted-foreground mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-400 inline-block"></span>
                وظائف مغلقة ({closedJobs.length})
              </h2>
              <div className="grid gap-4 opacity-60">
                {closedJobs.map((job) => (
                  <Card key={job.id} className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-lg">{job.title}</h3>
                          <Badge variant="default">مغلقة</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{job.city} • {formatCurrency(job.salary)}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setLocation(`/employer/jobs/${job.id}`)}>
                        عرض
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirm Close Dialog */}
      <Dialog isOpen={!!closingId} onClose={() => setClosingId(null)} title="إغلاق الوظيفة">
        <div className="space-y-4">
          <p className="text-muted-foreground">هل أنت متأكد أنك تريد إغلاق هذه الوظيفة؟ لن تظهر للعمال بعد ذلك.</p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setClosingId(null)}>إلغاء</Button>
            <Button
              variant="outline"
              className="flex-1"
              isLoading={closeJobMutation.isPending}
              onClick={() => closingId && closeJobMutation.mutate(closingId)}
            >
              إغلاق الوظيفة
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Mobile FAB */}
      <button
        onClick={() => setLocation('/employer/post')}
        className="sm:hidden fixed bottom-24 left-4 rtl:right-4 rtl:left-auto z-20 w-14 h-14 bg-accent text-white rounded-full shadow-xl shadow-accent/30 flex items-center justify-center"
      >
        <Wand2 className="w-6 h-6" />
      </button>
    </div>
  );
}

export function PostJob() {
  const { t, lang } = useI18n();
  const [, setLocation] = useLocation();
  const [prompt, setPrompt] = useState('');
  
  const parseMutation = useParseJobWithAI();
  const createMutation = useCreateJob({
    mutation: {
      onSuccess: () => setLocation('/employer')
    }
  });

  const form = useForm({
    defaultValues: { title: '', city: '', location: '', salary: 0, salaryType: 'daily' as any, jobDate: '', description: '' }
  });

  const handleParse = async () => {
    if (!prompt) return;
    try {
      const res = await parseMutation.mutateAsync({ data: { text: prompt, language: lang } });
      form.reset({
        title: res.title || '',
        city: res.city || '',
        location: res.location || res.city || '',
        salary: res.salary || 0,
        salaryType: res.salaryType || 'daily',
        jobDate: res.jobDate || '',
        description: res.description || prompt,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const onSubmit = (data: any) => {
    createMutation.mutate({ data: { ...data, salary: Number(data.salary) } });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-primary mb-8">{t('postJob')}</h1>
      
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/10">
        <h3 className="font-bold flex items-center gap-2 mb-4 text-primary">
          <Wand2 className="w-5 h-5 text-accent" />
          النشر الذكي بالذكاء الاصطناعي
        </h3>
        <div className="flex flex-col gap-3">
          <Textarea 
            placeholder={t('aiPlaceholder')} 
            value={prompt} 
            onChange={(e) => setPrompt(e.target.value)} 
            className="bg-white/80 border-primary/20 focus-visible:ring-accent/20 focus-visible:border-accent"
          />
          <Button onClick={handleParse} isLoading={parseMutation.isPending} variant="accent" className="self-end shadow-md shadow-accent/20">
            {t('parseAi')}
          </Button>
        </div>
      </Card>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card className="p-6 space-y-5">
          <h3 className="font-bold text-lg mb-4 border-b pb-2">تفاصيل الوظيفة</h3>
          
          <Input placeholder={t('jobTitle')} {...form.register('title', { required: true })} />
          
          <div className="grid grid-cols-2 gap-4">
            <Input placeholder={t('city')} {...form.register('city', { required: true })} />
            <Input placeholder="الموقع التفصيلي" {...form.register('location', { required: true })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input type="number" placeholder={t('salary')} {...form.register('salary', { required: true })} />
            <select {...form.register('salaryType')} className="flex h-12 w-full rounded-xl border-2 border-border bg-background px-4 py-2 text-base outline-none focus:border-primary focus:ring-4 focus:ring-primary/10">
              <option value="hourly">ساعة</option>
              <option value="daily">يوم</option>
              <option value="fixed">مقطوع</option>
            </select>
          </div>

          <Input type="date" placeholder="تاريخ العمل" {...form.register('jobDate')} />
          <Textarea placeholder={t('description')} {...form.register('description')} className="min-h-[150px]" />
        </Card>
        <Button type="submit" size="lg" className="w-full text-lg" isLoading={createMutation.isPending}>
          نشر الوظيفة الآن
        </Button>
      </form>
    </div>
  );
}

export function JobDetail({ params }: { params: { id: string } }) {
  const jobId = parseInt(params.id);
  const { data: job, isLoading: jobLoading } = useGetJob(jobId);
  const { data: appsData, isLoading: appsLoading } = useGetJobApplications(jobId);
  const queryClient = useQueryClient();

  const revealMutation = useRevealContact({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetJobApplicationsQueryKey(jobId) });
        queryClient.invalidateQueries({ queryKey: getGetCreditBalanceQueryKey() });
      }
    }
  });

  const boostMutation = useBoostJob({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [`/api/jobs/${jobId}`] });
        queryClient.invalidateQueries({ queryKey: getGetCreditBalanceQueryKey() });
      }
    }
  });

  // Accept / Reject application
  const statusMutation = useMutation({
    mutationFn: async ({ applicationId, status }: { applicationId: number; status: string }) => {
      const token = localStorage.getItem('monjez_token');
      const res = await fetch(`/api/applications/${applicationId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getGetJobApplicationsQueryKey(jobId) });
    },
  });

  if (jobLoading || appsLoading) return <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div></div>;
  if (!job) return <div>Job not found</div>;

  const apps = appsData?.applications || [];

  return (
    <div className="space-y-8">
      <Card className="p-8 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Users className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{job.title}</h1>
            <p className="text-primary-foreground/80 text-lg">{job.city} • {formatCurrency(job.salary)} / {job.salaryType === 'hourly' ? 'ساعة' : job.salaryType === 'daily' ? 'يوم' : 'مقطوع'}</p>
          </div>
          {!job.isBoosted && job.status === 'open' && (
            <Button variant="accent" onClick={() => boostMutation.mutate({ jobId })} isLoading={boostMutation.isPending} className="shadow-xl shadow-accent/30 whitespace-nowrap">
              <Zap className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />
              ترقية (3 رصيد)
            </Button>
          )}
        </div>
      </Card>

      <div>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          المتقدمين <Badge variant="default" className="text-sm px-3 py-1">{apps.length}</Badge>
        </h2>

        {apps.length === 0 ? (
          <Card className="p-12 text-center border-dashed text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>لا يوجد متقدمين حتى الآن</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {apps.map((app) => (
              <Card key={app.id} className="p-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center text-xl font-bold text-primary">
                      {app.worker.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">{app.worker.name}</h4>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Star className="w-4 h-4 text-amber-500 mr-1 rtl:ml-1 rtl:mr-0 fill-current" />
                        {app.worker.trustScore?.toFixed(1) || 'جديد'}
                      </div>
                      {app.status !== 'pending' && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${app.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {app.status === 'accepted' ? '✅ مقبول' : '❌ مرفوض'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                    {/* Accept / Reject */}
                    {app.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-700 border-green-300 hover:bg-green-50 flex-1 sm:flex-none"
                          isLoading={statusMutation.isPending}
                          onClick={() => statusMutation.mutate({ applicationId: app.id, status: 'accepted' })}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" /> قبول
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-700 border-red-300 hover:bg-red-50 flex-1 sm:flex-none"
                          isLoading={statusMutation.isPending}
                          onClick={() => statusMutation.mutate({ applicationId: app.id, status: 'rejected' })}
                        >
                          <XCircle className="w-4 h-4 mr-1" /> رفض
                        </Button>
                      </>
                    )}

                    {/* Reveal Contact */}
                    {app.contactRevealed ? (
                      <a href={`tel:${app.phone}`} className="flex items-center justify-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-xl font-bold hover:bg-green-200 transition-colors">
                        <Phone className="w-5 h-5" />
                        {app.phone}
                      </a>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => revealMutation.mutate({ applicationId: app.id })}
                        isLoading={revealMutation.isPending}
                      >
                        كشف الرقم (1 رصيد)
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
