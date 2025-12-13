async function loadUsers() {
    try {

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const { data: schoolsData } = await supabase
            .from('schools')
            .select('id, name');

        const schoolsMap = {};
        if (schoolsData) {
            schoolsData.forEach(school => {
                schoolsMap[school.id] = school;
            });
        }

        const usersWithSchools = (data || []).map(user => {
            if (user.school_id && schoolsMap[user.school_id]) {
                user.schools = schoolsMap[user.school_id];
            } else {
                user.schools = null;
            }
            return user;
        });

        return { success: true, data: usersWithSchools };
    } catch (error) {
        console.error('خطأ في تحميل المستخدمين:', error);
        return { success: false, error: error.message };
    }
}

function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">لا يوجد مستخدمين</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(user => {
        const school = user.schools;
        const roleBadge = user.is_admin 
            ? '<span class="badge bg-danger">رئيس مجلس الإدارة</span>'
            : user.role === 'school_admin'
            ? '<span class="badge bg-primary">مدير مدرسة</span>'
            : '<span class="badge bg-secondary">مستخدم</span>';

        const statusBadge = user.is_active 
            ? '<span class="badge bg-success">نشط</span>'
            : '<span class="badge bg-danger">معطل</span>';

        return `
            <tr>
                <td>${Utils.sanitizeHTML(user.username)}</td>
                <td>${Utils.sanitizeHTML(user.full_name || '-')}</td>
                <td>${Utils.sanitizeHTML(user.email || '-')}</td>
                <td>${school ? school.name : '-'}</td>
                <td>${roleBadge}</td>
                <td>${statusBadge}</td>
                <td>${user.last_login ? Utils.formatDateArabic(user.last_login) : 'لم يسجل دخول'}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editUser(${user.id})" title="تعديل">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-${user.is_active ? 'warning' : 'success'}" 
                            onclick="toggleUserStatus(${user.id}, ${user.is_active})" 
                            title="${user.is_active ? 'تعطيل' : 'تفعيل'}">
                        <i class="bi bi-${user.is_active ? 'x-circle' : 'check-circle'}"></i>
                    </button>
                    ${!user.is_admin ? `
                        <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})" title="حذف">
                            <i class="bi bi-trash"></i>
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-info" onclick="resetPassword(${user.id})" title="إعادة تعيين كلمة المرور">
                        <i class="bi bi-key"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function showAddUserModal() {
    const modalHTML = `
        <div class="modal fade" id="addUserModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">إضافة مستخدم جديد</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="addUserForm">
                            <div class="mb-3">
                                <label class="form-label">اسم المستخدم *</label>
                                <input type="text" class="form-control" id="newUsername" 
                                       pattern="[a-z0-9_]+" required>
                                <small class="text-muted">أحرف صغيرة وأرقام وشرطة سفلية فقط</small>
                            </div>

                            <div class="mb-3">
                                <label class="form-label">الاسم الكامل *</label>
                                <input type="text" class="form-control" id="newFullName" required>
                            </div>

                            <div class="mb-3">
                                <label class="form-label">البريد الإلكتروني</label>
                                <input type="email" class="form-control" id="newEmail">
                            </div>

                            <div class="mb-3">
                                <label class="form-label">كلمة المرور *</label>
                                <input type="password" class="form-control" id="newPassword" 
                                       minlength="6" required>
                                <small class="text-muted">6 أحرف على الأقل</small>
                            </div>

                            <div class="mb-3">
                                <label class="form-label">المدرسة</label>
                                <select class="form-select" id="newSchoolId">
                                    <option value="">لا يوجد (لرئيس مجلس الإدارة)</option>
                                    ${schoolsData.map(school => 
                                        `<option value="${school.id}">${school.name}</option>`
                                    ).join('')}
                                </select>
                            </div>

                            <div class="mb-3">
                                <label class="form-label">الدور *</label>
                                <select class="form-select" id="newRole" required onchange="updateRoleOptions()">
                                    <option value="admin">رئيس مجلس الإدارة</option>
                                    <option value="school_admin">مدير مدرسة</option>
                                    <option value="user">مستخدم عادي</option>
                                </select>
                            </div>

                            <div class="mb-3">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="newIsActive" checked>
                                    <label class="form-check-label" for="newIsActive">
                                        الحساب نشط
                                    </label>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                        <button type="button" class="btn btn-primary" onclick="submitNewUser()">حفظ</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const existingModal = document.getElementById('addUserModal');
    if (existingModal) {
        existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = new bootstrap.Modal(document.getElementById('addUserModal'));
    modal.show();

    updateRoleOptions();
}

function updateRoleOptions() {
    const role = document.getElementById('newRole').value;
    const schoolSelect = document.getElementById('newSchoolId');

    if (role === 'admin') {
        schoolSelect.value = '';
        schoolSelect.disabled = true;
    } else {
        schoolSelect.disabled = false;
    }
}

async function submitNewUser() {
    const username = document.getElementById('newUsername').value.trim().toLowerCase();
    const fullName = document.getElementById('newFullName').value.trim();
    const email = document.getElementById('newEmail').value.trim();
    const password = document.getElementById('newPassword').value;
    const schoolId = document.getElementById('newSchoolId').value || null;
    const role = document.getElementById('newRole').value;
    const isActive = document.getElementById('newIsActive').checked;

    if (!Utils.validateUsername(username)) {
        showAlert('اسم المستخدم غير صحيح', 'danger');
        return;
    }

    if (!Utils.validatePassword(password)) {
        showAlert('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'danger');
        return;
    }

    if (role === 'admin' && schoolId) {
        showAlert('رئيس مجلس الإدارة لا يمكن أن يكون مرتبطاً بمدرسة', 'danger');
        return;
    }

    try {

        const { data: hashedPassword, error: hashError } = await supabase.rpc('hash_password', {
            password: password
        });

        let passwordHash = password; 
        if (!hashError && hashedPassword) {
            passwordHash = hashedPassword;
        }

        const { data, error } = await supabase
            .from('users')
            .insert({
                username: username,
                password_hash: passwordHash,
                full_name: fullName,
                email: email || null,
                school_id: schoolId,
                role: role,
                is_admin: role === 'admin',
                is_active: isActive,
                created_by: currentUser.id
            })
            .select()
            .single();

        if (error) throw error;

        showAlert('تم إضافة المستخدم بنجاح', 'success');

        const modal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
        modal.hide();

        await loadUsersSection();
    } catch (error) {
        console.error('خطأ في إضافة المستخدم:', error);
        if (error.code === '23505') {
            showAlert('اسم المستخدم موجود مسبقاً', 'danger');
        } else {
            showAlert('خطأ في إضافة المستخدم: ' + error.message, 'danger');
        }
    }
}

async function editUser(userId) {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;

        const modalHTML = `
            <div class="modal fade" id="editUserModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">تعديل المستخدم</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="editUserForm">
                                <input type="hidden" id="editUserId" value="${user.id}">

                                <div class="mb-3">
                                    <label class="form-label">اسم المستخدم</label>
                                    <input type="text" class="form-control" value="${user.username}" disabled>
                                    <small class="text-muted">لا يمكن تغيير اسم المستخدم</small>
                                </div>

                                <div class="mb-3">
                                    <label class="form-label">الاسم الكامل *</label>
                                    <input type="text" class="form-control" id="editFullName" 
                                           value="${user.full_name || ''}" required>
                                </div>

                                <div class="mb-3">
                                    <label class="form-label">البريد الإلكتروني</label>
                                    <input type="email" class="form-control" id="editEmail" 
                                           value="${user.email || ''}">
                                </div>

                                <div class="mb-3">
                                    <label class="form-label">المدرسة</label>
                                    <select class="form-select" id="editSchoolId">
                                        <option value="">لا يوجد</option>
                                        ${schoolsData.map(school => 
                                            `<option value="${school.id}" ${user.school_id === school.id ? 'selected' : ''}>${school.name}</option>`
                                        ).join('')}
                                    </select>
                                </div>

                                <div class="mb-3">
                                    <label class="form-label">الدور *</label>
                                    <select class="form-select" id="editRole" required>
                                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>رئيس مجلس الإدارة</option>
                                        <option value="school_admin" ${user.role === 'school_admin' ? 'selected' : ''}>مدير مدرسة</option>
                                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>مستخدم عادي</option>
                                    </select>
                                </div>

                                <div class="mb-3">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="editIsActive" ${user.is_active ? 'checked' : ''}>
                                        <label class="form-check-label" for="editIsActive">
                                            الحساب نشط
                                        </label>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                            <button type="button" class="btn btn-primary" onclick="submitEditUser()">حفظ</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const existingModal = document.getElementById('editUserModal');
        if (existingModal) {
            existingModal.remove();
        }

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
        modal.show();
    } catch (error) {
        console.error('خطأ في تحميل بيانات المستخدم:', error);
        showAlert('خطأ في تحميل بيانات المستخدم', 'danger');
    }
}

async function submitEditUser() {
    const userId = parseInt(document.getElementById('editUserId').value);
    const fullName = document.getElementById('editFullName').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const schoolId = document.getElementById('editSchoolId').value || null;
    const role = document.getElementById('editRole').value;
    const isActive = document.getElementById('editIsActive').checked;

    try {
        const { error } = await supabase
            .from('users')
            .update({
                full_name: fullName,
                email: email || null,
                school_id: schoolId,
                role: role,
                is_admin: role === 'admin',
                is_active: isActive,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (error) throw error;

        showAlert('تم تحديث المستخدم بنجاح', 'success');

        const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
        modal.hide();

        await loadUsersSection();
    } catch (error) {
        console.error('خطأ في تحديث المستخدم:', error);
        showAlert('خطأ في تحديث المستخدم: ' + error.message, 'danger');
    }
}

async function toggleUserStatus(userId, currentStatus) {
    const action = currentStatus ? 'تعطيل' : 'تفعيل';

    if (!confirm(`هل أنت متأكد من ${action} هذا المستخدم؟`)) {
        return;
    }

    try {
        const { error } = await supabase
            .from('users')
            .update({
                is_active: !currentStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (error) throw error;

        showAlert(`تم ${action} المستخدم بنجاح`, 'success');
        await loadUsersSection();
    } catch (error) {
        console.error('خطأ في تغيير حالة المستخدم:', error);
        showAlert('خطأ في تغيير حالة المستخدم', 'danger');
    }
}

async function deleteUser(userId) {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع عن هذه العملية.')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);

        if (error) throw error;

        showAlert('تم حذف المستخدم بنجاح', 'success');
        await loadUsersSection();
    } catch (error) {
        console.error('خطأ في حذف المستخدم:', error);
        showAlert('خطأ في حذف المستخدم: ' + error.message, 'danger');
    }
}

async function resetPassword(userId) {
    const newPassword = prompt('أدخل كلمة المرور الجديدة (6 أحرف على الأقل):');

    if (!newPassword || newPassword.length < 6) {
        showAlert('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'warning');
        return;
    }

    if (!confirm('هل أنت متأكد من إعادة تعيين كلمة المرور؟')) {
        return;
    }

    try {

        const { data: hashedPassword, error: hashError } = await supabase.rpc('hash_password', {
            password: newPassword
        });

        let passwordHash = newPassword; 
        if (!hashError && hashedPassword) {
            passwordHash = hashedPassword;
        }

        const { error } = await supabase
            .from('users')
            .update({
                password_hash: passwordHash,
                password_changed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (error) throw error;

        showAlert('تم إعادة تعيين كلمة المرور بنجاح', 'success');
    } catch (error) {
        console.error('خطأ في إعادة تعيين كلمة المرور:', error);
        showAlert('خطأ في إعادة تعيين كلمة المرور', 'danger');
    }
}

async function loadUsersSection() {
    try {
        const result = await loadUsers();

        if (result.success) {
            displayUsers(result.data);
        } else {
            showAlert('خطأ في تحميل المستخدمين: ' + result.error, 'danger');
        }
    } catch (error) {
        console.error('خطأ في تحميل قسم المستخدمين:', error);
        showAlert('خطأ في تحميل المستخدمين', 'danger');
    }
}
