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
                                <input type="number" class="form-control" id="paymentAmount" 
                                       max="${parseFloat(installment.amount) - parseFloat(installment.amount_paid || 0)}" 
                                       min="0" step="1000" required>
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
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                        <button type="button" class="btn btn-primary" onclick="submitPayment()">حفظ</button>
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
            
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('addPaymentModal'));
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

