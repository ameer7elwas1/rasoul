// ============================================
// Students Management JavaScript
// ============================================

function getCurrentUser() {
    try {
        const userData = localStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    } catch (error) {
        console.error('خطأ في قراءة بيانات المستخدم:', error);
        return null;
    }
}

async function addStudent(studentData) {
    try {
        const currentUser = getCurrentUser();
        
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
        
        let detectedSiblingCount = 1;
        let detectedSiblings = [];
        
        try {
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
                .neq('school_id', studentData.school_id)
                .eq('is_active', true);
            
            if (!siblingsError && siblings && siblings.length > 0) {
                detectedSiblings = siblings;
                detectedSiblingCount = siblings.length + 1;
                console.log(`تم اكتشاف ${siblings.length} أخ/أخت في المدارس والروضات للطالب الجديد`);
            }
        } catch (error) {
            console.error('خطأ في البحث عن الإخوة:', error);
        }
        
        let finalSiblingCount = parseInt(studentData.sibling_count || detectedSiblingCount);
        
        if (detectedSiblingCount > finalSiblingCount) {
            finalSiblingCount = detectedSiblingCount;
        }
        
        let discountRate = 0;
        if (finalSiblingCount >= 3) {
            discountRate = CONFIG.DISCOUNTS.SIBLING_3_PLUS;
        } else if (finalSiblingCount === 2) {
            discountRate = CONFIG.DISCOUNTS.SIBLING_2;
        }

        const annualFee = parseFloat(studentData.annual_fee || 0);
        if (annualFee <= 0) {
            return { success: false, error: 'المبلغ السنوي يجب أن يكون أكبر من صفر' };
        }
        
        const discountAmount = annualFee * discountRate;
        const finalFee = annualFee - discountAmount;

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

        const cleanedPhone = Utils.cleanPhone ? Utils.cleanPhone(studentData.phone) : (studentData.phone || null);
        
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
        
        if (cleanedPhone) {
            insertData.phone = cleanedPhone;
        }
        
        if (studentData.notes && studentData.notes.trim()) {
            insertData.notes = studentData.notes.trim();
        }
        
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

        const result = { success: true, data };
        if (detectedSiblings.length > 0) {
            result.detectedSiblings = detectedSiblings;
            result.siblingCount = finalSiblingCount;
            result.discountApplied = discountRate > 0;
            result.discountPercentage = discountRate * 100;
            
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

function calculateDueDate(installmentNumber) {
    const now = new Date();
    const month = now.getMonth() + installmentNumber;
    const year = now.getFullYear() + Math.floor(month / 12);
    const finalMonth = month % 12;
    
    return new Date(year, finalMonth, 1).toISOString().split('T')[0];
}

async function updateStudent(studentId, updates) {
    try {
        const currentUser = getCurrentUser();
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

            const installments = student.installments || [];
            const installmentAmount = finalFee / CONFIG.INSTALLMENT_COUNT;
            
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

async function addPaymentToStudent(studentId, paymentData) {
    try {
        const currentUser = getCurrentUser();
        const { data: student, error: fetchError } = await supabase
            .from('students')
            .select('*')
            .eq('id', studentId)
            .single();

        if (fetchError) throw fetchError;

        const installmentNumber = parseInt(paymentData.installment_number);
        const amount = parseFloat(paymentData.amount);
        const paymentDate = paymentData.payment_date || new Date().toISOString().split('T')[0];

        const installments = student.installments || [];
        const installment = installments.find(inst => inst.installment_number === installmentNumber);

        if (!installment) {
            throw new Error('الدفعة غير موجودة');
        }

        installment.amount_paid = (parseFloat(installment.amount_paid || 0)) + amount;
        installment.payment_date = paymentDate;
        installment.status = installment.amount_paid >= installment.amount ? 'paid' : 'partial';

        await supabase
            .from('students')
            .update({
                installments: installments,
                updated_at: new Date().toISOString()
            })
            .eq('id', studentId);

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
        }

        return { success: true, data: payment, paymentId: payment?.id };
    } catch (error) {
        console.error('خطأ في إضافة الدفعة:', error);
        return { success: false, error: error.message };
    }
}

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

        const status = calculateStudentStatus(student);
        
        let schoolName = 'المدرسة';
        if (student.school_id) {
            if (student.schools && student.schools.name) {
                schoolName = student.schools.name;
            } else {
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
        
        if (!message) {
            const installments = Array.isArray(student.installments) ? student.installments : [];
            const unpaidInstallments = installments.filter(inst => 
                parseFloat(inst.amount_paid || 0) < parseFloat(inst.amount || 0)
            );
            
            if (unpaidInstallments.length > 0) {
                let messageParts = [
                    `مرحباً ${student.guardian_name}،`,
                    ``,
                    `تذكير بدفع أقساط الطالب: *${student.name}*`,
                    `المدرسة: *${schoolName}*`,
                    `الصف: *${student.grade}*`,
                    ``
                ];
                
                messageParts.push(`*الأقساط المستحقة:*`);
                unpaidInstallments.forEach((inst, index) => {
                    const amountDue = parseFloat(inst.amount || 0) - parseFloat(inst.amount_paid || 0);
                    const statusText = parseFloat(inst.amount_paid || 0) > 0 ? 'مدفوع جزئياً' : 'غير مدفوع';
                    messageParts.push(
                        `${index + 1}. الدفعة ${inst.installment_number}:`,
                        `   المبلغ المستحق: ${Utils.formatCurrency(amountDue)}`,
                        `   تاريخ الاستحقاق: ${Utils.formatDateArabic(inst.due_date)}`,
                        `   الحالة: ${statusText}`,
                        ``
                    );
                });
                
                messageParts.push(
                    `*الملخص المالي:*`,
                    `المبلغ السنوي: ${Utils.formatCurrency(student.annual_fee || 0)}`,
                    student.discount_percentage > 0 ? `الخصم: ${student.discount_percentage}% (${Utils.formatCurrency(student.discount_amount || 0)})` : '',
                    `المبلغ النهائي: ${Utils.formatCurrency(student.final_fee || 0)}`,
                    `المبلغ المدفوع: ${Utils.formatCurrency(status.totalPaid)}`,
                    `المبلغ المتبقي: *${Utils.formatCurrency(status.remaining)}*`,
                    ``,
                    `نرجو منكم التكرم بدفع المستحقات في أقرب وقت ممكن.`,
                    ``,
                    `شكراً لكم`
                );
                
                message = messageParts.filter(part => part !== '').join('\n');
            } else {
                message = `مرحباً ${student.guardian_name}،
                
تم دفع جميع أقساط الطالب ${student.name} بنجاح.

شكراً لكم`;
            }
        }

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

        const phone = Utils.cleanPhone(student.phone);
        const url = Utils.buildWhatsAppURL(phone, message);
        window.open(url, '_blank');

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

async function sendBulkWhatsAppMessages(studentIds, message) {
    const results = [];
    
    for (const studentId of studentIds) {
        const result = await sendWhatsAppReminder(studentId, message);
        results.push({ studentId, ...result });
        
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return results;
}

function exportStudents(students, format = 'xlsx') {
    if (format === 'xlsx') {
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

