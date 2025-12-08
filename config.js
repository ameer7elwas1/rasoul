// ============================================
// ملف إعدادات Supabase
// ============================================
// ⚠️ مهم: يجب تحديث القيم التالية بإعدادات Supabase الخاصة بك

const CONFIG = {
    SUPABASE: {
        // استبدل هذه القيم بإعدادات Supabase الخاصة بك
        URL: 'https://vpvvjascwgivdjyyhzwp.supabase.co',
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
    console.error('⚠️ خطأ: إعدادات Supabase غير مكتملة!');
    console.error('يرجى تحديث CONFIG.SUPABASE.URL و CONFIG.SUPABASE.ANON_KEY في ملف config.js');
    console.error('يمكنك الحصول على هذه القيم من لوحة تحكم Supabase:');
    console.error('1. اذهب إلى https://supabase.com/dashboard');
    console.error('2. اختر مشروعك');
    console.error('3. اذهب إلى Settings > API');
    console.error('4. انسخ Project URL و anon/public key');
}

