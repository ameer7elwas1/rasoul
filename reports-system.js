// ============================================
// Advanced Reports System - نظام التقارير المتقدم
// ============================================

// تحميل التقارير للمدرسة
async function loadReports() {
    try {
        const reportsContent = document.getElementById('reportsContent');
        if (!reportsContent) return;

        reportsContent.innerHTML = `
            <div class="row mb-4">
                <div class="col-md-12">
                    <div class="card-custom">
                        <div class="card-header-custom">
                            <i class="bi bi-graph-up"></i> نظام التقارير المتقدم
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-3 mb-3">
                                    <button class="btn btn-primary-custom w-100" onclick="generateFinancialReport()">
                                        <i class="bi bi-cash-stack"></i> التقرير المالي
                                    </button>
                                </div>
                                <div class="col-md-3 mb-3">
                                    <button class="btn btn-success-custom w-100" onclick="generateStudentsReport()">
                                        <i class="bi bi-people-fill"></i> تقرير الطلاب
                                    </button>
                                </div>
                                <div class="col-md-3 mb-3">
                                    <button class="btn btn-info-custom w-100" onclick="generatePaymentsReport()">
                                        <i class="bi bi-receipt-cutoff"></i> تقرير المدفوعات
                                    </button>
                                </div>
                                <div class="col-md-3 mb-3">
                                    <button class="btn btn-danger-custom w-100" onclick="generateOverdueReport()">
                                        <i class="bi bi-exclamation-triangle"></i> المتأخرون
                                    </button>
                                </div>
                            </div>
                            <div class="row mt-3">
                                <div class="col-md-4 mb-3">
                                    <button class="btn btn-primary w-100" onclick="generateMonthlyReport()">
                                        <i class="bi bi-calendar-month"></i> التقرير الشهري
                                    </button>
                                </div>
                                <div class="col-md-4 mb-3">
                                    <button class="btn btn-success w-100" onclick="generateGradeReport()">
                                        <i class="bi bi-mortarboard"></i> تقرير حسب الصف
                                    </button>
                                </div>
                                <div class="col-md-4 mb-3">
                                    <button class="btn btn-info w-100" onclick="generateCustomReport()">
                                        <i class="bi bi-sliders"></i> تقرير مخصص
                                    </button>
                                </div>
                            </div>
                            <div id="reportOutput" class="mt-4"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('خطأ في تحميل التقارير:', error);
    }
}

// التقرير المالي الشامل
async function generateFinancialReport() {
    try {
        const output = document.getElementById('reportOutput');
        output.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div></div>';

        const { data: students, error } = await supabase
            .from('students')
            .select('*')
            .eq('school_id', currentSchool.id)
            .eq('is_active', true);

        if (error) throw error;

        let totalFees = 0;
        let totalPaid = 0;
        let totalDiscount = 0;
        let paidCount = 0;
        let partialCount = 0;
        let unpaidCount = 0;

        students.forEach(student => {
            totalFees += parseFloat(student.final_fee || 0);
            totalDiscount += parseFloat(student.discount_amount || 0);
            
            const status = calculateStudentStatus(student);
            totalPaid += status.totalPaid;
            
            if (status.status === 'paid') paidCount++;
            else if (status.status === 'partial') partialCount++;
            else unpaidCount++;
        });

        const totalRemaining = totalFees - totalPaid;
        const paymentRate = totalFees > 0 ? (totalPaid / totalFees * 100) : 0;

        const reportHTML = `
            <div class="card-custom">
                <div class="card-header-custom">
                    <i class="bi bi-cash-stack"></i> التقرير المالي الشامل
                    <button class="btn btn-sm btn-light float-start" onclick="exportReport('financial')">
                        <i class="bi bi-download"></i> تصدير PDF
                    </button>
                </div>
                <div class="card-body">
                    <div class="row mb-4">
                        <div class="col-md-3">
                            <div class="stats-box">
                                <h3>إجمالي الرسوم</h3>
                                <p>${Utils.formatCurrency(totalFees)}</p>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stats-box" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                                <h3>المبلغ المدفوع</h3>
                                <p>${Utils.formatCurrency(totalPaid)}</p>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stats-box" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
                                <h3>المبلغ المتبقي</h3>
                                <p>${Utils.formatCurrency(totalRemaining)}</p>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stats-box" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                                <h3>نسبة التحصيل</h3>
                                <p>${paymentRate.toFixed(1)}%</p>
                            </div>
                        </div>
                    </div>
                    <div class="row mb-4">
                        <div class="col-md-4">
                            <div class="card p-3 text-center">
                                <h5 class="text-success">${paidCount}</h5>
                                <p class="mb-0">طلاب مدفوعين بالكامل</p>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card p-3 text-center">
                                <h5 class="text-warning">${partialCount}</h5>
                                <p class="mb-0">طلاب مدفوعين جزئياً</p>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card p-3 text-center">
                                <h5 class="text-danger">${unpaidCount}</h5>
                                <p class="mb-0">طلاب غير مدفوعين</p>
                            </div>
                        </div>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>اسم الطالب</th>
                                    <th>المبلغ السنوي</th>
                                    <th>الخصم</th>
                                    <th>المبلغ النهائي</th>
                                    <th>المدفوع</th>
                                    <th>المتبقي</th>
                                    <th>نسبة الدفع</th>
                                    <th>الحالة</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${students.map(student => {
                                    const status = calculateStudentStatus(student);
                                    const paymentPercent = status.totalDue > 0 ? (status.totalPaid / status.totalDue * 100) : 0;
                                    let statusBadge = '<span class="badge bg-danger">غير مدفوع</span>';
                                    if (status.status === 'paid') statusBadge = '<span class="badge bg-success">مدفوع</span>';
                                    else if (status.status === 'partial') statusBadge = '<span class="badge bg-warning">جزئي</span>';
                                    
                                    return `
                                        <tr>
                                            <td>${Utils.sanitizeHTML(student.name)}</td>
                                            <td>${Utils.formatCurrency(student.annual_fee)}</td>
                                            <td>${Utils.formatCurrency(student.discount_amount)} (${student.discount_percentage}%)</td>
                                            <td><strong>${Utils.formatCurrency(student.final_fee)}</strong></td>
                                            <td class="text-success">${Utils.formatCurrency(status.totalPaid)}</td>
                                            <td class="text-danger">${Utils.formatCurrency(status.remaining)}</td>
                                            <td>
                                                <div class="progress" style="height: 20px;">
                                                    <div class="progress-bar ${status.status === 'paid' ? 'bg-success' : status.status === 'partial' ? 'bg-warning' : 'bg-danger'}" 
                                                         style="width: ${paymentPercent}%">${paymentPercent.toFixed(1)}%</div>
                                                </div>
                                            </td>
                                            <td>${statusBadge}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        output.innerHTML = reportHTML;
    } catch (error) {
        console.error('خطأ في إنشاء التقرير المالي:', error);
        document.getElementById('reportOutput').innerHTML = `<div class="alert alert-danger">خطأ: ${error.message}</div>`;
    }
}

// تقرير الطلاب
async function generateStudentsReport() {
    try {
        const output = document.getElementById('reportOutput');
        output.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div></div>';

        const { data: students, error } = await supabase
            .from('students')
            .select('*')
            .eq('school_id', currentSchool.id)
            .eq('is_active', true)
            .order('name');

        if (error) throw error;

        const reportHTML = `
            <div class="card-custom">
                <div class="card-header-custom">
                    <i class="bi bi-people-fill"></i> تقرير الطلاب
                    <button class="btn btn-sm btn-light float-start" onclick="exportReport('students')">
                        <i class="bi bi-download"></i> تصدير Excel
                    </button>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover" id="studentsReportTable">
                            <thead>
                                <tr>
                                    <th>اسم الطالب</th>
                                    <th>ولي الأمر</th>
                                    <th>اسم الأم</th>
                                    <th>الصف</th>
                                    <th>الهاتف</th>
                                    <th>تاريخ التسجيل</th>
                                    <th>المبلغ النهائي</th>
                                    <th>الحالة</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${students.map(student => {
                                    const status = calculateStudentStatus(student);
                                    let statusBadge = '<span class="badge bg-danger">غير مدفوع</span>';
                                    if (status.status === 'paid') statusBadge = '<span class="badge bg-success">مدفوع</span>';
                                    else if (status.status === 'partial') statusBadge = '<span class="badge bg-warning">جزئي</span>';
                                    
                                    return `
                                        <tr>
                                            <td>${Utils.sanitizeHTML(student.name)}</td>
                                            <td>${Utils.sanitizeHTML(student.guardian_name)}</td>
                                            <td>${Utils.sanitizeHTML(student.mother_name)}</td>
                                            <td>${Utils.sanitizeHTML(student.grade)}</td>
                                            <td>${student.phone || '-'}</td>
                                            <td>${Utils.formatDateArabic(student.registration_date)}</td>
                                            <td>${Utils.formatCurrency(student.final_fee)}</td>
                                            <td>${statusBadge}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        output.innerHTML = reportHTML;
    } catch (error) {
        console.error('خطأ في إنشاء تقرير الطلاب:', error);
        document.getElementById('reportOutput').innerHTML = `<div class="alert alert-danger">خطأ: ${error.message}</div>`;
    }
}

// تقرير المدفوعات
async function generatePaymentsReport() {
    try {
        const output = document.getElementById('reportOutput');
        output.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div></div>';

        const { data: payments, error } = await supabase
            .from('payments')
            .select(`
                *,
                students (
                    id,
                    name,
                    grade,
                    school_id
                )
            `)
            .eq('students.school_id', currentSchool.id)
            .order('payment_date', { ascending: false });

        if (error) throw error;

        let totalAmount = 0;
        const paymentMethods = { cash: 0, bank_transfer: 0, check: 0, other: 0 };

        payments.forEach(payment => {
            totalAmount += parseFloat(payment.amount || 0);
            paymentMethods[payment.payment_method] = (paymentMethods[payment.payment_method] || 0) + parseFloat(payment.amount || 0);
        });

        const reportHTML = `
            <div class="card-custom">
                <div class="card-header-custom">
                    <i class="bi bi-receipt-cutoff"></i> تقرير المدفوعات
                    <button class="btn btn-sm btn-light float-start" onclick="exportReport('payments')">
                        <i class="bi bi-download"></i> تصدير PDF
                    </button>
                </div>
                <div class="card-body">
                    <div class="row mb-4">
                        <div class="col-md-3">
                            <div class="stats-box">
                                <h3>إجمالي المدفوعات</h3>
                                <p>${Utils.formatCurrency(totalAmount)}</p>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stats-box" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                                <h3>نقدي</h3>
                                <p>${Utils.formatCurrency(paymentMethods.cash)}</p>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stats-box" style="background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);">
                                <h3>تحويل بنكي</h3>
                                <p>${Utils.formatCurrency(paymentMethods.bank_transfer)}</p>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stats-box" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                                <h3>شيك</h3>
                                <p>${Utils.formatCurrency(paymentMethods.check)}</p>
                            </div>
                        </div>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>التاريخ</th>
                                    <th>اسم الطالب</th>
                                    <th>الصف</th>
                                    <th>رقم الدفعة</th>
                                    <th>المبلغ</th>
                                    <th>طريقة الدفع</th>
                                    <th>رقم الإيصال</th>
                                    <th>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${payments.map(payment => {
                                    const student = payment.students;
                                    const methodNames = {
                                        cash: 'نقدي',
                                        bank_transfer: 'تحويل بنكي',
                                        check: 'شيك',
                                        other: 'أخرى'
                                    };
                                    
                                    return `
                                        <tr>
                                            <td>${Utils.formatDateArabic(payment.payment_date)}</td>
                                            <td>${Utils.sanitizeHTML(student?.name || '-')}</td>
                                            <td>${Utils.sanitizeHTML(student?.grade || '-')}</td>
                                            <td>${payment.installment_number}</td>
                                            <td><strong>${Utils.formatCurrency(payment.amount)}</strong></td>
                                            <td>${methodNames[payment.payment_method] || payment.payment_method}</td>
                                            <td>${payment.receipt_number || '-'}</td>
                                            <td>
                                                <button class="btn btn-sm btn-info" onclick="printPaymentReceipt('${payment.id}')">
                                                    <i class="bi bi-printer"></i>
                                                </button>
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

        output.innerHTML = reportHTML;
    } catch (error) {
        console.error('خطأ في إنشاء تقرير المدفوعات:', error);
        document.getElementById('reportOutput').innerHTML = `<div class="alert alert-danger">خطأ: ${error.message}</div>`;
    }
}

// تقرير المتأخرين
async function generateOverdueReport() {
    try {
        const output = document.getElementById('reportOutput');
        output.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div></div>';

        const { data: students, error } = await supabase
            .from('students')
            .select('*')
            .eq('school_id', currentSchool.id)
            .eq('is_active', true);

        if (error) throw error;

        const today = new Date();
        const overdueStudents = [];

        students.forEach(student => {
            if (!student.installments || !Array.isArray(student.installments)) return;
            
            const overdueInstallments = student.installments.filter(inst => {
                const dueDate = new Date(inst.due_date);
                const paid = parseFloat(inst.amount_paid || 0);
                const amount = parseFloat(inst.amount || 0);
                return dueDate < today && paid < amount;
            });

            if (overdueInstallments.length > 0) {
                const status = calculateStudentStatus(student);
                overdueStudents.push({
                    student,
                    overdueInstallments,
                    totalOverdue: overdueInstallments.reduce((sum, inst) => {
                        return sum + (parseFloat(inst.amount || 0) - parseFloat(inst.amount_paid || 0));
                    }, 0),
                    status
                });
            }
        });

        overdueStudents.sort((a, b) => b.totalOverdue - a.totalOverdue);

        const reportHTML = `
            <div class="card-custom">
                <div class="card-header-custom">
                    <i class="bi bi-exclamation-triangle"></i> تقرير المتأخرين في الدفع
                    <button class="btn btn-sm btn-light float-start" onclick="sendBulkWhatsAppToOverdue()">
                        <i class="bi bi-whatsapp"></i> إرسال واتساب جماعي
                    </button>
                </div>
                <div class="card-body">
                    <div class="alert alert-warning">
                        <i class="bi bi-info-circle"></i> تم العثور على <strong>${overdueStudents.length}</strong> طالب متأخر في الدفع
                    </div>
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>اسم الطالب</th>
                                    <th>ولي الأمر</th>
                                    <th>الهاتف</th>
                                    <th>الصف</th>
                                    <th>المبلغ المتأخر</th>
                                    <th>عدد الأقساط المتأخرة</th>
                                    <th>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${overdueStudents.map(({ student, overdueInstallments, totalOverdue }) => {
                                    return `
                                        <tr>
                                            <td>${Utils.sanitizeHTML(student.name)}</td>
                                            <td>${Utils.sanitizeHTML(student.guardian_name)}</td>
                                            <td>${student.phone || '-'}</td>
                                            <td>${Utils.sanitizeHTML(student.grade)}</td>
                                            <td class="text-danger"><strong>${Utils.formatCurrency(totalOverdue)}</strong></td>
                                            <td><span class="badge bg-danger">${overdueInstallments.length}</span></td>
                                            <td>
                                                <button class="btn btn-sm btn-success" onclick="sendWhatsAppReminder('${student.id}')">
                                                    <i class="bi bi-whatsapp"></i> واتساب
                                                </button>
                                                <button class="btn btn-sm btn-info" onclick="showStudentDetails('${student.id}')">
                                                    <i class="bi bi-eye"></i> تفاصيل
                                                </button>
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

        output.innerHTML = reportHTML;
    } catch (error) {
        console.error('خطأ في إنشاء تقرير المتأخرين:', error);
        document.getElementById('reportOutput').innerHTML = `<div class="alert alert-danger">خطأ: ${error.message}</div>`;
    }
}

// التقرير الشهري
async function generateMonthlyReport() {
    const month = prompt('أدخل الشهر (1-12):', new Date().getMonth() + 1);
    const year = prompt('أدخل السنة:', new Date().getFullYear());
    
    if (!month || !year) return;

    try {
        const output = document.getElementById('reportOutput');
        output.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div></div>';

        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

        const { data: payments, error } = await supabase
            .from('payments')
            .select(`
                *,
                students (
                    id,
                    name,
                    school_id
                )
            `)
            .eq('students.school_id', currentSchool.id)
            .gte('payment_date', startDate)
            .lte('payment_date', endDate)
            .order('payment_date');

        if (error) throw error;

        let totalAmount = 0;
        const dailyPayments = {};

        payments.forEach(payment => {
            totalAmount += parseFloat(payment.amount || 0);
            const date = payment.payment_date.split('T')[0];
            if (!dailyPayments[date]) dailyPayments[date] = 0;
            dailyPayments[date] += parseFloat(payment.amount || 0);
        });

        const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

        const reportHTML = `
            <div class="card-custom">
                <div class="card-header-custom">
                    <i class="bi bi-calendar-month"></i> التقرير الشهري - ${monthNames[parseInt(month) - 1]} ${year}
                    <button class="btn btn-sm btn-light float-start" onclick="exportReport('monthly')">
                        <i class="bi bi-download"></i> تصدير PDF
                    </button>
                </div>
                <div class="card-body">
                    <div class="stats-box mb-4">
                        <h3>إجمالي المدفوعات في الشهر</h3>
                        <p style="font-size: 2rem;">${Utils.formatCurrency(totalAmount)}</p>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>التاريخ</th>
                                    <th>المبلغ</th>
                                    <th>عدد المعاملات</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${Object.keys(dailyPayments).sort().map(date => {
                                    const dayPayments = payments.filter(p => p.payment_date.startsWith(date));
                                    return `
                                        <tr>
                                            <td>${Utils.formatDateArabic(date)}</td>
                                            <td><strong>${Utils.formatCurrency(dailyPayments[date])}</strong></td>
                                            <td>${dayPayments.length}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        output.innerHTML = reportHTML;
    } catch (error) {
        console.error('خطأ في إنشاء التقرير الشهري:', error);
        document.getElementById('reportOutput').innerHTML = `<div class="alert alert-danger">خطأ: ${error.message}</div>`;
    }
}

// تقرير حسب الصف
async function generateGradeReport() {
    try {
        const output = document.getElementById('reportOutput');
        output.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div></div>';

        const { data: students, error } = await supabase
            .from('students')
            .select('*')
            .eq('school_id', currentSchool.id)
            .eq('is_active', true);

        if (error) throw error;

        const gradeStats = {};

        students.forEach(student => {
            const grade = student.grade || 'غير محدد';
            if (!gradeStats[grade]) {
                gradeStats[grade] = {
                    count: 0,
                    totalFees: 0,
                    totalPaid: 0,
                    paid: 0,
                    partial: 0,
                    unpaid: 0
                };
            }

            gradeStats[grade].count++;
            gradeStats[grade].totalFees += parseFloat(student.final_fee || 0);
            
            const status = calculateStudentStatus(student);
            gradeStats[grade].totalPaid += status.totalPaid;
            
            if (status.status === 'paid') gradeStats[grade].paid++;
            else if (status.status === 'partial') gradeStats[grade].partial++;
            else gradeStats[grade].unpaid++;
        });

        const reportHTML = `
            <div class="card-custom">
                <div class="card-header-custom">
                    <i class="bi bi-mortarboard"></i> تقرير حسب الصف
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>الصف</th>
                                    <th>عدد الطلاب</th>
                                    <th>إجمالي الرسوم</th>
                                    <th>المدفوع</th>
                                    <th>المتبقي</th>
                                    <th>مدفوع</th>
                                    <th>جزئي</th>
                                    <th>غير مدفوع</th>
                                    <th>نسبة التحصيل</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${Object.keys(gradeStats).sort().map(grade => {
                                    const stats = gradeStats[grade];
                                    const remaining = stats.totalFees - stats.totalPaid;
                                    const rate = stats.totalFees > 0 ? (stats.totalPaid / stats.totalFees * 100) : 0;
                                    
                                    return `
                                        <tr>
                                            <td><strong>${Utils.sanitizeHTML(grade)}</strong></td>
                                            <td>${stats.count}</td>
                                            <td>${Utils.formatCurrency(stats.totalFees)}</td>
                                            <td class="text-success">${Utils.formatCurrency(stats.totalPaid)}</td>
                                            <td class="text-danger">${Utils.formatCurrency(remaining)}</td>
                                            <td><span class="badge bg-success">${stats.paid}</span></td>
                                            <td><span class="badge bg-warning">${stats.partial}</span></td>
                                            <td><span class="badge bg-danger">${stats.unpaid}</span></td>
                                            <td>
                                                <div class="progress" style="height: 20px;">
                                                    <div class="progress-bar" style="width: ${rate}%">${rate.toFixed(1)}%</div>
                                                </div>
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

        output.innerHTML = reportHTML;
    } catch (error) {
        console.error('خطأ في إنشاء تقرير الصف:', error);
        document.getElementById('reportOutput').innerHTML = `<div class="alert alert-danger">خطأ: ${error.message}</div>`;
    }
}

// تقرير مخصص
function generateCustomReport() {
    const modalHTML = `
        <div class="modal fade" id="customReportModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">تقرير مخصص</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="customReportForm">
                            <div class="mb-3">
                                <label class="form-label">نوع التقرير</label>
                                <select class="form-select" id="reportType">
                                    <option value="financial">مالي</option>
                                    <option value="students">طلاب</option>
                                    <option value="payments">مدفوعات</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">من تاريخ</label>
                                <input type="date" class="form-control" id="startDate">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">إلى تاريخ</label>
                                <input type="date" class="form-control" id="endDate">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">الصف</label>
                                <select class="form-select" id="gradeFilter">
                                    <option value="">جميع الصفوف</option>
                                    ${GRADES[currentSchool.id]?.map(g => `<option value="${g}">${g}</option>`).join('')}
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">حالة الدفع</label>
                                <select class="form-select" id="statusFilter">
                                    <option value="">جميع الحالات</option>
                                    <option value="paid">مدفوع</option>
                                    <option value="partial">جزئي</option>
                                    <option value="unpaid">غير مدفوع</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                        <button type="button" class="btn btn-primary" onclick="generateCustomReportData()">إنشاء التقرير</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = new bootstrap.Modal(document.getElementById('customReportModal'));
    modal.show();
}

// تصدير التقرير
function exportReport(type) {
    alert('ميزة التصدير قيد التطوير');
}

// إرسال واتساب جماعي للمتأخرين
async function sendBulkWhatsAppToOverdue() {
    if (!confirm('هل تريد إرسال رسائل واتساب لجميع المتأخرين؟')) return;
    
    const output = document.getElementById('reportOutput');
    const table = output.querySelector('table tbody');
    if (!table) return;

    const rows = table.querySelectorAll('tr');
    const studentIds = [];

    rows.forEach(row => {
        const whatsappBtn = row.querySelector('button[onclick*="sendWhatsAppReminder"]');
        if (whatsappBtn) {
            const onclick = whatsappBtn.getAttribute('onclick');
            const match = onclick.match(/'([^']+)'/);
            if (match) studentIds.push(match[1]);
        }
    });

    if (studentIds.length === 0) {
        alert('لا توجد طلاب متأخرين');
        return;
    }

    let sent = 0;
    for (const studentId of studentIds) {
        await sendWhatsAppReminder(studentId);
        sent++;
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    alert(`تم إرسال ${sent} رسالة واتساب`);
}

