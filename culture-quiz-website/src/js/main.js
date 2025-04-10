// Main JavaScript file for the K-Culture Quiz Website

// Function to initialize the application
function init() {
    // Check if the user is on the homepage
    if (window.location.pathname === '/index.html') {
        document.getElementById('start-button').addEventListener('click', startQuiz);
    }
}

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

document.addEventListener("DOMContentLoaded", () => {
    const playerForm = document.getElementById("player-form");

    playerForm.addEventListener("submit", async (event) => {
        event.preventDefault(); // Prevent the form from refreshing the page

        const playerName = document.getElementById("player-name").value.trim();
        if (playerName) {
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

// Function to navigate to the quiz page
function startQuiz() {
    window.location.href = 'quiz.html';
}

document.addEventListener("DOMContentLoaded", () => {
    const playerForm = document.getElementById("player-form");

    playerForm.addEventListener("submit", (event) => {
        event.preventDefault(); // Prevent the form from refreshing the page

        const playerName = document.getElementById("player-name").value.trim();
        if (playerName) {
            // Store the player's name in localStorage
            localStorage.setItem("playerName", playerName);

            // Redirect to the quiz page
            window.location.href = "quiz.html";
        } else {
            alert("Please enter your name before starting the quiz.");
        }
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const startButton = document.getElementById("start-quiz");
    startButton.addEventListener("click", () => {
        window.location.href = "quiz.html"; // Redirect to the quiz page
    });
});