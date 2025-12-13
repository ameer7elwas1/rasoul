const Utils = {
    formatCurrency: function(amount) {
        if (amount === null || amount === undefined || isNaN(amount)) {
            return '0 د.ع';
        }
        const num = parseFloat(amount);
        return num.toLocaleString('ar-IQ') + ' د.ع';
    },
    sanitizeHTML: function(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },
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
    formatTime: function(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            const hours = date.getHours();
            const minutes = date.getMinutes();
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        } catch (error) {
            return dateString;
        }
    },
    isValidEmail: function(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    isValidPhone: function(phone) {
        const re = /^[0-9+\-\s()]+$/;
        return re.test(phone);
    },
    validateName: function(name) {
        if (!name || typeof name !== 'string') return false;
        const trimmed = name.trim();
        return trimmed.length >= 2 && trimmed.length <= 200;
    },
    validatePhone: function(phone) {
        if (!phone || typeof phone !== 'string') return false;
        const trimmed = phone.trim();
        const re = /^[0-9+\-\s()]+$/;
        const digitsOnly = trimmed.replace(/[^0-9]/g, '');
        return re.test(trimmed) && digitsOnly.length >= 8;
    },
    validateUsername: function(username) {
        if (!username || typeof username !== 'string') return false;
        const trimmed = username.trim().toLowerCase();
        const re = /^[a-z0-9_]+$/;
        return trimmed.length >= 3 && trimmed.length <= 50 && re.test(trimmed);
    },
    validatePassword: function(password) {
        if (!password || typeof password !== 'string') return false;
        return password.length >= 6;
    },
    cleanPhone: function(phone) {
        if (!phone || typeof phone !== 'string') return null;
        let cleaned = phone.trim();
        cleaned = cleaned.replace(/\s/g, '');
        cleaned = cleaned.replace(/[()]/g, '');
        cleaned = cleaned.replace(/-/g, '');
        if (!cleaned) return null;
        const withoutPlus = cleaned.startsWith('+') ? cleaned.substring(1) : cleaned;
        if (withoutPlus.startsWith('964964')) {
            cleaned = '+' + withoutPlus.substring(3);
            return cleaned;
        }
        if (cleaned.startsWith('+')) {
            return cleaned;
        }
        if (cleaned.startsWith('00')) {
            const without00 = cleaned.substring(2);
            if (without00.startsWith('964964')) {
                return '+' + without00.substring(3);
            }
            return '+' + without00;
        }
        if (cleaned.startsWith('0')) {
            const without0 = cleaned.substring(1);
            if (without0.startsWith('964')) {
                return '+' + without0;
            }
            return '964' + without0;
        }
        if (cleaned.startsWith('964')) {
            if (cleaned.startsWith('964964')) {
                return '+' + cleaned.substring(3);
            }
            return '+' + cleaned;
        }
        if (/^\d{9,10}$/.test(cleaned)) {
            return '964' + cleaned;
        }
        if (cleaned.startsWith('964964')) {
            return '+' + cleaned.substring(3);
        }
        return cleaned;
    },
    buildWhatsAppURL: function(phone, message = '') {
        if (!phone) return null;
        const cleanedPhone = this.cleanPhone(phone);
        if (!cleanedPhone) return null;
        const encodedMessage = encodeURIComponent(message || '');
        return `https://wa.me/${cleanedPhone}?text=${encodedMessage}`;
    },
    copyToClipboard: function(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                return true;
            }).catch(() => {
                return false;
            });
        } else {
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
    showSuccess: function(message) {
        if (typeof showAlert === 'function') {
            showAlert(message, 'success');
        } else {
            alert(message);
        }
    },
    showError: function(message) {
        if (typeof showAlert === 'function') {
            showAlert(message, 'danger');
        } else {
            alert(message);
        }
    }
};
if (typeof Utils !== 'undefined') {
    if (typeof Utils.cleanPhone !== 'function') {
        console.error('Utils.cleanPhone is not defined!');
    }
    if (typeof Utils.buildWhatsAppURL !== 'function') {
        console.error('Utils.buildWhatsAppURL is not defined!');
    }
} else {
    console.error('Utils object is not defined!');
}
