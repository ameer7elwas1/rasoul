// ============================================
// Students Management JavaScript
// ============================================

// الحصول على المستخدم الحالي
function getCurrentUser() {
    try {
        const userData = localStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    } catch (error) {
        console.error('خطأ في قراءة بيانات المستخدم:', error);
        return null;
    }
}

// إضافة طالب جديد
async function addStudent(studentData) {
    try {
        const currentUser = getCurrentUser();
        
        // التحقق من البيانات المطلوبة
        if (!studentData.name || !studentData.name.trim()) {
            return { success: false, error: 'اسم الطالب مطلوب' };
        }
        if (!studentData.guardian_name || !studentData.guardian_name.trim()) {
            return { success: false, error: 'اسم ولي الأمر مطلوب' };
        }
        if (!studentData.mother_name || !studentData.mother_name.trim()) {
            return { success: false, error: 'اسم الأم مطلوب' };
        }
        if (!studentData.grade) {
            return { success: false, error: 'الصف مطلوب' };
        }
        if (!studentData.school_id) {
            return { success: false, error: 'المدرسة مطلوبة' };
        }
        
        // اكتشاف الإخوة تلقائياً: البحث في جميع المدارس والروضات
        let detectedSiblingCount = 1; // الطالب نفسه
        let detectedSiblings = [];
        
        try {
            // البحث عن إخوة في جميع المدارس والروضات بناءً على اسم ولي الأمر واسم الأم
            const { data: siblings, error: siblingsError } = await supabase
                .from('students')
                .select(`
                    id, 
                    name, 
                    grade, 
                    school_id,
                    schools (
                        id,
                        name
                    )
                `)
                .eq('guardian_name', studentData.guardian_name.trim())
                .eq('mother_name', studentData.mother_name.trim())
                .neq('school_id', studentData.school_id) // استبعاد المدرسة الحالية (لأن الطالب الجديد سيسجل فيها)
                .eq('is_active', true);
            
            if (!siblingsError && siblings && siblings.length > 0) {
                detectedSiblings = siblings;
                detectedSiblingCount = siblings.length + 1; // الإخوة + الطالب الجديد
                console.log(`تم اكتشاف ${siblings.length} أخ/أخت في المدارس والروضات للطالب الجديد`);
            }
        } catch (error) {
            console.error('خطأ في البحث عن الإخوة:', error);
            // نتابع بدون اكتشاف الإخوة في حالة الخطأ
        }
        
        // استخدام عدد الإخوة المكتشف تلقائياً إذا لم يتم تحديده يدوياً
        let finalSiblingCount = parseInt(studentData.sibling_count || detectedSiblingCount);
        
        // إذا تم اكتشاف إخوة تلقائياً وكان العدد المكتشف أكبر من المحدد يدوياً، نستخدم المكتشف
        if (detectedSiblingCount > finalSiblingCount) {
            finalSiblingCount = detectedSiblingCount;
        }
        
        // حساب الخصم بناءً على عدد الإخوة
        // 2 إخوة (الطالب + أخ واحد) = 5%
        // 3 إخوة أو أكثر (الطالب + 2 أخوة أو أكثر) = 10%
        let discountRate = 0;
        if (finalSiblingCount >= 3) {
            discountRate = CONFIG.DISCOUNTS.SIBLING_3_PLUS; // 10%
        } else if (finalSiblingCount === 2) {
            discountRate = CONFIG.DISCOUNTS.SIBLING_2; // 5%
        }

        const annualFee = parseFloat(studentData.annual_fee || 0);
        if (annualFee <= 0) {
            return { success: false, error: 'المبلغ السنوي يجب أن يكون أكبر من صفر' };
        }
        
        const discountAmount = annualFee * discountRate;
        const finalFee = annualFee - discountAmount;

        // إنشاء الأقساط (4 دفعات)
        const installmentCount = CONFIG.INSTALLMENT_COUNT || 4;
        const installmentAmount = finalFee / installmentCount;
        const installments = [];
        for (let i = 1; i <= installmentCount; i++) {
            installments.push({
                installment_number: i,
                due_date: calculateDueDate(i),
                amount: installmentAmount,
                amount_paid: 0,
                payment_date: null,
                status: 'unpaid'
            });
        }

        // تنظيف رقم الهاتف
        const cleanedPhone = Utils.cleanPhone ? Utils.cleanPhone(studentData.phone) : (studentData.phone || null);
        
        // إدراج الطالب - فقط الحقول المطلوبة والموجودة
        const insertData = {
            name: studentData.name.trim(),
            guardian_name: studentData.guardian_name.trim(),
            mother_name: studentData.mother_name.trim(),
            grade: studentData.grade.trim(),
            school_id: studentData.school_id,
            annual_fee: annualFee,
            final_fee: finalFee,
            discount_amount: discountAmount,
            discount_percentage: discountRate * 100,
            has_sibling: finalSiblingCount > 1,
            installments: installments,
            registration_date: studentData.registration_date || new Date().toISOString().split('T')[0],
            is_active: true,
            status: 'unpaid'
        };
        
        // إضافة الحقول الاختيارية فقط إذا كانت موجودة
        if (cleanedPhone) {
            insertData.phone = cleanedPhone;
        }
        
        if (studentData.notes && studentData.notes.trim()) {
            insertData.notes = studentData.notes.trim();
        }
        
        // إضافة created_by فقط إذا كان موجوداً (اختياري)
        if (currentUser && currentUser.id) {
            insertData.created_by = String(currentUser.id);
        }
        
        console.log('إدراج بيانات الطالب:', insertData);
        
        const { data, error } = await supabase
            .from('students')
            .insert(insertData)
            .select()
            .single();

        if (error) {
            console.error('خطأ Supabase:', error);
            throw error;
        }

        // إضافة معلومات الإخوة المكتشفين إلى النتيجة
        const result = { success: true, data };
        if (detectedSiblings.length > 0) {
            result.detectedSiblings = detectedSiblings;
            result.siblingCount = finalSiblingCount;
            result.discountApplied = discountRate > 0;
            result.discountPercentage = discountRate * 100;
            
            // تجميع معلومات المدارس للإخوة المكتشفين
            const siblingsInfo = detectedSiblings.map(sibling => {
                const schoolName = sibling.schools?.name || sibling.school_id || 'مدرسة غير معروفة';
                return {
                    name: sibling.name,
                    grade: sibling.grade,
                    school: schoolName,
                    schoolId: sibling.school_id
                };
            });
            result.siblingsInfo = siblingsInfo;
            
            console.log(`تم تطبيق خصم ${discountRate * 100}% بسبب اكتشاف ${detectedSiblings.length} أخ/أخت في المدارس والروضات`);
        }

        return result;
    } catch (error) {
        console.error('خطأ في إضافة الطالب:', error);
        const errorMessage = error.message || 'حدث خطأ غير معروف';
        return { success: false, error: errorMessage };
    }
}

// حساب تاريخ الاستحقاق للدفعة
function calculateDueDate(installmentNumber) {
    const now = new Date();
    const month = now.getMonth() + installmentNumber; // الدفعة الأولى هذا الشهر، الثانية الشهر القادم، إلخ
    const year = now.getFullYear() + Math.floor(month / 12);
    const finalMonth = month % 12;
    
    return new Date(year, finalMonth, 1).toISOString().split('T')[0];
}

// تحديث بيانات الطالب
async function updateStudent(studentId, updates) {
    try {
        const currentUser = getCurrentUser();
        // إذا تم تحديث المبلغ السنوي أو عدد الإخوة، إعادة حساب الخصم والأقساط
        if (updates.annual_fee !== undefined || updates.sibling_count !== undefined) {
            const { data: student, error: fetchError } = await supabase
                .from('students')
                .select('*')
                .eq('id', studentId)
                .single();

            if (fetchError) throw fetchError;

            const annualFee = parseFloat(updates.annual_fee || student.annual_fee);
            const siblingCount = updates.sibling_count || (student.has_sibling ? 2 : 1);

            let discountRate = 0;
            if (siblingCount >= 3) {
                discountRate = CONFIG.DISCOUNTS.SIBLING_3_PLUS;
            } else if (siblingCount === 2) {
                discountRate = CONFIG.DISCOUNTS.SIBLING_2;
            }

            const discountAmount = annualFee * discountRate;
            const finalFee = annualFee - discountAmount;

            // تحديث الأقساط
            const installments = student.installments || [];
            const installmentAmount = finalFee / CONFIG.INSTALLMENT_COUNT;
            
            // تحديث مبالغ الأقساط غير المدفوعة فقط
            installments.forEach(inst => {
                if (inst.status === 'unpaid') {
                    inst.amount = installmentAmount;
                }
            });

            updates.final_fee = finalFee;
            updates.discount_amount = discountAmount;
            updates.discount_percentage = discountRate * 100;
            updates.has_sibling = siblingCount > 1;
            updates.installments = installments;
        }

        updates.updated_at = new Date().toISOString();
        updates.updated_by = currentUser.id ? String(currentUser.id) : null;

        const { data, error } = await supabase
            .from('students')
            .update(updates)
            .eq('id', studentId)
            .select()
            .single();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('خطأ في تحديث الطالب:', error);
        return { success: false, error: error.message };
    }
}

// إضافة دفعة للطالب
async function addPaymentToStudent(studentId, paymentData) {
    try {
        const currentUser = getCurrentUser();
        // الحصول على بيانات الطالب
        const { data: student, error: fetchError } = await supabase
            .from('students')
            .select('*')
            .eq('id', studentId)
            .single();

        if (fetchError) throw fetchError;

        const installmentNumber = parseInt(paymentData.installment_number);
        const amount = parseFloat(paymentData.amount);
        const paymentDate = paymentData.payment_date || new Date().toISOString().split('T')[0];

        // تحديث الأقساط
        const installments = student.installments || [];
        const installment = installments.find(inst => inst.installment_number === installmentNumber);

        if (!installment) {
            throw new Error('الدفعة غير موجودة');
        }

        // تحديث الدفعة
        installment.amount_paid = (parseFloat(installment.amount_paid || 0)) + amount;
        installment.payment_date = paymentDate;
        installment.status = installment.amount_paid >= installment.amount ? 'paid' : 'partial';

        // تحديث بيانات الطالب
        await supabase
            .from('students')
            .update({
                installments: installments,
                updated_at: new Date().toISOString()
            })
            .eq('id', studentId);

        // إضافة سجل الدفع في جدول payments
        const { data: payment, error: paymentError } = await supabase
            .from('payments')
            .insert({
                student_id: studentId,
                installment_number: installmentNumber,
                amount: amount,
                payment_date: paymentDate,
                payment_method: paymentData.payment_method || 'cash',
                receipt_number: paymentData.receipt_number || null,
                notes: paymentData.notes || null,
                created_by: currentUser?.id ? String(currentUser.id) : null
            })
            .select()
            .single();

        if (paymentError) {
            console.error('خطأ في إضافة سجل الدفع:', paymentError);
            // لا نرمي خطأ هنا لأن الدفعة تم تحديثها بالفعل
        }

        return { success: true, data: payment };
    } catch (error) {
        console.error('خطأ في إضافة الدفعة:', error);
        return { success: false, error: error.message };
    }
}

// حساب حالة الطالب المالية
function calculateStudentStatus(student) {
    if (!student.installments || !Array.isArray(student.installments)) {
        return {
            status: 'unpaid',
            totalPaid: 0,
            totalDue: parseFloat(student.final_fee || 0),
            remaining: parseFloat(student.final_fee || 0),
            paidInstallments: 0,
            unpaidInstallments: CONFIG.INSTALLMENT_COUNT
        };
    }

    let totalPaid = 0;
    let paidInstallments = 0;
    let unpaidInstallments = 0;

    student.installments.forEach(inst => {
        const paid = parseFloat(inst.amount_paid || 0);
        totalPaid += paid;
        
        if (paid >= parseFloat(inst.amount || 0)) {
            paidInstallments++;
        } else {
            unpaidInstallments++;
        }
    });

    const totalDue = parseFloat(student.final_fee || 0);
    const remaining = totalDue - totalPaid;

    let status = 'unpaid';
    if (totalPaid >= totalDue) {
        status = 'paid';
    } else if (totalPaid > 0) {
        status = 'partial';
    }

    return {
        status,
        totalPaid,
        totalDue,
        remaining,
        paidInstallments,
        unpaidInstallments
    };
}

// إرسال تذكير واتساب للطالب
async function sendWhatsAppReminder(studentId, message = null) {
    try {
        const currentUser = getCurrentUser();
        const { data: student, error } = await supabase
            .from('students')
            .select(`
                *,
                schools (
                    id,
                    name
                )
            `)
            .eq('id', studentId)
            .single();

        if (error) throw error;

        if (!student.phone) {
            return { success: false, error: 'لا يوجد رقم هاتف للطالب' };
        }

        // حساب حالة الطالب
        const status = calculateStudentStatus(student);
        
        // الحصول على اسم المدرسة
        let schoolName = 'المدرسة';
        if (student.school_id) {
            if (student.schools && student.schools.name) {
                schoolName = student.schools.name;
            } else {
                // محاولة جلب اسم المدرسة من قاعدة البيانات كبديل
                try {
                    const { data: schoolData } = await supabase
                        .from('schools')
                        .select('name')
                        .eq('id', student.school_id)
                        .single();
                    if (schoolData && schoolData.name) {
                        schoolName = schoolData.name;
                    }
                } catch (err) {
                    console.error('خطأ في جلب اسم المدرسة:', err);
                }
            }
        }
        
        // إنشاء رسالة افتراضية إذا لم يتم توفيرها
        if (!message) {
            const unpaidInstallments = student.installments.filter(inst => 
                parseFloat(inst.amount_paid || 0) < parseFloat(inst.amount || 0)
            );
            
            if (unpaidInstallments.length > 0) {
                const nextInstallment = unpaidInstallments[0];
                message = `مرحباً ${student.guardian_name}،
                
هذا تذكير بدفع أقساط الطالب ${student.name} في ${schoolName}.

الدفعة القادمة: الدفعة ${nextInstallment.installment_number}
المبلغ: ${Utils.formatCurrency(nextInstallment.amount)}
تاريخ الاستحقاق: ${Utils.formatDateArabic(nextInstallment.due_date)}

المبلغ المتبقي: ${Utils.formatCurrency(status.remaining)}

شكراً لكم`;
            } else {
                message = `مرحباً ${student.guardian_name}،
                
تم دفع جميع أقساط الطالب ${student.name} بنجاح.

شكراً لكم`;
            }
        }

        // حفظ الرسالة في قاعدة البيانات
        const { data: whatsappMessage, error: saveError } = await supabase
            .from('whatsapp_messages')
            .insert({
                student_id: studentId,
                guardian_phone: Utils.cleanPhone(student.phone),
                message: message,
                message_type: 'reminder',
                status: 'pending',
                school_id: student.school_id,
                created_by: currentUser?.id ? String(currentUser.id) : null
            })
            .select()
            .single();

        if (saveError) {
            console.error('خطأ في حفظ رسالة واتساب:', saveError);
        }

        // فتح واتساب
        const phone = Utils.cleanPhone(student.phone);
        const url = Utils.buildWhatsAppURL(phone, message);
        window.open(url, '_blank');

        // تحديث حالة الرسالة إلى "sent" بعد فتح واتساب
        if (whatsappMessage) {
            setTimeout(async () => {
                await supabase
                    .from('whatsapp_messages')
                    .update({ status: 'sent', sent_at: new Date().toISOString() })
                    .eq('id', whatsappMessage.id);
            }, 1000);
        }

        return { success: true, data: whatsappMessage };
    } catch (error) {
        console.error('خطأ في إرسال تذكير واتساب:', error);
        return { success: false, error: error.message };
    }
}

// إرسال رسائل واتساب جماعية
async function sendBulkWhatsAppMessages(studentIds, message) {
    const results = [];
    
    for (const studentId of studentIds) {
        const result = await sendWhatsAppReminder(studentId, message);
        results.push({ studentId, ...result });
        
        // تأخير صغير بين الرسائل لتجنب الإفراط في الطلبات
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return results;
}

// تصدير بيانات الطلاب
function exportStudents(students, format = 'xlsx') {
    if (format === 'xlsx') {
        // استخدام مكتبة xlsx إذا كانت متوفرة
        if (typeof XLSX !== 'undefined') {
            const ws = XLSX.utils.json_to_sheet(students.map(s => ({
                'اسم الطالب': s.name,
                'اسم ولي الأمر': s.guardian_name,
                'اسم الأم': s.mother_name,
                'الصف': s.grade,
                'الهاتف': s.phone,
                'المبلغ السنوي': s.annual_fee,
                'الخصم': s.discount_percentage + '%',
                'المبلغ النهائي': s.final_fee,
                'تاريخ التسجيل': Utils.formatDateArabic(s.registration_date)
            })));
            
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'الطلاب');
            XLSX.writeFile(wb, `students_${new Date().toISOString().split('T')[0]}.xlsx`);
        }
    }
}

