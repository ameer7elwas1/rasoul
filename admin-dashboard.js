// ============================================
// Admin Dashboard JavaScript
// ============================================

// تهيئة Supabase
const supabaseUrl = CONFIG.SUPABASE.URL;
const supabaseKey = CONFIG.SUPABASE.ANON_KEY;
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// متغيرات عامة
let currentUser = null;
let schoolsData = [];
let studentsData = [];
let conversationsData = [];
let currentConversationId = null;

// تهيئة الصفحة
document.addEventListener('DOMContentLoaded', async () => {
    // التحقق من تسجيل الدخول
    const userData = localStorage.getItem('user');
    if (!userData) {
        window.location.href = 'index.html';
        return;
    }

    currentUser = JSON.parse(userData);
    
    if (!currentUser.is_admin && currentUser.role !== 'admin') {
        alert('ليس لديك صلاحية للوصول إلى هذه الصفحة');
        window.location.href = 'index.html';
        return;
    }

    // تحديث معلومات المستخدم في الواجهة
    document.getElementById('userName').textContent = currentUser.full_name || currentUser.username;

    // تحميل البيانات
    await loadDashboardStats();
    await loadSchools();
    await loadAllStudents();
    await loadConversations();
    
    // تحميل بيانات المدارس لإدارة المستخدمين
    schoolsData = (await supabase.from('schools').select('*').eq('is_active', true)).data || [];

    // تحديث البيانات كل 30 ثانية
    setInterval(async () => {
        await loadDashboardStats();
        await loadConversations();
    }, 30000);

    // إرسال الرسالة عند الضغط على Enter
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
});

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
        loadAllStudents();
    } else if (sectionId === 'messages') {
        loadConversations();
    } else if (sectionId === 'notifications') {
        loadNotifications();
    } else if (sectionId === 'users') {
        loadUsersSection();
    } else if (sectionId === 'reports') {
        loadReports();
    } else if (sectionId === 'settings') {
        loadSettings();
    }
}

// تحميل إحصائيات لوحة التحكم
async function loadDashboardStats() {
    try {
        const { data: schools, error } = await supabase
            .from('schools')
            .select('*')
            .eq('is_active', true);

        if (error) throw error;

        const statsContainer = document.getElementById('schoolsStats');
        statsContainer.innerHTML = '';

        for (const school of schools) {
            // الحصول على إحصائيات المدرسة
            const { data: students, error: studentsError } = await supabase
                .from('students')
                .select('*')
                .eq('school_id', school.id)
                .eq('is_active', true);

            if (studentsError) continue;

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

            const statCard = document.createElement('div');
            statCard.className = 'col-md-6 col-lg-4';
            statCard.innerHTML = `
                <div class="stat-card">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5>${school.name}</h5>
                        <a href="school-dashboard.html?school=${school.id}" class="btn btn-sm btn-primary">
                            <i class="bi bi-arrow-left"></i> عرض
                        </a>
                    </div>
                    <div class="row">
                        <div class="col-6">
                            <div class="value" style="font-size: 24px;">${totalStudents}</div>
                            <div class="label">إجمالي الطلاب</div>
                        </div>
                        <div class="col-6">
                            <div class="value text-success" style="font-size: 24px;">${paidStudents}</div>
                            <div class="label">مدفوعين</div>
                        </div>
                    </div>
                    <div class="mt-3">
                        <div class="d-flex justify-content-between">
                            <span>إجمالي الأقساط:</span>
                            <strong>${Utils.formatCurrency(totalFees)}</strong>
                        </div>
                        <div class="d-flex justify-content-between">
                            <span>المتبقي:</span>
                            <strong class="text-danger">${Utils.formatCurrency(totalFees - totalPaid)}</strong>
                        </div>
                    </div>
                </div>
            `;
            statsContainer.appendChild(statCard);
        }
    } catch (error) {
        console.error('خطأ في تحميل الإحصائيات:', error);
    }
}

// تحميل المدارس
async function loadSchools() {
    try {
        const { data, error } = await supabase
            .from('schools')
            .select('*')
            .eq('is_active', true)
            .order('name');

        if (error) throw error;
        
        schoolsData = data || [];
        displaySchools(schoolsData);
    } catch (error) {
        console.error('خطأ في تحميل المدارس:', error);
        showAlert('خطأ في تحميل المدارس', 'danger');
    }
}

// عرض المدارس
function displaySchools(schools) {
    const container = document.getElementById('schoolsList');
    
    if (schools.length === 0) {
        container.innerHTML = '<p class="text-center">لا توجد مدارس مسجلة</p>';
        return;
    }

    container.innerHTML = schools.map(school => {
        return `
            <div class="school-card" onclick="openSchool('${school.id}')">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h5>${school.name}</h5>
                        <p class="text-muted mb-0">${school.code || ''}</p>
                    </div>
                    <button class="btn btn-primary">
                        <i class="bi bi-arrow-left"></i> عرض التفاصيل
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// فتح صفحة المدرسة
function openSchool(schoolId) {
    window.open(`school-dashboard.html?school=${schoolId}`, '_blank');
}

// تحميل جميع الطلاب
async function loadAllStudents() {
    try {
        const { data, error } = await supabase
            .from('students')
            .select(`
                *,
                schools (
                    id,
                    name
                )
            `)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(500);

        if (error) throw error;
        
        studentsData = data || [];
        displayAllStudents(studentsData);
    } catch (error) {
        console.error('خطأ في تحميل الطلاب:', error);
        showAlert('خطأ في تحميل الطلاب', 'danger');
    }
}

// عرض جميع الطلاب
function displayAllStudents(students) {
    const tbody = document.getElementById('allStudentsTableBody');
    
    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">لا يوجد طلاب مسجلين</td></tr>';
        return;
    }

    tbody.innerHTML = students.map(student => {
        const school = student.schools;
        let paid = 0;
        if (student.installments && Array.isArray(student.installments)) {
            student.installments.forEach(inst => {
                paid += parseFloat(inst.amount_paid || 0);
            });
        }
        
        const finalFee = parseFloat(student.final_fee || 0);
        let statusBadge = '<span class="badge bg-danger">غير مدفوع</span>';
        
        if (paid >= finalFee) {
            statusBadge = '<span class="badge bg-success">مدفوع بالكامل</span>';
        } else if (paid > 0) {
            statusBadge = '<span class="badge bg-warning">مدفوع جزئياً</span>';
        }

        return `
            <tr>
                <td>${Utils.sanitizeHTML(student.name)}</td>
                <td>${Utils.sanitizeHTML(school?.name || '-')}</td>
                <td>${Utils.sanitizeHTML(student.grade)}</td>
                <td>${Utils.formatCurrency(finalFee)}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewStudent('${student.id}')">
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// تحميل المحادثات
async function loadConversations() {
    try {
        const { data, error } = await supabase
            .from('conversations')
            .select('*')
            .or(`sender_id.eq.admin,receiver_id.eq.admin`)
            .order('updated_at', { ascending: false });

        if (error) throw error;
        
        conversationsData = data || [];
        displayConversations(conversationsData);
    } catch (error) {
        console.error('خطأ في تحميل المحادثات:', error);
    }
}

// عرض المحادثات
function displayConversations(conversations) {
    const container = document.getElementById('conversationsList');
    
    if (conversations.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">لا توجد محادثات</p>';
        return;
    }

    container.innerHTML = conversations.map(conv => {
        const isAdminSender = conv.sender_id === 'admin';
        const otherParty = isAdminSender ? conv.receiver_name : conv.sender_name;
        const unreadBadge = conv.unread_count > 0 ? `<span class="badge bg-danger">${conv.unread_count}</span>` : '';
        
        return `
            <div class="card mb-2 ${currentConversationId === conv.id ? 'border-primary' : ''}" 
                 onclick="openConversation('${conv.id}')" style="cursor: pointer;">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-0">${otherParty}</h6>
                            <small class="text-muted">${conv.last_message ? conv.last_message.substring(0, 50) + '...' : 'لا توجد رسائل'}</small>
                        </div>
                        ${unreadBadge}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// فتح محادثة
async function openConversation(conversationId) {
    currentConversationId = conversationId;
    await loadConversationMessages(conversationId);
    loadConversations(); // تحديث القائمة
}

// تحميل رسائل المحادثة
async function loadConversationMessages(conversationId) {
    try {
        const { data, error } = await supabase
            .from('conversation_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        const messagesContainer = document.getElementById('chatMessages');
        
        if (data.length === 0) {
            messagesContainer.innerHTML = '<p class="text-center text-muted">لا توجد رسائل في هذه المحادثة</p>';
            return;
        }

        messagesContainer.innerHTML = data.map(msg => {
            const isSent = msg.sender_id === 'admin';
            return `
                <div class="message ${isSent ? 'sent' : ''}">
                    <div class="message-content">
                        <div class="fw-bold mb-1">${msg.sender_name}</div>
                        <div>${Utils.sanitizeHTML(msg.message)}</div>
                        <small class="text-muted">${Utils.formatTime(msg.created_at)}</small>
                    </div>
                </div>
            `;
        }).join('');

        // التمرير للأسفل
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // تحديث حالة القراءة
        await supabase.rpc('mark_conversation_messages_read', {
            conv_id: conversationId,
            reader_id: 'admin'
        });
    } catch (error) {
        console.error('خطأ في تحميل الرسائل:', error);
    }
}

// إرسال رسالة
async function sendMessage() {
    if (!currentConversationId) {
        alert('يرجى اختيار محادثة أولاً');
        return;
    }

    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();

    if (!message) return;

    try {
        // إرسال الرسالة
        const { data, error } = await supabase
            .from('conversation_messages')
            .insert({
                conversation_id: currentConversationId,
                sender_id: 'admin',
                sender_name: currentUser.full_name || 'رئيس مجلس الإدارة',
                message: message
            });

        if (error) throw error;

        messageInput.value = '';
        await loadConversationMessages(currentConversationId);
        await loadConversations();
    } catch (error) {
        console.error('خطأ في إرسال الرسالة:', error);
        showAlert('خطأ في إرسال الرسالة', 'danger');
    }
}

// تحميل الإشعارات
async function loadNotifications() {
    try {
        const { data, error } = await supabase
            .from('admin_notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        const container = document.getElementById('notificationsList');
        
        if (data.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">لا توجد إشعارات</p>';
            return;
        }

        container.innerHTML = data.map(notif => {
            const targetSchools = notif.target_schools && notif.target_schools.length > 0 
                ? notif.target_schools.join(', ') 
                : 'جميع المدارس';
            
            return `
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h5>${notif.title}</h5>
                                <p>${notif.message}</p>
                                <small class="text-muted">المستهدف: ${targetSchools}</small>
                                <br>
                                <small class="text-muted">${Utils.formatDateArabic(notif.created_at)}</small>
                            </div>
                            <span class="badge bg-${getNotificationTypeColor(notif.notification_type)}">
                                ${getNotificationTypeName(notif.notification_type)}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('خطأ في تحميل الإشعارات:', error);
    }
}

// الحصول على اسم نوع الإشعار
function getNotificationTypeName(type) {
    const types = {
        'info': 'معلومات',
        'success': 'نجاح',
        'warning': 'تحذير',
        'error': 'خطأ'
    };
    return types[type] || type;
}

// الحصول على لون نوع الإشعار
function getNotificationTypeColor(type) {
    const colors = {
        'info': 'info',
        'success': 'success',
        'warning': 'warning',
        'error': 'danger'
    };
    return colors[type] || 'info';
}

// عرض نموذج إرسال إشعار - تم نقله إلى notifications-system.js

// عرض الطالب
function viewStudent(studentId) {
    // سيتم تنفيذها لاحقاً
    alert(`عرض تفاصيل الطالب: ${studentId}`);
}

// تحميل التقارير
function loadReports() {
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

