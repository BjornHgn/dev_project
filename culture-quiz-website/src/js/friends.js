document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    const playerName = localStorage.getItem('playerName');
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
    
    // Create a notifications container if it doesn't exist
    if (!document.getElementById('game-notifications')) {
        const notificationsContainer = document.createElement('div');
        notificationsContainer.id = 'game-notifications';
        document.body.appendChild(notificationsContainer);
    }
    
    // Initialize socket.io connection if user is logged in
    if (token && userId) {
        console.log('Attempting to connect to socket server...');
        socket = io('http://10.33.75.205:5000', {
            transports: ['websocket', 'polling'],
            reconnection: true
        });
        
        // Identify the user to the server on connect
        socket.on('connect', () => {
            console.log('Socket connected successfully!');
            socket.emit('userConnected', userId);
            console.log('Connected to socket.io server, identified as:', userId);
        });
        
        // Listen for connection errors
        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });
        
        // Listen for game invitations
        socket.on('gameInvitation', (data) => {
            console.log('Received game invitation:', data);
            
            // Create notification
            showGameInvitationNotification(data);
        });
        
        // Listen for other relevant events
        socket.on('disconnect', () => {
            console.log('Socket disconnected from server');
        });
        
        socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
    }
    
    // Initialize friends UI
    initializeFriendsUI();
    
    // Load friends list on page load
    if (token) {
        loadFriendsList();
        // Set up auto-refresh
        setInterval(loadFriendsList, 30000);
        
        // Also load any pending game invitations
        loadGameInvitations();
    }
    
    function initializeFriendsUI() {
        // Open/close friends sidebar
        if (friendsToggle && friendsContainer) {
            friendsToggle.addEventListener('click', () => {
                friendsContainer.classList.add('open');
            });
        }
        
        if (closeFriends) {
            closeFriends.addEventListener('click', () => {
                friendsContainer.classList.remove('open');
            });
        }
        
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
            addFriendForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                if (!token) {
                    alert('You must be logged in to add friends.');
                    addFriendModal.style.display = 'none';
                    return;
                }
                
                const friendUsername = document.getElementById('friend-username').value.trim();
                if (!friendUsername) {
                    alert('Please enter a username');
                    return;
                }
                
                try {
                    const response = await fetch('http://10.33.75.205:5000/api/friends/invite', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ username: friendUsername })
                    });
                    
                    // Parse the JSON response
                    let data;
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        data = await response.json();
                    } else {
                        throw new Error('Server returned non-JSON response');
                    }
                    
                    if (response.ok) {
                        alert('Friend request sent successfully!');
                        addFriendModal.style.display = 'none';
                        document.getElementById('friend-username').value = '';
                        loadFriendsList(); // Reload the friends list
                    } else {
                        alert(`Error sending invite: ${data.error || 'Unknown error'}`);
                    }
                } catch (error) {
                    console.error('Error sending friend request:', error);
                    alert('Error sending invite. Please try again later.');
                }
            });
        }
        
        // Set up tabs functionality if available
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
    
    async function loadFriendsList() {
        if (!token) return;
        
        try {
            const response = await fetch('http://10.33.75.205:5000/api/friends', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch friends list');
            }
            
            const data = await response.json();
            console.log('Friends data:', data);
            
            if (friendsList) {
                // Clear existing content
                friendsList.innerHTML = '';
                
                // Display or hide the empty message
                if (data.friends.length === 0 && 
                    data.sentRequests.length === 0 && 
                    data.receivedRequests.length === 0) {
                    if (emptyFriends) {
                        emptyFriends.style.display = 'block';
                        friendsList.appendChild(emptyFriends);
                    }
                } else {
                    if (emptyFriends) {
                        emptyFriends.style.display = 'none';
                    }
                    
                    // Render friend requests first
                    if (data.receivedRequests.length > 0) {
                        const requestsHeader = document.createElement('div');
                        requestsHeader.className = 'friends-section-header';
                        requestsHeader.innerHTML = '<h4>Friend Requests</h4>';
                        friendsList.appendChild(requestsHeader);
                        
                        data.receivedRequests.forEach(request => {
                            const requestEl = createFriendRequestElement(request);
                            friendsList.appendChild(requestEl);
                        });
                    }
                    
                    // Render friends
                    if (data.friends.length > 0) {
                        const friendsHeader = document.createElement('div');
                        friendsHeader.className = 'friends-section-header';
                        friendsHeader.innerHTML = '<h4>Friends</h4>';
                        friendsList.appendChild(friendsHeader);
                        
                        data.friends.forEach(friend => {
                            const friendEl = createFriendElement(friend);
                            friendsList.appendChild(friendEl);
                        });
                    }
                    
                    // Render sent requests
                    if (data.sentRequests.length > 0) {
                        const sentHeader = document.createElement('div');
                        sentHeader.className = 'friends-section-header';
                        sentHeader.innerHTML = '<h4>Sent Requests</h4>';
                        friendsList.appendChild(sentHeader);
                        
                        data.sentRequests.forEach(request => {
                            const requestEl = createSentRequestElement(request);
                            friendsList.appendChild(requestEl);
                        });
                    }
                    
                    // Update request count badge if it exists
                    if (friendRequestsCount && data.receivedRequests.length > 0) {
                        friendRequestsCount.style.display = 'flex';
                        friendRequestsCount.textContent = data.receivedRequests.length;
                    } else if (friendRequestsCount) {
                        friendRequestsCount.style.display = 'none';
                    }
                    
                    // Update tab request count if it exists
                    if (tabRequestCount && data.receivedRequests.length > 0) {
                        tabRequestCount.style.display = 'inline';
                        tabRequestCount.textContent = `(${data.receivedRequests.length})`;
                    } else if (tabRequestCount) {
                        tabRequestCount.style.display = 'none';
                    }
                }
                
                // Set initial filter to active tab
                const activeTab = document.querySelector('.friends-tabs button.active');
                if (activeTab) {
                    filterFriendsList(activeTab.dataset.tab);
                }
            }
        } catch (error) {
            console.error('Error loading friends list:', error);
            
            // Show error message in friends list
            if (friendsList) {
                const errorMsg = document.createElement('div');
                errorMsg.className = 'friend-error';
                errorMsg.textContent = 'Failed to load friends. Please try again later.';
                friendsList.appendChild(errorMsg);
            }
        }
    }
    
    async function loadGameInvitations() {
        if (!token) return;
        
        try {
            const response = await fetch('http://10.33.75.205:5000/api/game-invitations', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch game invitations');
            }
            
            const data = await response.json();
            console.log('Game invitations:', data);
            
            // Display pending game invitations
            if (data.invitations && data.invitations.length > 0) {
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
        }
    }
    
    function createFriendRequestElement(request) {
        const requestEl = document.createElement('div');
        requestEl.className = 'friend-item friend-request';
        requestEl.setAttribute('data-type', 'request');
        
        requestEl.innerHTML = `
            <div class="friend-info">
                <span class="friend-name">${request.username}</span>
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
    
    function createFriendElement(friend) {
        const friendEl = document.createElement('div');
        friendEl.className = 'friend-item';
        friendEl.setAttribute('data-type', 'friend');
        friendEl.setAttribute('data-status', friend.status || 'offline');
        
        friendEl.innerHTML = `
            <div class="friend-info">
                <span class="friend-name">${friend.username}</span>
                <span class="friend-status ${friend.status || 'offline'}">${friend.status || 'offline'}</span>
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
    
    function createSentRequestElement(request) {
        const requestEl = document.createElement('div');
        requestEl.className = 'friend-item friend-sent';
        requestEl.setAttribute('data-type', 'sent');
        
        requestEl.innerHTML = `
            <div class="friend-info">
                <span class="friend-name">${request.username}</span>
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
                if (item.getAttribute('data-type') === 'friend' && 
                    item.getAttribute('data-status') === 'online') {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
                // Only show the Friends header
                headers.forEach(header => {
                    if (header.querySelector('h4').textContent === 'Friends') {
                        header.style.display = 'block';
                    }
                });
            } else if (tabType === 'requests') {
                if (item.getAttribute('data-type') === 'request') {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
                // Only show the Requests header
                headers.forEach(header => {
                    if (header.querySelector('h4').textContent === 'Friend Requests') {
                        header.style.display = 'block';
                    }
                });
            }
        });
    }
    
    async function acceptRequest(requestId) {
        try {
            const response = await fetch(`http://10.33.75.205:5000/api/friends/accept/${requestId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to accept friend request');
            }
            
            // Reload friends list after accepting
            loadFriendsList();
            
        } catch (error) {
            console.error('Error accepting friend request:', error);
            alert('Failed to accept friend request. Please try again.');
        }
    }
    
    async function declineRequest(requestId) {
        try {
            const response = await fetch(`http://10.33.75.205:5000/api/friends/decline/${requestId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to decline friend request');
            }
            
            // Reload friends list after declining
            loadFriendsList();
            
        } catch (error) {
            console.error('Error declining friend request:', error);
            alert('Failed to decline friend request. Please try again.');
        }
    }
    
    async function removeFriend(friendshipId, username) {
        if (confirm(`Are you sure you want to remove ${username} from your friends?`)) {
            try {
                const response = await fetch(`http://10.33.75.205:5000/api/friends/remove/${friendshipId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to remove friend');
                }
                
                // Reload friends list after removing
                loadFriendsList();
                
            } catch (error) {
                console.error('Error removing friend:', error);
                alert('Failed to remove friend. Please try again.');
            }
        }
    }
    
    async function cancelFriendRequest(requestId, username) {
        if (confirm(`Cancel friend request to ${username}?`)) {
            try {
                const response = await fetch(`http://10.33.75.205:5000/api/friends/decline/${requestId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to cancel friend request');
                }
                
                // Reload friends list after canceling
                loadFriendsList();
                
            } catch (error) {
                console.error('Error canceling friend request:', error);
                alert('Failed to cancel friend request. Please try again.');
            }
        }
    }
    
    // Function to invite a friend to join a game session
    async function inviteFriendToGame(friendId, username) {
        try {
            console.log(`Attempting to invite ${username} (ID: ${friendId}) to a game`);
            
            const sessionId = localStorage.getItem('sessionId');
            
            if (!sessionId) {
                console.log('No existing session, creating a new one...');
                // Create a new game session if none exists
                try {
                    // Get player name from localStorage
                    const playerName = localStorage.getItem('playerName');
                    if (!playerName) {
                        alert('Please enter your name before inviting friends.');
                        return;
                    }
                    
                    console.log(`Creating session for player: ${playerName}`);
                    
                    // Create a basic session
                    const response = await fetch('http://10.33.75.205:5000/api/sessions/create', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ 
                            playerName: playerName,
                            difficulty: 'medium',
                            category: 'all',
                            questionCount: 10
                        })
                    });
                    
                    const responseText = await response.text();
                    console.log('Session creation response:', responseText);
                    
                    if (!response.ok) {
                        throw new Error(`Failed to create game session: ${responseText}`);
                    }
                    
                    let data;
                    try {
                        data = JSON.parse(responseText);
                    } catch (e) {
                        throw new Error(`Failed to parse response: ${responseText}`);
                    }
                    
                    console.log('Created session:', data);
                    
                    // Parse out the session ID from the response
                    let newSessionId;
                    if (data.sessionId) {
                        newSessionId = data.sessionId;
                    } else if (data.session && data.session.sessionId) {
                        newSessionId = data.session.sessionId;
                    } else {
                        throw new Error('No session ID returned from server');
                    }
                    
                    console.log(`Got new session ID: ${newSessionId}`);
                    
                    // Store the session ID
                    localStorage.setItem('sessionId', newSessionId);
                    
                    // Send the invitation with the new session ID
                    await sendGameInvitation(friendId, newSessionId, username);
                    
                } catch (error) {
                    console.error('Error creating game session:', error);
                    alert(`Failed to create a game session: ${error.message}`);
                }
            } else {
                console.log(`Using existing session: ${sessionId}`);
                // Use existing session
                await sendGameInvitation(friendId, sessionId, username);
            }
        } catch (error) {
            console.error('Error in inviteFriendToGame:', error);
            alert(`Failed to send game invitation: ${error.message}`);
        }
    }

    // Function to send game invitation
    async function sendGameInvitation(friendId, sessionId, username) {
        try {
            console.log(`Sending invitation to ${username} (${friendId}) for session ${sessionId}`);
            
            // Debug the data we're about to send
            const requestData = { friendId, sessionId };
            console.log('Request data:', requestData);
            
            // Use the REST API for reliable invitation storage
            const response = await fetch('http://10.33.75.205:5000/api/game-invitations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(requestData)
            });
            
            // Debug the raw response
            const responseText = await response.text();
            console.log('Raw response:', responseText);
            
            // Parse the response to JSON if possible
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('Failed to parse response:', e);
                throw new Error(`Server returned invalid JSON: ${responseText}`);
            }
            
            if (!response.ok) {
                throw new Error(data.error || `Server returned ${response.status}: ${responseText}`);
            }
            
            console.log('Invitation sent successfully:', data);
            
            // Also send via socket for real-time notification
            if (socket) {
                const socketData = {
                    friendId,
                    sessionId,
                    senderName: localStorage.getItem('playerName') || username
                };
                
                console.log('Emitting socket event with data:', socketData);
                socket.emit('sendGameInvitation', socketData);
            } else {
                console.warn('Socket not initialized, skipping real-time notification');
            }
            
            alert(`Game invitation sent to ${username}!`);
            
        } catch (error) {
            console.error('Error sending game invitation:', error);
            alert(`Failed to send game invitation: ${error.message}`);
        }
    }

    // Function to show game invitation notification
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
                <p>${data.message}</p>
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
        const closeBtn = notification.querySelector('.close-notification');
        closeBtn.addEventListener('click', () => {
            notification.classList.add('notification-hide');
            setTimeout(() => notification.remove(), 300);
        });
        
        const acceptBtn = notification.querySelector('.accept-invitation');
        acceptBtn.addEventListener('click', async () => {
            const sessionId = acceptBtn.dataset.session;
            const invitationId = acceptBtn.dataset.id;
            
            console.log(`User accepted invitation to session ${sessionId}`);
            
            // If there's an invitation ID, accept it formally
            if (invitationId) {
                try {
                    console.log(`Accepting invitation ${invitationId}`);
                    const response = await fetch(`http://10.33.75.205:5000/api/game-invitations/accept/${invitationId}`, {
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
        
        const declineBtn = notification.querySelector('.decline-invitation');
        declineBtn.addEventListener('click', async () => {
            const invitationId = declineBtn.dataset.id;
            
            console.log(`User declined invitation`);
            
            // If there's an invitation ID, decline it formally
            if (invitationId) {
                try {
                    console.log(`Declining invitation ${invitationId}`);
                    const response = await fetch(`http://10.33.75.205:5000/api/game-invitations/decline/${invitationId}`, {
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
            setTimeout(() => notification.remove(), 300);
        });
        
        // Add notification to container
        notificationContainer.appendChild(notification);
        
        // Make a sound to alert the user
        try {
            const audio = new Audio('/assets/notification.mp3');
            audio.play().catch(e => console.log('Could not play notification sound:', e));
        } catch (e) {
            console.log('Sound notification not supported');
        }
        
        // Auto-hide notification after 30 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.add('notification-hide');
                setTimeout(() => notification.remove(), 300);
            }
        }, 30000);
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