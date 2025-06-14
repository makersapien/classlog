// Emoji icon system for ClassLog
export const EMOJIS = {
    // App Icons
    GRADUATION: '🎓',
    BOOK: '📚',
    TEACHER: '👨‍🏫',
    STUDENT: '👨‍🎓',
    PARENT: '👨‍👩‍👧‍👦',
    
    // Dashboard Icons
    DASHBOARD: '📊',
    CALENDAR: '📅',
    CLOCK: '🕐',
    BELL: '🔔',
    STAR: '⭐',
    
    // Actions
    PLUS: '➕',
    MINUS: '➖',
    EDIT: '✏️',
    DELETE: '🗑️',
    SAVE: '💾',
    SEARCH: '🔍',
    
    // Status
    SUCCESS: '✅',
    ERROR: '❌',
    WARNING: '⚠️',
    INFO: 'ℹ️',
    LOADING: '⏳',
    
    // Money & Payments
    MONEY: '💰',
    CREDIT_CARD: '💳',
    DOLLAR: '💵',
    
    // Communication
    MESSAGE: '💬',
    EMAIL: '📧',
    PHONE: '📞',
    
    // Files & Documents
    FILE: '📄',
    PDF: '📋',
    IMAGE: '🖼️',
    
    // Navigation
    HOME: '🏠',
    SETTINGS: '⚙️',
    LOGOUT: '🚪',
    MENU: '☰',
    
    // Subjects
    MATH: '🔢',
    SCIENCE: '🔬',
    ENGLISH: '📝',
    HISTORY: '📜',
    ART: '🎨',
  } as const;
  
  export type EmojiKey = keyof typeof EMOJIS;