// ============================================
// ملف إعدادات Supabase
// ============================================
// ⚠️ مهم: يجب تحديث القيم التالية بإعدادات Supabase الخاصة بك

const CONFIG = {
    SUPABASE: {
        // استبدل هذه القيم بإعدادات Supabase الخاصة بك
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

// تحذير إذا كانت القيم الافتراضية
if (CONFIG.SUPABASE.URL === 'YOUR_SUPABASE_URL_HERE' || CONFIG.SUPABASE.ANON_KEY === 'YOUR_SUPABASE_ANON_KEY_HERE') {
    console.warn('⚠️ يرجى تحديث إعدادات Supabase في ملف config.js');
}

