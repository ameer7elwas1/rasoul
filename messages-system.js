// ============================================
// Messages System JavaScript
// ============================================

// عرض المحادثات للمدرسة
async function showMessages() {
    try {
        // إنشاء أو العثور على محادثة مع رئيس مجلس الإدارة
        let conversation = await findOrCreateConversation('admin', currentSchool.id);
        
        if (!conversation) {
            // إنشاء محادثة جديدة
            const { data, error } = await supabase
                .from('conversations')
                .insert({
                    sender_id: currentSchool.id,
                    sender_name: currentSchool.name,
                    sender_type: 'school',
                    receiver_id: 'admin',
                    receiver_name: 'رئيس مجلس الإدارة',
                    receiver_type: 'admin',
                    last_message: '',
                    unread_count: 0
                })
                .select()
                .single();

            if (error) throw error;
            conversation = data;
        }

        // عرض نافذة المحادثة
        showConversationModal(conversation.id);
    } catch (error) {
        console.error('خطأ في عرض المحادثات:', error);
        showAlert('خطأ في تحميل المحادثات', 'danger');
    }
}

// العثور على محادثة أو إنشاء واحدة جديدة
async function findOrCreateConversation(senderId, receiverId) {
    try {
        // البحث عن محادثة موجودة
        const { data, error } = await supabase
            .from('conversations')
            .select('*')
            .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            throw error;
        }

        return data || null;
    } catch (error) {
        console.error('خطأ في البحث عن المحادثة:', error);
        return null;
    }
}

// عرض نافذة المحادثة
function showConversationModal(conversationId) {
    const modalHTML = `
        <div class="modal fade" id="conversationModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">المحادثة مع رئيس مجلس الإدارة</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="chat-container" style="height: 400px;">
                            <div class="chat-messages" id="conversationMessages" style="overflow-y: auto; max-height: 350px;">
                                <!-- سيتم ملؤها ديناميكياً -->
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
                    </div>
                </div>
            </div>
        </div>
    `;

    // إزالة النموذج السابق إن وجد
    const existingModal = document.getElementById('conversationModal');
    if (existingModal) {
        existingModal.remove();
    }

    // إضافة النموذج الجديد
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // عرض النموذج
    const modal = new bootstrap.Modal(document.getElementById('conversationModal'));
    modal.show();

    // تحميل الرسائل
    loadConversationMessages(conversationId);
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

        const messagesContainer = document.getElementById('conversationMessages');
        
        if (!data || data.length === 0) {
            messagesContainer.innerHTML = '<p class="text-center text-muted">لا توجد رسائل في هذه المحادثة</p>';
            return;
        }

        messagesContainer.innerHTML = data.map(msg => {
            const isSent = msg.sender_id === currentSchool.id;
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

        // التمرير للأسفل
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // تحديث حالة القراءة
        await supabase.rpc('mark_conversation_messages_read', {
            conv_id: conversationId,
            reader_id: currentSchool.id
        });
    } catch (error) {
        console.error('خطأ في تحميل الرسائل:', error);
    }
}

// إرسال رسالة في المحادثة
async function sendConversationMessage(conversationId) {
    const messageInput = document.getElementById('conversationMessageInput');
    const message = messageInput.value.trim();

    if (!message) return;

    try {
        // إرسال الرسالة
        const { data, error } = await supabase
            .from('conversation_messages')
            .insert({
                conversation_id: conversationId,
                sender_id: currentSchool.id,
                sender_name: currentSchool.name,
                message: message
            });

        if (error) throw error;

        messageInput.value = '';
        await loadConversationMessages(conversationId);
        await loadMessages(); // تحديث العداد
    } catch (error) {
        console.error('خطأ في إرسال الرسالة:', error);
        showAlert('خطأ في إرسال الرسالة', 'danger');
    }
}

