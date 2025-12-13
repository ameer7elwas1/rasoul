const CONFIG = {
    SUPABASE: {
        URL: 'https://vpvvjascwgivdjyyhzwp.supabase.co',
        ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwdnZqYXNjd2dpdmRqeXloendwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MDYxMjYsImV4cCI6MjA2NTM4MjEyNn0.6AR2-MG4x9ugNTXe9jUqx-IwGEtj1m6MCYwQkTsSbUQ'
    },
    SECURITY: {
        MAX_LOGIN_ATTEMPTS: 5,
        SESSION_TIMEOUT: 24 * 60 * 60 * 1000
    },
    INSTALLMENT_COUNT: 4,
    DISCOUNTS: {
        SIBLING_2: 0.05,      // 5%
        SIBLING_3_PLUS: 0.10  // 10%
    },
    DEFAULT_FEES: {
        KINDERGARTEN: 1000000,
        ELEMENTARY: 1100000,
        MIDDLE: 1300000
    },
    WHATSAPP: {
        AUTO_SEND: false,
        REMINDER_DAYS: 7,
        COUNTRY_CODE: '+964'
    }
};
const GRADES = {
    rawda: [
        'روضة أولى',
        'روضة ثانية',
        'روضة ثالثة'
    ],
    rasoul: [
        'الصف الأول',
        'الصف الثاني',
        'الصف الثالث',
        'الصف الرابع',
        'الصف الخامس',
        'الصف السادس'
    ],
    noor: [
        'الصف الأول',
        'الصف الثاني',
        'الصف الثالث',
        'الصف الرابع',
        'الصف الخامس',
        'الصف السادس'
    ],
    nabi: [
        'الصف الأول',
        'الصف الثاني',
        'الصف الثالث',
        'الصف الرابع',
        'الصف الخامس',
        'الصف السادس'
    ],
    thanawiya: [
        'الصف الأول الثانوي',
        'الصف الثاني الثانوي',
        'الصف الثالث الثانوي',
        'الصف الرابع الثانوي',
        'الصف الخامس الثانوي',
        'الصف السادس الثانوي'
    ]
};
