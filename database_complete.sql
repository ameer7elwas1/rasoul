-- ============================================
-- قاعدة البيانات الكاملة - نظام إدارة الأقساط
-- مجموعة رسول الرحمة
-- ============================================
-- هذا الملف يحتوي على جميع جداول وقواعد قاعدة البيانات
-- شغّله مرة واحدة في Supabase SQL Editor

-- ============================================
-- Extension للتشفير
-- ============================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- ENUMS
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM ('unpaid', 'partial', 'paid');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_type') THEN
        CREATE TYPE payment_method_type AS ENUM ('cash', 'bank_transfer', 'check', 'other');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'school_admin', 'user');
    END IF;
END $$;

-- ============================================
-- TABLES - الجداول الأساسية
-- ============================================

-- جدول المدارس
-- ملاحظة: إذا كان الجدول موجوداً مسبقاً بـ UUID، سيتم حذفه وإعادة إنشائه
DO $$
BEGIN
    -- حذف Foreign Keys أولاً
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'whatsapp_messages_school_id_fkey') THEN
        ALTER TABLE whatsapp_messages DROP CONSTRAINT whatsapp_messages_school_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'notifications_school_id_fkey') THEN
        ALTER TABLE notifications DROP CONSTRAINT notifications_school_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'students_school_id_fkey') THEN
        ALTER TABLE students DROP CONSTRAINT students_school_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'users_school_id_fkey') THEN
        ALTER TABLE users DROP CONSTRAINT users_school_id_fkey;
    END IF;
    
    -- التحقق من وجود الجدول ونوع عمود id
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'schools' 
        AND table_schema = 'public'
    ) THEN
        -- التحقق من نوع عمود id
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'schools' 
            AND column_name = 'id' 
            AND data_type = 'uuid'
        ) THEN
            -- حفظ البيانات (فقط الأعمدة الأساسية التي نعرف أنها موجودة دائماً)
            CREATE TABLE IF NOT EXISTS schools_backup AS 
            SELECT name, code, is_active
            FROM schools;
            
            -- حذف الجدول
            DROP TABLE IF EXISTS schools CASCADE;
        END IF;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS schools (
    id TEXT PRIMARY KEY CHECK (id ~ '^[a-z0-9_]+$'),
    name TEXT NOT NULL CHECK (LENGTH(name) >= 2 AND LENGTH(name) <= 200),
    code TEXT UNIQUE,
    address TEXT,
    phone TEXT CHECK (phone IS NULL OR phone ~ '^[0-9+\-\s()]+$'),
    email TEXT CHECK (email IS NULL OR email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    is_active BOOLEAN DEFAULT TRUE,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT schools_name_unique UNIQUE (name)
);

-- جدول المستخدمين
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL CHECK (LENGTH(username) >= 3 AND LENGTH(username) <= 50 AND username ~ '^[a-z0-9_]+$'),
    password_hash TEXT NOT NULL CHECK (LENGTH(password_hash) >= 60),
    email TEXT CHECK (email IS NULL OR email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    full_name TEXT CHECK (full_name IS NULL OR LENGTH(full_name) <= 200),
    school_id TEXT REFERENCES schools(id) ON DELETE SET NULL,
    role user_role DEFAULT 'user',
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by BIGINT REFERENCES users(id),
    CONSTRAINT users_admin_check CHECK (
        (is_admin = TRUE AND school_id IS NULL) OR 
        (is_admin = FALSE)
    )
);

-- إضافة الأعمدة المفقودة إذا كان الجدول موجوداً مسبقاً
DO $$
DECLARE
    rec RECORD;
BEGIN
    -- التحقق من نوع عمود school_id وتحويله من UUID إلى TEXT إذا لزم الأمر
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'school_id'
        AND data_type = 'uuid'
    ) THEN
        -- حذف Foreign Key أولاً
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'users' 
            AND constraint_name = 'users_school_id_fkey'
        ) THEN
            ALTER TABLE users DROP CONSTRAINT users_school_id_fkey;
        END IF;
        
        -- حذف القيم الموجودة لأنها UUID ولا يمكن تحويلها مباشرة
        UPDATE users SET school_id = NULL WHERE school_id IS NOT NULL;
        
        -- حذف العمود وإعادة إنشائه من نوع TEXT
        ALTER TABLE users DROP COLUMN school_id;
        ALTER TABLE users ADD COLUMN school_id TEXT;
        
        -- إعادة إضافة Foreign Key
        ALTER TABLE users 
        ADD CONSTRAINT users_school_id_fkey 
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL;
    END IF;
    
    -- إضافة عمود school_id إذا لم يكن موجوداً
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'school_id'
    ) THEN
        ALTER TABLE users ADD COLUMN school_id TEXT REFERENCES schools(id) ON DELETE SET NULL;
    END IF;
    
    -- إضافة عمود is_admin إذا لم يكن موجوداً
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_admin'
    ) THEN
        ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- التحقق من نوع عمود role وتحويله إلى user_role ENUM إذا لزم الأمر
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'role'
        AND udt_name != 'user_role'
    ) THEN
        -- حذف الـ Views التي تعتمد على عمود role أولاً
        DROP VIEW IF EXISTS users_statistics CASCADE;
        
        -- حذف constraint إذا كان موجوداً
        FOR rec IN 
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'users' 
            AND constraint_name LIKE '%role%'
        LOOP
            EXECUTE 'ALTER TABLE users DROP CONSTRAINT IF EXISTS ' || quote_ident(rec.constraint_name);
        END LOOP;
        
        -- حفظ القيم الحالية وتحويلها
        CREATE TEMP TABLE IF NOT EXISTS users_role_backup AS 
        SELECT id, role::text as old_role FROM users WHERE role IS NOT NULL;
        
        -- حذف العمود القديم
        ALTER TABLE users DROP COLUMN IF EXISTS role CASCADE;
        
        -- إضافة العمود الجديد من نوع user_role
        ALTER TABLE users ADD COLUMN role user_role DEFAULT 'user';
        
        -- استعادة القيم المحولة
        UPDATE users u
        SET role = CASE 
            WHEN b.old_role IN ('admin', 'school_admin', 'user') THEN b.old_role::user_role
            WHEN b.old_role = 'active' THEN 'user'::user_role
            WHEN b.old_role = 'inactive' THEN 'user'::user_role
            ELSE 'user'::user_role
        END
        FROM users_role_backup b
        WHERE u.id = b.id;
        
        -- حذف الجدول المؤقت
        DROP TABLE IF EXISTS users_role_backup;
    END IF;
    
    -- إضافة عمود role إذا لم يكن موجوداً
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        ALTER TABLE users ADD COLUMN role user_role DEFAULT 'user';
    END IF;
    
    -- إضافة عمود is_active إذا لم يكن موجوداً
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
    
    -- إضافة عمود full_name إذا لم يكن موجوداً
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'full_name'
    ) THEN
        ALTER TABLE users ADD COLUMN full_name TEXT;
    END IF;
    
    -- إضافة عمود email إذا لم يكن موجوداً
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'email'
    ) THEN
        ALTER TABLE users ADD COLUMN email TEXT;
    END IF;
END $$;

-- جدول الطلاب
-- التحقق من نوع عمود school_id وتحويله من UUID إلى TEXT إذا لزم الأمر
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'students' 
        AND column_name = 'school_id'
        AND data_type = 'uuid'
    ) THEN
        -- حذف جميع الـ Views التي تعتمد على school_id في جدول students
        DROP VIEW IF EXISTS students_statistics CASCADE;
        DROP VIEW IF EXISTS monthly_payments_statistics CASCADE;
        DROP VIEW IF EXISTS overdue_students CASCADE;
        DROP VIEW IF EXISTS users_statistics CASCADE;
        
        -- حذف Foreign Key أولاً
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'students' 
            AND constraint_name = 'students_school_id_fkey'
        ) THEN
            ALTER TABLE students DROP CONSTRAINT students_school_id_fkey;
        END IF;
        
        -- إزالة constraint NOT NULL إذا كان موجوداً
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'students' 
            AND column_name = 'school_id'
            AND is_nullable = 'NO'
        ) THEN
            ALTER TABLE students ALTER COLUMN school_id DROP NOT NULL;
        END IF;
        
        -- حذف القيم الموجودة لأنها UUID ولا يمكن تحويلها مباشرة
        UPDATE students SET school_id = NULL WHERE school_id IS NOT NULL;
        
        -- حذف العمود وإعادة إنشائه من نوع TEXT
        ALTER TABLE students DROP COLUMN school_id CASCADE;
        ALTER TABLE students ADD COLUMN school_id TEXT;
        
        -- إعادة إضافة Foreign Key
        ALTER TABLE students 
        ADD CONSTRAINT students_school_id_fkey 
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT;
        
        -- إضافة constraint NOT NULL بعد إعادة إنشاء العمود
        -- لكن فقط إذا لم يكن هناك طلاب بدون school_id
        IF NOT EXISTS (SELECT 1 FROM students WHERE school_id IS NULL) THEN
            ALTER TABLE students ALTER COLUMN school_id SET NOT NULL;
        END IF;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (LENGTH(TRIM(name)) >= 2 AND LENGTH(name) <= 200),
    guardian_name TEXT NOT NULL CHECK (LENGTH(TRIM(guardian_name)) >= 2 AND LENGTH(guardian_name) <= 200),
    mother_name TEXT NOT NULL CHECK (LENGTH(TRIM(mother_name)) >= 2 AND LENGTH(mother_name) <= 200),
    grade TEXT NOT NULL CHECK (LENGTH(grade) >= 1 AND LENGTH(grade) <= 50),
    phone TEXT CHECK (phone IS NULL OR (LENGTH(phone) >= 8 AND phone ~ '^[0-9+\-\s()]+$')),
    school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    annual_fee NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (annual_fee >= 0),
    final_fee NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (final_fee >= 0),
    has_sibling BOOLEAN DEFAULT FALSE,
    discount_amount NUMERIC(15, 2) DEFAULT 0 CHECK (discount_amount >= 0),
    discount_percentage NUMERIC(5, 2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    receipt_number TEXT UNIQUE CHECK (receipt_number IS NULL OR LENGTH(receipt_number) >= 1),
    registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT CHECK (notes IS NULL OR LENGTH(notes) <= 1000),
    installments JSONB DEFAULT '[]'::jsonb,
    status payment_status DEFAULT 'unpaid',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT,
    updated_by TEXT,
    CONSTRAINT students_final_fee_check CHECK (final_fee <= annual_fee),
    CONSTRAINT students_discount_check CHECK (discount_amount <= annual_fee)
);

-- إضافة الأعمدة المفقودة في جدول students إذا كان الجدول موجوداً مسبقاً
DO $$
BEGIN
    -- إضافة عمود guardian_name إذا لم يكن موجوداً
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'students' AND column_name = 'guardian_name'
    ) THEN
        ALTER TABLE students ADD COLUMN guardian_name TEXT;
        -- تحديث القيم الموجودة بقيمة افتراضية إذا كانت NULL
        UPDATE students SET guardian_name = 'غير محدد' WHERE guardian_name IS NULL;
        -- إضافة constraint NOT NULL بعد التحديث
        ALTER TABLE students ALTER COLUMN guardian_name SET NOT NULL;
        -- إضافة constraint CHECK إذا لم يكن موجوداً
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'students' 
            AND constraint_name = 'students_guardian_name_check'
        ) THEN
            ALTER TABLE students ADD CONSTRAINT students_guardian_name_check 
                CHECK (LENGTH(TRIM(guardian_name)) >= 2 AND LENGTH(guardian_name) <= 200);
        END IF;
    END IF;
    
    -- إضافة عمود mother_name إذا لم يكن موجوداً
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'students' AND column_name = 'mother_name'
    ) THEN
        ALTER TABLE students ADD COLUMN mother_name TEXT;
        -- تحديث القيم الموجودة بقيمة افتراضية إذا كانت NULL
        UPDATE students SET mother_name = 'غير محدد' WHERE mother_name IS NULL;
        -- إضافة constraint NOT NULL بعد التحديث
        ALTER TABLE students ALTER COLUMN mother_name SET NOT NULL;
        -- إضافة constraint CHECK إذا لم يكن موجوداً
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'students' 
            AND constraint_name = 'students_mother_name_check'
        ) THEN
            ALTER TABLE students ADD CONSTRAINT students_mother_name_check 
                CHECK (LENGTH(TRIM(mother_name)) >= 2 AND LENGTH(mother_name) <= 200);
        END IF;
    END IF;
    
    -- إضافة عمود status إذا لم يكن موجوداً
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'students' AND column_name = 'status'
    ) THEN
        ALTER TABLE students ADD COLUMN status payment_status DEFAULT 'unpaid';
        
        -- تحديث القيم الموجودة بناءً على المدفوعات
        UPDATE students s
        SET status = CASE 
            WHEN COALESCE((
                SELECT SUM(amount) 
                FROM payments 
                WHERE student_id = s.id
            ), 0) >= s.final_fee THEN 'paid'::payment_status
            WHEN COALESCE((
                SELECT SUM(amount) 
                FROM payments 
                WHERE student_id = s.id
            ), 0) > 0 THEN 'partial'::payment_status
            ELSE 'unpaid'::payment_status
        END;
    END IF;
    
    -- إضافة عمود is_active إذا لم يكن موجوداً
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'students' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE students ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
    
    -- إضافة عمود installments إذا لم يكن موجوداً
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'students' AND column_name = 'installments'
    ) THEN
        ALTER TABLE students ADD COLUMN installments JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    -- إضافة عمود registration_date إذا لم يكن موجوداً
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'students' AND column_name = 'registration_date'
    ) THEN
        ALTER TABLE students ADD COLUMN registration_date DATE DEFAULT CURRENT_DATE;
    END IF;
    
    -- إضافة عمود created_by إذا لم يكن موجوداً
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'students' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE students ADD COLUMN created_by TEXT;
    END IF;
    
    -- إضافة عمود updated_by إذا لم يكن موجوداً
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'students' AND column_name = 'updated_by'
    ) THEN
        ALTER TABLE students ADD COLUMN updated_by TEXT;
    END IF;
END $$;

-- جدول المدفوعات
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL CHECK (installment_number >= 1 AND installment_number <= 12),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method payment_method_type NOT NULL DEFAULT 'cash',
    receipt_number TEXT UNIQUE CHECK (receipt_number IS NULL OR LENGTH(receipt_number) >= 1),
    notes TEXT CHECK (notes IS NULL OR LENGTH(notes) <= 1000),
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT payments_date_check CHECK (payment_date <= CURRENT_DATE)
);

-- جدول الرسائل
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id TEXT NOT NULL CHECK (LENGTH(sender_id) >= 1),
    sender_name TEXT NOT NULL CHECK (LENGTH(sender_name) >= 2),
    receiver_id TEXT CHECK (receiver_id IS NULL OR LENGTH(receiver_id) >= 1),
    receiver_name TEXT CHECK (receiver_name IS NULL OR LENGTH(receiver_name) >= 2),
    message TEXT NOT NULL CHECK (LENGTH(TRIM(message)) >= 1 AND LENGTH(message) <= 5000),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT messages_sender_receiver_check CHECK (sender_id != receiver_id OR receiver_id IS NULL)
);

-- جدول الإشعارات
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    school_id TEXT REFERENCES schools(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (LENGTH(TRIM(title)) >= 1 AND LENGTH(title) <= 200),
    message TEXT NOT NULL CHECK (LENGTH(TRIM(message)) >= 1 AND LENGTH(message) <= 2000),
    type notification_type DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    action_url TEXT CHECK (action_url IS NULL OR LENGTH(action_url) <= 500),
    metadata JSONB DEFAULT '{}'::jsonb,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT notifications_target_check CHECK (user_id IS NOT NULL OR school_id IS NOT NULL)
);

-- جدول سجل الأنشطة
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id TEXT,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    user_id BIGINT REFERENCES users(id),
    user_name TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول الإعدادات العامة
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY CHECK (key ~ '^[a-z0-9_]+$'),
    value JSONB NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    is_public BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by BIGINT REFERENCES users(id)
);

-- ============================================
-- TABLES - جداول إضافية
-- ============================================

-- جدول المحادثات المباشرة
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id TEXT NOT NULL CHECK (LENGTH(sender_id) >= 1),
    sender_name TEXT NOT NULL CHECK (LENGTH(sender_name) >= 2),
    sender_type TEXT NOT NULL CHECK (sender_type IN ('admin', 'school')),
    receiver_id TEXT CHECK (receiver_id IS NULL OR LENGTH(receiver_id) >= 1),
    receiver_name TEXT CHECK (receiver_name IS NULL OR LENGTH(receiver_name) >= 2),
    receiver_type TEXT CHECK (receiver_type IS NULL OR receiver_type IN ('admin', 'school')),
    last_message TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE,
    unread_count INTEGER DEFAULT 0,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول رسائل المحادثات
CREATE TABLE IF NOT EXISTS conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL CHECK (LENGTH(sender_id) >= 1),
    sender_name TEXT NOT NULL CHECK (LENGTH(sender_name) >= 2),
    message TEXT NOT NULL CHECK (LENGTH(TRIM(message)) >= 1 AND LENGTH(message) <= 5000),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول إشعارات رئيس مجلس الإدارة
CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id TEXT NOT NULL CHECK (admin_id = 'admin'),
    title TEXT NOT NULL CHECK (LENGTH(TRIM(title)) >= 1 AND LENGTH(title) <= 200),
    message TEXT NOT NULL CHECK (LENGTH(TRIM(message)) >= 1 AND LENGTH(message) <= 2000),
    notification_type notification_type DEFAULT 'info',
    target_schools TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_read_by JSONB DEFAULT '{}'::jsonb,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول رسائل واتساب
-- ملاحظة: حذف Foreign Key الموجود إذا كان من نوع خاطئ
DO $$
BEGIN
    -- حذف Foreign Key إذا كان موجوداً
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'whatsapp_messages_school_id_fkey'
        AND table_name = 'whatsapp_messages'
    ) THEN
        ALTER TABLE whatsapp_messages DROP CONSTRAINT IF EXISTS whatsapp_messages_school_id_fkey;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    guardian_phone TEXT NOT NULL CHECK (LENGTH(guardian_phone) >= 8),
    message TEXT NOT NULL CHECK (LENGTH(TRIM(message)) >= 1 AND LENGTH(message) <= 2000),
    message_type TEXT NOT NULL CHECK (message_type IN ('reminder', 'notification', 'custom')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    school_id TEXT,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إضافة Foreign Key بعد التأكد من أن schools.id هو TEXT
DO $$
BEGIN
    -- التحقق من أن schools.id هو TEXT قبل إضافة Foreign Key
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'schools' 
        AND column_name = 'id' 
        AND data_type = 'text'
    ) THEN
        -- إضافة Foreign Key فقط إذا لم يكن موجوداً
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'whatsapp_messages_school_id_fkey'
            AND table_name = 'whatsapp_messages'
        ) THEN
            ALTER TABLE whatsapp_messages 
            ADD CONSTRAINT whatsapp_messages_school_id_fkey 
            FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- جدول الفئات (Categories)
CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL CHECK (LENGTH(TRIM(name)) >= 1),
    name_ar TEXT NOT NULL CHECK (LENGTH(TRIM(name_ar)) >= 1),
    icon TEXT DEFAULT 'tv',
    color TEXT DEFAULT '#2196F3',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes للفئات
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);

-- ============================================
-- INDEXES
-- ============================================

-- Indexes للطلاب
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);
CREATE INDEX IF NOT EXISTS idx_students_receipt_number ON students(receipt_number) WHERE receipt_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_registration_date ON students(registration_date);
CREATE INDEX IF NOT EXISTS idx_students_created_at ON students(created_at DESC);

-- Indexes للمستخدمين
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_school_id ON users(school_id) WHERE school_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Indexes للرسائل
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id) WHERE receiver_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read) WHERE is_read = FALSE;

-- Indexes للإشعارات
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_school_id ON notifications(school_id) WHERE school_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read) WHERE is_read = FALSE;

-- Indexes للمدفوعات
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_receipt_number ON payments(receipt_number) WHERE receipt_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- Indexes للمحادثات
CREATE INDEX IF NOT EXISTS idx_conversations_sender ON conversations(sender_id);
CREATE INDEX IF NOT EXISTS idx_conversations_receiver ON conversations(receiver_id) WHERE receiver_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_created_at ON conversation_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_student ON whatsapp_messages(student_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON whatsapp_messages(created_at DESC);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function لتشفير كلمة المرور
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN crypt(password, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql;

-- Function للتحقق من كلمة المرور
CREATE OR REPLACE FUNCTION verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN hash = crypt(password, hash);
END;
$$ LANGUAGE plpgsql;

-- Function لتحديث آخر رسالة في المحادثة
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET last_message = NEW.message,
        last_message_at = NEW.created_at,
        updated_at = NOW(),
        unread_count = unread_count + 1
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function لتحديث unread_count عند قراءة الرسائل
CREATE OR REPLACE FUNCTION mark_conversation_messages_read(conv_id UUID, reader_id TEXT)
RETURNS void AS $$
BEGIN
    UPDATE conversation_messages
    SET is_read = TRUE,
        read_at = NOW()
    WHERE conversation_id = conv_id
      AND sender_id != reader_id
      AND is_read = FALSE;
    
    UPDATE conversations
    SET unread_count = 0
    WHERE id = conv_id;
END;
$$ LANGUAGE plpgsql;

-- Function لحساب المبلغ المدفوع للطالب
CREATE OR REPLACE FUNCTION calculate_student_paid_amount(student_uuid UUID)
RETURNS NUMERIC AS $$
DECLARE
    total_paid NUMERIC;
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM payments
    WHERE student_id = student_uuid;
    
    RETURN total_paid;
END;
$$ LANGUAGE plpgsql;

-- Function لحساب حالة الدفع للطالب
CREATE OR REPLACE FUNCTION calculate_student_payment_status(student_uuid UUID)
RETURNS payment_status AS $$
DECLARE
    student_final_fee NUMERIC;
    total_paid NUMERIC;
    payment_status_val payment_status;
BEGIN
    -- الحصول على المبلغ النهائي للطالب
    SELECT final_fee INTO student_final_fee
    FROM students
    WHERE id = student_uuid;
    
    -- حساب المبلغ المدفوع
    SELECT calculate_student_paid_amount(student_uuid) INTO total_paid;
    
    -- تحديد الحالة
    IF total_paid >= student_final_fee THEN
        payment_status_val := 'paid';
    ELSIF total_paid > 0 THEN
        payment_status_val := 'partial';
    ELSE
        payment_status_val := 'unpaid';
    END IF;
    
    RETURN payment_status_val;
END;
$$ LANGUAGE plpgsql;

-- Function لتحديث حالة الطالب تلقائياً
CREATE OR REPLACE FUNCTION update_student_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    student_uuid UUID;
    new_status payment_status;
BEGIN
    -- تحديد معرف الطالب
    IF TG_OP = 'DELETE' THEN
        student_uuid := OLD.student_id;
    ELSE
        student_uuid := NEW.student_id;
    END IF;
    
    -- حساب الحالة الجديدة
    SELECT calculate_student_payment_status(student_uuid) INTO new_status;
    
    -- تحديث حالة الطالب
    UPDATE students
    SET status = new_status,
        updated_at = NOW()
    WHERE id = student_uuid;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function لتحديث أقساط الطالب في JSONB بناءً على المدفوعات
CREATE OR REPLACE FUNCTION update_student_installments_from_payments(student_uuid UUID)
RETURNS void AS $$
DECLARE
    student_record RECORD;
    installment_record RECORD;
    paid_amount NUMERIC;
    updated_installments JSONB;
    installment JSONB;
BEGIN
    -- الحصول على بيانات الطالب
    SELECT * INTO student_record FROM students WHERE id = student_uuid;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- تهيئة مصفوفة الأقساط المحدثة
    updated_installments := student_record.installments;
    
    -- تحديث كل قسط بناءً على المدفوعات
    FOR installment_record IN 
        SELECT installment_number, SUM(amount) as total_paid
        FROM payments
        WHERE student_id = student_uuid
        GROUP BY installment_number
    LOOP
        -- البحث عن القسط في JSONB وتحديثه
        FOR i IN 0..jsonb_array_length(updated_installments) - 1 LOOP
            installment := updated_installments->i;
            
            IF (installment->>'installment_number')::INTEGER = installment_record.installment_number THEN
                -- تحديث المبلغ المدفوع
                updated_installments := jsonb_set(
                    updated_installments,
                    ARRAY[i::text, 'amount_paid'],
                    to_jsonb(installment_record.total_paid)
                );
                
                -- تحديث تاريخ الدفع إذا كان هناك دفعة
                IF installment_record.total_paid > 0 THEN
                    updated_installments := jsonb_set(
                        updated_installments,
                        ARRAY[i::text, 'payment_date'],
                        to_jsonb(CURRENT_DATE::text)
                    );
                END IF;
                
                EXIT;
            END IF;
        END LOOP;
    END LOOP;
    
    -- تحديث الأقساط في جدول الطلاب
    UPDATE students
    SET installments = updated_installments,
        updated_at = NOW()
    WHERE id = student_uuid;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Triggers لتحديث updated_at
DROP TRIGGER IF EXISTS update_schools_updated_at ON schools;
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON schools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_students_updated_at ON students;
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger لتحديث المحادثة عند إضافة رسالة جديدة
DROP TRIGGER IF EXISTS trigger_update_conversation ON conversation_messages;
CREATE TRIGGER trigger_update_conversation
    AFTER INSERT ON conversation_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message();

-- Triggers لتحديث حالة الطالب عند إضافة/تعديل/حذف دفعة
DROP TRIGGER IF EXISTS trigger_update_student_status_on_payment_insert ON payments;
CREATE TRIGGER trigger_update_student_status_on_payment_insert
    AFTER INSERT ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_student_payment_status();

DROP TRIGGER IF EXISTS trigger_update_student_status_on_payment_update ON payments;
CREATE TRIGGER trigger_update_student_status_on_payment_update
    AFTER UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_student_payment_status();

DROP TRIGGER IF EXISTS trigger_update_student_status_on_payment_delete ON payments;
CREATE TRIGGER trigger_update_student_status_on_payment_delete
    AFTER DELETE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_student_payment_status();

-- ============================================
-- INITIAL DATA - البيانات الأولية
-- ============================================

-- إدراج المدارس الافتراضية
INSERT INTO schools (id, name, code, is_active) VALUES
    ('rawda', 'روضة رسول الرحمة', 'RAWDA', TRUE),
    ('rasoul', 'مدرسة رسول الرحمة', 'RASOUL', TRUE),
    ('noor', 'مدرسة نور الرحمة', 'NOOR', TRUE),
    ('nabi', 'مدرسة نبي الرحمة', 'NABI', TRUE),
    ('thanawiya', 'ثانوية رسول الرحمة', 'THANAWIYA', TRUE)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    code = EXCLUDED.code,
    is_active = TRUE,
    updated_at = NOW();

-- استعادة البيانات من النسخة الاحتياطية (إن وجدت)
DO $$
DECLARE
    backup_row RECORD;
    new_id TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schools_backup') THEN
        FOR backup_row IN SELECT * FROM schools_backup LOOP
            -- البحث عن مدرسة مطابقة بالاسم أو الكود
            SELECT id INTO new_id
            FROM schools
            WHERE LOWER(name) = LOWER(backup_row.name)
               OR (backup_row.code IS NOT NULL AND LOWER(code) = LOWER(backup_row.code))
            LIMIT 1;
            
            -- إذا لم نجد مطابقة، نستخدم المعرف الافتراضي بناءً على الكود أو الاسم
            IF new_id IS NULL THEN
                -- محاولة استخراج معرف من الكود أولاً
                IF backup_row.code IS NOT NULL AND backup_row.code != '' THEN
                    new_id := LOWER(REGEXP_REPLACE(backup_row.code, '[^a-z0-9_]', '_', 'g'));
                    new_id := REGEXP_REPLACE(new_id, '_+', '_', 'g');
                    new_id := TRIM(BOTH '_' FROM new_id);
                END IF;
                
                -- إذا لم نستطع استخراج معرف من الكود، استخدم الاسم
                IF new_id IS NULL OR new_id = '' THEN
                    new_id := LOWER(REGEXP_REPLACE(backup_row.name, '[^a-z0-9_]', '_', 'g'));
                    new_id := REGEXP_REPLACE(new_id, '_+', '_', 'g');
                    new_id := TRIM(BOTH '_' FROM new_id);
                    new_id := SUBSTRING(new_id FROM 1 FOR 50);
                END IF;
                
                -- التأكد من أن المعرف صالح
                IF new_id IS NULL OR new_id = '' OR new_id !~ '^[a-z0-9_]+$' OR LENGTH(new_id) < 3 THEN
                    new_id := 'school_' || ABS(HASHTEXT(COALESCE(backup_row.name, 'unknown')::text))::text;
                END IF;
                
                -- إدراج المدرسة (الأعمدة الأساسية فقط)
                INSERT INTO schools (id, name, code, is_active)
                VALUES (
                    new_id,
                    backup_row.name,
                    backup_row.code,
                    COALESCE(backup_row.is_active, TRUE)
                )
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    code = EXCLUDED.code,
                    updated_at = NOW();
            ELSE
                -- تحديث البيانات إذا كانت المدرسة موجودة
                UPDATE schools SET
                    name = backup_row.name,
                    code = backup_row.code,
                    updated_at = NOW()
                WHERE id = new_id;
            END IF;
        END LOOP;
        
        -- حذف النسخة الاحتياطية
        DROP TABLE IF EXISTS schools_backup;
    END IF;
END $$;

-- إدراج حساب رئيس مجلس الإدارة
INSERT INTO users (username, password_hash, role, full_name, is_admin, is_active) VALUES
    ('admin', crypt('master123', gen_salt('bf', 10)), 'admin', 'رئيس مجلس الإدارة', TRUE, TRUE)
ON CONFLICT (username) DO UPDATE SET 
    password_hash = crypt('master123', gen_salt('bf', 10)),
    role = 'admin',
    is_admin = TRUE,
    full_name = 'رئيس مجلس الإدارة',
    is_active = TRUE,
    updated_at = NOW();

-- إدراج حسابات المدارس
INSERT INTO users (username, password_hash, school_id, role, full_name, is_admin, is_active) VALUES
    ('rawda', crypt('rawda123', gen_salt('bf', 10)), 'rawda', 'school_admin', 'مدير روضة رسول الرحمة', FALSE, TRUE),
    ('rasoul', crypt('rasoul123', gen_salt('bf', 10)), 'rasoul', 'school_admin', 'مدير مدرسة رسول الرحمة', FALSE, TRUE),
    ('noor', crypt('noor123', gen_salt('bf', 10)), 'noor', 'school_admin', 'مدير مدرسة نور الرحمة', FALSE, TRUE),
    ('nabi', crypt('nabi123', gen_salt('bf', 10)), 'nabi', 'school_admin', 'مدير مدرسة نبي الرحمة', FALSE, TRUE),
    ('thanawiya', crypt('thanawiya123', gen_salt('bf', 10)), 'thanawiya', 'school_admin', 'مدير ثانوية رسول الرحمة', FALSE, TRUE)
ON CONFLICT (username) DO UPDATE SET 
    password_hash = CASE 
        WHEN EXCLUDED.username = 'rawda' THEN crypt('rawda123', gen_salt('bf', 10))
        WHEN EXCLUDED.username = 'rasoul' THEN crypt('rasoul123', gen_salt('bf', 10))
        WHEN EXCLUDED.username = 'noor' THEN crypt('noor123', gen_salt('bf', 10))
        WHEN EXCLUDED.username = 'nabi' THEN crypt('nabi123', gen_salt('bf', 10))
        WHEN EXCLUDED.username = 'thanawiya' THEN crypt('thanawiya123', gen_salt('bf', 10))
        ELSE users.password_hash
    END,
    school_id = EXCLUDED.school_id,
    role = COALESCE(EXCLUDED.role, 'school_admin'),
    full_name = EXCLUDED.full_name,
    is_admin = COALESCE(EXCLUDED.is_admin, FALSE),
    is_active = COALESCE(EXCLUDED.is_active, TRUE),
    updated_at = NOW();

-- إدراج الإعدادات الافتراضية
INSERT INTO system_settings (key, value, description, category, is_public) VALUES
    ('default_annual_fee_kindergarten', '{"value": 1000000}', 'المبلغ السنوي الافتراضي للروضة', 'fees', TRUE),
    ('default_annual_fee_elementary', '{"value": 1100000}', 'المبلغ السنوي الافتراضي للمرحلة الابتدائية', 'fees', TRUE),
    ('default_annual_fee_middle', '{"value": 1300000}', 'المبلغ السنوي الافتراضي للمرحلة المتوسطة', 'fees', TRUE),
    ('default_installment_count', '{"value": 4}', 'عدد الدفعات الافتراضي', 'fees', TRUE),
    ('sibling_discount_2', '{"percentage": 5}', 'خصم الإخوة (2 أخوة)', 'discounts', TRUE),
    ('sibling_discount_3_plus', '{"percentage": 10}', 'خصم الإخوة (3+ أخوة)', 'discounts', TRUE),
    ('whatsapp_auto_send', '{"enabled": false}', 'إرسال إشعارات واتساب تلقائياً', 'notifications', FALSE),
    ('reminder_days', '{"value": 7}', 'عدد أيام التأخير قبل إرسال التذكير', 'notifications', FALSE)
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = NOW();

-- ============================================
-- VIEWS - عروض البيانات
-- ============================================

-- View لإحصائيات الطلاب حسب المدرسة
CREATE OR REPLACE VIEW students_statistics AS
SELECT 
    s.school_id::TEXT AS school_id,
    sch.name AS school_name,
    COUNT(*) AS total_students,
    COUNT(*) FILTER (WHERE s.status = 'paid') AS paid_students,
    COUNT(*) FILTER (WHERE s.status = 'partial') AS partial_students,
    COUNT(*) FILTER (WHERE s.status = 'unpaid') AS unpaid_students,
    COALESCE(SUM(s.final_fee), 0) AS total_fees,
    COALESCE(SUM(calculate_student_paid_amount(s.id)), 0) AS total_paid,
    COALESCE(SUM(s.final_fee), 0) - COALESCE(SUM(calculate_student_paid_amount(s.id)), 0) AS total_remaining
FROM students s
JOIN schools sch ON s.school_id::TEXT = sch.id
WHERE s.is_active = TRUE
GROUP BY s.school_id::TEXT, sch.name;

-- View لإحصائيات المدفوعات الشهرية
CREATE OR REPLACE VIEW monthly_payments_statistics AS
SELECT 
    DATE_TRUNC('month', payment_date)::DATE AS month,
    s.school_id::TEXT AS school_id,
    sch.name AS school_name,
    COUNT(*) AS payment_count,
    SUM(p.amount) AS total_amount,
    COUNT(DISTINCT p.student_id) AS students_count
FROM payments p
JOIN students s ON p.student_id = s.id
JOIN schools sch ON s.school_id::TEXT = sch.id
GROUP BY DATE_TRUNC('month', payment_date), s.school_id::TEXT, sch.name
ORDER BY month DESC, school_name;

-- View للطلاب المتأخرين في الدفع
CREATE OR REPLACE VIEW overdue_students AS
SELECT 
    s.id,
    s.name,
    s.guardian_name,
    s.phone,
    s.grade,
    s.school_id::TEXT AS school_id,
    sch.name AS school_name,
    s.final_fee,
    calculate_student_paid_amount(s.id) AS paid_amount,
    s.final_fee - calculate_student_paid_amount(s.id) AS remaining_amount,
    s.status,
    s.registration_date,
    (SELECT MAX((inst->>'due_date')::DATE)
     FROM jsonb_array_elements(s.installments) AS inst
     WHERE (inst->>'due_date') IS NOT NULL
       AND (inst->>'amount_paid')::NUMERIC < (inst->>'amount')::NUMERIC) AS last_overdue_date
FROM students s
JOIN schools sch ON s.school_id::TEXT = sch.id
WHERE s.is_active = TRUE
  AND s.status != 'paid'
  AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(s.installments) AS inst
      WHERE (inst->>'due_date')::DATE < CURRENT_DATE
        AND (inst->>'amount_paid')::NUMERIC < (inst->>'amount')::NUMERIC
  )
ORDER BY last_overdue_date ASC, s.school_id::TEXT, s.name;

-- View لإحصائيات المستخدمين
CREATE OR REPLACE VIEW users_statistics AS
SELECT 
    u.role,
    u.school_id::TEXT AS school_id,
    sch.name AS school_name,
    COUNT(*) AS total_users,
    COUNT(*) FILTER (WHERE u.is_active = TRUE) AS active_users,
    COUNT(*) FILTER (WHERE u.is_active = FALSE) AS inactive_users,
    COUNT(*) FILTER (WHERE u.is_admin = TRUE) AS admin_users,
    MAX(u.last_login) AS last_login_date
FROM users u
LEFT JOIN schools sch ON u.school_id::TEXT = sch.id
GROUP BY u.role, u.school_id::TEXT, sch.name
ORDER BY u.role, school_name;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Policies - السماح لجميع المستخدمين المصرح لهم بالوصول
DROP POLICY IF EXISTS "Allow all operations on students" ON students;
CREATE POLICY "Allow all operations on students" ON students FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on users" ON users;
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on messages" ON messages;
CREATE POLICY "Allow all operations on messages" ON messages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on notifications" ON notifications;
CREATE POLICY "Allow all operations on notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on payments" ON payments;
CREATE POLICY "Allow all operations on payments" ON payments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on conversations" ON conversations;
CREATE POLICY "Allow all operations on conversations" ON conversations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on conversation_messages" ON conversation_messages;
CREATE POLICY "Allow all operations on conversation_messages" ON conversation_messages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on admin_notifications" ON admin_notifications;
CREATE POLICY "Allow all operations on admin_notifications" ON admin_notifications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on whatsapp_messages" ON whatsapp_messages;
CREATE POLICY "Allow all operations on whatsapp_messages" ON whatsapp_messages FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- ADDITIONAL FUNCTIONS - دوال إضافية مفيدة
-- ============================================

-- Function للحصول على إحصائيات مدرسة معينة
CREATE OR REPLACE FUNCTION get_school_statistics(school_id_param TEXT)
RETURNS TABLE (
    total_students BIGINT,
    paid_students BIGINT,
    partial_students BIGINT,
    unpaid_students BIGINT,
    total_fees NUMERIC,
    total_paid NUMERIC,
    total_remaining NUMERIC,
    payment_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT AS total_students,
        COUNT(*) FILTER (WHERE s.status = 'paid')::BIGINT AS paid_students,
        COUNT(*) FILTER (WHERE s.status = 'partial')::BIGINT AS partial_students,
        COUNT(*) FILTER (WHERE s.status = 'unpaid')::BIGINT AS unpaid_students,
        COALESCE(SUM(s.final_fee), 0) AS total_fees,
        COALESCE(SUM(calculate_student_paid_amount(s.id)), 0) AS total_paid,
        COALESCE(SUM(s.final_fee), 0) - COALESCE(SUM(calculate_student_paid_amount(s.id)), 0) AS total_remaining,
        CASE 
            WHEN SUM(s.final_fee) > 0 THEN 
                (SUM(calculate_student_paid_amount(s.id)) / SUM(s.final_fee) * 100)
            ELSE 0
        END AS payment_rate
    FROM students s
    WHERE s.school_id::TEXT = school_id_param
      AND s.is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function للحصول على إحصائيات عامة للنظام
CREATE OR REPLACE FUNCTION get_system_statistics()
RETURNS TABLE (
    total_schools BIGINT,
    active_schools BIGINT,
    total_students BIGINT,
    total_users BIGINT,
    total_payments BIGINT,
    total_revenue NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM schools)::BIGINT AS total_schools,
        (SELECT COUNT(*) FROM schools WHERE is_active = TRUE)::BIGINT AS active_schools,
        (SELECT COUNT(*) FROM students WHERE is_active = TRUE)::BIGINT AS total_students,
        (SELECT COUNT(*) FROM users WHERE is_active = TRUE)::BIGINT AS total_users,
        (SELECT COUNT(*) FROM payments)::BIGINT AS total_payments,
        (SELECT COALESCE(SUM(amount), 0) FROM payments) AS total_revenue;
END;
$$ LANGUAGE plpgsql;

-- Function للبحث عن طلاب متأخرين في مدرسة معينة
CREATE OR REPLACE FUNCTION get_overdue_students_by_school(school_id_param TEXT, days_overdue INTEGER DEFAULT 7)
RETURNS TABLE (
    student_id UUID,
    student_name TEXT,
    guardian_name TEXT,
    phone TEXT,
    grade TEXT,
    final_fee NUMERIC,
    paid_amount NUMERIC,
    remaining_amount NUMERIC,
    overdue_days INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id AS student_id,
        s.name AS student_name,
        s.guardian_name,
        s.phone,
        s.grade,
        s.final_fee,
        calculate_student_paid_amount(s.id) AS paid_amount,
        s.final_fee - calculate_student_paid_amount(s.id) AS remaining_amount,
        (CURRENT_DATE - (
            SELECT MAX((inst->>'due_date')::DATE)
            FROM jsonb_array_elements(s.installments) AS inst
            WHERE (inst->>'due_date') IS NOT NULL
              AND (inst->>'amount_paid')::NUMERIC < (inst->>'amount')::NUMERIC
        ))::INTEGER AS overdue_days
    FROM students s
    WHERE s.school_id::TEXT = school_id_param
      AND s.is_active = TRUE
      AND s.status != 'paid'
      AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements(s.installments) AS inst
          WHERE (inst->>'due_date')::DATE < CURRENT_DATE - (days_overdue - 1)
            AND (inst->>'amount_paid')::NUMERIC < (inst->>'amount')::NUMERIC
      )
    ORDER BY overdue_days DESC, s.name;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- اكتمل الإعداد
-- ============================================
-- يمكنك التحقق من البيانات باستخدام:
-- SELECT * FROM schools ORDER BY name;
-- SELECT key, value FROM system_settings ORDER BY category, key;
-- 
-- استخدام الـ Views:
-- SELECT * FROM students_statistics;
-- SELECT * FROM monthly_payments_statistics;
-- SELECT * FROM overdue_students;
-- SELECT * FROM users_statistics;
-- 
-- استخدام الـ Functions:
-- SELECT * FROM get_school_statistics('rawda');
-- SELECT * FROM get_system_statistics();
-- SELECT * FROM get_overdue_students_by_school('rawda', 7);

-- ============================================
-- استعلامات للتحقق من المستخدمين
-- ============================================

-- عرض جميع المستخدمين مع معلوماتهم
SELECT 
    id,
    username,
    full_name,
    email,
    school_id,
    (SELECT name FROM schools WHERE id = users.school_id) AS school_name,
    role,
    is_admin,
    is_active,
    last_login,
    login_count,
    created_at,
    updated_at
FROM users
ORDER BY role, is_admin DESC, username;

-- عرض المستخدمين حسب الدور
SELECT 
    role,
    COUNT(*) AS total_users,
    COUNT(*) FILTER (WHERE is_active = TRUE) AS active_users,
    COUNT(*) FILTER (WHERE is_active = FALSE) AS inactive_users
FROM users
GROUP BY role
ORDER BY role;

-- عرض المستخدمين حسب المدرسة
SELECT 
    u.username,
    u.full_name,
    u.role,
    u.is_active,
    s.name AS school_name,
    s.code AS school_code
FROM users u
LEFT JOIN schools s ON u.school_id = s.id
WHERE u.school_id IS NOT NULL
ORDER BY s.name, u.role, u.username;

-- عرض المستخدمين النشطين فقط
SELECT 
    username,
    full_name,
    email,
    (SELECT name FROM schools WHERE id = users.school_id) AS school_name,
    role,
    is_admin,
    last_login,
    login_count
FROM users
WHERE is_active = TRUE
ORDER BY role, username;

-- عرض المستخدمين غير النشطين
SELECT 
    username,
    full_name,
    email,
    (SELECT name FROM schools WHERE id = users.school_id) AS school_name,
    role,
    is_admin,
    created_at,
    updated_at
FROM users
WHERE is_active = FALSE
ORDER BY updated_at DESC;

-- عرض المستخدمين الذين لم يسجلوا دخول أبداً
SELECT 
    username,
    full_name,
    email,
    (SELECT name FROM schools WHERE id = users.school_id) AS school_name,
    role,
    created_at
FROM users
WHERE last_login IS NULL
ORDER BY created_at DESC;

-- عرض المستخدمين حسب آخر تسجيل دخول
SELECT 
    username,
    full_name,
    (SELECT name FROM schools WHERE id = users.school_id) AS school_name,
    role,
    last_login,
    login_count
FROM users
WHERE last_login IS NOT NULL
ORDER BY last_login DESC
LIMIT 20;

-- ============================================
-- أسماء المستخدمين وكلمات المرور الافتراضية
-- ============================================
-- 
-- رئيس مجلس الإدارة:
--   Username: admin
--   Password: master123
--   Role: admin
--   School: لا يوجد (رئيس مجلس الإدارة)
--
-- مدير روضة رسول الرحمة:
--   Username: rawda
--   Password: rawda123
--   Role: school_admin
--   School: rawda (روضة رسول الرحمة)
--
-- مدير مدرسة رسول الرحمة:
--   Username: rasoul
--   Password: rasoul123
--   Role: school_admin
--   School: rasoul (مدرسة رسول الرحمة)
--
-- مدير مدرسة نور الرحمة:
--   Username: noor
--   Password: noor123
--   Role: school_admin
--   School: noor (مدرسة نور الرحمة)
--
-- مدير مدرسة نبي الرحمة:
--   Username: nabi
--   Password: nabi123
--   Role: school_admin
--   School: nabi (مدرسة نبي الرحمة)
--
-- مدير ثانوية رسول الرحمة:
--   Username: thanawiya
--   Password: thanawiya123
--   Role: school_admin
--   School: thanawiya (ثانوية رسول الرحمة)
--
-- ============================================
-- ملاحظات مهمة:
-- ============================================
-- 1. يرجى تغيير كلمات المرور الافتراضية بعد أول تسجيل دخول
-- 2. يمكنك إنشاء مستخدمين جدد من لوحة التحكم
-- 3. كلمات المرور مشفرة في قاعدة البيانات باستخدام bcrypt
-- 4. يمكنك استخدام الاستعلام التالي للتحقق من المستخدمين:
--
-- SELECT username, full_name, role, 
--        (SELECT name FROM schools WHERE id = users.school_id) AS school_name,
--        is_active, created_at
-- FROM users
-- ORDER BY role, username;

