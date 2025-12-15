const supabaseUrl = CONFIG?.SUPABASE?.URL || 'https://vpvvjascwgivdjyyhzwp.supabase.co';
const supabaseKey = CONFIG?.SUPABASE?.ANON_KEY || '';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null;
let currentSchool = null;
let studentsData = [];
let paymentsData = [];

document.addEventListener('DOMContentLoaded', async () => {

    const userData = localStorage.getItem('user');
    if (!userData) {
        window.location.href = 'index.html';
        return;
    }

    currentUser = JSON.parse(userData);

    const urlParams = new URLSearchParams(window.location.search);
    const schoolId = urlParams.get('school') || currentUser.school_id;

    if (!schoolId) {
        alert('لم يتم تحديد المدرسة');
        window.location.href = 'index.html';
        return;
    }

    await loadSchoolData(schoolId);

    document.getElementById('schoolName').textContent = currentSchool?.name || 'المدرسة';
    document.getElementById('userName').textContent = currentUser.full_name || currentUser.username;

    await loadDashboardStats();
    await loadStudents();
    await loadPayments();
    await loadNotifications();
    await loadMessages();

    setInterval(async () => {
        await loadDashboardStats();
        await loadNotifications();
        await loadMessages();
    }, 30000);

    // تحديث التنبيهات كل 5 ثوانٍ
    setInterval(async () => {
        await loadNotifications();
    }, 5000);
});

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

window.showSection = function(sectionId, clickedElement) {
    try {
        // إخفاء جميع الأقسام
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // إظهار القسم المطلوب
        const targetSection = document.getElementById(sectionId);
        if (!targetSection) {
            console.error(`القسم ${sectionId} غير موجود`);
            showAlert('القسم المطلوب غير موجود', 'warning');
            return;
        }
        targetSection.classList.add('active');

        // تحديث حالة القائمة الجانبية
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.remove('active');
        });
        
        if (clickedElement) {
            clickedElement.classList.add('active');
        } else {
            // البحث عن العنصر المناسب في القائمة الجانبية
            const sidebarItem = document.querySelector(`[onclick*="${sectionId}"]`);
            if (sidebarItem) {
                sidebarItem.classList.add('active');
            }
        }

        // تحميل البيانات حسب القسم
        switch(sectionId) {
            case 'students':
                loadStudents();
                break;
            case 'payments':
                loadPayments();
                break;
            case 'reports':
                loadReports();
                break;
            case 'settings':
                loadSettings();
                break;
            case 'dashboard':
                loadDashboardStats();
                break;
            case 'installments':
                // لا يحتاج تحميل تلقائي
                break;
        }
    } catch (error) {
        console.error('خطأ في عرض القسم:', error);
        showAlert('حدث خطأ أثناء عرض القسم', 'danger');
    }
}

async function loadDashboardStats() {
    try {
        if (!currentSchool || !currentSchool.id) {
            console.error('المدرسة غير محددة');
            return;
        }

        const { data: students, error } = await supabase
            .from('students')
            .select('*')
            .eq('school_id', currentSchool.id)
            .eq('is_active', true);

        if (error) {
            console.error('خطأ في تحميل الطلاب:', error);
            throw new Error(`خطأ في تحميل الطلاب: ${error.message || 'خطأ غير معروف'}`);
        }

        let totalStudents = students.length;
        let paidStudents = 0;
        let partialStudents = 0;
        let unpaidStudents = 0;
        let totalFees = 0;
        let totalPaid = 0;

        students.forEach(student => {
            totalFees += parseFloat(student.final_fee || 0);

            let paid = 0;
            if (student.installments && Array.isArray(student.installments)) {
                student.installments.forEach(inst => {
                    paid += parseFloat(inst.amount_paid || 0);
                });
            }

            totalPaid += paid;

            if (paid >= parseFloat(student.final_fee || 0)) {
                paidStudents++;
            } else if (paid > 0) {
                partialStudents++;
            } else {
                unpaidStudents++;
            }
        });

        document.getElementById('totalStudents').textContent = totalStudents;
        document.getElementById('paidStudents').textContent = paidStudents;
        document.getElementById('partialStudents').textContent = partialStudents;
        document.getElementById('unpaidStudents').textContent = unpaidStudents;
        const totalFeesEl = document.getElementById('totalFees');
        const remainingFeesEl = document.getElementById('remainingFees');
        
        if (totalFeesEl) totalFeesEl.textContent = Utils.formatCurrency(totalFees);
        if (remainingFeesEl) remainingFeesEl.textContent = Utils.formatCurrency(totalFees - totalPaid);

    } catch (error) {
        console.error('خطأ في تحميل الإحصائيات:', error);
        showAlert('خطأ في تحميل الإحصائيات: ' + (error.message || 'خطأ غير معروف'), 'danger');
    }
}

async function loadStudents() {
    try {
        if (!currentSchool || !currentSchool.id) {
            console.error('المدرسة غير محددة');
            showAlert('المدرسة غير محددة', 'warning');
            return;
        }

        const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('school_id', currentSchool.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('خطأ في تحميل الطلاب:', error);
            throw new Error(`خطأ في تحميل الطلاب: ${error.message || 'خطأ غير معروف'}`);
        }

        studentsData = data || [];
        displayStudents(studentsData);
    } catch (error) {
        console.error('خطأ في تحميل الطلاب:', error);
        const tbody = document.getElementById('studentsTableBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center text-danger">خطأ في تحميل الطلاب: ${error.message || 'خطأ غير معروف'}</td></tr>`;
        }
        showAlert('خطأ في تحميل الطلاب: ' + (error.message || 'خطأ غير معروف'), 'danger');
    }
}

window.loadStudentInstallments = async function() {
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

function displayStudents(students) {
    const tbody = document.getElementById('studentsTableBody');

    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">لا يوجد طلاب مسجلين</td></tr>';
        return;
    }

    const studentSelect = document.getElementById('studentSelect');
    if (studentSelect) {
        studentSelect.innerHTML = '<option value="">اختر طالب لعرض أقساطه</option>' +
            students.map(s => `<option value="${s.id}">${s.name} - ${s.grade}</option>`).join('');
    }

    tbody.innerHTML = students.map(student => {

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

async function loadPayments() {
    try {

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
                    <button class="btn btn-sm btn-info" onclick="viewPayment('${payment.id}')" title="طباعة الوصل">
                        <i class="bi bi-printer"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function getPaymentMethodName(method) {
    const methods = {
        'cash': 'نقدي',
        'bank_transfer': 'تحويل بنكي',
        'check': 'شيك',
        'other': 'أخرى'
    };
    return methods[method] || method;
}

async function loadNotifications() {
    try {
        const { data, error } = await supabase
            .from('admin_notifications')
            .select('*')
            .or(`target_schools.cs.{${currentSchool.id}},target_schools.is.null`)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        const unreadNotifications = data.filter(n => {
            const readBy = n.is_read_by || {};
            return !readBy[currentSchool.id];
        });

        const unreadCount = unreadNotifications.length;

        const badge = document.getElementById('notificationBadge');
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }

        // عرض التنبيهات المميزة في أعلى الشاشة
        displayTopNotifications(unreadNotifications.slice(0, 3)); // عرض آخر 3 تنبيهات غير مقروءة
    } catch (error) {
        console.error('خطأ في تحميل الإشعارات:', error);
    }
}

function displayTopNotifications(notifications) {
    const container = document.getElementById('topNotificationsContainer');
    if (!container) return;

    // إزالة التنبيهات القديمة التي تم إغلاقها
    const existingNotifications = container.querySelectorAll('.top-notification');
    existingNotifications.forEach(notif => {
        const notifId = notif.getAttribute('data-notification-id');
        if (!notifications.find(n => n.id === notifId)) {
            notif.style.transition = 'opacity 0.3s';
            notif.style.opacity = '0';
            setTimeout(() => {
                if (notif.parentNode) {
                    notif.remove();
                }
            }, 300);
        }
    });

    if (notifications.length === 0) return;

    notifications.forEach(notif => {
        // التحقق من وجود التنبيه بالفعل
        const existingNotif = container.querySelector(`[data-notification-id="${notif.id}"]`);
        if (existingNotif) return;

        const notificationDiv = document.createElement('div');
        notificationDiv.className = `alert alert-${getNotificationTypeColor(notif.notification_type)} alert-dismissible fade show top-notification ${notif.notification_type}`;
        notificationDiv.setAttribute('data-notification-id', notif.id);
        notificationDiv.style.cssText = 'margin-bottom: 10px; cursor: pointer;';
        notificationDiv.innerHTML = `
            <div class="d-flex align-items-start">
                <div class="flex-grow-1">
                    <strong><i class="bi bi-bell-fill"></i> ${Utils.sanitizeHTML(notif.title)}</strong>
                    <div class="mt-1">${Utils.sanitizeHTML(notif.message)}</div>
                    <small class="d-block mt-1"><i class="bi bi-clock"></i> ${Utils.formatDateArabic(notif.created_at)}</small>
                </div>
                <button type="button" class="btn-close" onclick="event.stopPropagation(); dismissTopNotification('${notif.id}', this)"></button>
            </div>
        `;
        notificationDiv.onclick = () => {
            if (typeof showNotifications === 'function') {
                showNotifications();
            }
        };
        container.appendChild(notificationDiv);

        // إزالة التنبيه تلقائياً بعد 15 ثانية
        setTimeout(() => {
            if (notificationDiv.parentNode) {
                notificationDiv.style.transition = 'opacity 0.3s';
                notificationDiv.style.opacity = '0';
                setTimeout(() => {
                    if (notificationDiv.parentNode) {
                        notificationDiv.remove();
                    }
                }, 300);
            }
        }, 15000);
    });
}

function getNotificationTypeColor(type) {
    const colors = {
        'info': 'info',
        'success': 'success',
        'warning': 'warning',
        'error': 'danger'
    };
    return colors[type] || 'info';
}

async function dismissTopNotification(notificationId, button) {
    try {
        const notificationDiv = button.closest('.top-notification');
        if (notificationDiv) {
            notificationDiv.style.transition = 'opacity 0.3s';
            notificationDiv.style.opacity = '0';
            setTimeout(() => {
                notificationDiv.remove();
            }, 300);
        }

        // تحديث حالة القراءة
        const { data: notification, error: fetchError } = await supabase
            .from('admin_notifications')
            .select('*')
            .eq('id', notificationId)
            .single();
        
        if (fetchError) throw fetchError;
        
        const readBy = notification.is_read_by || {};
        if (currentSchool && currentSchool.id) {
            readBy[currentSchool.id] = new Date().toISOString();
        }
        
        await supabase
            .from('admin_notifications')
            .update({ is_read_by: readBy })
            .eq('id', notificationId);
        
        await loadNotifications();
    } catch (error) {
        console.error('خطأ في إغلاق التنبيه:', error);
    }
}

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

window.viewStudent = function(studentId) {
    const student = studentsData.find(s => s.id === studentId);
    if (!student) return;

    showSection('installments');
    displayStudentInstallments(student);
}

window.addPayment = function(studentId) {
    const student = studentsData.find(s => s.id === studentId);
    if (!student) return;

    const unpaidInstallment = student.installments?.find(inst => 
        parseFloat(inst.amount_paid || 0) < parseFloat(inst.amount || 0)
    );

    if (unpaidInstallment) {
        showAddPaymentModal(studentId, unpaidInstallment.installment_number);
    } else {
        alert('تم دفع جميع الأقساط');
    }
}

window.sendWhatsApp = async function(studentId) {
    if (typeof showWhatsAppModal === 'function') {
        showWhatsAppModal(studentId);
    } else {
        const result = await sendWhatsAppReminder(studentId);
        if (!result.success) {
            showAlert(result.error || 'خطأ في إرسال رسالة واتساب', 'danger');
        }
    }
}

window.logout = function() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        localStorage.removeItem('user');
        localStorage.removeItem('loginTime');
        window.location.href = 'index.html';
    }
}

window.showAlert = function(message, type = 'info') {
    try {
        // إزالة أي تنبيهات سابقة
        const existingAlerts = document.querySelectorAll('.custom-alert');
        existingAlerts.forEach(alert => alert.remove());

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed custom-alert`;
        alertDiv.style.cssText = `
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 99999;
            min-width: 300px;
            max-width: 90%;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border-radius: 8px;
            animation: slideDown 0.3s ease-out;
        `;
        
        const icons = {
            'success': '<i class="bi bi-check-circle-fill"></i>',
            'danger': '<i class="bi bi-exclamation-triangle-fill"></i>',
            'warning': '<i class="bi bi-exclamation-circle-fill"></i>',
            'info': '<i class="bi bi-info-circle-fill"></i>'
        };
        
        alertDiv.innerHTML = `
            <div class="d-flex align-items-center">
                <span class="me-2">${icons[type] || icons.info}</span>
                <span class="flex-grow-1">${message}</span>
                <button type="button" class="btn-close ms-2" onclick="this.closest('.custom-alert').remove()"></button>
            </div>
        `;
        
        document.body.appendChild(alertDiv);

        // إزالة تلقائية بعد 5 ثوانٍ
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.style.transition = 'opacity 0.3s';
                alertDiv.style.opacity = '0';
                setTimeout(() => {
                    if (alertDiv.parentNode) {
                        alertDiv.remove();
                    }
                }, 300);
            }
        }, 5000);
    } catch (error) {
        console.error('خطأ في عرض التنبيه:', error);
        alert(message); // Fallback
    }
}

function showLoading(message = 'جاري التحميل...') {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'globalLoading';
    loadingDiv.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center';
    loadingDiv.style.cssText = `
        background: rgba(0,0,0,0.5);
        z-index: 99998;
        backdrop-filter: blur(2px);
    `;
    loadingDiv.innerHTML = `
        <div class="text-center bg-white p-4 rounded shadow-lg">
            <div class="spinner-border text-primary mb-3" role="status">
                <span class="visually-hidden">جاري التحميل...</span>
            </div>
            <div class="text-dark fw-bold">${message}</div>
        </div>
    `;
    document.body.appendChild(loadingDiv);
    return loadingDiv;
}

function hideLoading() {
    const loadingDiv = document.getElementById('globalLoading');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}
