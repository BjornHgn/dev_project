// Main JavaScript file for the K-Culture Quiz Website

// Improve the createGameSession function
async function createGameSession(playerName) {
    try {
        console.log('Attempting to create game session for:', playerName);
        
        const response = await fetch('http://localhost:5000/api/sessions/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: playerName })
        });
        
        const data = await response.json();
        console.log('Server response:', data);
        
        if (response.ok) {
            // Store the session ID in localStorage
            localStorage.setItem('sessionId', data.session.sessionId);
            console.log('Created session with ID:', data.session.sessionId);
            return data.session.sessionId;
        } else {
            console.error('Failed to create session:', data.error);
            return null;
        }
    } catch (error) {
        console.error('Error creating session:', error);
        console.error('Network error details:', error.message);
        return null;
    }
}

// SINGLE event listener for DOMContentLoaded - REMOVE ALL OTHERS
document.addEventListener("DOMContentLoaded", () => {
    console.log('DOM fully loaded - initializing form handler');
    const playerForm = document.getElementById("player-form");
    
    if (!playerForm) {
        console.error('Player form not found in the document!');
        return;
    }

    playerForm.addEventListener("submit", async (event) => {
        event.preventDefault(); // Prevent the form from refreshing the page
        console.log('Form submitted');

        const playerNameInput = document.getElementById("player-name");
        if (!playerNameInput) {
            console.error('Player name input not found!');
            return;
        }

        const playerName = playerNameInput.value.trim();
        if (playerName) {
            console.log(`Player name: ${playerName} - creating session`);
            // Store the player's name in localStorage
            localStorage.setItem("playerName", playerName);
            
            // Create a new game session
            const sessionId = await createGameSession(playerName);
            if (sessionId) {
                // Redirect to the quiz page
                window.location.href = "quiz.html";
            } else {
                alert("Failed to create game session. Please try again.");
            }
        } else {
            alert("Please enter your name before starting the quiz.");
        }
    });
});