// Generate unique session ID
const sessionId = 'session_' + Math.random().toString(36).substr(2, 9);

// WebSocket connection
let ws = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

// DOM elements
const chatContainer = document.getElementById('chatContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const clearBtn = document.getElementById('clearBtn');
const statusIndicator = document.getElementById('status');

// Initialize WebSocket connection
function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/${sessionId}`;
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        console.log('Connected to server');
        updateStatus('connected');
        enableInput();
        reconnectAttempts = 0;
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleMessage(data);
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateStatus('disconnected');
    };
    
    ws.onclose = () => {
        console.log('Disconnected from server');
        updateStatus('disconnected');
        disableInput();
        
        // Attempt to reconnect
        if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            setTimeout(() => {
                console.log(`Reconnection attempt ${reconnectAttempts}...`);
                updateStatus('connecting');
                connect();
            }, 2000 * reconnectAttempts);
        }
    };
}

// Handle incoming messages
function handleMessage(data) {
    switch(data.type) {
        case 'system':
            clearInitialMessage();
            addSystemMessage(data.message);
            break;
        case 'typing':
            showTypingIndicator();
            break;
        case 'response':
            removeTypingIndicator();
            addAssistantMessage(data.message);
            break;
        case 'error':
            removeTypingIndicator();
            addSystemMessage(data.message, true);
            break;
    }
}

// Clear initial "Initializing" message
function clearInitialMessage() {
    const systemMessages = chatContainer.querySelectorAll('.system-wrapper');
    if (systemMessages.length === 1) {
        chatContainer.innerHTML = '';
    }
}

// Add message to chat
function addMessage(content, className, wrapperClass) {
    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${wrapperClass}`;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${className}`;
    messageDiv.innerHTML = `<p>${escapeHtml(content)}</p>`;
    
    wrapper.appendChild(messageDiv);
    chatContainer.appendChild(wrapper);
    scrollToBottom();
}

function addUserMessage(content) {
    addMessage(content, 'user-message', 'user-wrapper');
}

function addAssistantMessage(content) {
    addMessage(content, 'assistant-message', 'assistant-wrapper');
}

function addSystemMessage(content, isError = false) {
    const wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper system-wrapper';
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message system-message';
    if (isError) messageDiv.style.background = '#fed7d7';
    messageDiv.innerHTML = `<p>${escapeHtml(content)}</p>`;
    
    wrapper.appendChild(messageDiv);
    chatContainer.appendChild(wrapper);
    scrollToBottom();
}

// Typing indicator
function showTypingIndicator() {
    // Remove existing typing indicator if any
    removeTypingIndicator();
    
    const wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper assistant-wrapper';
    wrapper.id = 'typingIndicator';
    
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.innerHTML = '<span></span><span></span><span></span>';
    
    wrapper.appendChild(indicator);
    chatContainer.appendChild(wrapper);
    scrollToBottom();
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

// Send message
function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || !ws || ws.readyState !== WebSocket.OPEN) return;
    
    addUserMessage(message);
    
    ws.send(JSON.stringify({
        message: message
    }));
    
    messageInput.value = '';
    adjustTextareaHeight();
    messageInput.focus();
}

// Clear conversation
async function clearConversation() {
    if (!confirm('Are you sure you want to clear the conversation?')) return;
    
    try {
        await fetch(`/session/${sessionId}`, { method: 'DELETE' });
        chatContainer.innerHTML = '';
        addSystemMessage('Conversation cleared. Start a new chat!');
    } catch (error) {
        console.error('Error clearing conversation:', error);
        addSystemMessage('Failed to clear conversation', true);
    }
}

// Update status indicator
function updateStatus(status) {
    statusIndicator.className = `status ${status}`;
    const statusText = {
        'connected': 'Connected',
        'connecting': 'Connecting...',
        'disconnected': 'Disconnected'
    };
    statusIndicator.textContent = statusText[status] || status;
}

// Enable/disable input
function enableInput() {
    messageInput.disabled = false;
    sendBtn.disabled = false;
    messageInput.focus();
}

function disableInput() {
    messageInput.disabled = true;
    sendBtn.disabled = true;
}

// Auto-resize textarea
function adjustTextareaHeight() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
}

// Scroll to bottom
function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
}

// Event listeners
sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

messageInput.addEventListener('input', adjustTextareaHeight);

clearBtn.addEventListener('click', clearConversation);

// Initialize connection on page load
connect();