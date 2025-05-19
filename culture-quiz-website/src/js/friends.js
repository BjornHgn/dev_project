document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
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
    
    // Initialize friends UI
    initializeFriendsUI();
    
    // Load friends list on page load
    if (token) {
        loadFriendsList();
        // Set up auto-refresh
        setInterval(loadFriendsList, 30000);
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
        
        // Close friends panel when clicking outside of it
        document.addEventListener('click', (e) => {
            if (friendsContainer && friendsContainer.classList.contains('open') && 
                !friendsContainer.contains(e.target) && 
                e.target !== friendsToggle && 
                !friendsToggle.contains(e.target)) {
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
        if (!token || !friendsList) return;
        
        try {
            // Clear any existing error messages first
            const existingErrors = friendsList.querySelectorAll('.friend-error');
            existingErrors.forEach(error => error.remove());
            
            const response = await fetch('http://10.33.75.205:5000/api/friends', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch friends list (Status ${response.status})`);
            }
            
            const data = await response.json();
            console.log('Friends data:', data);
            
            // Clear the list
            friendsList.innerHTML = '';
            
            // Only show empty message if BOTH the request succeeded AND there are no friends/requests
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
                
                // Render friend requests
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
                
                // Update request counts
                if (friendRequestsCount) {
                    if (data.receivedRequests.length > 0) {
                        friendRequestsCount.style.display = 'flex';
                        friendRequestsCount.textContent = data.receivedRequests.length;
                    } else {
                        friendRequestsCount.style.display = 'none';
                    }
                }
                
                if (tabRequestCount) {
                    if (data.receivedRequests.length > 0) {
                        tabRequestCount.style.display = 'inline';
                        tabRequestCount.textContent = `(${data.receivedRequests.length})`;
                    } else {
                        tabRequestCount.style.display = 'none';
                    }
                }
            }
            
        } catch (error) {
            console.error('Error loading friends list:', error);
            
            // Only show error if the list is empty
            if (friendsList.children.length === 0 || 
                (friendsList.children.length === 1 && friendsList.children[0].id === 'empty-friends')) {
                
                // Remove empty friends message if it exists
                if (emptyFriends && emptyFriends.parentNode === friendsList) {
                    emptyFriends.style.display = 'none';
                }
                
                // Show error message
                const errorMsg = document.createElement('div');
                errorMsg.className = 'friend-error';
                errorMsg.textContent = 'Failed to load friends. Please try again later.';
                friendsList.appendChild(errorMsg);
            }
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
    function inviteFriendToGame(friendId, username) {
        const sessionId = localStorage.getItem('sessionId');
        
        if (!sessionId) {
            alert('You need to start a game first before inviting friends.');
            return;
        }
        
        // Here you would implement the game invitation functionality
        // For example, sending a notification to the friend
        const currentUrl = window.location.origin;
        const gameUrl = `${currentUrl}/index.html?session=${sessionId}`;
        
        alert(`Game invitation to ${username} would be sent with link: ${gameUrl}`);
        
        // Additional code would be needed to actually send the invitation
        // through your backend system
    }
});