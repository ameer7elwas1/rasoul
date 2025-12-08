// ============================================
// ملف إعدادات Supabase
// ============================================

const CONFIG = {
    SUPABASE: {
        URL: 'https://vpvvjascwgivdjyyhzwp.supabase.co',
        ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwdnZqYXNjd2dpdmRqeXloendwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MDYxMjYsImV4cCI6MjA2NTM4MjEyNn0.6AR2-MG4x9ugNTXe9jUqx-IwGEtj1m6MCYwQkTsSbUQ'
    },
    SECURITY: {
        MAX_LOGIN_ATTEMPTS: 5,
        SESSION_TIMEOUT: 24 * 60 * 60 * 1000 // 24 ساعة بالميلي ثانية
    },
    INSTALLMENT_COUNT: 4,
    DISCOUNTS: {
        SIBLING_2: 0.05,      // 5%
        SIBLING_3_PLUS: 0.10  // 10%
    }
};

// تهيئة الإعدادات بشكل صامت

