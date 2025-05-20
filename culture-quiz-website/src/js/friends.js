document.addEventListener('DOMContentLoaded', () => {
    // Constants and configuration
    const API_BASE_URL = getBaseUrl();
    const SOCKET_URL = getBaseUrl();
    
    // User data
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    const playerName = localStorage.getItem('playerName');
    
    // DOM elements
    const friendsList = document.getElementById('friends-list');
    const emptyFriends = document.getElementById('empty-friends');
    const addFriendBtn = document.getElementById('add-friend-btn');
    const addFriendModal = document.getElementById('add-friend-modal');
    const addFriendForm = document.getElementById('add-friend-form');
    const closeModal = document.getElementById('close-modal');
    const cancelAddFriend = document.getElementById('cancel-add-friend');
    const friendsContainer = document.getElementById('friends-container');
    const closeFriends = document.getElementById('close-friends');
    const friendsToggle = document.getElementById('friends-toggle');
    const friendRequestsCount = document.getElementById('friend-requests-count');
    const tabRequestCount = document.getElementById('tab-request-count');
    
    let socket = null;
    let refreshInterval = null;
    
    // Initialize notification container
    initializeNotificationContainer();
    
    // Initialize socket connection
    if (token && userId) {
        initializeSocketConnection();
    }
    
    // Initialize UI and event listeners
    initializeFriendsUI();
    
    // Load data if user is logged in
    if (token) {
        loadFriendsList();
        
        // Auto-refresh friends list only when container is visible
        refreshInterval = setInterval(() => {
            if (friendsContainer?.classList.contains('open')) {
                loadFriendsList();
            }
        }, 30000);
        
        loadGameInvitations();
        
        // Clean up interval on page unload
        window.addEventListener('beforeunload', () => {
            if (refreshInterval) clearInterval(refreshInterval);
        });
    }
    
    /**
     * Get base URL based on environment
     * @returns {string} Base URL for API requests and socket connection
     */
    function getBaseUrl() {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return `${protocol === 'https:' ? 'https' : 'http'}://localhost:5000`;
        } else if (hostname.includes('192.168.') || hostname.includes('10.') || hostname.includes('172.')) {
            // For local network IP addresses
            return `${protocol === 'https:' ? 'https' : 'http'}://${hostname}:5000`;
        } else {
            // For production or deployed version
            // Assuming the backend is on the same domain but different port
            // Or you could use a relative URL if they're on the same origin
            return `${protocol}//${hostname}${hostname.includes(':') ? '' : ':5000'}`;
        }
    }
    
    /**
     * Initialize notification container
     */
    function initializeNotificationContainer() {
        if (!document.getElementById('game-notifications')) {
            const notificationsContainer = document.createElement('div');
            notificationsContainer.id = 'game-notifications';
            document.body.appendChild(notificationsContainer);
        }
    }
    
    /**
     * Initialize socket.io connection
     */
    function initializeSocketConnection() {
        try {
            console.log('Attempting to connect to socket server...');
            socket = io(SOCKET_URL, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 20000
            });
            
            socket.on('connect', () => {
                console.log('Socket connected successfully!');
                socket.emit('userConnected', userId);
                showToast('Connected to game server');
            });
            
            socket.on('connect_error', (error) => {
                console.error('Socket connection error:', error);
                showToast('Connection error. Some features may be limited.', 'error');
            });
            
            socket.on('reconnect', (attemptNumber) => {
                console.log(`Reconnected to server after ${attemptNumber} attempts`);
                socket.emit('userConnected', userId);
                showToast('Reconnected to server');
            });
            
            socket.on('reconnect_attempt', (attemptNumber) => {
                console.log(`Reconnection attempt ${attemptNumber}`);
            });
            
            socket.on('reconnect_error', (error) => {
                console.error('Reconnection error:', error);
            });
            
            socket.on('reconnect_failed', () => {
                console.error('Failed to reconnect to server');
                showToast('Connection lost. Please refresh the page.', 'error');
            });
            
            socket.on('gameInvitation', (data) => {
                console.log('Received game invitation:', data);
                showGameInvitationNotification(data);
            });
            
            socket.on('disconnect', () => {
                console.log('Socket disconnected from server');
            });
            
            socket.on('error', (error) => {
                console.error('Socket error:', error);
            });
        } catch (error) {
            console.error('Failed to initialize socket connection:', error);
            showToast('Failed to connect to game server. Some features may be limited.', 'error');
        }
    }
    
    /**
     * Initialize friends UI elements and event listeners
     */
    function initializeFriendsUI() {
        // Open/close friends sidebar
        if (friendsToggle && friendsContainer) {
            friendsToggle.addEventListener('click', () => {
                friendsContainer.classList.add('open');
                // Load fresh data when opened
                loadFriendsList();
            });
        }
        
        if (closeFriends) {
            closeFriends.addEventListener('click', () => {
                friendsContainer.classList.remove('open');
            });
        }
        
        // Close friends panel when clicking outside
        document.addEventListener('click', (e) => {
            if (friendsContainer?.classList.contains('open') && 
                !friendsContainer.contains(e.target) && 
                e.target !== friendsToggle && 
                !friendsToggle?.contains(e.target)) {
                friendsContainer.classList.remove('open');
            }
        });
        
        // Add friend modal controls
        if (addFriendBtn && addFriendModal) {
            addFriendBtn.addEventListener('click', () => {
                addFriendModal.style.display = 'flex';
            });
        }
        
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                addFriendModal.style.display = 'none';
            });
        }
        
        if (cancelAddFriend) {
            cancelAddFriend.addEventListener('click', () => {
                addFriendModal.style.display = 'none';
            });
        }
        
        // Friend request form
        if (addFriendForm) {
            addFriendForm.addEventListener('submit', handleAddFriendSubmit);
        }
        
        // Set up tabs functionality
        setupTabsFunctionality();
    }
    
    /**
     * Handle add friend form submission
     * @param {Event} e Form submit event
     */
    async function handleAddFriendSubmit(e) {
        e.preventDefault();
        
        if (!token) {
            showToast('You must be logged in to add friends.', 'error');
            if (addFriendModal) {
                addFriendModal.style.display = 'none';
            }
            return;
        }
        
        const friendUsername = document.getElementById('friend-username')?.value.trim();
        if (!friendUsername) {
            showToast('Please enter a username', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/friends/invite`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ username: friendUsername })
            });
            
            // Try to parse JSON response if it's a JSON content type
            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                throw new Error('Server returned non-JSON response');
            }
            
            if (response.ok) {
                showToast('Friend request sent successfully!', 'success');
                if (addFriendModal) {
                    addFriendModal.style.display = 'none';
                }
                const usernameInput = document.getElementById('friend-username');
                if (usernameInput) {
                    usernameInput.value = '';
                }
                loadFriendsList();
            } else {
                showToast(`Error sending invite: ${data.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('Error sending friend request:', error);
            showToast('Error sending invite. Please try again later.', 'error');
        }
    }
    
    /**
     * Set up tabs functionality for friends list
     */
    function setupTabsFunctionality() {
        const tabButtons = document.querySelectorAll('.friends-tabs button');
        if (tabButtons.length > 0) {
            tabButtons.forEach(button => {
                button.addEventListener('click', () => {
                    // Remove active class from all tabs
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    // Add active class to clicked tab
                    button.classList.add('active');
                    
                    const tabType = button.dataset.tab;
                    filterFriendsList(tabType);
                });
            });
        }
    }
    
    /**
     * Load friends list from server
     */
    async function loadFriendsList() {
        if (!token || !friendsList) return;
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/friends`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch friends list: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Clear existing content
            friendsList.innerHTML = '';
            
            // Show empty state or render friends data
            if (isEmptyFriendsList(data)) {
                showEmptyFriendsState();
            } else {
                hideEmptyFriendsState();
                renderFriendsData(data);
                updateRequestCountBadges(data.receivedRequests);
                
                // Set initial filter to active tab
                const activeTab = document.querySelector('.friends-tabs button.active');
                if (activeTab) {
                    filterFriendsList(activeTab.dataset.tab);
                }
            }
        } catch (error) {
            console.error('Error loading friends list:', error);
            showErrorMessage();
        }
    }
    
    /**
     * Check if friends list is empty
     * @param {Object} data Friends data from API
     * @returns {boolean} True if all lists are empty
     */
    function isEmptyFriendsList(data) {
        return (
            (!data.friends || data.friends.length === 0) && 
            (!data.sentRequests || data.sentRequests.length === 0) && 
            (!data.receivedRequests || data.receivedRequests.length === 0)
        );
    }
    
    /**
     * Show empty friends state
     */
    function showEmptyFriendsState() {
        if (emptyFriends) {
            emptyFriends.style.display = 'block';
            friendsList.appendChild(emptyFriends);
        }
    }
    
    /**
     * Hide empty friends state
     */
    function hideEmptyFriendsState() {
        if (emptyFriends) {
            emptyFriends.style.display = 'none';
        }
    }
    
    /**
     * Show error message in friends list
     */
    function showErrorMessage() {
        if (friendsList) {
            const errorMsg = document.createElement('div');
            errorMsg.className = 'friend-error';
            errorMsg.textContent = 'Failed to load friends. Please try again later.';
            friendsList.appendChild(errorMsg);
        }
    }
    
    /**
     * Show toast notification
     * @param {string} message Message to display
     * @param {string} type Type of notification: 'success', 'error', 'info'
     */
    function showToast(message, type = 'info') {
        // Remove existing toast if present
        const existingToast = document.getElementById('toast-notification');
        if (existingToast) {
            existingToast.remove();
        }
        
        const toast = document.createElement('div');
        toast.id = 'toast-notification';
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
    
    /**
     * Render friends data in UI
     * @param {Object} data Friends data from API
     */
    function renderFriendsData(data) {
        // Create document fragment for better performance
        const fragment = document.createDocumentFragment();
        
        // Render friend requests
        if (data.receivedRequests?.length > 0) {
            const requestsHeader = createSectionHeader('Friend Requests');
            fragment.appendChild(requestsHeader);
            
            data.receivedRequests.forEach(request => {
                const requestEl = createFriendRequestElement(request);
                fragment.appendChild(requestEl);
            });
        }
        
        // Render friends
        if (data.friends?.length > 0) {
            const friendsHeader = createSectionHeader('Friends');
            fragment.appendChild(friendsHeader);
            
            data.friends.forEach(friend => {
                const friendEl = createFriendElement(friend);
                fragment.appendChild(friendEl);
            });
        }
        
        // Render sent requests
        if (data.sentRequests?.length > 0) {
            const sentHeader = createSectionHeader('Sent Requests');
            fragment.appendChild(sentHeader);
            
            data.sentRequests.forEach(request => {
                const requestEl = createSentRequestElement(request);
                fragment.appendChild(requestEl);
            });
        }
        
        // Append all elements at once for better performance
        friendsList.appendChild(fragment);
    }
    
    /**
     * Create a section header element
     * @param {string} title The header title
     * @returns {HTMLElement} The created header element
     */
    function createSectionHeader(title) {
        const header = document.createElement('div');
        header.className = 'friends-section-header';
        header.innerHTML = `<h4>${title}</h4>`;
        return header;
    }
    
    /**
     * Append a section header to the friends list
     * @param {HTMLElement} container The container to append to
     * @param {string} title The header title
     */
    function appendSectionHeader(container, title) {
        const header = createSectionHeader(title);
        container.appendChild(header);
    }
    
    /**
     * Update request count badges
     * @param {Array} receivedRequests Array of received friend requests
     */
    function updateRequestCountBadges(receivedRequests) {
        const requestCount = receivedRequests?.length || 0;
        
        // Update request count badge
        if (friendRequestsCount) {
            friendRequestsCount.style.display = requestCount > 0 ? 'flex' : 'none';
            if (requestCount > 0) {
                friendRequestsCount.textContent = requestCount;
            }
        }
        
        // Update tab request count
        if (tabRequestCount) {
            tabRequestCount.style.display = requestCount > 0 ? 'inline' : 'none';
            if (requestCount > 0) {
                tabRequestCount.textContent = `(${requestCount})`;
            }
        }
    }
    
    /**
     * Load pending game invitations
     */
    async function loadGameInvitations() {
        if (!token) return;
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/game-invitations`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch game invitations: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Display pending game invitations
            if (data.invitations?.length > 0) {
                data.invitations.forEach(invitation => {
                    showGameInvitationNotification({
                        sessionId: invitation.sessionId,
                        from: invitation.from,
                        invitationId: invitation.id,
                        message: `${invitation.from} invited you to join a game session!`
                    });
                });
            }
        } catch (error) {
            console.error('Error loading game invitations:', error);
            // Don't show a toast here as it's a background operation
        }
    }
    
    /**
     * Create a friend request element
     * @param {Object} request Friend request data
     * @returns {HTMLElement} Friend request element
     */
    function createFriendRequestElement(request) {
        const requestEl = document.createElement('div');
        requestEl.className = 'friend-item friend-request';
        requestEl.setAttribute('data-type', 'request');
        
        requestEl.innerHTML = `
            <div class="friend-info">
                <span class="friend-name">${escapeHtml(request.username)}</span>
                <span class="friend-status">wants to be your friend</span>
            </div>
            <div class="friend-request-actions">
                <button class="btn btn-small accept-btn" data-id="${request.requestId}">Accept</button>
                <button class="btn btn-small decline-btn" data-id="${request.requestId}">Decline</button>
            </div>
        `;
        
        // Add click handlers
        const acceptBtn = requestEl.querySelector('.accept-btn');
        if (acceptBtn) {
            acceptBtn.addEventListener('click', () => acceptRequest(request.requestId));
        }
        
        const declineBtn = requestEl.querySelector('.decline-btn');
        if (declineBtn) {
            declineBtn.addEventListener('click', () => declineRequest(request.requestId));
        }
        
        return requestEl;
    }
    
    /**
     * Create a friend element
     * @param {Object} friend Friend data
     * @returns {HTMLElement} Friend element
     */
    function createFriendElement(friend) {
        const friendEl = document.createElement('div');
        friendEl.className = 'friend-item';
        friendEl.setAttribute('data-type', 'friend');
        friendEl.setAttribute('data-status', friend.status || 'offline');
        
        const status = friend.status || 'offline';
        
        friendEl.innerHTML = `
            <div class="friend-info">
                <span class="friend-name">${escapeHtml(friend.username)}</span>
                <span class="friend-status ${status}">${status}</span>
            </div>
            <div class="friend-actions">
                <button class="friend-action-btn invite" title="Invite to Game" data-id="${friend.id}">
                    <i class="fas fa-gamepad"></i>
                </button>
                <button class="friend-action-btn remove" title="Remove Friend" data-id="${friend.friendshipId}">
                    <i class="fas fa-user-minus"></i>
                </button>
            </div>
        `;
        
        // Add click handler for remove button
        const removeBtn = friendEl.querySelector('.friend-action-btn.remove');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => removeFriend(friend.friendshipId, friend.username));
        }
        
        // Add click handler for invite button
        const inviteBtn = friendEl.querySelector('.friend-action-btn.invite');
        if (inviteBtn) {
            inviteBtn.addEventListener('click', () => inviteFriendToGame(friend.id, friend.username));
        }
        
        return friendEl;
    }
    
    /**
     * Create a sent request element
     * @param {Object} request Sent friend request data
     * @returns {HTMLElement} Sent request element
     */
    function createSentRequestElement(request) {
        const requestEl = document.createElement('div');
        requestEl.className = 'friend-item friend-sent';
        requestEl.setAttribute('data-type', 'sent');
        
        requestEl.innerHTML = `
            <div class="friend-info">
                <span class="friend-name">${escapeHtml(request.username)}</span>
                <span class="friend-status">request pending</span>
            </div>
            <div class="friend-actions">
                <button class="friend-action-btn cancel" title="Cancel Request" data-id="${request.requestId}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Add click handler for cancel button
        const cancelBtn = requestEl.querySelector('.friend-action-btn.cancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => cancelFriendRequest(request.requestId, request.username));
        }
        
        return requestEl;
    }
    
    /**
     * Filter the friends list based on tab type
     * @param {string} tabType The tab type to filter by
     */
    function filterFriendsList(tabType) {
        if (!friendsList) return;
        
        const allItems = friendsList.querySelectorAll('.friend-item');
        const headers = friendsList.querySelectorAll('.friends-section-header');
        
        // First hide all headers
        headers.forEach(header => header.style.display = 'none');
        
        // Then filter based on tab
        allItems.forEach(item => {
            if (tabType === 'all') {
                item.style.display = 'flex';
                // Show all headers
                headers.forEach(header => header.style.display = 'block');
            } else if (tabType === 'online') {
                const isOnlineFriend = item.getAttribute('data-type') === 'friend' && 
                                      item.getAttribute('data-status') === 'online';
                item.style.display = isOnlineFriend ? 'flex' : 'none';
                
                // Only show the Friends header
                headers.forEach(header => {
                    if (header.querySelector('h4')?.textContent === 'Friends') {
                        header.style.display = 'block';
                    }
                });
            } else if (tabType === 'requests') {
                const isRequest = item.getAttribute('data-type') === 'request';
                item.style.display = isRequest ? 'flex' : 'none';
                
                // Only show the Requests header
                headers.forEach(header => {
                    if (header.querySelector('h4')?.textContent === 'Friend Requests') {
                        header.style.display = 'block';
                    }
                });
            }
        });
    }
    
    /**
     * Accept a friend request
     * @param {string} requestId The request ID
     */
    async function acceptRequest(requestId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/friends/accept/${requestId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to accept friend request: ${response.status}`);
            }
            
            showToast('Friend request accepted!', 'success');
            // Reload friends list after accepting
            loadFriendsList();
            
        } catch (error) {
            console.error('Error accepting friend request:', error);
            showToast('Failed to accept friend request. Please try again.', 'error');
        }
    }
    
    /**
     * Decline a friend request
     * @param {string} requestId The request ID
     */
    async function declineRequest(requestId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/friends/decline/${requestId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to decline friend request: ${response.status}`);
            }
            
            showToast('Friend request declined', 'info');
            // Reload friends list after declining
            loadFriendsList();
            
        } catch (error) {
            console.error('Error declining friend request:', error);
            showToast('Failed to decline friend request. Please try again.', 'error');
        }
    }
    
    /**
     * Remove a friend
     * @param {string} friendshipId The friendship ID
     * @param {string} username The friend's username
     */
    async function removeFriend(friendshipId, username) {
        if (confirm(`Are you sure you want to remove ${username} from your friends?`)) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/friends/remove/${friendshipId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `Failed to remove friend: ${response.status}`);
                }
                
                showToast(`Removed ${username} from your friends list`, 'info');
                // Reload friends list after removing
                loadFriendsList();
                
            } catch (error) {
                console.error('Error removing friend:', error);
                showToast('Failed to remove friend. Please try again.', 'error');
            }
        }
    }
    
    /**
     * Cancel a sent friend request
     * @param {string} requestId The request ID
     * @param {string} username The username
     */
    async function cancelFriendRequest(requestId, username) {
        if (confirm(`Cancel friend request to ${username}?`)) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/friends/decline/${requestId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `Failed to cancel friend request: ${response.status}`);
                }
                
                showToast('Friend request cancelled', 'info');
                // Reload friends list after canceling
                loadFriendsList();
                
            } catch (error) {
                console.error('Error canceling friend request:', error);
                showToast('Failed to cancel friend request. Please try again.', 'error');
            }
        }
    }
    
    /**
     * Invite a friend to join a game session
     * @param {string} friendId The friend's ID
     * @param {string} username The friend's username
     */
    async function inviteFriendToGame(friendId, username) {
        try {
            console.log(`Attempting to invite ${username} (ID: ${friendId}) to a game`);
            
            const sessionId = localStorage.getItem('sessionId');
            
            // Create a new session if none exists, otherwise use existing one
            const gameSessionId = sessionId || await createGameSession();
            
            if (!gameSessionId) {
                throw new Error('Failed to get a valid session ID');
            }
            
            // Send invitation with the session ID
            await sendGameInvitation(friendId, gameSessionId, username);
            
        } catch (error) {
            console.error('Error in inviteFriendToGame:', error);
            showToast(`Failed to send game invitation: ${error.message}`, 'error');
        }
    }
    
    /**
     * Create a new game session
     * @returns {Promise<string>} The new session ID
     */
    async function createGameSession() {
        // Get player name from localStorage
        const playerName = localStorage.getItem('playerName');
        if (!playerName) {
            showToast('Please enter your name before inviting friends.', 'error');
            return null;
        }
        
        console.log(`Creating session for player: ${playerName}`);
        
        // Create a basic session
        const response = await fetch(`${API_BASE_URL}/api/sessions/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                playerName,
                difficulty: 'medium',
                category: 'all',
                questionCount: 10
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to create game session: ${errorText}`);
        }
        
        let data;
        try {
            data = await response.json();
        } catch (e) {
            throw new Error(`Failed to parse response: ${await response.text()}`);
        }
        
        console.log('Created session:', data);
        
        // Parse out the session ID from the response
        let newSessionId;
        if (data.sessionId) {
            newSessionId = data.sessionId;
        } else if (data.session?.sessionId) {
            newSessionId = data.session.sessionId;
        } else {
            throw new Error('No session ID returned from server');
        }
        
        // Store the session ID
        localStorage.setItem('sessionId', newSessionId);
        
        return newSessionId;
    }

    /**
     * Send a game invitation
     * @param {string} friendId The friend's ID
     * @param {string} sessionId The session ID
     * @param {string} username The friend's username
     */
    async function sendGameInvitation(friendId, sessionId, username) {
        try {
            console.log(`Sending invitation to ${username} (${friendId}) for session ${sessionId}`);
            
            // Debug the data we're about to send
            const requestData = { friendId, sessionId };
            
            // Use the REST API for reliable invitation storage
            const response = await fetch(`${API_BASE_URL}/api/game-invitations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage;
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error;
                } catch (e) {
                    errorMessage = `Server returned ${response.status}: ${errorText}`;
                }
                throw new Error(errorMessage);
            }
            
            // Also send via socket for real-time notification
            if (socket) {
                const socketData = {
                    friendId,
                    sessionId,
                    senderName: localStorage.getItem('playerName') || username
                };
                
                socket.emit('sendGameInvitation', socketData);
            }
            
            showToast(`Game invitation sent to ${username}!`, 'success');
            
        } catch (error) {
            console.error('Error sending game invitation:', error);
            throw error;
        }
    }

    /**
     * Show a game invitation notification
     * @param {Object} data The invitation data
     */
    function showGameInvitationNotification(data) {
        console.log('Showing game invitation notification:', data);
        
        // Check if notification container exists, if not create it
        let notificationContainer = document.getElementById('game-notifications');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'game-notifications';
            document.body.appendChild(notificationContainer);
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'game-invitation-notification';
        notification.innerHTML = `
            <div class="notification-header">
                <i class="fas fa-gamepad"></i>
                <span>Game Invitation</span>
                <button class="close-notification">&times;</button>
            </div>
            <div class="notification-body">
                <p>${escapeHtml(data.message)}</p>
                <div class="notification-actions">
                    <button class="accept-invitation" data-session="${data.sessionId}" ${data.invitationId ? `data-id="${data.invitationId}"` : ''}>
                        Join Game
                    </button>
                    <button class="decline-invitation" ${data.invitationId ? `data-id="${data.invitationId}"` : ''}>
                        Decline
                    </button>
                </div>
            </div>
        `;
        
        // Add event listeners
        setupNotificationEventListeners(notification, data);
        
        // Add notification to container
        notificationContainer.appendChild(notification);
        
        // Make a sound to alert the user
        playNotificationSound();
        
        // Auto-hide notification after 30 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.add('notification-hide');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 30000);
    }
    
    /**
     * Set up event listeners for notification
     * @param {HTMLElement} notification The notification element
     * @param {Object} data The invitation data
     */
    function setupNotificationEventListeners(notification, data) {
        const closeBtn = notification.querySelector('.close-notification');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                notification.classList.add('notification-hide');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            });
        }
        
        const acceptBtn = notification.querySelector('.accept-invitation');
        if (acceptBtn) {
            acceptBtn.addEventListener('click', async () => {
                const sessionId = acceptBtn.dataset.session;
                const invitationId = acceptBtn.dataset.id;
                
                console.log(`User accepted invitation to session ${sessionId}`);
                
                // If there's an invitation ID, accept it formally
                if (invitationId) {
                    try {
                        console.log(`Accepting invitation ${invitationId}`);
                        const response = await fetch(`${API_BASE_URL}/api/game-invitations/accept/${invitationId}`, {
                            method: 'PUT',
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });
                        
                        if (!response.ok) {
                            console.error('Failed to accept invitation:', await response.text());
                        }
                    } catch (error) {
                        console.error('Error accepting game invitation:', error);
                        // Continue anyway - we want to join the game even if the accept API call fails
                    }
                }
                
                // Join the session and redirect to the game
                localStorage.setItem('sessionId', sessionId);
                console.log(`Redirecting to quiz.html with session ${sessionId}`);
                window.location.href = 'quiz.html';
            });
        }
        
        const declineBtn = notification.querySelector('.decline-invitation');
        if (declineBtn) {
            declineBtn.addEventListener('click', async () => {
                const invitationId = declineBtn.dataset.id;
                
                console.log(`User declined invitation`);
                
                // If there's an invitation ID, decline it formally
                if (invitationId) {
                    try {
                        console.log(`Declining invitation ${invitationId}`);
                        const response = await fetch(`${API_BASE_URL}/api/game-invitations/decline/${invitationId}`, {
                            method: 'PUT',
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });
                        
                        if (!response.ok) {
                            console.error('Failed to decline invitation:', await response.text());
                        }
                    } catch (error) {
                        console.error('Error declining game invitation:', error);
                    }
                }
                
                // Remove the notification
                notification.classList.add('notification-hide');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            });
        }
    }
    
    /**
     * Play a notification sound
     */
    function playNotificationSound() {
        try {
            // Try to find the sound at multiple potential paths
            const soundPaths = [
                '/assets/notification.mp3',
                'assets/notification.mp3',
                '../assets/notification.mp3'
            ];
            
            // Try each path until one works
            for (const path of soundPaths) {
                const audio = new Audio(path);
                const playPromise = audio.play();
                
                if (playPromise) {
                    playPromise.catch(e => {
                        console.log(`Could not play notification sound at ${path}:`, e);
                        // Continue to next path if this one fails
                    });
                    break; // Exit loop after first attempt
                }
            }
        } catch (e) {
            console.log('Sound notification not supported');
        }
    }
    
    /**
     * Escape HTML to prevent XSS
     * @param {string} unsafe Unsafe string that might contain HTML
     * @returns {string} Escaped safe string
     */
    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    // Add a global function to test notifications
    window.testGameInvitation = function() {
        showGameInvitationNotification({
            sessionId: 'test-session-123',
            from: 'Test User',
            message: 'Test User invited you to join a game session!'
        });
    };
});