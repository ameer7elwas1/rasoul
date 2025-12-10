// ============================================
// Receipt Printer - Payment Receipt Printing
// ============================================

async function printPaymentReceipt(paymentId) {
    try {
        // التحقق من وجود paymentId
        if (!paymentId) {
            throw new Error('رقم الدفعة غير موجود');
        }

        // التحقق من وجود supabase
        if (typeof supabase === 'undefined') {
            throw new Error('Supabase غير متاح. يرجى التأكد من تحميل config.js');
        }

        // جلب بيانات الدفعة
        const { data: payment, error: paymentError } = await supabase
            .from('payments')
            .select(`
                *,
                students (
                    id,
                    name,
                    guardian_name,
                    mother_name,
                    grade,
                    phone,
                    annual_fee,
                    final_fee,
                    discount_amount,
                    discount_percentage,
                    school_id
                )
            `)
            .eq('id', paymentId)
            .single();

        if (paymentError) {
            console.error('Supabase error:', paymentError);
            throw new Error(`خطأ في جلب بيانات الدفعة: ${paymentError.message || 'خطأ غير معروف'}`);
        }

        if (!payment) {
            throw new Error('لم يتم العثور على بيانات الدفعة');
        }

        if (!payment.students) {
            throw new Error('لم يتم العثور على بيانات الطالب المرتبطة بهذه الدفعة');
        }

        const student = payment.students;
        
        // جلب بيانات المدرسة بشكل منفصل
        let school = { name: 'المدرسة' };
        if (student.school_id) {
            try {
                const { data: schoolData, error: schoolError } = await supabase
                    .from('schools')
                    .select('id, name')
                    .eq('id', student.school_id)
                    .single();
                
                if (!schoolError && schoolData) {
                    school = schoolData;
                } else if (schoolError) {
                    console.warn('خطأ في جلب بيانات المدرسة:', schoolError);
                }
            } catch (err) {
                console.warn('خطأ في جلب بيانات المدرسة:', err);
            }
        }
        
        const paymentDate = new Date(payment.payment_date);
        const formattedDate = `${paymentDate.getDate()} / ${paymentDate.getMonth() + 1} / ${paymentDate.getFullYear()}`;
        
        const receiptNumber = payment.receipt_number || payment.id.substring(0, 8).toUpperCase();
        
        const paymentMethodNames = {
            'cash': 'نقد',
            'bank_transfer': 'تحويل بنكي',
            'check': 'شيك',
            'other': 'أخرى'
        };
        
        const paymentMethod = paymentMethodNames[payment.payment_method] || payment.payment_method;
        
        const installmentNames = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'];
        const installmentName = installmentNames[payment.installment_number - 1] || `الدفعة ${payment.installment_number}`;

        const receiptHTML = `
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>وصل قبض - ${student.name}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Cairo', 'Arial', 'Segoe UI', sans-serif; 
                        padding: 15px; 
                        direction: rtl; 
                        background: #e5e7eb; 
                    }
                    .receipt { 
                        background: white; 
                        max-width: 750px; 
                        margin: 0 auto; 
                        padding: 0; 
                        box-shadow: 0 10px 40px rgba(0,0,0,0.15); 
                    }
                    
                    .header-gradient { 
                        background: linear-gradient(180deg, #0f766e 0%, #f0fdf4 100%); 
                        padding: 30px 15px; 
                        text-align: center; 
                        position: relative;
                        overflow: hidden;
                    }
                    .header-gradient::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background-image: 
                            repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 8px, transparent 8px, transparent 16px);
                        opacity: 0.3;
                    }
                    .logo-container { 
                        margin-bottom: 15px; 
                        position: relative; 
                        z-index: 1; 
                    }
                    .institution-name { 
                        background: white; 
                        border: 3px solid #0f766e; 
                        padding: 12px 40px; 
                        display: inline-block; 
                        border-radius: 25px; 
                        font-weight: bold; 
                        color: #1e40af; 
                        font-size: 18px; 
                        margin-top: 10px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                        position: relative;
                        z-index: 1;
                    }
                    
                    .receipt-header { 
                        display: flex; 
                        justify-content: space-between; 
                        align-items: center; 
                        padding: 12px 20px; 
                        background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); 
                        border-bottom: 2px solid #0f766e; 
                    }
                    .receipt-number { 
                        font-size: 18px; 
                        font-weight: bold; 
                        color: #1f2937; 
                    }
                    .receipt-title { 
                        background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%); 
                        padding: 6px 15px; 
                        border-radius: 15px; 
                        font-weight: bold; 
                        font-size: 15px; 
                        box-shadow: 0 3px 8px rgba(0,0,0,0.1); 
                    }
                    .receipt-date { 
                        font-size: 13px; 
                        font-weight: bold; 
                        color: #374151; 
                    }
                    
                    .content { 
                        padding: 15px 20px; 
                    }
                    .info-row { 
                        margin: 10px 0; 
                        display: grid; 
                        grid-template-columns: 160px 1fr; 
                        gap: 15px; 
                        align-items: center; 
                        padding: 6px 0; 
                        border-bottom: 1px solid #e5e7eb; 
                    }
                    .info-row:last-of-type { 
                        border-bottom: none; 
                    }
                    .info-row label { 
                        font-weight: bold; 
                        font-size: 14px; 
                        color: #374151; 
                    }
                    .info-value { 
                        font-size: 15px; 
                        font-weight: 600; 
                        color: #1f2937; 
                        padding: 6px 12px; 
                        background: #f9fafb; 
                        border-radius: 6px; 
                        border: 2px solid #e5e7eb; 
                    }
                    
                    .amount-highlight {
                        background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
                        border: 2px solid #10b981;
                        padding: 12px;
                        border-radius: 10px;
                        margin: 15px 0;
                        text-align: center;
                    }
                    .amount-highlight label {
                        display: block;
                        font-size: 14px;
                        color: #065f46;
                        margin-bottom: 5px;
                    }
                    .amount-highlight .amount-value {
                        font-size: 24px;
                        font-weight: bold;
                        color: #047857;
                    }
                    
                    .notes-section { 
                        background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); 
                        padding: 12px; 
                        margin: 15px 0; 
                        border-radius: 10px; 
                        border-right: 4px solid #f59e0b; 
                        box-shadow: 0 3px 8px rgba(245, 158, 11, 0.1); 
                    }
                    .notes-section ul { 
                        list-style: none; 
                        padding-right: 0; 
                    }
                    .notes-section li { 
                        margin: 6px 0; 
                        font-size: 12px; 
                        color: #78350f; 
                        font-weight: 500; 
                        padding-right: 20px; 
                        position: relative; 
                    }
                    .notes-section li::before { 
                        content: '✓'; 
                        position: absolute; 
                        right: 0; 
                        top: 0; 
                        color: #f59e0b; 
                        font-weight: bold; 
                        font-size: 15px; 
                    }
                    
                    .signature-section { 
                        display: flex; 
                        justify-content: space-around; 
                        margin: 20px 0 15px 0; 
                        padding-top: 15px; 
                        border-top: 2px solid #e5e7eb; 
                    }
                    .signature-box { 
                        text-align: center; 
                        min-width: 180px; 
                    }
                    .signature-box label { 
                        font-weight: bold; 
                        display: block; 
                        margin-bottom: 10px; 
                        font-size: 14px; 
                        color: #374151; 
                    }
                    .signature-line { 
                        border-bottom: 2px solid #1f2937; 
                        height: 40px; 
                        width: 180px; 
                        margin: 0 auto; 
                        position: relative; 
                        border-radius: 4px; 
                    }
                    
                    .separator { 
                        height: 2px; 
                        background: linear-gradient(90deg, transparent, #0f766e, transparent); 
                        margin: 12px 0; 
                    }
                    
                    @media print {
                        body { 
                            background: white; 
                            padding: 0; 
                        }
                        .receipt { 
                            border: none; 
                            box-shadow: none; 
                            max-width: 100%; 
                        }
                    }
                </style>
            </head>
            <body>
                <div class="receipt">
                    <div class="header-gradient">
                        <div class="logo-container"></div>
                        <div class="institution-name">مجموعة رسول الرحمة التعليمية</div>
                    </div>
                    
                    <div class="receipt-header">
                        <div class="receipt-number">${receiptNumber}</div>
                        <div class="receipt-title">وصل قبض</div>
                        <div class="receipt-date">التاريخ: ${formattedDate}</div>
                    </div>
                    
                    <div class="content">
                        <div class="info-row">
                            <label>استلمت من السيد ولي أمر الطالب:</label>
                            <span class="info-value">${Utils.sanitizeHTML(student.guardian_name)}</span>
                        </div>
                        
                        <div class="info-row">
                            <label>اسم الطالب:</label>
                            <span class="info-value">${Utils.sanitizeHTML(student.name)}</span>
                        </div>
                        
                        <div class="info-row">
                            <label>في الصف:</label>
                            <span class="info-value">${Utils.sanitizeHTML(student.grade)}</span>
                        </div>
                        
                        <div class="info-row">
                            <label>المدرسة:</label>
                            <span class="info-value">${Utils.sanitizeHTML(school.name)}</span>
                        </div>
                        
                        <div class="separator"></div>
                        
                        <div class="amount-highlight">
                            <label>مبلغاً قدره:</label>
                            <div class="amount-value">${Utils.formatCurrency(payment.amount)}</div>
                        </div>
                        
                        <div class="info-row">
                            <label>وهو القسط:</label>
                            <span class="info-value">${installmentName}</span>
                        </div>
                        
                        <div class="info-row">
                            <label>طريقة الدفع:</label>
                            <span class="info-value">${paymentMethod}</span>
                        </div>
                        
                        ${payment.notes ? `
                        <div class="info-row">
                            <label>الملاحظات:</label>
                            <span class="info-value">${Utils.sanitizeHTML(payment.notes)}</span>
                        </div>
                        ` : ''}
                        
                        <div class="separator"></div>
                        
                        <div class="notes-section">
                            <ul>
                                <li>يسقط حق المطالبة بالمبلغ بعد توقيع الوصل.</li>
                                <li>يرجى الاحتفاظ بهذا الوصل حتى نهاية العام الدراسي.</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div class="signature-section">
                        <div class="signature-box">
                            <label>اسم المستلم:</label>
                            <div class="signature-line"></div>
                        </div>
                        <div class="signature-box">
                            <label>التوقيع:</label>
                            <div class="signature-line"></div>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        // التحقق من أن النافذة فتحت بنجاح
        const printWindow = window.open('', '_blank');
        
        if (!printWindow) {
            throw new Error('فشل فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة في المتصفح');
        }

        printWindow.document.write(receiptHTML);
        printWindow.document.close();
        
        // انتظار تحميل المحتوى قبل الطباعة
        printWindow.onload = () => {
            setTimeout(() => {
                try {
                    printWindow.print();
                } catch (printError) {
                    console.error('Error in print dialog:', printError);
                    printWindow.close();
                    throw new Error('فشل فتح نافذة الطباعة');
                }
            }, 500);
        };
        
        // Fallback في حالة عدم تحميل onload
        setTimeout(() => {
            try {
                if (printWindow.document.readyState === 'complete') {
                    printWindow.print();
                }
            } catch (e) {
                console.warn('Print fallback failed:', e);
            }
        }, 1000);
        
        return { success: true };
    } catch (error) {
        console.error('Error printing receipt:', error);
        
        // عرض رسالة خطأ للمستخدم
        if (typeof showAlert === 'function') {
            showAlert(`خطأ في طباعة الوصل: ${error.message}`, 'danger');
        } else {
            alert(`خطأ في طباعة الوصل: ${error.message}`);
        }
        
        return { success: false, error: error.message };
    }
}

function viewPayment(paymentId) {
    printPaymentReceipt(paymentId);
}

// دالة مساعدة للاستدعاء من onclick
async function printPaymentReceiptAsync(paymentId) {
    if (!paymentId) {
        alert('رقم الدفعة غير موجود');
        return;
    }
    
    const result = await printPaymentReceipt(paymentId);
    if (!result.success && result.error) {
        if (typeof showAlert === 'function') {
            showAlert(result.error, 'danger');
        } else {
            alert(result.error);
        }
    }
}

// طباعة متقدمة مع خيارات
async function printPaymentReceiptAdvanced(paymentId, options = {}) {
    const {
        showPrintDialog = true,
        includeQRCode = false,
        includeBarcode = false,
        paperSize = 'A4',
        orientation = 'portrait'
    } = options;

    const result = await printPaymentReceipt(paymentId);
    
    if (result.success && showPrintDialog) {
        // النافذة ستفتح تلقائياً من printPaymentReceipt
    }
    
    return result;
}

// تصدير PDF للوصل
async function exportReceiptToPDF(paymentId) {
    try {
        if (typeof window.jsPDF === 'undefined') {
            showAlert('مكتبة PDF غير متوفرة. يرجى تحميل الصفحة مرة أخرى.', 'warning');
            return;
        }

        const { data: payment, error: paymentError } = await supabase
            .from('payments')
            .select(`
                *,
                students (
                    id,
                    name,
                    guardian_name,
                    mother_name,
                    grade,
                    phone,
                    annual_fee,
                    final_fee,
                    discount_amount,
                    discount_percentage,
                    school_id,
                    schools (
                        id,
                        name
                    )
                )
            `)
            .eq('id', paymentId)
            .single();

        if (paymentError) throw paymentError;
        if (!payment || !payment.students) {
            throw new Error('Payment or student data not found');
        }

        const student = payment.students;
        const school = student.schools || { name: 'المدرسة' };
        
        const paymentDate = new Date(payment.payment_date);
        const formattedDate = Utils.formatDateArabic(payment.payment_date);
        
        const receiptNumber = payment.receipt_number || payment.id.substring(0, 8).toUpperCase();
        
        const paymentMethodNames = {
            'cash': 'نقد',
            'bank_transfer': 'تحويل بنكي',
            'check': 'شيك',
            'other': 'أخرى'
        };
        
        const paymentMethod = paymentMethodNames[payment.payment_method] || payment.payment_method;
        
        const installmentNames = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'];
        const installmentName = installmentNames[payment.installment_number - 1] || `الدفعة ${payment.installment_number}`;

        const { jsPDF } = window.jsPDF;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // إعداد الخط العربي
        doc.setFont('helvetica');
        
        // العنوان
        doc.setFontSize(20);
        doc.setTextColor(15, 118, 110);
        doc.text('مجموعة رسول الرحمة التعليمية', 105, 20, { align: 'center' });
        
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text('وصل قبض', 105, 30, { align: 'center' });
        
        // معلومات الوصل
        doc.setFontSize(10);
        let yPos = 45;
        
        doc.text(`رقم الوصل: ${receiptNumber}`, 20, yPos);
        doc.text(`التاريخ: ${formattedDate}`, 150, yPos);
        
        yPos += 10;
        doc.line(20, yPos - 5, 190, yPos - 5);
        
        yPos += 10;
        doc.setFontSize(12);
        doc.text('استلمت من السيد ولي أمر الطالب:', 20, yPos);
        doc.setFontSize(11);
        doc.text(student.guardian_name, 20, yPos + 7);
        
        yPos += 15;
        doc.setFontSize(12);
        doc.text('اسم الطالب:', 20, yPos);
        doc.setFontSize(11);
        doc.text(student.name, 20, yPos + 7);
        
        yPos += 15;
        doc.setFontSize(12);
        doc.text('في الصف:', 20, yPos);
        doc.setFontSize(11);
        doc.text(student.grade, 20, yPos + 7);
        
        yPos += 15;
        doc.setFontSize(12);
        doc.text('المدرسة:', 20, yPos);
        doc.setFontSize(11);
        doc.text(school.name, 20, yPos + 7);
        
        yPos += 20;
        doc.line(20, yPos - 5, 190, yPos - 5);
        
        // المبلغ
        yPos += 10;
        doc.setFontSize(14);
        doc.text('مبلغاً قدره:', 20, yPos);
        doc.setFontSize(18);
        doc.setTextColor(15, 118, 110);
        doc.text(Utils.formatCurrency(payment.amount), 105, yPos, { align: 'center' });
        
        yPos += 15;
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text(`وهو القسط: ${installmentName}`, 20, yPos);
        
        yPos += 10;
        doc.text(`طريقة الدفع: ${paymentMethod}`, 20, yPos);
        
        if (payment.notes) {
            yPos += 10;
            doc.text(`الملاحظات: ${payment.notes}`, 20, yPos);
        }
        
        yPos += 20;
        doc.line(20, yPos - 5, 190, yPos - 5);
        
        // التوقيعات
        yPos += 15;
        doc.setFontSize(10);
        doc.text('اسم المستلم:', 50, yPos);
        doc.text('التوقيع:', 140, yPos);
        
        yPos += 10;
        doc.line(50, yPos, 100, yPos);
        doc.line(140, yPos, 190, yPos);
        
        // ملاحظات
        yPos += 20;
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text('• يسقط حق المطالبة بالمبلغ بعد توقيع الوصل.', 20, yPos);
        yPos += 7;
        doc.text('• يرجى الاحتفاظ بهذا الوصل حتى نهاية العام الدراسي.', 20, yPos);
        
        // حفظ الملف
        const fileName = `receipt_${receiptNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        
        return { success: true, fileName };
    } catch (error) {
        console.error('Error exporting receipt to PDF:', error);
        return { success: false, error: error.message };
    }
}

