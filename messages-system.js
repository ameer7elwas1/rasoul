async function showMessages() {
    try {
        if (!currentSchool || !currentSchool.id) {
            showAlert('لم يتم تحديد المدرسة', 'danger');
            return;
        }
        // جلب المدارس بدون عمود type غير الموجود
        const { data: schools, error: schoolsError } = await supabase
            .from('schools')
            .select('id, name, code')
            .order('name', { ascending: true });
        if (schoolsError) throw schoolsError;
        const { data: conversations, error: convError } = await supabase
            .from('conversations')
            .select('*')
            .or(`sender_id.eq.${currentSchool.id},receiver_id.eq.${currentSchool.id}`)
            .order('updated_at', { ascending: false });
        if (convError) throw convError;
        showMessagesModal(schools || [], conversations || []);
    } catch (error) {
        console.error('خطأ في تحميل الرسائل:', error);
        if (typeof showAlert === 'function') {
            showAlert('خطأ في تحميل الرسائل', 'danger');
        } else {
            alert('خطأ في تحميل الرسائل');
        }
    }
}
function showMessagesModal(schools, conversations) {
    const modalHTML = `
        <div class="modal fade" id="messagesModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">المحادثات</h5>
                        <button type="button" class="btn btn-sm btn-primary" onclick="showNewConversationModal()">
                            <i class="bi bi-plus-circle"></i> محادثة جديدة
                        </button>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-4 border-end" style="max-height: 500px; overflow-y: auto;">
                                <h6 class="mb-3">قائمة المحادثات</h6>
                                <div id="conversationsList">
                                    ${conversations.length > 0 ? conversations.map(conv => {
                                        const otherId = conv.sender_id === currentSchool.id ? conv.receiver_id : conv.sender_id;
                                        const otherName = conv.sender_id === currentSchool.id ? conv.receiver_name : conv.sender_name;
                                        const unreadCount = conv.sender_id === currentSchool.id ? 0 : (conv.unread_count || 0);
                                        return `
                                            <div class="card mb-2 ${unreadCount > 0 ? 'border-primary' : ''}" 
                                                 style="cursor: pointer;" 
                                                 onclick="openConversation('${conv.id}', '${otherName}')">
                                                <div class="card-body p-2">
                                                    <div class="d-flex justify-content-between align-items-center">
                                                        <div>
                                                            <strong>${otherName}</strong>
                                                            <small class="d-block text-muted">${conv.last_message || 'لا توجد رسائل'}</small>
                                                        </div>
                                                        ${unreadCount > 0 ? `<span class="badge bg-primary">${unreadCount}</span>` : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        `;
                                    }).join('') : '<p class="text-muted text-center">لا توجد محادثات</p>'}
                                </div>
                            </div>
                            <div class="col-md-8">
                                <div id="conversationView" style="min-height: 400px;">
                                    <p class="text-center text-muted mt-5">اختر محادثة لعرض الرسائل</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    const existingModal = document.getElementById('messagesModal');
    if (existingModal) {
        existingModal.remove();
    }
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = new bootstrap.Modal(document.getElementById('messagesModal'));
    modal.show();
    window.allSchools = schools;
}
function showNewConversationModal() {
    if (!window.allSchools || window.allSchools.length === 0) {
        showAlert('لا توجد مدارس متاحة', 'warning');
        return;
    }
    const modalHTML = `
        <div class="modal fade" id="newConversationModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">بدء محادثة جديدة</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">اختر المستلم</label>
                            <select class="form-select" id="receiverSelect">
                                <option value="admin">رئيس مجلس الإدارة</option>
                                ${window.allSchools.filter(s => s.id !== currentSchool.id).map(school => 
                                    `<option value="${school.id}">${school.name}</option>`
                                ).join('')}
                            </select>
                            <small class="text-muted">يمكنك محادثة أي مدرسة أخرى أو رئيس مجلس الإدارة</small>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                        <button type="button" class="btn btn-primary" onclick="startNewConversation()">بدء المحادثة</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    const existingModal = document.getElementById('newConversationModal');
    if (existingModal) {
        existingModal.remove();
    }
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = new bootstrap.Modal(document.getElementById('newConversationModal'));
    modal.show();
}
async function startNewConversation() {
    const receiverId = document.getElementById('receiverSelect').value;
    if (!receiverId) {
        showAlert('يرجى اختيار مستلم', 'warning');
        return;
    }
    try {
        let receiverName = 'رئيس مجلس الإدارة';
        let receiverType = 'admin';
        if (receiverId !== 'admin') {
            const school = window.allSchools.find(s => s.id === receiverId);
            if (school) {
                receiverName = school.name;
                receiverType = 'school';
            }
        }
        let conversation = await findOrCreateConversation(currentSchool.id, receiverId);
        if (!conversation) {
            const { data, error } = await supabase
                .from('conversations')
                .insert({
                    sender_id: currentSchool.id,
                    sender_name: currentSchool.name,
                    sender_type: 'school',
                    receiver_id: receiverId,
                    receiver_name: receiverName,
                    receiver_type: receiverType,
                    last_message: '',
                    unread_count: 0
                })
                .select()
                .single();
            if (error) throw error;
            conversation = data;
        }
        const newConvModal = bootstrap.Modal.getInstance(document.getElementById('newConversationModal'));
        if (newConvModal) newConvModal.hide();
        openConversation(conversation.id, receiverName);
    } catch (error) {
        console.error('خطأ في بدء المحادثة:', error);
        showAlert('خطأ في بدء المحادثة', 'danger');
    }
}
function openConversation(conversationId, receiverName) {
    const conversationView = document.getElementById('conversationView');
    conversationView.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
            <h6 class="mb-0">المحادثة مع ${receiverName}</h6>
        </div>
        <div class="chat-container" style="height: 400px;">
            <div class="chat-messages" id="conversationMessages" style="overflow-y: auto; max-height: 350px;">
                
            </div>
            <div class="message-input p-3 border-top">
                <div class="input-group">
                    <input type="text" class="form-control" id="conversationMessageInput" 
                           placeholder="اكتب رسالة..." onkeypress="if(event.key==='Enter') sendConversationMessage('${conversationId}')">
                    <button class="btn btn-primary" onclick="sendConversationMessage('${conversationId}')">
                        <i class="bi bi-send-fill"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    loadConversationMessages(conversationId);
}
async function findOrCreateConversation(senderId, receiverId) {
    try {
        const { data, error } = await supabase
            .from('conversations')
            .select('*')
            .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`)
            .single();
        if (error && error.code !== 'PGRST116') { 
            throw error;
        }
        return data || null;
    } catch (error) {
        console.error('خطأ في البحث عن المحادثة:', error);
        return null;
    }
}
window.showNewConversationModal = showNewConversationModal;
window.startNewConversation = startNewConversation;
window.openConversation = openConversation;
async function loadConversationMessages(conversationId) {
    try {
        const { data, error } = await supabase
            .from('conversation_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });
        if (error) throw error;
        const messagesContainer = document.getElementById('conversationMessages');
        if (!data || data.length === 0) {
            messagesContainer.innerHTML = '<p class="text-center text-muted">لا توجد رسائل في هذه المحادثة</p>';
            return;
        }
        messagesContainer.innerHTML = data.map(msg => {
            const isSent = currentSchool && msg.sender_id === currentSchool.id;
            return `
                <div class="message ${isSent ? 'sent' : ''}" style="margin-bottom: 15px; display: flex; ${isSent ? 'justify-content: flex-end;' : ''}">
                    <div class="message-content" style="max-width: 70%; padding: 12px 16px; border-radius: 15px; background: ${isSent ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white'}; color: ${isSent ? 'white' : '#333'}; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                        <div class="fw-bold mb-1">${msg.sender_name}</div>
                        <div>${Utils.sanitizeHTML(msg.message)}</div>
                        <small style="opacity: 0.7;">${Utils.formatTime(msg.created_at)}</small>
                    </div>
                </div>
            `;
        }).join('');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        if (currentSchool && currentSchool.id) {
            await supabase.rpc('mark_conversation_messages_read', {
                conv_id: conversationId,
                reader_id: currentSchool.id
            });
        }
    } catch (error) {
        console.error('خطأ في تحميل الرسائل:', error);
    }
}
async function sendConversationMessage(conversationId) {
    const messageInput = document.getElementById('conversationMessageInput');
    const message = messageInput.value.trim();
    if (!message) return;
    try {
        const { data, error } = await supabase
            .from('conversation_messages')
            .insert({
                conversation_id: conversationId,
                sender_id: currentSchool?.id || '',
                sender_name: currentSchool?.name || '',
                message: message
            });
        if (error) throw error;

        // تحديث المحادثة
        await supabase
            .from('conversations')
            .update({
                last_message: message,
                last_message_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', conversationId);

        messageInput.value = '';
        await loadConversationMessages(conversationId);
        await loadMessages();
        const conversationsList = document.getElementById('conversationsList');
        if (conversationsList) {
            const { data: conversations, error: convError } = await supabase
                .from('conversations')
                .select('*')
                .or(`sender_id.eq.${currentSchool.id},receiver_id.eq.${currentSchool.id}`)
                .order('updated_at', { ascending: false });
            if (!convError && conversations) {
                conversationsList.innerHTML = conversations.length > 0 ? conversations.map(conv => {
                    const otherId = conv.sender_id === currentSchool.id ? conv.receiver_id : conv.sender_id;
                    const otherName = conv.sender_id === currentSchool.id ? conv.receiver_name : conv.sender_name;
                    const unreadCount = conv.sender_id === currentSchool.id ? 0 : (conv.unread_count || 0);
                    return `
                        <div class="card mb-2 ${unreadCount > 0 ? 'border-primary' : ''}" 
                             style="cursor: pointer;" 
                             onclick="openConversation('${conv.id}', '${otherName}')">
                            <div class="card-body p-2">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <strong>${otherName}</strong>
                                        <small class="d-block text-muted">${conv.last_message || 'لا توجد رسائل'}</small>
                                    </div>
                                    ${unreadCount > 0 ? `<span class="badge bg-primary">${unreadCount}</span>` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('') : '<p class="text-muted text-center">لا توجد محادثات</p>';
            }
        } 
    } catch (error) {
        console.error('خطأ في إرسال الرسالة:', error);
        if (typeof showAlert === 'function') {
            showAlert('خطأ في إرسال الرسالة', 'danger');
        } else {
            alert('خطأ في إرسال الرسالة');
        }
    }
}