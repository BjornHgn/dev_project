// Check for spectate parameter in URL
const urlParams = new URLSearchParams(window.location.search);
const spectateSession = urlParams.get('spectate');

if (spectateSession) {
    // Automatically handle joining as spectator
    const playerName = localStorage.getItem('playerName');
    if (!playerName) {
        // If no name set, show a prompt to enter name before spectating
        const namePromptContainer = document.createElement('div');
        namePromptContainer.className = 'name-prompt-container';
        namePromptContainer.innerHTML = `
            <div class="name-prompt">
                <h3>Enter Your Name to Spectate</h3>
                <p>You're about to spectate session: <strong>${spectateSession}</strong></p>
                <input type="text" id="spectate-name" placeholder="Your display name">
                <div class="prompt-buttons">
                    <button id="confirm-spectate" class="btn btn-primary">Spectate</button>
                    <button id="cancel-spectate" class="btn">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(namePromptContainer);
        
        // Add event listeners
        document.getElementById('confirm-spectate').addEventListener('click', async () => {
            const spectateName = document.getElementById('spectate-name').value.trim();
            if (spectateName) {
                localStorage.setItem('playerName', spectateName);
                // IMPORTANT: Set spectator flag before calling API
                localStorage.setItem('isSpectator', 'true');
                const success = await spectateGameSession(spectateSession, spectateName);
                if (success) {
                    window.location.href = 'quiz.html';
                } else {
                    alert('Failed to join session as spectator. The session may no longer exist.');
                    namePromptContainer.remove();
                }
            } else {
                alert('Please enter a name');
            }
        });
        
        document.getElementById('cancel-spectate').addEventListener('click', () => {
            namePromptContainer.remove();
            // Remove the spectate parameter from URL
            window.history.replaceState({}, document.title, window.location.pathname);
        });
    } else {
        // If name is set, directly attempt to spectate
        (async () => {
            // IMPORTANT: Set spectator flag before calling API
            localStorage.setItem('isSpectator', 'true');
            const success = await spectateGameSession(spectateSession, playerName);
            if (success) {
                window.location.href = 'quiz.html';
            } else {
                alert('Failed to join session as spectator. The session may no longer exist.');
                // Remove the spectate parameter from URL
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        })();
    }
}

async function createGameSession(playerName) {
    try {
        const response = await fetch('http://10.33.75.205:5000/api/sessions/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: playerName })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Store the session ID in localStorage
            localStorage.setItem('sessionId', data.session.sessionId);
            // IMPORTANT: Make sure to clear spectator flag
            localStorage.removeItem('isSpectator');
            console.log('Created session:', data.session.sessionId);
            return data.session.sessionId;
        } else {
            console.error('Failed to create session:', data.error);
            return null;
        }
    } catch (error) {
        console.error('Error creating session:', error);
        return null;
    }
}

// Function to join a session as a spectator
async function spectateGameSession(sessionId, spectatorName) {
    try {
        const response = await fetch('http://10.33.75.205:5000/api/sessions/spectate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sessionId, userId: spectatorName })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Store the session ID in localStorage
            localStorage.setItem('sessionId', sessionId);
            localStorage.setItem('playerName', spectatorName);
            // IMPORTANT: Set spectator flag
            localStorage.setItem('isSpectator', 'true');
            console.log('Joined session as spectator:', sessionId);
            return true;
        } else {
            console.error('Failed to join session as spectator:', data.error);
            return false;
        }
    } catch (error) {
        console.error('Error joining session as spectator:', error);
        return false;
    }
}

// Update your join game button event listener to include a spectate option
document.getElementById('join-game-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const playerName = localStorage.getItem('playerName');
    if (!playerName) {
        alert('Please enter your name first');
        return;
    }
    
    const sessionCode = document.getElementById('session-code').value;
    if (!sessionCode) {
        alert('Please enter a session code');
        return;
    }
    
    // Check if spectator mode is selected
    const asSpectator = document.getElementById('join-as-spectator').checked;
    
    // IMPORTANT: Set or clear the spectator flag explicitly
    if (asSpectator) {
        localStorage.setItem('isSpectator', 'true');
        const joined = await spectateGameSession(sessionCode, playerName);
        if (joined) {
            window.location.href = 'quiz.html';
        } else {
            alert('Failed to spectate game. Check your session code and try again.');
        }
    } else {
        // Clear any previous spectator flag
        localStorage.removeItem('isSpectator');
        const joined = await joinGameSession(sessionCode, playerName);
        if (joined) {
            window.location.href = 'quiz.html';
        } else {
            alert('Failed to join game. Check your session code and try again.');
        }
    }
});

// Add this function to join an existing session
async function joinGameSession(sessionId, playerName) {
    try {
        const response = await fetch('http://10.33.75.205:5000/api/sessions/join', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sessionId, userId: playerName })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Store the session ID in localStorage
            localStorage.setItem('sessionId', sessionId);
            // IMPORTANT: Clear spectator flag to ensure we're not in spectator mode
            localStorage.removeItem('isSpectator');
            console.log('Joined session:', sessionId);
            return true;
        } else {
            console.error('Failed to join session:', data.error);
            return false;
        }
    } catch (error) {
        console.error('Error joining session:', error);
        return false;
    }
}

// Replace all existing event listeners with this single one
document.addEventListener("DOMContentLoaded", () => {
    console.log('DOM loaded - initializing form');
    // Check if user is logged in
    const playerName = localStorage.getItem('playerName');
    const token = localStorage.getItem('token');
    // Also add functionality for the modal close button
    const addFriendModal = document.getElementById('add-friend-modal');
    const closeModal = document.getElementById('close-modal');
    const cancelAddFriend = document.getElementById('cancel-add-friend');
    const addFriendBtn = document.getElementById('add-friend-btn');
    const friendsToggle = document.getElementById('friends-toggle');
    const friendsContainer = document.getElementById('friends-container');
    const closeFriends = document.getElementById('close-friends');
    const addFriendForm = document.getElementById('add-friend-form');

    // Add this code after initializing the addFriendForm constant
    if (addFriendForm) {
        addFriendForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const token = localStorage.getItem('token');
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
                // Remove the test alert that always shows success
                // alert(`Friend request to "${friendUsername}" sent successfully!`);
                
                const response = await fetch('http://10.33.75.205:5000/api/friends/invite', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ username: friendUsername })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    alert('Friend request sent successfully!');
                    // Close the modal
                    addFriendModal.style.display = 'none';
                    // Clear the input
                    document.getElementById('friend-username').value = '';
                } else {
                    alert(`Error sending invite: ${data.error || 'Unknown error'}`);
                }
                
            } catch (error) {
                console.error('Error sending friend invite:', error);
                alert('Error sending invite. Please try again later.');
            }
        });
    }

    if (friendsToggle && friendsContainer) {
        // Click event for opening friends panel
        friendsToggle.addEventListener('click', () => {
            friendsContainer.classList.add('open');
        });
        
        // Click event for closing friends panel
        if (closeFriends) {
            closeFriends.addEventListener('click', () => {
                friendsContainer.classList.remove('open');
            });
        }
        
        // Close friends panel when clicking outside of it
        document.addEventListener('click', (e) => {
            // Check if the friends container has the 'open' class (works on all screen sizes)
            if (friendsContainer.classList.contains('open') && 
                !friendsContainer.contains(e.target) && 
                e.target !== friendsToggle && 
                !friendsToggle.contains(e.target)) {
                friendsContainer.classList.remove('open');
            }
        });
    }
    
    if (addFriendBtn && addFriendModal) {
        addFriendBtn.addEventListener('click', () => {
            addFriendModal.style.display = 'flex';
        });
    }
    
    if (closeModal && addFriendModal) {
        closeModal.addEventListener('click', () => {
            addFriendModal.style.display = 'none';
        });
    }
    
    if (cancelAddFriend && addFriendModal) {
        cancelAddFriend.addEventListener('click', () => {
            addFriendModal.style.display = 'none';
        });
    }
    
    // Update UI based on login status

    if (token && playerName) {
        // User is logged in
        const loginButton = document.querySelector('a[href="login.html"]');
        const registerButton = document.querySelector('a[href="register.html"]');
        
        if (loginButton) {
            loginButton.innerHTML = `<i class="fas fa-user"></i> ${playerName}`;
            loginButton.href = "#";
        }

        if (registerButton) {
            registerButton.innerHTML = `<i class="fas fa-sign-out-alt"></i> Logout`;
            registerButton.href = "#";
            registerButton.addEventListener('click', (e) => {
                e.preventDefault();
                // Clear user data from localStorage
                localStorage.removeItem('token');
                localStorage.removeItem('playerName');
                localStorage.removeItem('userId');
                localStorage.removeItem('userRole');
                localStorage.removeItem('sessionId');
                
                // Reload the page
                window.location.reload();
            });
        }

        // AUTO-FILL PLAYER NAME: Add this code to pre-fill the player name input
        const playerNameInput = document.getElementById("player-name");
        if (playerNameInput) {
            playerNameInput.value = playerName;
        }

        // Add Submit Question link to navigation
        const navContainer = document.querySelector('header nav ul, .auth-links');
        if (navContainer) {
            // Check if the submit link already exists to prevent duplicates
            if (!navContainer.querySelector('a[href="submit-question.html"]')) {
                // Create either a list item or a direct link depending on container type
                if (navContainer.classList.contains('auth-links')) {
                    const submitLink = document.createElement('p');
                    submitLink.innerHTML = '<a href="submit-question.html"><i class="fas fa-plus-circle"></i> Submit Question</a>';
                    navContainer.insertBefore(submitLink, navContainer.lastElementChild);
                } else {
                    const submitQuestionLink = document.createElement('li');
                    submitQuestionLink.innerHTML = '<a href="submit-question.html">Submit Question</a>';
                    
                    // Insert before the admin link if it exists, otherwise append to the end
                    const adminLink = navContainer.querySelector('a[href="admin.html"]')?.parentNode;
                    if (adminLink) {
                        navContainer.insertBefore(submitQuestionLink, adminLink);
                    } else {
                        navContainer.appendChild(submitQuestionLink);
                    }
                }
            }
        }
        const joinGameBtn = document.getElementById('join-game-btn');
        if (joinGameBtn) {
            joinGameBtn.addEventListener('click', async () => {
                const playerName = localStorage.getItem('playerName');
                if (!playerName) {
                    alert('Please enter your name first');
                    return;
                }
                
                const sessionCode = document.getElementById('session-code').value;
                if (!sessionCode) {
                    alert('Please enter a session code');
                    return;
                }
                
                const joined = await joinGameSession(sessionCode, playerName);
                if (joined) {
                    window.location.href = 'quiz.html';
                } else {
                    alert('Failed to join game. Check your session code and try again.');
                }
            });
        }
    }
    
    const playerForm = document.getElementById("player-form");
    const questionCountSlider = document.getElementById("question-count");
    const questionCountValue = document.getElementById("question-count-value");
    
    // Update the question count display when slider is moved
    if (questionCountSlider && questionCountValue) {
        questionCountSlider.addEventListener("input", () => {
            questionCountValue.textContent = questionCountSlider.value;
        });
    }

    const userRole = localStorage.getItem('userRole');
    const navContainer = document.querySelector('header nav ul') || document.querySelector('nav ul');
    
    if (userRole === 'admin' && navContainer) {
        const adminLink = document.createElement('li');
        adminLink.innerHTML = '<a href="admin.html">Admin Dashboard</a>';
        navContainer.appendChild(adminLink);
    }
    
    if (!playerForm) {
        console.error('Player form not found');
        return;
    }

    playerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        
        const playerNameInput = document.getElementById("player-name");
        if (!playerNameInput) {
            console.error('Player name input not found');
            return;
        }

        const playerName = playerNameInput.value.trim();
        if (playerName) {
            console.log(`Creating session for player: ${playerName}`);
            localStorage.setItem("playerName", playerName);
            
            // Get and store quiz preferences
            const questionCount = document.getElementById("question-count").value;
            const difficulty = document.getElementById("difficulty").value;
            const category = document.getElementById("category").value;
            
            // Store quiz preferences in localStorage
            localStorage.setItem("questionCount", questionCount);
            localStorage.setItem("difficulty", difficulty);
            localStorage.setItem("category", category);
            
            console.log(`Quiz preferences: ${questionCount} questions, ${difficulty} difficulty, ${category} category`);
            
            try {
                // Create session with proper error handling
                const response = await fetch('http://10.33.75.205:5000/api/sessions/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        userId: playerName,
                        questionCount,
                        difficulty,
                        category
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`Server responded with ${response.status}`);
                }
                
                const data = await response.json();
                console.log('Session created:', data);
                
                // Store the session ID from the backend
                localStorage.setItem("sessionId", data.session.sessionId);
                
                // Redirect to quiz
                window.location.href = "quiz.html";
            } catch (error) {
                console.error('Session creation error:', error);
                alert("Failed to create game session. Please try again.");
            }
        } else {
            alert("Please enter your name before starting the quiz.");
        }
    });
});