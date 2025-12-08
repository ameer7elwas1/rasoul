# دليل الإعداد الكامل - نظام إدارة الأقساط

## معلومات قاعدة البيانات

- **URL**: `https://vpvvjascwgivdjyyhzwp.supabase.co`
- **ANON KEY**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwdnZqYXNjd2dpdmRqeXloendwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MDYxMjYsImV4cCI6MjA2NTM4MjEyNn0.6AR2-MG4x9ugNTXe9jUqx-IwGEtj1m6MCYwQkTsSbUQ`

## خطوات الإعداد

### الخطوة 1: تشغيل ملف SQL في Supabase

1. افتح Supabase Dashboard
2. اذهب إلى SQL Editor
3. شغّل ملف **`database_complete.sql`** - هذا الملف الواحد يحتوي على:
   - جميع الجداول الأساسية والإضافية
   - جميع الـ Functions والـ Triggers
   - البيانات الأولية (المدارس والحسابات)
   - الإعدادات الافتراضية
   - Row Level Security (RLS)

### الخطوة 2: استخدام أداة الإعداد التلقائي (الطريقة الأسهل)

1. افتح ملف `setup-database.html` في المتصفح
2. اضغط على "اختبار الاتصال" للتأكد من الاتصال بقاعدة البيانات
3. اضغط على "إعداد كل شيء تلقائياً" أو قم بالخطوات يدوياً:
   - إنشاء المدارس
   - إنشاء حساب رئيس مجلس الإدارة
   - إنشاء حسابات المدارس
   - إنشاء الإعدادات

### الخطوة 3: التحقق من الحسابات

بعد الإعداد، ستكون لديك الحسابات التالية:

#### رئيس مجلس الإدارة
- **اسم المستخدم**: `admin`
- **كلمة المرور**: `master123`
- **الصلاحيات**: عرض جميع المدارس، إرسال إشعارات، إدارة النظام

#### المدارس والروضات

| المدرسة | اسم المستخدم | كلمة المرور |
|---------|-------------|------------|
| روضة رسول الرحمة | `rawda` | `rawda123` |
| مدرسة رسول الرحمة | `rasoul` | `rasoul123` |
| مدرسة نور الرحمة | `noor` | `noor123` |
| مدرسة نبي الرحمة | `nabi` | `nabi123` |
| ثانوية رسول الرحمة | `thanawiya` | `thanawiya123` |

⚠️ **مهم جداً**: قم بتغيير كلمات المرور الافتراضية فوراً بعد أول تسجيل دخول!

## ملاحظات مهمة

### تشفير كلمات المرور

إذا كانت كلمات المرور غير مشفرة بشكل صحيح، يمكنك استخدام أحد الحلول التالية:

#### الحل 1: استخدام Supabase Auth (موصى به)
- استخدم Supabase Authentication بدلاً من جدول users المخصص
- هذا يوفر تشفير تلقائي وأمان أفضل

#### الحل 2: استخدام RPC Function
في Supabase SQL Editor، شغّل:

```sql
-- إنشاء دالة لتشفير كلمة المرور
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN crypt(password, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql;

-- تحديث كلمات المرور الموجودة
UPDATE users SET password_hash = crypt('master123', gen_salt('bf', 10)) WHERE username = 'admin';
UPDATE users SET password_hash = crypt('rawda123', gen_salt('bf', 10)) WHERE username = 'rawda';
UPDATE users SET password_hash = crypt('rasoul123', gen_salt('bf', 10)) WHERE username = 'rasoul';
UPDATE users SET password_hash = crypt('noor123', gen_salt('bf', 10)) WHERE username = 'noor';
UPDATE users SET password_hash = crypt('nabi123', gen_salt('bf', 10)) WHERE username = 'nabi';
UPDATE users SET password_hash = crypt('thanawiya123', gen_salt('bf', 10)) WHERE username = 'thanawiya';
```

#### الحل 3: استخدام JavaScript (للتطوير فقط)
في ملف `index.html`، يمكنك استخدام مكتبة bcrypt.js للتشفير على العميل (غير آمن للإنتاج).

### التحقق من الإعداد

بعد الإعداد، يمكنك التحقق من البيانات باستخدام هذه الاستعلامات:

```sql
-- عرض جميع المدارس
SELECT * FROM schools ORDER BY name;

-- عرض جميع المستخدمين
SELECT username, full_name, school_id, role, is_admin FROM users ORDER BY role, username;

-- عرض الإعدادات
SELECT key, value, description FROM system_settings ORDER BY category, key;
```

## بدء الاستخدام

1. افتح `index.html` في المتصفح
2. سجّل الدخول باستخدام أحد الحسابات المذكورة أعلاه
3. سيتم توجيهك تلقائياً إلى:
   - لوحة تحكم رئيس مجلس الإدارة (إذا كنت admin)
   - لوحة تحكم المدرسة (إذا كنت مدير مدرسة)

## استكشاف الأخطاء

### مشكلة: لا يمكن الاتصال بقاعدة البيانات
- تأكد من أن URL و ANON KEY صحيحين في `config.js`
- تأكد من أن Supabase Project نشط
- تحقق من إعدادات Row Level Security (RLS)

### مشكلة: لا يمكن تسجيل الدخول
- تأكد من تشغيل ملفات SQL بشكل صحيح
- تحقق من أن كلمات المرور مشفرة بشكل صحيح
- راجع سجل الأخطاء في Console المتصفح (F12)

### مشكلة: الجداول غير موجودة
- تأكد من تشغيل `database_complete.sql` بشكل كامل
- تحقق من وجود جميع الجداول في Supabase Dashboard
- راجع سجل الأخطاء في Supabase SQL Editor

## الدعم

للمساعدة والدعم، يرجى التواصل مع فريق التطوير.

---

**آخر تحديث**: 2025

