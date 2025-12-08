// ============================================
// Utilities JavaScript
// ============================================

const Utils = {
    // تنسيق العملة
    formatCurrency: function(amount) {
        if (amount === null || amount === undefined || isNaN(amount)) {
            return '0 د.ع';
        }
        const num = parseFloat(amount);
        return num.toLocaleString('ar-IQ') + ' د.ع';
    },

    // تنظيف HTML لمنع XSS
    sanitizeHTML: function(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    // تنسيق التاريخ بالعربية
    formatDateArabic: function(dateString) {
        if (!dateString) return '-';
        
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            
            const options = { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                calendar: 'gregory'
            };
            
            return date.toLocaleDateString('ar-IQ', options);
        } catch (error) {
            return dateString;
        }
    },

    // تنسيق التاريخ القصير
    formatDateShort: function(dateString) {
        if (!dateString) return '-';
        
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            
            const day = date.getDate();
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            
            return `${day}/${month}/${year}`;
        } catch (error) {
            return dateString;
        }
    },

    // التحقق من صحة البريد الإلكتروني
    isValidEmail: function(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    // التحقق من صحة رقم الهاتف
    isValidPhone: function(phone) {
        const re = /^[0-9+\-\s()]+$/;
        return re.test(phone);
    },

    // التحقق من صحة الاسم (للطلاب والأشخاص)
    validateName: function(name) {
        if (!name || typeof name !== 'string') return false;
        const trimmed = name.trim();
        return trimmed.length >= 2 && trimmed.length <= 200;
    },

    // التحقق من صحة رقم الهاتف (مع التحقق من الطول)
    validatePhone: function(phone) {
        if (!phone || typeof phone !== 'string') return false;
        const trimmed = phone.trim();
        // يجب أن يكون على الأقل 8 أرقام وأن يحتوي فقط على أرقام ورموز مسموحة
        const re = /^[0-9+\-\s()]+$/;
        const digitsOnly = trimmed.replace(/[^0-9]/g, '');
        return re.test(trimmed) && digitsOnly.length >= 8;
    },

    // التحقق من صحة اسم المستخدم
    validateUsername: function(username) {
        if (!username || typeof username !== 'string') return false;
        const trimmed = username.trim().toLowerCase();
        // يجب أن يكون بين 3-50 حرف، فقط أحرف صغيرة وأرقام وشرطة سفلية
        const re = /^[a-z0-9_]+$/;
        return trimmed.length >= 3 && trimmed.length <= 50 && re.test(trimmed);
    },

    // التحقق من صحة كلمة المرور
    validatePassword: function(password) {
        if (!password || typeof password !== 'string') return false;
        // يجب أن تكون 6 أحرف على الأقل
        return password.length >= 6;
    },

    // نسخ إلى الحافظة
    copyToClipboard: function(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                return true;
            }).catch(() => {
                return false;
            });
        } else {
            // Fallback للأنظمة القديمة
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return true;
            } catch (error) {
                document.body.removeChild(textArea);
                return false;
            }
        }
    },

    // إظهار رسالة نجاح
    showSuccess: function(message) {
        // يمكن استخدام Bootstrap toast أو alert
        if (typeof showAlert === 'function') {
            showAlert(message, 'success');
        } else {
            alert(message);
        }
    },

    // إظهار رسالة خطأ
    showError: function(message) {
        if (typeof showAlert === 'function') {
            showAlert(message, 'danger');
        } else {
            alert(message);
        }
    }
};

