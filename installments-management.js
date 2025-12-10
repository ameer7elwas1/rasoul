// ============================================
// Installments Management JavaScript
// ============================================


function displayStudentInstallments(student) {
    const container = document.getElementById('installmentsContent');
    
    if (!student.installments || !Array.isArray(student.installments)) {
        container.innerHTML = '<p class="text-center text-muted">لا توجد أقساط مسجلة</p>';
        return;
    }

    const status = calculateStudentStatus(student);
    
    container.innerHTML = `
        <div class="card mb-4">
            <div class="card-header bg-primary text-white">
                <h5 class="mb-0">أقساط الطالب: ${student.name}</h5>
            </div>
            <div class="card-body">
                <div class="row mb-3">
                    <div class="col-md-3">
                        <div class="stat-card">
                            <div class="label">المبلغ الإجمالي</div>
                            <div class="value">${Utils.formatCurrency(student.final_fee)}</div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-card">
                            <div class="label">المدفوع</div>
                            <div class="value text-success">${Utils.formatCurrency(status.totalPaid)}</div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-card">
                            <div class="label">المتبقي</div>
                            <div class="value text-danger">${Utils.formatCurrency(status.remaining)}</div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-card">
                            <div class="label">نسبة الدفع</div>
                            <div class="value">${((status.totalPaid / status.totalDue) * 100).toFixed(1)}%</div>
                        </div>
                    </div>
                </div>
                
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>رقم الدفعة</th>
                                <th>المبلغ</th>
                                <th>المدفوع</th>
                                <th>المتبقي</th>
                                <th>تاريخ الاستحقاق</th>
                                <th>تاريخ الدفع</th>
                                <th>الحالة</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${student.installments.map(inst => {
                                const amount = parseFloat(inst.amount || 0);
                                const paid = parseFloat(inst.amount_paid || 0);
                                const remaining = amount - paid;
                                const isPaid = paid >= amount;
                                const isPartial = paid > 0 && paid < amount;
                                
                                let statusBadge = '<span class="badge bg-danger">غير مدفوع</span>';
                                if (isPaid) {
                                    statusBadge = '<span class="badge bg-success">مدفوع</span>';
                                } else if (isPartial) {
                                    statusBadge = '<span class="badge bg-warning">مدفوع جزئياً</span>';
                                }
                                
                                return `
                                    <tr>
                                        <td>${inst.installment_number}</td>
                                        <td>${Utils.formatCurrency(amount)}</td>
                                        <td>${Utils.formatCurrency(paid)}</td>
                                        <td>${Utils.formatCurrency(remaining)}</td>
                                        <td>${Utils.formatDateArabic(inst.due_date)}</td>
                                        <td>${inst.payment_date ? Utils.formatDateArabic(inst.payment_date) : '-'}</td>
                                        <td>${statusBadge}</td>
                                        <td>
                                            ${!isPaid ? `
                                                <button class="btn btn-sm btn-success" onclick="showAddPaymentModal('${student.id}', ${inst.installment_number})">
                                                    <i class="bi bi-cash-coin"></i> دفع
                                                </button>
                                            ` : ''}
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}


function showAddPaymentModal(studentId, installmentNumber) {
    const student = studentsData.find(s => s.id === studentId);
    if (!student) return;

    const installment = student.installments.find(inst => inst.installment_number === installmentNumber);
    if (!installment) return;

    const modalHTML = `
        <div class="modal fade" id="addPaymentModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">إضافة دفعة - ${student.name}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="addPaymentForm">
                            <input type="hidden" id="paymentStudentId" value="${studentId}">
                            <input type="hidden" id="paymentInstallmentNumber" value="${installmentNumber}">
                            
                            <div class="mb-3">
                                <label class="form-label">رقم الدفعة</label>
                                <input type="text" class="form-control" value="${installmentNumber}" disabled>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">المبلغ المطلوب</label>
                                <input type="text" class="form-control" value="${Utils.formatCurrency(installment.amount)}" disabled>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">المبلغ المدفوع</label>
                                <input type="text" class="form-control" value="${Utils.formatCurrency(installment.amount_paid || 0)}" disabled>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">المبلغ المتبقي</label>
                                <input type="text" class="form-control" value="${Utils.formatCurrency(parseFloat(installment.amount) - parseFloat(installment.amount_paid || 0))}" disabled>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">المبلغ المراد دفعه *</label>
                                <div class="input-group">
                                    <input type="number" class="form-control" id="paymentAmount" 
                                           max="${parseFloat(installment.amount) - parseFloat(installment.amount_paid || 0)}" 
                                           min="0" step="1000" required
                                           oninput="updatePaymentPreview()">
                                    <button class="btn btn-outline-secondary" type="button" onclick="setFullAmount()">
                                        المبلغ الكامل
                                    </button>
                                </div>
                                <small class="text-muted">يمكنك دفع المبلغ كاملاً أو جزئياً</small>
                            </div>
                            
                            <div class="mb-3" id="paymentPreview" style="display: none;">
                                <div class="alert alert-info">
                                    <strong>معاينة الدفعة:</strong>
                                    <div id="previewContent"></div>
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">تاريخ الدفع *</label>
                                <input type="date" class="form-control" id="paymentDate" 
                                       value="${new Date().toISOString().split('T')[0]}" required>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">طريقة الدفع *</label>
                                <select class="form-select" id="paymentMethod" required>
                                    <option value="cash">نقدي</option>
                                    <option value="bank_transfer">تحويل بنكي</option>
                                    <option value="check">شيك</option>
                                    <option value="other">أخرى</option>
                                </select>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">رقم الإيصال</label>
                                <input type="text" class="form-control" id="receiptNumber">
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">ملاحظات</label>
                                <textarea class="form-control" id="paymentNotes" rows="3"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-info" id="printReceiptBtn" onclick="printLastPaymentReceipt()" style="display: none;">
                            <i class="bi bi-printer"></i> طباعة الوصل
                        </button>
                        <button type="button" class="btn btn-success" id="exportPDFBtn" onclick="exportLastPaymentPDF()" style="display: none;">
                            <i class="bi bi-file-pdf"></i> تصدير PDF
                        </button>
                        <button type="button" class="btn btn-warning" id="sendWhatsAppBtn" onclick="sendPaymentWhatsApp()" style="display: none;">
                            <i class="bi bi-whatsapp"></i> إرسال واتساب
                        </button>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                        <button type="button" class="btn btn-primary" onclick="submitPayment()">
                            <i class="bi bi-check-circle"></i> حفظ وتسجيل الدفعة
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    
    const existingModal = document.getElementById('addPaymentModal');
    if (existingModal) {
        existingModal.remove();
    }

    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    
    const modal = new bootstrap.Modal(document.getElementById('addPaymentModal'));
    modal.show();
    
    // إضافة مستمعات للأحداث
    document.getElementById('paymentAmount')?.addEventListener('input', updatePaymentPreview);
}

// تحديث معاينة الدفعة
function updatePaymentPreview() {
    const amount = parseFloat(document.getElementById('paymentAmount')?.value || 0);
    const installmentAmount = parseFloat(document.getElementById('paymentAmount')?.max || 0);
    const preview = document.getElementById('paymentPreview');
    const previewContent = document.getElementById('previewContent');
    
    if (!preview || !previewContent) return;
    
    if (amount > 0) {
        preview.style.display = 'block';
        const remaining = installmentAmount - amount;
        previewContent.innerHTML = `
            المبلغ المدفوع: <strong>${Utils.formatCurrency(amount)}</strong><br>
            المبلغ المتبقي: <strong>${Utils.formatCurrency(remaining)}</strong><br>
            ${remaining === 0 ? '<span class="text-success">✓ سيتم إكمال الدفعة</span>' : '<span class="text-warning">دفعة جزئية</span>'}
        `;
    } else {
        preview.style.display = 'none';
    }
}

// تعيين المبلغ الكامل
function setFullAmount() {
    const amountInput = document.getElementById('paymentAmount');
    if (amountInput) {
        amountInput.value = amountInput.max;
        updatePaymentPreview();
    }
}


async function submitPayment() {
    const studentId = document.getElementById('paymentStudentId').value;
    const installmentNumber = parseInt(document.getElementById('paymentInstallmentNumber').value);
    const amount = parseFloat(document.getElementById('paymentAmount').value);
    const paymentDate = document.getElementById('paymentDate').value;
    const paymentMethod = document.getElementById('paymentMethod').value;
    const receiptNumber = document.getElementById('receiptNumber').value.trim();
    const notes = document.getElementById('paymentNotes').value.trim();

    if (!amount || amount <= 0) {
        alert('يرجى إدخال مبلغ صحيح');
        return;
    }

    try {
        const result = await addPaymentToStudent(studentId, {
            installment_number: installmentNumber,
            amount: amount,
            payment_date: paymentDate,
            payment_method: paymentMethod,
            receipt_number: receiptNumber || null,
            notes: notes || null
        });

        if (result.success) {
            showAlert('تم إضافة الدفعة بنجاح', 'success');
            
            const paymentId = result.data?.id || result.paymentId;
            if (window.lastPaymentId !== undefined) {
                window.lastPaymentId = paymentId;
            }
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('addPaymentModal'));
            
            // حفظ paymentId للاستخدام لاحقاً
            window.lastPaymentId = paymentId;
            
            const printBtn = document.getElementById('printReceiptBtn');
            const exportBtn = document.getElementById('exportPDFBtn');
            const whatsappBtn = document.getElementById('sendWhatsAppBtn');
            
            if (paymentId) {
                if (printBtn) {
                    printBtn.style.display = 'inline-block';
                    printBtn.onclick = async () => {
                        if (typeof printPaymentReceipt === 'function') {
                            await printPaymentReceipt(paymentId);
                        } else {
                            showAlert('دالة الطباعة غير متوفرة', 'warning');
                        }
                    };
                }
                
                if (exportBtn) {
                    exportBtn.style.display = 'inline-block';
                    exportBtn.onclick = () => {
                        if (typeof exportReceiptToPDF === 'function') {
                            exportReceiptToPDF(paymentId);
                        }
                    };
                }
                
                if (whatsappBtn) {
                    whatsappBtn.style.display = 'inline-block';
                    whatsappBtn.onclick = () => {
                        sendPaymentConfirmationWhatsApp(studentId, paymentId);
                    };
                }
                
                // عرض نافذة تأكيد مع خيارات
                showPaymentSuccessModal(paymentId, studentId);
            }
            
            modal.hide();
            
            await loadStudents();
            await loadPayments();
            await loadDashboardStats();
            
            if (document.getElementById('installments').classList.contains('active')) {
                const student = studentsData.find(s => s.id === studentId);
                if (student) {
                    const { data, error } = await supabase
                        .from('students')
                        .select('*')
                        .eq('id', studentId)
                        .single();
                    
                    if (!error && data) {
                        displayStudentInstallments(data);
                    }
                }
            }
        } else {
            showAlert('خطأ في إضافة الدفعة: ' + result.error, 'danger');
        }
    } catch (error) {
        console.error('خطأ في إضافة الدفعة:', error);
        showAlert('حدث خطأ أثناء إضافة الدفعة', 'danger');
    }
}


function showAddStudentModal() {
    const modalHTML = `
        <div class="modal fade" id="addStudentModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">إضافة طالب جديد</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="addStudentForm">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">اسم الطالب *</label>
                                    <input type="text" class="form-control" id="studentName" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">اسم ولي الأمر *</label>
                                    <input type="text" class="form-control" id="guardianName" required>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">اسم الأم *</label>
                                    <input type="text" class="form-control" id="motherName" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">الصف *</label>
                                    <select class="form-select" id="studentGrade" required>
                                        ${GRADES[currentSchool.id]?.map(grade => 
                                            `<option value="${grade}">${grade}</option>`
                                        ).join('') || ''}
                                    </select>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">رقم الهاتف *</label>
                                    <input type="tel" class="form-control" id="studentPhone" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">عدد الإخوة</label>
                                    <input type="number" class="form-control" id="siblingCount" 
                                           value="1" min="1" max="10" onchange="calculateDiscount()">
                                    <small class="text-muted">سيتم حساب الخصم تلقائياً</small>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">المبلغ السنوي *</label>
                                    <input type="number" class="form-control" id="annualFee" 
                                           value="${CONFIG.DEFAULT_FEES.ELEMENTARY}" 
                                           min="0" step="1000" required onchange="calculateDiscount()">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">تاريخ التسجيل</label>
                                    <input type="date" class="form-control" id="registrationDate" 
                                           value="${new Date().toISOString().split('T')[0]}">
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-4 mb-3">
                                    <label class="form-label">نسبة الخصم</label>
                                    <input type="text" class="form-control" id="discountPercentage" 
                                           value="0%" disabled>
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label class="form-label">مبلغ الخصم</label>
                                    <input type="text" class="form-control" id="discountAmount" 
                                           value="0 د.ع" disabled>
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label class="form-label">المبلغ النهائي</label>
                                    <input type="text" class="form-control" id="finalFee" 
                                           value="0 د.ع" disabled>
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">ملاحظات</label>
                                <textarea class="form-control" id="studentNotes" rows="3"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                        <button type="button" class="btn btn-primary" onclick="submitStudent()">حفظ</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    
    const existingModal = document.getElementById('addStudentModal');
    if (existingModal) {
        existingModal.remove();
    }

    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    
    const modal = new bootstrap.Modal(document.getElementById('addStudentModal'));
    modal.show();
    
    
    calculateDiscount();
}


// عرض نافذة نجاح الدفع مع خيارات
function showPaymentSuccessModal(paymentId, studentId) {
    const modalHTML = `
        <div class="modal fade" id="paymentSuccessModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-check-circle-fill"></i> تم تسجيل الدفعة بنجاح
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body text-center">
                        <div class="mb-4">
                            <i class="bi bi-check-circle-fill text-success" style="font-size: 4rem;"></i>
                        </div>
                        <h4>تم تسجيل الدفعة بنجاح</h4>
                        <p class="text-muted">ما الذي تريد فعله الآن؟</p>
                        <div class="d-grid gap-2">
                                                <button class="btn btn-primary" onclick="printPaymentReceiptAsync('${paymentId}')">
                                <i class="bi bi-printer"></i> طباعة الوصل
                            </button>
                            <button class="btn btn-info" onclick="exportReceiptToPDF('${paymentId}')">
                                <i class="bi bi-file-pdf"></i> تصدير PDF
                            </button>
                            <button class="btn" style="background: #25D366; color: white;" onclick="sendPaymentConfirmationWhatsApp('${studentId}', '${paymentId}')">
                                <i class="bi bi-whatsapp"></i> إرسال تأكيد واتساب
                            </button>
                            <button class="btn btn-secondary" data-bs-dismiss="modal">
                                إغلاق
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('paymentSuccessModal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = new bootstrap.Modal(document.getElementById('paymentSuccessModal'));
    modal.show();
}

// إرسال تأكيد واتساب بعد الدفع
async function sendPaymentConfirmationWhatsApp(studentId, paymentId) {
    try {
        if (!paymentId) {
            showAlert('رقم الدفعة غير موجود', 'danger');
            return;
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
            console.error('خطأ في جلب بيانات الدفعة:', paymentError);
            showAlert('خطأ في جلب بيانات الدفعة: ' + paymentError.message, 'danger');
            return;
        }
        
        if (!payment) {
            showAlert('لم يتم العثور على بيانات الدفعة', 'danger');
            return;
        }
        
        if (!payment.students) {
            showAlert('لم يتم العثور على بيانات الطالب المرتبطة بهذه الدفعة', 'danger');
            return;
        }
        
        const student = payment.students;
        
        // جلب بيانات المدرسة بشكل منفصل
        let schoolName = 'المدرسة';
        if (student.school_id) {
            try {
                const { data: schoolData, error: schoolError } = await supabase
                    .from('schools')
                    .select('id, name')
                    .eq('id', student.school_id)
                    .single();
                
                if (!schoolError && schoolData) {
                    schoolName = schoolData.name;
                }
            } catch (err) {
                console.warn('خطأ في جلب بيانات المدرسة:', err);
            }
        }
        
        // إضافة بيانات المدرسة للطالب
        student.schools = { name: schoolName };
        
        // إنشاء رسالة التأكيد
        const message = WhatsAppTemplates.payment_confirmation(student, payment);
        
        // إرسال الرسالة
        const result = await sendWhatsAppMessage(studentId, 'payment_confirmation', null);
        
        if (result.success) {
            showAlert('تم فتح واتساب لإرسال التأكيد', 'success');
        } else {
            showAlert('خطأ: ' + (result.error || 'خطأ غير معروف'), 'danger');
        }
    } catch (error) {
        console.error('خطأ في إرسال تأكيد واتساب:', error);
        showAlert('حدث خطأ أثناء إرسال التأكيد: ' + error.message, 'danger');
    }
}

function calculateDiscount() {
    const siblingCount = parseInt(document.getElementById('siblingCount')?.value || 1);
    const annualFee = parseFloat(document.getElementById('annualFee')?.value || 0);
    
    let discountRate = 0;
    if (siblingCount >= 3) {
        discountRate = CONFIG.DISCOUNTS.SIBLING_3_PLUS;
    } else if (siblingCount === 2) {
        discountRate = CONFIG.DISCOUNTS.SIBLING_2;
    }
    
    const discountAmount = annualFee * discountRate;
    const finalFee = annualFee - discountAmount;
    
    if (document.getElementById('discountPercentage')) {
        document.getElementById('discountPercentage').value = (discountRate * 100).toFixed(0) + '%';
        document.getElementById('discountAmount').value = Utils.formatCurrency(discountAmount);
        document.getElementById('finalFee').value = Utils.formatCurrency(finalFee);
    }
}


async function submitStudent() {
    const studentData = {
        name: document.getElementById('studentName').value.trim(),
        guardian_name: document.getElementById('guardianName').value.trim(),
        mother_name: document.getElementById('motherName').value.trim(),
        grade: document.getElementById('studentGrade').value,
        phone: document.getElementById('studentPhone').value.trim(),
        school_id: currentSchool.id,
        annual_fee: parseFloat(document.getElementById('annualFee').value),
        sibling_count: parseInt(document.getElementById('siblingCount').value),
        registration_date: document.getElementById('registrationDate').value,
        notes: document.getElementById('studentNotes').value.trim()
    };

    
    if (!Utils.validateName(studentData.name)) {
        alert('يرجى إدخال اسم طالب صحيح');
        return;
    }

    if (!Utils.validatePhone(studentData.phone)) {
        alert('يرجى إدخال رقم هاتف صحيح');
        return;
    }

    try {
        const result = await addStudent(studentData);

        if (result.success) {
            let successMessage = 'تم إضافة الطالب بنجاح';
            
            
            if (result.siblingsInfo && result.siblingsInfo.length > 0) {
                const siblingsDetails = result.siblingsInfo.map(s => {
                    return `${s.name} (${s.school})`;
                }).join('، ');
                
                successMessage += `\n\nتم اكتشاف ${result.siblingsInfo.length} أخ/أخت في المدارس والروضات:`;
                successMessage += `\n${siblingsDetails}`;
                
                if (result.discountApplied) {
                    successMessage += `\n\nتم تطبيق خصم ${result.discountPercentage}% تلقائياً بسبب وجود ${result.siblingCount} إخوة`;
                }
            }
            
            showAlert(successMessage, 'success');
            
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('addStudentModal'));
            modal.hide();
            
            
            await loadStudents();
            await loadDashboardStats();
        } else {
            showAlert('خطأ في إضافة الطالب: ' + result.error, 'danger');
        }
    } catch (error) {
        console.error('خطأ في إضافة الطالب:', error);
        showAlert('حدث خطأ أثناء إضافة الطالب', 'danger');
    }
}

