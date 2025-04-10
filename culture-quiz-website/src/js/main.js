// Main JavaScript file for the K-Culture Quiz Website

// Improve the createGameSession function
async function createGameSession(playerName) {
    try {
        const response = await fetch('http://localhost:5000/api/sessions/create', {
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

// Replace all existing event listeners with this single one
document.addEventListener("DOMContentLoaded", () => {
    console.log('DOM loaded - initializing form');
    const playerForm = document.getElementById("player-form");
    const questionCountSlider = document.getElementById("question-count");
    const questionCountValue = document.getElementById("question-count-value");
    
    // Update the question count display when slider is moved
    if (questionCountSlider && questionCountValue) {
        questionCountSlider.addEventListener("input", () => {
            questionCountValue.textContent = questionCountSlider.value;
        });
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
                const response = await fetch('http://localhost:5000/api/sessions/create', {
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