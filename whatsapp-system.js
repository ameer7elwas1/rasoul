// ============================================
// Advanced WhatsApp System - نظام واتساب المتقدم
// ============================================

// قوالب الرسائل الجاهزة
const WhatsAppTemplates = {
    reminder: (student, status) => {
        const unpaidInstallments = student.installments?.filter(inst => 
            parseFloat(inst.amount_paid || 0) < parseFloat(inst.amount || 0)
        ) || [];
        
        let message = `*مجموعة رسول الرحمة التعليمية*\n\n`;
        message += `مرحباً ${student.guardian_name}،\n\n`;
        message += `نود تذكيركم بدفع أقساط الطالب:\n`;
        message += `*${student.name}*\n`;
        message += `المدرسة: *${student.schools?.name || 'المدرسة'}*\n`;
        message += `الصف: *${student.grade}*\n\n`;
        
        if (unpaidInstallments.length > 0) {
            message += `*الأقساط المستحقة:*\n`;
            unpaidInstallments.forEach((inst, index) => {
                const amountDue = parseFloat(inst.amount || 0) - parseFloat(inst.amount_paid || 0);
                const dueDate = new Date(inst.due_date);
                const isOverdue = dueDate < new Date();
                message += `${index + 1}. الدفعة ${inst.installment_number}:\n`;
                message += `   المبلغ: *${Utils.formatCurrency(amountDue)}*\n`;
                message += `   تاريخ الاستحقاق: ${Utils.formatDateArabic(inst.due_date)}${isOverdue ? ' ⚠️' : ''}\n\n`;
            });
        }
        
        message += `*الملخص المالي:*\n`;
        message += `المبلغ السنوي: ${Utils.formatCurrency(student.annual_fee || 0)}\n`;
        if (student.discount_percentage > 0) {
            message += `الخصم: ${student.discount_percentage}% (${Utils.formatCurrency(student.discount_amount || 0)})\n`;
        }
        message += `المبلغ النهائي: ${Utils.formatCurrency(student.final_fee || 0)}\n`;
        message += `المبلغ المدفوع: ${Utils.formatCurrency(status.totalPaid)}\n`;
        message += `المبلغ المتبقي: *${Utils.formatCurrency(status.remaining)}*\n\n`;
        
        message += `نرجو منكم التكرم بدفع المستحقات في أقرب وقت ممكن.\n\n`;
        message += `شكراً لكم\n`;
        message += `*مجموعة رسول الرحمة التعليمية*`;
        
        return message;
    },
    
    payment_confirmation: (student, payment) => {
        let message = `*مجموعة رسول الرحمة التعليمية*\n\n`;
        message += `مرحباً ${student.guardian_name}،\n\n`;
        message += `تم استلام دفعة بنجاح:\n\n`;
        message += `اسم الطالب: *${student.name}*\n`;
        message += `المدرسة: *${student.schools?.name || 'المدرسة'}*\n`;
        message += `رقم الدفعة: ${payment.installment_number}\n`;
        message += `المبلغ: *${Utils.formatCurrency(payment.amount)}*\n`;
        message += `تاريخ الدفع: ${Utils.formatDateArabic(payment.payment_date)}\n`;
        if (payment.receipt_number) {
            message += `رقم الإيصال: ${payment.receipt_number}\n`;
        }
        message += `\nشكراً لكم\n`;
        message += `*مجموعة رسول الرحمة التعليمية*`;
        
        return message;
    },
    
    welcome: (student) => {
        let message = `*مجموعة رسول الرحمة التعليمية*\n\n`;
        message += `مرحباً ${student.guardian_name}،\n\n`;
        message += `نرحب بكم في *${student.schools?.name || 'المدرسة'}*\n\n`;
        message += `تم تسجيل الطالب:\n`;
        message += `*${student.name}*\n`;
        message += `الصف: *${student.grade}*\n\n`;
        message += `*تفاصيل الرسوم:*\n`;
        message += `المبلغ السنوي: ${Utils.formatCurrency(student.annual_fee || 0)}\n`;
        if (student.discount_percentage > 0) {
            message += `الخصم: ${student.discount_percentage}% (${Utils.formatCurrency(student.discount_amount || 0)})\n`;
        }
        message += `المبلغ النهائي: *${Utils.formatCurrency(student.final_fee || 0)}*\n`;
        message += `عدد الأقساط: ${CONFIG.INSTALLMENT_COUNT || 4}\n\n`;
        message += `نتمنى لكم عاماً دراسياً موفقاً\n\n`;
        message += `*مجموعة رسول الرحمة التعليمية*`;
        
        return message;
    },
    
    custom: (student, customText) => {
        let message = `*مجموعة رسول الرحمة التعليمية*\n\n`;
        message += `مرحباً ${student.guardian_name}،\n\n`;
        message += customText;
        message += `\n\n*مجموعة رسول الرحمة التعليمية*`;
        
        return message;
    }
};

// إرسال رسالة واتساب محسنة
async function sendWhatsAppMessage(studentId, templateType = 'reminder', customMessage = null) {
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
        
        let message;
        if (templateType === 'custom' && customMessage) {
            message = WhatsAppTemplates.custom(student, customMessage);
        } else if (templateType === 'payment_confirmation') {
            // جلب بيانات آخر دفعة للطالب
            try {
                const { data: lastPayment } = await supabase
                    .from('payments')
                    .select('*')
                    .eq('student_id', studentId)
                    .order('payment_date', { ascending: false })
                    .limit(1)
                    .single();
                
                if (lastPayment) {
                    message = WhatsAppTemplates.payment_confirmation(student, lastPayment);
                } else {
                    message = WhatsAppTemplates.reminder(student, status);
                }
            } catch (err) {
                console.warn('خطأ في جلب بيانات الدفعة:', err);
                message = WhatsAppTemplates.reminder(student, status);
            }
        } else if (templateType === 'welcome') {
            message = WhatsAppTemplates.welcome(student);
        } else {
            message = WhatsAppTemplates.reminder(student, status);
        }

        // حفظ الرسالة في قاعدة البيانات
        const { data: whatsappMessage, error: saveError } = await supabase
            .from('whatsapp_messages')
            .insert({
                student_id: studentId,
                guardian_phone: Utils.cleanPhone(student.phone),
                message: message,
                message_type: templateType,
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
        
        if (url) {
            window.open(url, '_blank');
            
            // تحديث الحالة بعد ثانية
            if (whatsappMessage) {
                setTimeout(async () => {
                    await supabase
                        .from('whatsapp_messages')
                        .update({ 
                            status: 'sent', 
                            sent_at: new Date().toISOString() 
                        })
                        .eq('id', whatsappMessage.id);
                }, 1000);
            }
            
            return { success: true, data: whatsappMessage };
        } else {
            return { success: false, error: 'خطأ في بناء رابط واتساب' };
        }
    } catch (error) {
        console.error('خطأ في إرسال رسالة واتساب:', error);
        return { success: false, error: error.message };
    }
}

// إرسال واتساب جماعي محسن
async function sendBulkWhatsAppMessages(studentIds, templateType = 'reminder', customMessage = null) {
    const results = [];
    let successCount = 0;
    let failCount = 0;
    
    const progressModal = showProgressModal('إرسال رسائل واتساب', studentIds.length);
    
    for (let i = 0; i < studentIds.length; i++) {
        const studentId = studentIds[i];
        
        try {
            updateProgressModal(progressModal, i + 1, studentIds.length, `جاري إرسال الرسالة ${i + 1}...`);
            
            const result = await sendWhatsAppMessage(studentId, templateType, customMessage);
            results.push({ studentId, ...result });
            
            if (result.success) {
                successCount++;
            } else {
                failCount++;
            }
            
            // تأخير بين الرسائل لتجنب الحظر
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            results.push({ studentId, success: false, error: error.message });
            failCount++;
        }
    }
    
    closeProgressModal(progressModal);
    
    showAlert(
        `تم إرسال ${successCount} رسالة بنجاح${failCount > 0 ? ` و ${failCount} فشلت` : ''}`,
        failCount > 0 ? 'warning' : 'success'
    );
    
    return results;
}

// عرض نافذة إرسال واتساب محسنة
function showWhatsAppModal(studentId) {
    const modalHTML = `
        <div class="modal fade" id="whatsappModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header" style="background: linear-gradient(135deg, #25D366 0%, #128C7E 100%); color: white;">
                        <h5 class="modal-title">
                            <i class="bi bi-whatsapp"></i> إرسال رسالة واتساب
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="whatsappForm">
                            <input type="hidden" id="whatsappStudentId" value="${studentId}">
                            
                            <div class="mb-3">
                                <label class="form-label">نوع الرسالة</label>
                                <select class="form-select" id="whatsappTemplate" onchange="updateWhatsAppPreview()">
                                    <option value="reminder">تذكير بدفع الأقساط</option>
                                    <option value="welcome">رسالة ترحيب</option>
                                    <option value="custom">رسالة مخصصة</option>
                                </select>
                            </div>
                            
                            <div class="mb-3" id="customMessageDiv" style="display: none;">
                                <label class="form-label">نص الرسالة المخصصة</label>
                                <textarea class="form-control" id="customMessage" rows="5" 
                                          placeholder="اكتب رسالتك هنا..." oninput="updateWhatsAppPreview()"></textarea>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">معاينة الرسالة</label>
                                <div class="card p-3" style="background: #e5f5e5; border: 1px solid #25D366;">
                                    <div id="whatsappPreview" style="white-space: pre-wrap; font-family: 'Cairo', sans-serif;"></div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                        <button type="button" class="btn" style="background: #25D366; color: white;" onclick="submitWhatsAppMessage()">
                            <i class="bi bi-whatsapp"></i> إرسال
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const existingModal = document.getElementById('whatsappModal');
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = new bootstrap.Modal(document.getElementById('whatsappModal'));
    modal.show();
    
    updateWhatsAppPreview();
}

// تحديث معاينة الرسالة
async function updateWhatsAppPreview() {
    const studentId = document.getElementById('whatsappStudentId')?.value;
    const templateType = document.getElementById('whatsappTemplate')?.value;
    const customMessage = document.getElementById('customMessage')?.value;
    const preview = document.getElementById('whatsappPreview');
    const customDiv = document.getElementById('customMessageDiv');
    
    if (!preview) return;
    
    if (templateType === 'custom') {
        customDiv.style.display = 'block';
    } else {
        customDiv.style.display = 'none';
    }
    
    if (!studentId) {
        preview.textContent = 'يرجى اختيار طالب';
        return;
    }
    
    try {
        const { data: student } = await supabase
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
        
        if (!student) {
            preview.textContent = 'لم يتم العثور على بيانات الطالب';
            return;
        }
        
        const status = calculateStudentStatus(student);
        let message;
        
        if (templateType === 'custom' && customMessage) {
            message = WhatsAppTemplates.custom(student, customMessage);
        } else if (templateType === 'welcome') {
            message = WhatsAppTemplates.welcome(student);
        } else {
            message = WhatsAppTemplates.reminder(student, status);
        }
        
        preview.textContent = message;
    } catch (error) {
        preview.textContent = 'خطأ في تحميل المعاينة';
    }
}

// إرسال رسالة واتساب من النافذة
async function submitWhatsAppMessage() {
    const studentId = document.getElementById('whatsappStudentId')?.value;
    const templateType = document.getElementById('whatsappTemplate')?.value;
    const customMessage = document.getElementById('customMessage')?.value;
    
    if (!studentId) {
        showAlert('يرجى اختيار طالب', 'danger');
        return;
    }
    
    const result = await sendWhatsAppMessage(studentId, templateType, customMessage);
    
    if (result.success) {
        showAlert('تم فتح واتساب بنجاح', 'success');
        const modal = bootstrap.Modal.getInstance(document.getElementById('whatsappModal'));
        modal.hide();
    } else {
        showAlert('خطأ: ' + result.error, 'danger');
    }
}

// عرض نافذة التقدم
function showProgressModal(title, total) {
    const modalHTML = `
        <div class="modal fade" id="progressModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${title}</h5>
                    </div>
                    <div class="modal-body">
                        <div class="progress mb-3" style="height: 25px;">
                            <div class="progress-bar progress-bar-striped progress-bar-animated" 
                                 id="progressBar" style="width: 0%"></div>
                        </div>
                        <p class="text-center mb-0" id="progressText">0 / ${total}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = new bootstrap.Modal(document.getElementById('progressModal'));
    modal.show();
    
    return modal;
}

// تحديث نافذة التقدم
function updateProgressModal(modal, current, total, text) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    if (progressBar) {
        const percentage = (current / total) * 100;
        progressBar.style.width = percentage + '%';
    }
    
    if (progressText) {
        progressText.textContent = text || `${current} / ${total}`;
    }
}

// إغلاق نافذة التقدم
function closeProgressModal(modal) {
    const modalElement = document.getElementById('progressModal');
    if (modalElement) {
        const bsModal = bootstrap.Modal.getInstance(modalElement);
        if (bsModal) bsModal.hide();
        setTimeout(() => modalElement.remove(), 300);
    }
}

