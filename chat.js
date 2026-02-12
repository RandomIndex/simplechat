// ========== ФАЙЛОВОЕ ХРАНИЛИЩЕ (localStorage) ==========
const STORAGE_KEY = 'private_chat_rooms';
const USERS_KEY = 'private_chat_users';

// ----- ЗАГРУЗКА ВСЕХ КОМНАТ -----
function loadRooms() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {
        'public': []
    };
}

// ----- СОХРАНЕНИЕ КОМНАТ -----
function saveRooms(rooms) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
}

// ----- ЗАГРУЗКА СООБЩЕНИЙ ДЛЯ КОМНАТЫ -----
function loadRoomMessages(roomId) {
    const rooms = loadRooms();
    return rooms[roomId] || [];
}

// ----- СОХРАНЕНИЕ СООБЩЕНИЙ ДЛЯ КОМНАТЫ -----
function saveRoomMessages(roomId, messages) {
    const rooms = loadRooms();
    rooms[roomId] = messages;
    saveRooms(rooms);
}

// ----- ПОЛЬЗОВАТЕЛИ -----
function loadUsers() {
    const stored = localStorage.getItem(USERS_KEY);
    return stored ? JSON.parse(stored) : [];
}

function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function registerUser(username) {
    const users = loadUsers();
    if (!users.includes(username)) {
        users.push(username);
        saveUsers(users);
        
        // Создаем личную комнату
        const rooms = loadRooms();
        const personalRoomId = `personal:${username}`;
        if (!rooms[personalRoomId]) {
            rooms[personalRoomId] = [];
            saveRooms(rooms);
        }
    }
    return username;
}

// ========== СОСТОЯНИЕ ЧАТА ==========
let currentUser = null;
let currentRoom = 'personal'; // по умолчанию личные заметки
let currentRoomId = null;
let rooms = loadRooms();
let allUsers = loadUsers();

// ========== DOM ЭЛЕМЕНТЫ ==========
const authContainer = document.getElementById('auth-container');
const chatContainer = document.getElementById('chat-container');
const usernameInput = document.getElementById('username-input');
const loginBtn = document.getElementById('login-btn');
const authError = document.getElementById('auth-error');
const displayUsername = document.getElementById('display-username');
const roomBadge = document.getElementById('room-badge');
const currentRoomName = document.getElementById('current-room-name');
const roomStatus = document.getElementById('room-status');
const messagesArea = document.getElementById('messages-area');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const logoutBtn = document.getElementById('logout-btn');
const clearChatBtn = document.getElementById('clear-chat-btn');
const confirmDialog = document.getElementById('confirm-dialog');
const confirmClearBtn = document.getElementById('confirm-clear-btn');
const cancelClearBtn = document.getElementById('cancel-clear-btn');
const personalChatBtn = document.getElementById('personal-chat-btn');
const publicChatBtn = document.getElementById('public-chat-btn');
const contactSearch = document.getElementById('contact-search');
const searchBtn = document.getElementById('search-btn');
const searchResults = document.getElementById('search-results');
const privateChatsList = document.getElementById('private-chats-list');

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
    
    // По умолчанию - личные заметки
    joinPersonalChat();
    
    renderPrivateChats();
    messageInput.focus();
}

// ----- ПРИСОЕДИНЕНИЕ К ЧАТАМ -----
function joinPersonalChat() {
    currentRoom = 'personal';
    currentRoomId = `personal:${currentUser}`;
    currentRoomName.textContent = 'Личные заметки';
    roomStatus.textContent = 'только вы';
    roomBadge.textContent = 'личная комната';
    
    // Активируем кнопку
    document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
    personalChatBtn.classList.add('active');
    
    renderMessages();
    scrollToBottom();
}

function joinPublicChat() {
    currentRoom = 'public';
    currentRoomId = 'public';
    currentRoomName.textContent = 'Общий чат';
    roomStatus.textContent = 'все участники';
    roomBadge.textContent = 'общий чат';
    
    document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
    publicChatBtn.classList.add('active');
    
    renderMessages();
    scrollToBottom();
}

function joinPrivateChat(otherUser) {
    const roomId = getPrivateRoomId(currentUser, otherUser);
    currentRoom = 'private';
    currentRoomId = roomId;
    currentRoomName.textContent = `Приватный чат с ${otherUser}`;
    roomStatus.textContent = `только вы и ${otherUser}`;
    roomBadge.textContent = 'приватный чат';
    
    // Убираем активный класс со всех чатов
    document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.private-chat-item').forEach(el => el.classList.remove('active'));
    
    // Активируем нужный приватный чат
    const activePrivateChat = document.querySelector(`.private-chat-item[data-user="${otherUser}"]`);
    if (activePrivateChat) {
        activePrivateChat.classList.add('active');
    }
    
    renderMessages();
    scrollToBottom();
}

// ----- ПОЛУЧЕНИЕ ID ПРИВАТНОЙ КОМНАТЫ -----
function getPrivateRoomId(user1, user2) {
    const sorted = [user1, user2].sort();
    return `private:${sorted[0]}:${sorted[1]}`;
}

// ----- ОТПРАВКА СООБЩЕНИЯ -----
function sendMessage() {
    let text = messageInput.value.trim();
    if (!text || !currentUser || !currentRoomId) return;
    
    if (text === '/clear') {
        showConfirmDialog();
        messageInput.value = '';
        return;
    }
    
    const message = {
        username: currentUser,
        text: text,
        timestamp: Date.now()
    };
    
    // Добавляем флаг в зависимости от типа комнаты
    if (currentRoom === 'personal') {
        message.isPersonal = true;
    } else if (currentRoom === 'public') {
        message.isPublic = true;
    } else if (currentRoom === 'private') {
        message.isPrivate = true;
    }
    
    let roomMessages = loadRoomMessages(currentRoomId);
    roomMessages.push(message);
    saveRoomMessages(currentRoomId, roomMessages);
    
    renderMessages();
    scrollToBottom();
    messageInput.value = '';
}

// ----- ПОИСК КОНТАКТОВ -----
function searchContacts(query) {
    if (!query.trim()) {
        searchResults.classList.add('hidden');
        return [];
    }
    
    const users = loadUsers();
    const searchTerm = query.toLowerCase().trim();
    
    // Ищем пользователей, кроме текущего
    const results = users.filter(user => 
        user !== currentUser && 
        user.toLowerCase().includes(searchTerm)
    );
    
    return results;
}

function renderSearchResults(results) {
    searchResults.innerHTML = '';
    
    if (results.length === 0) {
        searchResults.innerHTML = '<div class="search-result-item" style="color: #9aabcf;">❌ Пользователи не найдены</div>';
        searchResults.classList.remove('hidden');
        return;
    }
    
    results.forEach(user => {
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        resultItem.innerHTML = `
            <div class="result-avatar">${user.charAt(0).toUpperCase()}</div>
            <div class="result-info">
                <div class="result-name">${user}</div>
                <div class="result-action">Начать приватный чат</div>
            </div>
        `;
        
        resultItem.addEventListener('click', () => {
            // Создаем приватный чат
            const roomId = getPrivateRoomId(currentUser, user);
            const rooms = loadRooms();
            if (!rooms[roomId]) {
                rooms[roomId] = [];
                saveRooms(rooms);
            }
            
            // Добавляем в список приватных чатов
            renderPrivateChats();
            
            // Переходим в чат
            joinPrivateChat(user);
            
            // Очищаем поиск
            contactSearch.value = '';
            searchResults.classList.add('hidden');
        });
        
        searchResults.appendChild(resultItem);
    });
    
    searchResults.classList.remove('hidden');
}

// ----- ОТОБРАЖЕНИЕ ПРИВАТНЫХ ЧАТОВ -----
function renderPrivateChats() {
    const rooms = loadRooms();
    const privateRooms = [];
    
    // Собираем все приватные комнаты текущего пользователя
    Object.keys(rooms).forEach(roomId => {
        if (roomId.startsWith('private:')) {
            const users = roomId.replace('private:', '').split(':');
            if (users.includes(currentUser)) {
                const otherUser = users.find(u => u !== currentUser);
                if (otherUser) {
                    privateRooms.push({
                        user: otherUser,
                        roomId: roomId,
                        lastMessage: rooms[roomId][rooms[roomId].length - 1]
                    });
                }
            }
        }
    });
    
    // Сортируем по последнему сообщению
    privateRooms.sort((a, b) => {
        const timeA = a.lastMessage?.timestamp || 0;
        const timeB = b.lastMessage?.timestamp || 0;
        return timeB - timeA;
    });
    
    privateChatsList.innerHTML = '';
    
    if (privateRooms.length === 0) {
        privateChatsList.innerHTML = '<div style="color: #6b7ab3; text-align: center; padding: 20px;">🔍 Нет приватных чатов<br><span style="font-size: 0.85rem;">Найдите пользователя через поиск</span></div>';
        return;
    }
    
    privateRooms.forEach(room => {
        const chatItem = document.createElement('div');
        chatItem.className = `private-chat-item ${currentRoomId === room.roomId ? 'active' : ''}`;
        chatItem.setAttribute('data-user', room.user);
        
        const lastMessageText = room.lastMessage 
            ? (room.lastMessage.text.length > 20 
                ? room.lastMessage.text.substring(0, 20) + '...' 
                : room.lastMessage.text)
            : 'Нет сообщений';
        
        chatItem.innerHTML = `
            <div class="chat-avatar" style="background: #6a4e8a;">${room.user.charAt(0).toUpperCase()}</div>
            <div class="chat-info">
                <div class="chat-name">${room.user}</div>
                <div class="chat-preview">${lastMessageText}</div>
            </div>
        `;
        
        chatItem.addEventListener('click', () => {
            joinPrivateChat(room.user);
        });
        
        privateChatsList.appendChild(chatItem);
    });
}

// ----- ОТОБРАЖЕНИЕ СООБЩЕНИЙ -----
let messages = [];
function renderMessages() {
    if (!currentRoomId) return;
    
    messages = loadRoomMessages(currentRoomId);
    messagesArea.innerHTML = '';
    
    if (messages.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.style.textAlign = 'center';
        emptyDiv.style.color = '#7a85a8';
        emptyDiv.style.padding = '40px 0';
        
        if (currentRoom === 'personal') {
            emptyDiv.innerHTML = '📒 Ваши личные заметки.<br>Только вы видите эти сообщения.';
        } else if (currentRoom === 'public') {
            emptyDiv.innerHTML = '🌐 Общий чат.<br>Сообщения видят все участники.';
        } else if (currentRoom === 'private') {
            const otherUser = currentRoomName.textContent.split('с ')[1] || 'пользователем';
            emptyDiv.innerHTML = `🔒 Приватный чат с ${otherUser}.<br>Сообщения видите только вы и ${otherUser}.`;
        }
        
        messagesArea.appendChild(emptyDiv);
        return;
    }
    
    messages.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        
        if (msg.isSystem) {
            messageDiv.classList.add('system-message');
        } else {
            if (msg.username === currentUser) {
                messageDiv.classList.add('my-message');
            }
            if (msg.isPrivate) {
                messageDiv.classList.add('private-message');
            }
        }
        
        const time = new Date(msg.timestamp);
        const timeStr = `${time.getHours().toString().padStart(2,'0')}:${time.getMinutes().toString().padStart(2,'0')}`;
        
        let senderHtml = `<span>${escapeHTML(msg.username)}</span>`;
        
        if (msg.isPrivate) {
            senderHtml += `<span class="private-label">приват</span>`;
        } else if (msg.isPersonal) {
            senderHtml += `<span class="private-label" style="background: #4a6fa5;">заметка</span>`;
        } else if (msg.isPublic) {
            senderHtml += `<span class="private-label" style="background: #5a4b7a;">общее</span>`;
        }
        
        messageDiv.innerHTML = `
            <div class="sender">
                ${senderHtml}
                <span class="time">${timeStr}</span>
            </div>
            <div>${escapeHTML(msg.text)}</div>
        `;
        
        messagesArea.appendChild(messageDiv);
    });
}

function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function scrollToBottom() {
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

// ----- ОЧИСТКА ЧАТА -----
function clearCurrentRoom() {
    if (!currentRoomId) return;
    
    saveRoomMessages(currentRoomId, []);
    
    // Добавляем системное сообщение
    const systemMessage = {
        username: '⚙️ система',
        text: `🗑️ Чат очищен`,
        timestamp: Date.now(),
        isSystem: true
    };
    
    let roomMessages = loadRoomMessages(currentRoomId);
    roomMessages.push(systemMessage);
    saveRoomMessages(currentRoomId, roomMessages);
    
    renderMessages();
}

// ----- ДИАЛОГ ПОДТВЕРЖДЕНИЯ -----
function showConfirmDialog() {
    confirmDialog.classList.remove('hidden');
}

function hideConfirmDialog() {
    confirmDialog.classList.add('hidden');
}

// ========== ОБРАБОТЧИКИ ==========
loginBtn.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    if (!username) {
        authError.textContent = '❌ введите имя';
        return;
    }
    
    registerUser(username);
    allUsers = loadUsers();
    showChat(username);
});

usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        loginBtn.click();
    }
});

personalChatBtn.addEventListener('click', joinPersonalChat);
publicChatBtn.addEventListener('click', joinPublicChat);

sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
    }
});

// Поиск контактов
searchBtn.addEventListener('click', () => {
    const query = contactSearch.value;
    const results = searchContacts(query);
    renderSearchResults(results);
});

contactSearch.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const query = contactSearch.value;
        const results = searchContacts(query);
        renderSearchResults(results);
    }
});

// Очистка результатов поиска при клике вне
document.addEventListener('click', (e) => {
    if (!searchResults.contains(e.target) && 
        e.target !== contactSearch && 
        e.target !== searchBtn) {
        searchResults.classList.add('hidden');
    }
});

clearChatBtn.addEventListener('click', showConfirmDialog);

confirmClearBtn.addEventListener('click', () => {
    clearCurrentRoom();
    hideConfirmDialog();
});

cancelClearBtn.addEventListener('click', hideConfirmDialog);

logoutBtn.addEventListener('click', showAuth);

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        hideConfirmDialog();
        searchResults.classList.add('hidden');
    }
});

confirmDialog.addEventListener('click', (e) => {
    if (e.target === confirmDialog) {
        hideConfirmDialog();
    }
});

// Синхронизация между вкладками
window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY || e.key === USERS_KEY) {
        if (currentUser) {
            renderMessages();
            renderPrivateChats();
        }
    }
});

// ========== ИНИЦИАЛИЗАЦИЯ ==========
function init() {
    showAuth();
    
    const rooms = loadRooms();
    if (!rooms['public']) {
        rooms['public'] = [];
        saveRooms(rooms);
    }
}

init();