// ============================================
// Notifications System JavaScript
// ============================================


async function showNotifications() {
    try {
        const { data, error } = await supabase
            .from('admin_notifications')
            .select('*')
            .or(`target_schools.cs.{${currentSchool.id}},target_schools.is.null`)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        const modalHTML = `
            <div class="modal fade" id="notificationsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">الإشعارات</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" style="max-height: 500px; overflow-y: auto;">
                            ${data && data.length > 0 ? data.map(notif => {
                                const isRead = notif.is_read_by && notif.is_read_by[currentSchool.id];
                                return `
                                    <div class="card mb-3 ${isRead ? '' : 'border-primary'}" style="cursor: pointer;" onclick="markNotificationRead('${notif.id}')">
                                        <div class="card-body">
                                            <div class="d-flex justify-content-between align-items-start">
                                                <div>
                                                    <h6 class="mb-1">${notif.title}</h6>
                                                    <p class="mb-2">${notif.message}</p>
                                                    <small class="text-muted">${Utils.formatDateArabic(notif.created_at)}</small>
                                                </div>
                                                <span class="badge bg-${getNotificationTypeColor(notif.notification_type)}">
                                                    ${getNotificationTypeName(notif.notification_type)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('') : '<p class="text-center text-muted">لا توجد إشعارات</p>'}
                        </div>
                    </div>
                </div>
            </div>
        `;

        
        const existingModal = document.getElementById('notificationsModal');
        if (existingModal) {
            existingModal.remove();
        }

        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        
        const modal = new bootstrap.Modal(document.getElementById('notificationsModal'));
        modal.show();
    } catch (error) {
        console.error('خطأ في تحميل الإشعارات:', error);
        showAlert('خطأ في تحميل الإشعارات', 'danger');
    }
}


async function markNotificationRead(notificationId) {
    try {
        const { data: notification, error: fetchError } = await supabase
            .from('admin_notifications')
            .select('*')
            .eq('id', notificationId)
            .single();

        if (fetchError) throw fetchError;

        const readBy = notification.is_read_by || {};
        readBy[currentSchool.id] = new Date().toISOString();

        await supabase
            .from('admin_notifications')
            .update({ is_read_by: readBy })
            .eq('id', notificationId);

        await loadNotifications(); 
    } catch (error) {
        console.error('خطأ في تحديد الإشعار كمقروء:', error);
    }
}


function getNotificationTypeName(type) {
    const types = {
        'info': 'معلومات',
        'success': 'نجاح',
        'warning': 'تحذير',
        'error': 'خطأ'
    };
    return types[type] || type;
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


async function sendNotificationToSchools(title, message, type = 'info', targetSchools = []) {
    try {
        const { data, error } = await supabase
            .from('admin_notifications')
            .insert({
                admin_id: 'admin',
                title: title,
                message: message,
                notification_type: type,
                target_schools: targetSchools.length > 0 ? targetSchools : null,
                is_read_by: {}
            })
            .select()
            .single();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('خطأ في إرسال الإشعار:', error);
        return { success: false, error: error.message };
    }
}


function showSendNotificationModal() {
    const modalHTML = `
        <div class="modal fade" id="sendNotificationModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">إرسال إشعار</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="sendNotificationForm">
                            <div class="mb-3">
                                <label class="form-label">العنوان *</label>
                                <input type="text" class="form-control" id="notificationTitle" required>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">الرسالة *</label>
                                <textarea class="form-control" id="notificationMessage" rows="5" required></textarea>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">نوع الإشعار *</label>
                                <select class="form-select" id="notificationType" required>
                                    <option value="info">معلومات</option>
                                    <option value="success">نجاح</option>
                                    <option value="warning">تحذير</option>
                                    <option value="error">خطأ</option>
                                </select>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">المدارس المستهدفة</label>
                                <select class="form-select" id="targetSchools" multiple>
                                    <option value="">جميع المدارس</option>
                                    ${schoolsData.map(school => 
                                        `<option value="${school.id}">${school.name}</option>`
                                    ).join('')}
                                </select>
                                <small class="text-muted">اتركه فارغاً لإرسال الإشعار لجميع المدارس</small>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                        <button type="button" class="btn btn-primary" onclick="submitNotification()">إرسال</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    
    const existingModal = document.getElementById('sendNotificationModal');
    if (existingModal) {
        existingModal.remove();
    }

    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    
    const modal = new bootstrap.Modal(document.getElementById('sendNotificationModal'));
    modal.show();
}


async function submitNotification() {
    const title = document.getElementById('notificationTitle').value.trim();
    const message = document.getElementById('notificationMessage').value.trim();
    const type = document.getElementById('notificationType').value;
    const targetSchoolsSelect = document.getElementById('targetSchools');
    const targetSchools = Array.from(targetSchoolsSelect.selectedOptions)
        .map(option => option.value)
        .filter(value => value !== '');

    if (!title || !message) {
        alert('يرجى إدخال العنوان والرسالة');
        return;
    }

    try {
        const result = await sendNotificationToSchools(title, message, type, targetSchools);

        if (result.success) {
            showAlert('تم إرسال الإشعار بنجاح', 'success');
            
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('sendNotificationModal'));
            modal.hide();
            
            
            await loadNotifications();
        } else {
            showAlert('خطأ في إرسال الإشعار: ' + result.error, 'danger');
        }
    } catch (error) {
        console.error('خطأ في إرسال الإشعار:', error);
        showAlert('حدث خطأ أثناء إرسال الإشعار', 'danger');
    }
}

