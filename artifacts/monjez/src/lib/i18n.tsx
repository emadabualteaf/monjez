import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'ar' | 'he';

const dictionaries = {
  ar: {
    welcome: 'مرحباً بك في منجز',
    subtitle: 'سوق العمل الذكي والأسريع',
    phone: 'رقم الهاتف',
    password: 'كلمة المرور',
    name: 'الاسم الكامل',
    role: 'نوع الحساب',
    worker: 'عامل',
    employer: 'صاحب عمل',
    login: 'تسجيل الدخول',
    register: 'إنشاء حساب جديد',
    noAccount: 'ليس لديك حساب؟',
    hasAccount: 'لديك حساب بالفعل؟',
    home: 'الرئيسية',
    myJobs: 'وظائفي',
    applications: 'الطلبات',
    profile: 'حسابي',
    postJob: 'نشر وظيفة',
    credits: 'الرصيد',
    buyCredits: 'شراء رصيد',
    salary: 'الراتب',
    city: 'المدينة',
    distance: 'المسافة',
    apply: 'تقديم طلب',
    applied: 'تم التقديم',
    revealContact: 'إظهار الرقم',
    boostJob: 'ترقية الوظيفة',
    rate: 'تقييم',
    submit: 'إرسال',
    cancel: 'إلغاء',
    jobTitle: 'المسمى الوظيفي',
    description: 'الوصف',
    aiPlaceholder: 'مثال: أحتاج إلى نادل في رهط غداً مقابل 300 شيكل...',
    parseAi: 'تحليل ذكي',
    logout: 'تسجيل الخروج',
    emptyJobs: 'لا توجد وظائف متاحة حالياً',
    emptyApps: 'لم تقم بتقديم أي طلبات بعد',
    status: 'الحالة',
    pending: 'قيد الانتظار',
    accepted: 'مقبول',
    rejected: 'مرفوض',
    filled: 'مكتمل',
    open: 'مفتوح',
    markFilled: 'تحديد كمكتمل',
  },
  he: {
    welcome: 'ברוכים הבאים למונג׳ז',
    subtitle: 'שוק העבודה החכם והמהיר',
    phone: 'מספר טלפון',
    password: 'סיסמה',
    name: 'שם מלא',
    role: 'סוג חשבון',
    worker: 'עובד',
    employer: 'מעסיק',
    login: 'התחברות',
    register: 'צור חשבון חדש',
    noAccount: 'אין לך חשבון?',
    hasAccount: 'יש לך כבר חשבון?',
    home: 'ראשי',
    myJobs: 'המשרות שלי',
    applications: 'בקשות',
    profile: 'פרופיל',
    postJob: 'פרסם משרה',
    credits: 'קרדיטים',
    buyCredits: 'קנה קרדיטים',
    salary: 'שכר',
    city: 'עיר',
    distance: 'מרחק',
    apply: 'הגש מועמדות',
    applied: 'הוגש',
    revealContact: 'חשיפת מספר',
    boostJob: 'קדם משרה',
    rate: 'דרג',
    submit: 'שלח',
    cancel: 'ביטול',
    jobTitle: 'תואר משרה',
    description: 'תיאור',
    aiPlaceholder: 'לדוגמה: צריך מלצר ברהט מחר ב-300 ש״ח...',
    parseAi: 'ניתוח חכם',
    logout: 'התנתק',
    emptyJobs: 'אין משרות זמינות כרגע',
    emptyApps: 'עדיין לא הגשת בקשות',
    status: 'סטטוס',
    pending: 'ממתין',
    accepted: 'התקבל',
    rejected: 'נדחה',
    filled: 'הושלם',
    open: 'פתוח',
    markFilled: 'סמן כהושלם',
  }
};

type DictionaryKey = keyof typeof dictionaries.ar;

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: DictionaryKey) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>('ar');

  const t = (key: DictionaryKey) => {
    return dictionaries[lang][key] || key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      <div dir="rtl" className="w-full min-h-screen text-right">
        {children}
      </div>
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
}
