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