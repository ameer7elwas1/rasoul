// ============================================
// ملف إعدادات Supabase
// ============================================

const CONFIG = {
    SUPABASE: {
        URL: 'https://vpvvjascwgivdjyyhzwp.supabase.co',
        ANON_KEY: ''
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

