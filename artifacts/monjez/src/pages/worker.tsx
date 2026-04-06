import React, { useState, useEffect } from 'react';
import { useListJobs, useApplyToJob, useGetMyApplications, getListJobsQueryKey, getGetMyApplicationsQueryKey } from '@workspace/api-client-react';
import { useI18n } from '@/lib/i18n';
import { Card, Badge, Button, Dialog } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { MapPin, Calendar, Coins, Star, Navigation, Search, SlidersHorizontal, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ReportButton } from '@/components/report-button';

const CITIES = ['الناصرة', 'حيفا', 'القدس', 'تل أبيب', 'الرملة', 'اللد', 'بئر السبع', 'عكا', 'نازرت عيليت', 'أم الفحم', 'الطيبة', 'طمرة', 'شفاعمرو', 'كفر كنا', 'باقة الغربية'];

export function WorkerFeed() {
  const { t } = useI18n();
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterSalaryType, setFilterSalaryType] = useState('');
  const [filterMinSalary, setFilterMinSalary] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
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

  if (isLoading) return (
    <div className="p-8 text-center">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
    </div>
  );

  const jobs = (data?.jobs || []).filter(job => {
    if (search && !job.title.toLowerCase().includes(search.toLowerCase()) && !job.city.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCity && job.city !== filterCity) return false;
    if (filterSalaryType && job.salaryType !== filterSalaryType) return false;
    if (filterMinSalary && job.salary < parseFloat(filterMinSalary)) return false;
    return true;
  });

  const hasFilters = filterCity || filterSalaryType || filterMinSalary;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-primary">{t('home')}</h1>
        {coords && <Badge variant="success" className="px-3 py-1"><Navigation className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0"/> متصل بالموقع</Badge>}
      </div>

      {/* Search + Filter Bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="ابحث عن وظيفة أو مدينة..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-11 pr-10 rtl:pr-10 ltr:pl-10 pl-4 rounded-xl border-2 border-border bg-background text-sm outline-none focus:border-primary transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute left-3 rtl:left-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <Button
          variant={hasFilters ? 'accent' : 'outline'}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="shrink-0"
        >
          <SlidersHorizontal className="w-4 h-4 mr-1 rtl:ml-1 rtl:mr-0" />
          فلتر {hasFilters && `(${[filterCity, filterSalaryType, filterMinSalary].filter(Boolean).length})`}
        </Button>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <Card className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">المدينة</label>
                <select
                  value={filterCity}
                  onChange={e => setFilterCity(e.target.value)}
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
                >
                  <option value="">كل المدن</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">نوع الراتب</label>
                <select
                  value={filterSalaryType}
                  onChange={e => setFilterSalaryType(e.target.value)}
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
                >
                  <option value="">الكل</option>
                  <option value="hourly">بالساعة</option>
                  <option value="daily">باليوم</option>
                  <option value="fixed">مقطوع</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">الحد الأدنى للراتب (₪)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={filterMinSalary}
                  onChange={e => setFilterMinSalary(e.target.value)}
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
                />
              </div>
              {hasFilters && (
                <button
                  onClick={() => { setFilterCity(''); setFilterSalaryType(''); setFilterMinSalary(''); }}
                  className="text-xs text-destructive underline"
                >
                  مسح الفلاتر
                </button>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-sm text-muted-foreground">{jobs.length} وظيفة متاحة</p>

      {jobs.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground border-dashed">
          <p className="text-lg">{search || hasFilters ? 'لا توجد نتائج مطابقة' : t('emptyJobs')}</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job, i) => (
            <motion.div key={job.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="p-5 hover:shadow-hover transition-all cursor-pointer group" onClick={() => setSelectedJob(job)}>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-lg group-hover:text-accent transition-colors line-clamp-2">{job.title}</h3>
                  {job.isBoosted && <Badge variant="accent" className="animate-pulse shrink-0 ml-2">مُمولة</Badge>}
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Coins className="w-4 h-4 text-amber-500 mr-2 rtl:ml-2 rtl:mr-0 shrink-0" />
                    <span className="font-semibold text-foreground">{formatCurrency(job.salary)}</span>
                    <span className="mx-1 text-xs">/ {job.salaryType === 'hourly' ? 'ساعة' : job.salaryType === 'daily' ? 'يوم' : 'مقطوع'}</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 text-blue-500 mr-2 rtl:ml-2 rtl:mr-0 shrink-0" />
                    <span>{job.city}</span>
                    {job.distance != null && <span className="mx-2 text-xs bg-secondary px-2 py-0.5 rounded-md">{job.distance.toFixed(1)} km</span>}
                  </div>
                  {job.jobDate && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4 text-emerald-500 mr-2 rtl:ml-2 rtl:mr-0 shrink-0" />
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

      {/* Job Detail Dialog */}
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
              {selectedJob.location && selectedJob.location !== selectedJob.city && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">الموقع التفصيلي</span>
                  <span className="font-medium text-sm">{selectedJob.location}</span>
                </div>
              )}
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

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                {selectedJob.employer.name.charAt(0)}
              </div>
              <div>
                <p className="font-medium">{selectedJob.employer.name}</p>
                <div className="flex items-center text-sm text-amber-500">
                  <Star className="w-3 h-3 fill-current mr-1" />
                  {selectedJob.employer.trustScore?.toFixed(1) || 'جديد'}
                </div>
              </div>
              <div className="mr-auto rtl:ml-auto rtl:mr-0">
                <ReportButton targetType="job" targetId={selectedJob.id} />
              </div>
            </div>

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

  if (isLoading) return (
    <div className="p-8 text-center">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
    </div>
  );

  const apps = data?.applications || [];

  const statusColor = (s: string) => s === 'accepted' ? 'success' : s === 'rejected' ? 'destructive' : 'default';
  const statusLabel = (s: string) => s === 'accepted' ? '✅ مقبول' : s === 'rejected' ? '❌ مرفوض' : '⏳ قيد المراجعة';

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
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-lg">{(app as any).jobTitle || `وظيفة #${app.jobId}`}</h3>
                    <Badge variant={statusColor(app.status) as any}>{statusLabel(app.status)}</Badge>
                  </div>
                  {(app as any).jobCity && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {(app as any).jobCity}
                      {(app as any).jobSalary && (
                        <span className="mx-2">· {formatCurrency((app as any).jobSalary)} / {(app as any).jobSalaryType === 'hourly' ? 'ساعة' : (app as any).jobSalaryType === 'daily' ? 'يوم' : 'مقطوع'}</span>
                      )}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">تم التقديم: {formatDate(app.appliedAt)}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
