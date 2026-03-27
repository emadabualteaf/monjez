import React, { useState, useEffect } from 'react';
import { useListJobs, useApplyToJob, useGetMyApplications, getListJobsQueryKey, getGetMyApplicationsQueryKey } from '@workspace/api-client-react';
import { useI18n } from '@/lib/i18n';
import { Card, Badge, Button, Dialog } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { MapPin, Calendar, Coins, Star, Navigation } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';

export function WorkerFeed() {
  const { t } = useI18n();
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log("Geoloc denied")
      );
    }
  }, []);

  const { data, isLoading } = useListJobs({ lat: coords?.lat, lng: coords?.lng });
  const queryClient = useQueryClient();

  const applyMutation = useApplyToJob({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMyApplicationsQueryKey() });
        setSelectedJob(null);
      }
    }
  });

  if (isLoading) return <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div></div>;

  const jobs = data?.jobs || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-primary">{t('home')}</h1>
        {coords && <Badge variant="success" className="px-3 py-1"><Navigation className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0"/> متصل بالموقع</Badge>}
      </div>

      {jobs.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground border-dashed">
          <p className="text-lg">{t('emptyJobs')}</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job, i) => (
            <motion.div key={job.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-5 hover:shadow-hover transition-all cursor-pointer group" onClick={() => setSelectedJob(job)}>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-lg group-hover:text-accent transition-colors">{job.title}</h3>
                  {job.isBoosted && <Badge variant="accent" className="animate-pulse">مُمولة</Badge>}
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Coins className="w-4 h-4 text-amber-500 mr-2 rtl:ml-2 rtl:mr-0" />
                    <span className="font-semibold text-foreground">{formatCurrency(job.salary)}</span>
                    <span className="mx-1 text-xs">/ {job.salaryType === 'hourly' ? 'ساعة' : job.salaryType === 'daily' ? 'يوم' : 'مقطوع'}</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 text-blue-500 mr-2 rtl:ml-2 rtl:mr-0" />
                    <span>{job.city}</span>
                    {job.distance && <span className="mx-2 text-xs bg-secondary px-2 py-0.5 rounded-md">{job.distance.toFixed(1)} km</span>}
                  </div>
                  {job.jobDate && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4 text-emerald-500 mr-2 rtl:ml-2 rtl:mr-0" />
                      <span>{job.jobDate}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                      {job.employer.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{job.employer.name}</p>
                      <div className="flex items-center text-xs text-amber-500">
                        <Star className="w-3 h-3 fill-current" />
                        <span className="mr-1 rtl:ml-1 rtl:mr-0">{job.employer.trustScore?.toFixed(1) || 'جديد'}</span>
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="accent" onClick={(e) => { e.stopPropagation(); setSelectedJob(job); }}>
                    التفاصيل
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog isOpen={!!selectedJob} onClose={() => setSelectedJob(null)} title={selectedJob?.title}>
        {selectedJob && (
          <div className="space-y-6">
            <div className="bg-secondary/50 p-4 rounded-xl space-y-3">
               <div className="flex justify-between items-center">
                 <span className="text-muted-foreground">{t('salary')}</span>
                 <span className="font-bold text-lg text-primary">{formatCurrency(selectedJob.salary)}</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-muted-foreground">{t('city')}</span>
                 <span className="font-medium">{selectedJob.city}</span>
               </div>
               {selectedJob.jobDate && (
                 <div className="flex justify-between items-center">
                   <span className="text-muted-foreground">التاريخ</span>
                   <span className="font-medium">{selectedJob.jobDate}</span>
                 </div>
               )}
            </div>
            
            {selectedJob.description && (
              <div>
                <h4 className="font-bold mb-2">{t('description')}</h4>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{selectedJob.description}</p>
              </div>
            )}

            <Button 
              className="w-full" 
              size="lg" 
              variant="accent"
              isLoading={applyMutation.isPending}
              onClick={() => applyMutation.mutate({ jobId: selectedJob.id })}
            >
              {t('apply')}
            </Button>
          </div>
        )}
      </Dialog>
    </div>
  );
}

export function WorkerApplications() {
  const { t } = useI18n();
  const { data, isLoading } = useGetMyApplications();

  if (isLoading) return <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div></div>;

  const apps = data?.applications || [];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary mb-8">{t('applications')}</h1>
      
      {apps.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground border-dashed">
          <p className="text-lg">{t('emptyApps')}</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {apps.map((app, i) => (
             <motion.div key={app.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
               <Card className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div>
                   <div className="flex items-center gap-3 mb-2">
                     <h3 className="font-bold text-lg">طلب وظيفة #{app.jobId}</h3>
                     <Badge variant={app.status === 'accepted' ? 'success' : app.status === 'rejected' ? 'destructive' : 'default' as any}>
                       {t(app.status as any)}
                     </Badge>
                   </div>
                   <p className="text-sm text-muted-foreground">صاحب العمل: <span className="font-medium text-foreground">{app.worker.name}</span></p>
                   <p className="text-xs text-muted-foreground mt-1">تم التقديم: {formatDate(app.appliedAt)}</p>
                 </div>
                 
                 {app.status === 'accepted' && (
                   <Button variant="outline" size="sm">تواصل</Button>
                 )}
               </Card>
             </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
