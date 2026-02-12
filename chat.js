// ========== ФАЙЛОВОЕ ХРАНИЛИЩЕ (localStorage) ==========
const STORAGE_KEY = 'simple_chat_messages';
const USERS_KEY = 'simple_chat_users';

// ----- ЗАГРУЗКА СООБЩЕНИЙ -----
function loadMessages() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
}

// ----- СОХРАНЕНИЕ СООБЩЕНИЙ (замена БД) -----
function saveMessages(messages) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
}

// ----- ПОЛЬЗОВАТЕЛИ (простое "файловое" хранилище) -----
function loadUsers() {
    const stored = localStorage.getItem(USERS_KEY);
    return stored ? JSON.parse(stored) : [];
}

function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// ----- ДОБАВЛЕНИЕ НОВОГО ПОЛЬЗОВАТЕЛЯ (при первом входе) -----
function registerUser(username) {
    const users = loadUsers();
    if (!users.includes(username)) {
        users.push(username);
        saveUsers(users);
    }
}

// ========== СОСТОЯНИЕ ЧАТА ==========
let currentUser = null;
let messages = loadMessages();

// ========== DOM ЭЛЕМЕНТЫ ==========
const authContainer = document.getElementById('auth-container');
const chatContainer = document.getElementById('chat-container');
const usernameInput = document.getElementById('username-input');
const loginBtn = document.getElementById('login-btn');
const authError = document.getElementById('auth-error');
const displayUsername = document.getElementById('display-username');
const messagesArea = document.getElementById('messages-area');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const logoutBtn = document.getElementById('logout-btn');
const clearChatBtn = document.getElementById('clear-chat-btn');
const confirmDialog = document.getElementById('confirm-dialog');
const confirmClearBtn = document.getElementById('confirm-clear-btn');
const cancelClearBtn = document.getElementById('cancel-clear-btn');

// ========== ФУНКЦИИ ИНТЕРФЕЙСА ==========
function showAuth() {
    authContainer.classList.remove('hidden');
    chatContainer.classList.add('hidden');
    confirmDialog.classList.add('hidden');
    currentUser = null;
    usernameInput.value = '';
    authError.textContent = '';
}

function showChat(username) {
    currentUser = username;
    displayUsername.textContent = username;
    authContainer.classList.add('hidden');
    chatContainer.classList.remove('hidden');
    renderMessages();
    scrollToBottom();
    messageInput.focus();
}

// ----- СИСТЕМНОЕ СООБЩЕНИЕ -----
function addSystemMessage(text) {
    const systemMessage = {
        username: '⚙️ система',
        text: text,
        timestamp: Date.now(),
        isSystem: true
    };
    messages.push(systemMessage);
    saveMessages(messages);
    renderMessages();
    scrollToBottom();
}

// ----- ОЧИСТКА ЧАТА -----
function clearAllMessages() {
    messages = [];
    saveMessages(messages);
    addSystemMessage(`🗑️ Чат был очищен пользователем ${currentUser}`);
    renderMessages();
}

// ----- ОТОБРАЖЕНИЕ СООБЩЕНИЙ -----
function renderMessages() {
    messagesArea.innerHTML = '';
    if (messages.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.style.textAlign = 'center';
        emptyDiv.style.color = '#7a85a8';
        emptyDiv.style.padding = '30px 0';
        emptyDiv.textContent = '✨ Чат пуст. Напишите что-нибудь!';
        messagesArea.appendChild(emptyDiv);
        return;
    }

    messages.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        
        if (msg.isSystem) {
            messageDiv.classList.add('system-message');
        } else if (currentUser && msg.username === currentUser) {
            messageDiv.classList.add('my-message');
        }
        
        const time = new Date(msg.timestamp);
        const timeStr = `${time.getHours().toString().padStart(2,'0')}:${time.getMinutes().toString().padStart(2,'0')}`;
        
        messageDiv.innerHTML = `
            <div class="sender">
                <span>${escapeHTML(msg.username)}</span>
                <span class="time">${timeStr}</span>
            </div>
            <div>${escapeHTML(msg.text)}</div>
        `;
        messagesArea.appendChild(messageDiv);
    });
}

// ----- Экранирование XSS -----
function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ----- Скролл вниз -----
function scrollToBottom() {
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

// ----- ОТПРАВКА СООБЩЕНИЯ -----
function sendMessage() {
    let text = messageInput.value.trim();
    if (!text || !currentUser) return;
    
    // Проверка на команду /clear
    if (text === '/clear') {
        showConfirmDialog();
        messageInput.value = '';
        return;
    }
    
    const newMessage = {
        username: currentUser,
        text: text,
        timestamp: Date.now()
    };
    
    messages.push(newMessage);
    saveMessages(messages);
    renderMessages();
    scrollToBottom();
    messageInput.value = '';
}

// ----- ДИАЛОГ ПОДТВЕРЖДЕНИЯ -----
function showConfirmDialog() {
    confirmDialog.classList.remove('hidden');
}

function hideConfirmDialog() {
    confirmDialog.classList.add('hidden');
}

// ========== ОБРАБОТЧИКИ ==========
// ----- ВХОД / РЕГИСТРАЦИЯ -----
loginBtn.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    if (!username) {
        authError.textContent = '❌ введите имя';
        return;
    }
    
    registerUser(username);
    showChat(username);
});

usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        loginBtn.click();
    }
});

// ----- ОТПРАВКА СООБЩЕНИЯ -----
sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
    }
});

// ----- ОЧИСТКА ЧАТА (кнопка) -----
clearChatBtn.addEventListener('click', () => {
    showConfirmDialog();
});

// ----- ПОДТВЕРЖДЕНИЕ ОЧИСТКИ -----
confirmClearBtn.addEventListener('click', () => {
    clearAllMessages();
    hideConfirmDialog();
});

// ----- ОТМЕНА ОЧИСТКИ -----
cancelClearBtn.addEventListener('click', () => {
    hideConfirmDialog();
});

// ----- ЗАКРЫТИЕ ДИАЛОГА ПО ESC -----
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !confirmDialog.classList.contains('hidden')) {
        hideConfirmDialog();
    }
});

// ----- КЛИК ВНЕ ДИАЛОГА -----
confirmDialog.addEventListener('click', (e) => {
    if (e.target === confirmDialog) {
        hideConfirmDialog();
    }
});

// ----- ВЫХОД -----
logoutBtn.addEventListener('click', () => {
    showAuth();
});

// ========== ИНИЦИАЛИЗАЦИЯ ==========
function init() {
    showAuth();
    messages = loadMessages();
}

// ----- СИНХРОНИЗАЦИЯ МЕЖДУ ВКЛАДКАМИ -----
window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
        messages = loadMessages();
        if (currentUser) {
            renderMessages();
            scrollToBottom();
        }
    }
});

init();