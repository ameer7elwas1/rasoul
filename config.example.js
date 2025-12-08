// ============================================
// ملف إعدادات Supabase - مثال
// ============================================
// انسخ هذا الملف إلى config.js واملأ القيم الصحيحة

const CONFIG = {
    SUPABASE: {
        URL: 'YOUR_SUPABASE_URL_HERE',
        ANON_KEY: 'YOUR_SUPABASE_ANON_KEY_HERE'
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

