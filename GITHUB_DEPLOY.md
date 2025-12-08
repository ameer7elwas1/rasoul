# دليل رفع المشروع على GitHub

## خطوات رفع المشروع

### 1. تهيئة Git (إذا لم يكن موجوداً)
```bash
cd "d:\Projects\HTML\رسول الرحمة"
git init
```

### 2. إضافة جميع الملفات
```bash
git add .
```

### 3. عمل Commit
```bash
git commit -m "رفع نظام إدارة الأقساط الكامل - مجموعة رسول الرحمة"
```

### 4. إضافة Remote Repository
```bash
git remote add origin https://github.com/ameer7elwas1/rasoul.git
```

### 5. رفع الملفات
```bash
git branch -M main
git push -u origin main --force
```

## ملاحظات مهمة

- استخدم `--force` فقط إذا كنت متأكداً من استبدال جميع الملفات الموجودة
- تأكد من وجود ملف `config.js` محلياً ولا ترفعه (يحتوي على مفاتيح Supabase)
- راجع الملفات قبل الرفع للتأكد من عدم وجود معلومات حساسة

