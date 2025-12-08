-- ============================================
-- إصلاح قاعدة البيانات - تشغيل هذا الملف أولاً
-- ============================================

-- إضافة الأعمدة المفقودة في جدول students
ALTER TABLE students ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS updated_by TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5, 2) DEFAULT 0;

-- إصلاح constraint receipt_number - السماح بـ NULL
ALTER TABLE students ALTER COLUMN receipt_number DROP NOT NULL;

-- إزالة constraint القديم لـ receipt_number إذا كان موجوداً
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN 
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'students' 
        AND constraint_name LIKE '%receipt_number%'
        AND constraint_type = 'CHECK'
    LOOP
        EXECUTE 'ALTER TABLE students DROP CONSTRAINT IF EXISTS ' || quote_ident(rec.constraint_name);
    END LOOP;
END $$;

-- إضافة constraint الصحيح لـ receipt_number
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_receipt_number_check;
ALTER TABLE students ADD CONSTRAINT students_receipt_number_check 
    CHECK (receipt_number IS NULL OR LENGTH(receipt_number) >= 1);

-- إضافة constraints للخصومات
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_discount_amount_check;
ALTER TABLE students ADD CONSTRAINT students_discount_amount_check 
    CHECK (discount_amount >= 0);

ALTER TABLE students DROP CONSTRAINT IF EXISTS students_discount_percentage_check;
ALTER TABLE students ADD CONSTRAINT students_discount_percentage_check 
    CHECK (discount_percentage >= 0 AND discount_percentage <= 100);

ALTER TABLE students DROP CONSTRAINT IF EXISTS students_discount_check;
ALTER TABLE students ADD CONSTRAINT students_discount_check 
    CHECK (discount_amount <= annual_fee);

-- تحديث القيم الافتراضية للأعمدة الجديدة
UPDATE students SET discount_amount = 0 WHERE discount_amount IS NULL;
UPDATE students SET discount_percentage = 0 WHERE discount_percentage IS NULL;

-- ============================================
-- تم الإصلاح بنجاح!
-- ============================================

