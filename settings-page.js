async function loadSettings() {
    try {
        const { data: settings, error } = await supabase
            .from('system_settings')
            .select('*')
            .order('category', { ascending: true });
        if (error) throw error;
        const settingsContent = document.getElementById('settingsContent');
        if (currentUser.is_admin || currentUser.role === 'admin') {
            settingsContent.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <div class="card mb-4">
                            <div class="card-header bg-primary text-white">
                                <h5 class="mb-0">إعدادات الرسوم</h5>
                            </div>
                            <div class="card-body">
                                <div class="mb-3">
                                    <label class="form-label">المبلغ السنوي للروضة</label>
                                    <input type="number" class="form-control" id="feeKindergarten" 
                                           value="${CONFIG.DEFAULT_FEES.KINDERGARTEN}" step="1000">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">المبلغ السنوي للمرحلة الابتدائية</label>
                                    <input type="number" class="form-control" id="feeElementary" 
                                           value="${CONFIG.DEFAULT_FEES.ELEMENTARY}" step="1000">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">المبلغ السنوي للمرحلة المتوسطة</label>
                                    <input type="number" class="form-control" id="feeMiddle" 
                                           value="${CONFIG.DEFAULT_FEES.MIDDLE}" step="1000">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">عدد الأقساط</label>
                                    <input type="number" class="form-control" id="installmentCount" 
                                           value="${CONFIG.INSTALLMENT_COUNT}" min="1" max="12">
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card mb-4">
                            <div class="card-header bg-success text-white">
                                <h5 class="mb-0">إعدادات الخصومات</h5>
                            </div>
                            <div class="card-body">
                                <div class="mb-3">
                                    <label class="form-label">خصم الإخوة (2 أخوة) %</label>
                                    <input type="number" class="form-control" id="discount2" 
                                           value="${CONFIG.DISCOUNTS.SIBLING_2 * 100}" min="0" max="100" step="1">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">خصم الإخوة (3+ أخوة) %</label>
                                    <input type="number" class="form-control" id="discount3Plus" 
                                           value="${CONFIG.DISCOUNTS.SIBLING_3_PLUS * 100}" min="0" max="100" step="1">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <div class="card mb-4">
                            <div class="card-header bg-info text-white">
                                <h5 class="mb-0">إعدادات واتساب</h5>
                            </div>
                            <div class="card-body">
                                <div class="mb-3">
                                    <div class="form-check form-switch">
                                        <input class="form-check-input" type="checkbox" id="whatsappAutoSend" 
                                               ${CONFIG?.WHATSAPP?.AUTO_SEND ? 'checked' : ''}>
                                        <label class="form-check-label" for="whatsappAutoSend">
                                            إرسال إشعارات واتساب تلقائياً
                                        </label>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">عدد الأيام قبل إرسال التذكير</label>
                                    <input type="number" class="form-control" id="reminderDays" 
                                           value="${CONFIG?.WHATSAPP?.REMINDER_DAYS || 7}" min="1" max="30">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">رمز الدولة</label>
                                    <input type="text" class="form-control" id="countryCode" 
                                           value="${CONFIG?.WHATSAPP?.COUNTRY_CODE || '+964'}">
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card mb-4">
                            <div class="card-header bg-warning text-white">
                                <h5 class="mb-0">إعدادات الأمان</h5>
                            </div>
                            <div class="card-body">
                                <div class="mb-3">
                                    <label class="form-label">عدد محاولات تسجيل الدخول</label>
                                    <input type="number" class="form-control" id="maxLoginAttempts" 
                                           value="${CONFIG.SECURITY.MAX_LOGIN_ATTEMPTS}" min="3" max="10">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">مدة انتهاء الجلسة (بالدقائق)</label>
                                    <input type="number" class="form-control" id="sessionTimeout" 
                                           value="${CONFIG.SECURITY.SESSION_TIMEOUT / 60000}" min="15" max="480">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="text-center">
                    <button class="btn btn-primary btn-lg" onclick="saveSettings()">
                        <i class="bi bi-save"></i> حفظ الإعدادات
                    </button>
                </div>
            `;
        } else {
            settingsContent.innerHTML = `
                <div class="card">
                    <div class="card-header bg-primary text-white">
                        <h5 class="mb-0">إعدادات المدرسة</h5>
                    </div>
                    <div class="card-body">
                        <div class="mb-3">
                            <label class="form-label">اسم المدرسة</label>
                            <input type="text" class="form-control" value="${currentSchool?.name || ''}" disabled>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">رمز المدرسة</label>
                            <input type="text" class="form-control" value="${currentSchool?.code || ''}" disabled>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">العنوان</label>
                            <input type="text" class="form-control" id="schoolAddress" 
                                   value="${currentSchool?.address || ''}">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">الهاتف</label>
                            <input type="tel" class="form-control" id="schoolPhone" 
                                   value="${currentSchool?.phone || ''}">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">البريد الإلكتروني</label>
                            <input type="email" class="form-control" id="schoolEmail" 
                                   value="${currentSchool?.email || ''}">
                        </div>
                        <div class="text-center">
                            <button class="btn btn-primary" onclick="saveSchoolSettings()">
                                <i class="bi bi-save"></i> حفظ الإعدادات
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('خطأ في تحميل الإعدادات:', error);
        showAlert('خطأ في تحميل الإعدادات', 'danger');
    }
}
async function saveSettings() {
    try {
        const settings = {
            'default_annual_fee_kindergarten': {
                value: parseFloat(document.getElementById('feeKindergarten').value)
            },
            'default_annual_fee_elementary': {
                value: parseFloat(document.getElementById('feeElementary').value)
            },
            'default_annual_fee_middle': {
                value: parseFloat(document.getElementById('feeMiddle').value)
            },
            'default_installment_count': {
                value: parseInt(document.getElementById('installmentCount').value)
            },
            'sibling_discount_2': {
                percentage: parseFloat(document.getElementById('discount2').value)
            },
            'sibling_discount_3_plus': {
                percentage: parseFloat(document.getElementById('discount3Plus').value)
            },
            'whatsapp_auto_send': {
                enabled: document.getElementById('whatsappAutoSend').checked
            },
            'reminder_days': {
                value: parseInt(document.getElementById('reminderDays').value)
            }
        };
        for (const [key, value] of Object.entries(settings)) {
            await supabase
                .from('system_settings')
                .upsert({
                    key: key,
                    value: value,
                    updated_at: new Date().toISOString(),
                    updated_by: currentUser.id
                });
        }
        showAlert('تم حفظ الإعدادات بنجاح', 'success');
        CONFIG.DEFAULT_FEES.KINDERGARTEN = settings.default_annual_fee_kindergarten.value;
        CONFIG.DEFAULT_FEES.ELEMENTARY = settings.default_annual_fee_elementary.value;
        CONFIG.DEFAULT_FEES.MIDDLE = settings.default_annual_fee_middle.value;
        CONFIG.INSTALLMENT_COUNT = settings.default_installment_count.value;
        CONFIG.DISCOUNTS.SIBLING_2 = settings.sibling_discount_2.percentage / 100;
        CONFIG.DISCOUNTS.SIBLING_3_PLUS = settings.sibling_discount_3_plus.percentage / 100;
        if (!CONFIG.WHATSAPP) CONFIG.WHATSAPP = {};
        CONFIG.WHATSAPP.AUTO_SEND = settings.whatsapp_auto_send.enabled;
        CONFIG.WHATSAPP.REMINDER_DAYS = settings.reminder_days.value;
    } catch (error) {
        console.error('خطأ في حفظ الإعدادات:', error);
        showAlert('خطأ في حفظ الإعدادات', 'danger');
    }
}
async function saveSchoolSettings() {
    try {
        const updates = {
            address: document.getElementById('schoolAddress').value.trim(),
            phone: document.getElementById('schoolPhone').value.trim(),
            email: document.getElementById('schoolEmail').value.trim(),
            updated_at: new Date().toISOString()
        };
        const { error } = await supabase
            .from('schools')
            .update(updates)
            .eq('id', currentSchool.id);
        if (error) throw error;
        showAlert('تم حفظ إعدادات المدرسة بنجاح', 'success');
        currentSchool = { ...currentSchool, ...updates };
    } catch (error) {
        console.error('خطأ في حفظ إعدادات المدرسة:', error);
        showAlert('خطأ في حفظ إعدادات المدرسة', 'danger');
    }
}