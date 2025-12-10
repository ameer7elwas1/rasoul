const CONFIG = {
    SUPABASE: {
        URL: 'https://vpvvjascwgivdjyyhzwp.supabase.co',
        ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwdnZqYXNjd2dpdmRqeXloendwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MDYxMjYsImV4cCI6MjA2NTM4MjEyNn0.6AR2-MG4x9ugNTXe9jUqx-IwGEtj1m6MCYwQkTsSbUQ'
    },
    SECURITY: {
        MAX_LOGIN_ATTEMPTS: 5,
        SESSION_TIMEOUT: 24 * 60 * 60 * 1000
    },
    INSTALLMENT_COUNT: 4,
    DISCOUNTS: {
        SIBLING_2: 0.05,      // 5%
        SIBLING_3_PLUS: 0.10  // 10%
    },
    DEFAULT_FEES: {
        KINDERGARTEN: 1000000,
        ELEMENTARY: 1100000,
        MIDDLE: 1300000
    }
};
const GRADES = {
    rawda: [
        '—Ê÷… √Ê·Ï',
        '—Ê÷… À«‰Ì…',
        '—Ê÷… À«·À…'
    ],
    rasoul: [
        '«·’› «·√Ê·',
        '«·’› «·À«‰Ì',
        '«·’› «·À«·À',
        '«·’› «·—«»⁄',
        '«·’› «·Œ«„”',
        '«·’› «·”«œ”'
    ],
    noor: [
        '«·’› «·√Ê·',
        '«·’› «·À«‰Ì',
        '«·’› «·À«·À',
        '«·’› «·—«»⁄',
        '«·’› «·Œ«„”',
        '«·’› «·”«œ”'
    ],
    nabi: [
        '«·’› «·√Ê·',
        '«·’› «·À«‰Ì',
        '«·’› «·À«·À',
        '«·’› «·—«»⁄',
        '«·’› «·Œ«„”',
        '«·’› «·”«œ”'
    ],
    thanawiya: [
        '«·’› «·√Ê· «·„ Ê”ÿ',
        '«·’› «·À«‰Ì «·„ Ê”ÿ',
        '«·’› «·À«·À «·„ Ê”ÿ',
        '«·’› «·—«»⁄ «·≈⁄œ«œÌ',
        '«·’› «·Œ«„” «·≈⁄œ«œÌ',
        '«·’› «·”«œ” «·≈⁄œ«œÌ'
    ]
};
