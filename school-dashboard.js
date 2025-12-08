// ============================================
// School Dashboard JavaScript
// ============================================

// تهيئة Supabase
const supabaseUrl = CONFIG.SUPABASE.URL;
const supabaseKey = CONFIG.SUPABASE.ANON_KEY;
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// متغيرات عامة
let currentUser = null;
let currentSchool = null;
let studentsData = [];
let paymentsData = [];

// تهيئة الصفحة
document.addEventListener('DOMContentLoaded', async () => {
    // التحقق من تسجيل الدخول
    const userData = localStorage.getItem('user');
    if (!userData) {
        window.location.href = 'index.html';
        return;
    }

    currentUser = JSON.parse(userData);
    
    // الحصول على معرف المدرسة من URL أو من بيانات المستخدم
    const urlParams = new URLSearchParams(window.location.search);
    const schoolId = urlParams.get('school') || currentUser.school_id;
    
    if (!schoolId) {
        alert('لم يتم تحديد المدرسة');
        window.location.href = 'index.html';
        return;
    }

    // تحميل بيانات المدرسة
    await loadSchoolData(schoolId);
    
    // تحديث معلومات المستخدم في الواجهة
    document.getElementById('schoolName').textContent = currentSchool?.name || 'المدرسة';
    document.getElementById('userName').textContent = currentUser.full_name || currentUser.username;

    // تحميل البيانات
    await loadDashboardStats();
    await loadStudents();
    await loadPayments();
    await loadNotifications();
    await loadMessages();

    // تحديث البيانات كل 30 ثانية
    setInterval(async () => {
        await loadDashboardStats();
        await loadNotifications();
        await loadMessages();
    }, 30000);
});

// تحميل بيانات المدرسة
async function loadSchoolData(schoolId) {
    try {
        const { data, error } = await supabase
            .from('schools')
            .select('*')
            .eq('id', schoolId)
            .single();

        if (error) throw error;
        currentSchool = data;
    } catch (error) {
        console.error('خطأ في تحميل بيانات المدرسة:', error);
        showAlert('خطأ في تحميل بيانات المدرسة', 'danger');
    }
}

// عرض قسم معين
function showSection(sectionId) {
    // إخفاء جميع الأقسام
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // إظهار القسم المحدد
    document.getElementById(sectionId).classList.add('active');
    
    // تحديث القائمة الجانبية
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.classList.add('active');

    // تحميل بيانات القسم إذا لزم الأمر
    if (sectionId === 'students') {
        loadStudents();
    } else if (sectionId === 'payments') {
        loadPayments();
    } else if (sectionId === 'reports') {
        loadReports();
    } else if (sectionId === 'settings') {
        loadSettings();
    }
}

// تحميل إحصائيات لوحة التحكم
async function loadDashboardStats() {
    try {
        const { data: students, error } = await supabase
            .from('students')
            .select('*')
            .eq('school_id', currentSchool.id)
            .eq('is_active', true);

        if (error) throw error;

        let totalStudents = students.length;
        let paidStudents = 0;
        let partialStudents = 0;
        let unpaidStudents = 0;
        let totalFees = 0;
        let totalPaid = 0;

        students.forEach(student => {
            totalFees += parseFloat(student.final_fee || 0);
            
            // حساب المدفوع
            let paid = 0;
            if (student.installments && Array.isArray(student.installments)) {
                student.installments.forEach(inst => {
                    paid += parseFloat(inst.amount_paid || 0);
                });
            }
            
            totalPaid += paid;
            
            // تحديد الحالة
            if (paid >= parseFloat(student.final_fee || 0)) {
                paidStudents++;
            } else if (paid > 0) {
                partialStudents++;
            } else {
                unpaidStudents++;
            }
        });

        // تحديث الواجهة
        document.getElementById('totalStudents').textContent = totalStudents;
        document.getElementById('paidStudents').textContent = paidStudents;
        document.getElementById('partialStudents').textContent = partialStudents;
        document.getElementById('unpaidStudents').textContent = unpaidStudents;
        document.getElementById('totalFees').textContent = Utils.formatCurrency(totalFees);
        document.getElementById('remainingFees').textContent = Utils.formatCurrency(totalFees - totalPaid);

    } catch (error) {
        console.error('خطأ في تحميل الإحصائيات:', error);
    }
}

// تحميل الطلاب
async function loadStudents() {
    try {
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('school_id', currentSchool.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        studentsData = data || [];
        displayStudents(studentsData);
    } catch (error) {
        console.error('خطأ في تحميل الطلاب:', error);
        showAlert('خطأ في تحميل الطلاب', 'danger');
    }
}

// تحميل أقساط الطالب
async function loadStudentInstallments() {
    const studentId = document.getElementById('studentSelect').value;
    if (!studentId) {
        document.getElementById('installmentsContent').innerHTML = 
            '<p class="text-center text-muted">يرجى اختيار طالب لعرض أقساطه</p>';
        return;
    }

    const student = studentsData.find(s => s.id === studentId);
    if (student) {
        displayStudentInstallments(student);
    }
}

// عرض الطلاب في الجدول
function displayStudents(students) {
    const tbody = document.getElementById('studentsTableBody');
    
    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">لا يوجد طلاب مسجلين</td></tr>';
        return;
    }

    // تحديث قائمة اختيار الطلاب في قسم الأقساط
    const studentSelect = document.getElementById('studentSelect');
    if (studentSelect) {
        studentSelect.innerHTML = '<option value="">اختر طالب لعرض أقساطه</option>' +
            students.map(s => `<option value="${s.id}">${s.name} - ${s.grade}</option>`).join('');
    }

    tbody.innerHTML = students.map(student => {
        // حساب المدفوع
        let paid = 0;
        if (student.installments && Array.isArray(student.installments)) {
            student.installments.forEach(inst => {
                paid += parseFloat(inst.amount_paid || 0);
            });
        }
        
        const finalFee = parseFloat(student.final_fee || 0);
        let status = 'unpaid';
        let statusBadge = '<span class="badge bg-danger">غير مدفوع</span>';
        
        if (paid >= finalFee) {
            status = 'paid';
            statusBadge = '<span class="badge bg-success">مدفوع بالكامل</span>';
        } else if (paid > 0) {
            status = 'partial';
            statusBadge = '<span class="badge bg-warning">مدفوع جزئياً</span>';
        }

        return `
            <tr>
                <td>${Utils.sanitizeHTML(student.name)}</td>
                <td>${Utils.sanitizeHTML(student.guardian_name)}</td>
                <td>${Utils.sanitizeHTML(student.grade)}</td>
                <td>${Utils.sanitizeHTML(student.phone || '-')}</td>
                <td>${Utils.formatCurrency(student.annual_fee)}</td>
                <td>${student.discount_percentage || 0}%</td>
                <td>${Utils.formatCurrency(finalFee)}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewStudent('${student.id}')">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-success" onclick="addPayment('${student.id}')">
                        <i class="bi bi-cash-coin"></i>
                    </button>
                    <button class="btn btn-sm btn-info" onclick="sendWhatsApp('${student.id}')">
                        <i class="bi bi-whatsapp"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// تحميل المدفوعات
async function loadPayments() {
    try {
        // الحصول على المدفوعات من جدول payments
        const { data: payments, error: paymentsError } = await supabase
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
            .order('created_at', { ascending: false })
            .limit(100);

        if (paymentsError) throw paymentsError;

        paymentsData = payments || [];
        displayPayments(paymentsData);
    } catch (error) {
        console.error('خطأ في تحميل المدفوعات:', error);
        showAlert('خطأ في تحميل المدفوعات', 'danger');
    }
}

// عرض المدفوعات
function displayPayments(payments) {
    const tbody = document.getElementById('paymentsTableBody');
    
    if (payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">لا توجد مدفوعات</td></tr>';
        return;
    }

    tbody.innerHTML = payments.map(payment => {
        const student = payment.students;
        return `
            <tr>
                <td>${Utils.sanitizeHTML(student?.name || '-')}</td>
                <td>${payment.installment_number}</td>
                <td>${Utils.formatCurrency(payment.amount)}</td>
                <td>${Utils.formatDateArabic(payment.payment_date)}</td>
                <td>${getPaymentMethodName(payment.payment_method)}</td>
                <td>${Utils.sanitizeHTML(payment.receipt_number || '-')}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewPayment('${payment.id}')">
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// الحصول على اسم طريقة الدفع
function getPaymentMethodName(method) {
    const methods = {
        'cash': 'نقدي',
        'bank_transfer': 'تحويل بنكي',
        'check': 'شيك',
        'other': 'أخرى'
    };
    return methods[method] || method;
}

// تحميل الإشعارات
async function loadNotifications() {
    try {
        const { data, error } = await supabase
            .from('admin_notifications')
            .select('*')
            .or(`target_schools.cs.{${currentSchool.id}},target_schools.is.null`)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        const unreadCount = data.filter(n => {
            const readBy = n.is_read_by || {};
            return !readBy[currentSchool.id];
        }).length;

        const badge = document.getElementById('notificationBadge');
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    } catch (error) {
        console.error('خطأ في تحميل الإشعارات:', error);
    }
}

// تحميل الرسائل
async function loadMessages() {
    try {
        const { data, error } = await supabase
            .from('conversations')
            .select('*')
            .or(`sender_id.eq.${currentSchool.id},receiver_id.eq.${currentSchool.id}`)
            .order('updated_at', { ascending: false });

        if (error) throw error;

        const unreadCount = data.reduce((sum, conv) => {
            return sum + (conv.unread_count || 0);
        }, 0);

        const badge = document.getElementById('messageBadge');
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    } catch (error) {
        console.error('خطأ في تحميل الرسائل:', error);
    }
}

// عرض الإشعارات - تم نقله إلى notifications-system.js
// عرض الرسائل - تم نقله إلى messages-system.js

// عرض الطالب
function viewStudent(studentId) {
    const student = studentsData.find(s => s.id === studentId);
    if (!student) return;
    
    // عرض قسم الأقساط
    showSection('installments');
    displayStudentInstallments(student);
}

// إضافة دفعة
function addPayment(studentId) {
    const student = studentsData.find(s => s.id === studentId);
    if (!student) return;
    
    // العثور على أول دفعة غير مدفوعة
    const unpaidInstallment = student.installments?.find(inst => 
        parseFloat(inst.amount_paid || 0) < parseFloat(inst.amount || 0)
    );
    
    if (unpaidInstallment) {
        showAddPaymentModal(studentId, unpaidInstallment.installment_number);
    } else {
        alert('تم دفع جميع الأقساط');
    }
}

// إرسال رسالة واتساب
async function sendWhatsApp(studentId) {
    const result = await sendWhatsAppReminder(studentId);
    if (!result.success) {
        showAlert(result.error || 'خطأ في إرسال رسالة واتساب', 'danger');
    }
}

// تحميل التقارير
function loadReports() {
    // سيتم تنفيذها لاحقاً
    document.getElementById('reportsContent').innerHTML = '<p>قريباً: التقارير</p>';
}

// تحميل الإعدادات - تم نقله إلى settings-page.js

// تسجيل الخروج
function logout() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        localStorage.removeItem('user');
        localStorage.removeItem('loginTime');
        window.location.href = 'index.html';
    }
}

// عرض رسالة
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
    alertDiv.style.zIndex = '9999';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

