const quizContainer = document.getElementById('quiz');
const resultsContainer = document.getElementById('results');
const submitButton = document.getElementById('submit');
const timerDisplay = document.getElementById('timer');
let currentQuestionIndex = 0;
let score = 0;
let timer;
const timeLimit = 15; // seconds for each question

// Initialize socket.io connection
console.log('Connecting to socket.io server');
const socket = io('http://localhost:5000'); // Connect to the backend server

// Update the loadQuestions function with robust error handling and debugging
async function loadQuestions() {
    try {
        console.log('Attempting to load questions from API...');
        const response = await fetch('http://localhost:5000/api/game/questions');
        
        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API Response received:', data);
        
        if (!data.questions || data.questions.length === 0) {
            throw new Error('No questions returned from API');
        }
        
        console.log(`Successfully loaded ${data.questions.length} questions from API`);
        return data.questions;
    } catch (error) {
        console.error('Error loading questions from API:', error);
        console.log('Falling back to local JSON file...');
        
        try {
            const response = await fetch('data/questions.json');
            const data = await response.json();
            console.log(`Loaded ${data.questions.length} questions from local JSON file`);
            return data.questions;
        } catch (fallbackError) {
            console.error('Error loading questions from fallback:', fallbackError);
            alert('Failed to load questions. Please refresh the page and try again.');
            return []; // Return empty array if all fails
        }
    }
}

// Start the quiz
async function startQuiz() {
    const playerName = localStorage.getItem("playerName");
    console.log(`Starting quiz for player: ${playerName}`);
    
    // Check if player name exists
    if (!playerName) {
        alert("Please enter your name before starting the quiz.");
        window.location.href = "index.html";
        return;
    }
    
    updateScoreboard(playerName, 0); // Add the player to the scoreboard with an initial score of 0

    console.log('Loading questions...');
    const questions = await loadQuestions();
    
    if (!questions || questions.length === 0) {
        quizContainer.innerHTML = `
            <h2>No questions available</h2>
            <p>Please try again later or contact the administrator.</p>
        `;
        return;
    }
    
    console.log(`Loaded ${questions.length} questions, shuffling...`);
    const shuffledQuestions = shuffleArray(questions);
    window.quizQuestions = shuffledQuestions;
    
    console.log('Displaying first question');
    displayQuestion(window.quizQuestions[currentQuestionIndex]);
    startTimer();
}

// Display the current question with validation
function displayQuestion(question) {
    console.log('Displaying question:', question); // Debugging
    
    // Enhanced validation for question format
    if (!question) {
        console.error('Question is undefined or null');
        quizContainer.innerHTML = '<h2>Error: Failed to load question</h2>';
        return;
    }
    
    if (typeof question.question !== 'string') {
        console.error('Question text is missing or not a string:', question);
        quizContainer.innerHTML = '<h2>Error: Invalid question format</h2>';
        return;
    }
    
    if (!Array.isArray(question.options) || question.options.length === 0) {
        console.error('Question options are missing or empty:', question);
        quizContainer.innerHTML = '<h2>Error: Question options missing</h2>';
        return;
    }
    
    // Build the question HTML
    quizContainer.innerHTML = `
        <h2 id="question">${question.question}</h2>
        <ul>
            ${question.options.map((option, index) => `
                <li>
                    <input type="radio" name="answer" value="${option}" id="option${index}">
                    <label for="option${index}">${option}</label>
                </li>
            `).join('')}
        </ul>
    `;
}

// Check the selected answer
function checkAnswer(answer) {
    const currentQuestion = window.quizQuestions[currentQuestionIndex];
    const playerName = localStorage.getItem("playerName");
    const sessionId = localStorage.getItem("sessionId") || "default-session";

    if (answer === currentQuestion.answer) {
        score++;
        updateScoreboard(playerName, score); // Update the UI scoreboard
        
        console.log(`Correct answer! Score: ${score}`);
        
        // Update score in real-time via socket.io
        socket.emit('updateScore', { sessionId, playerName, playerScore: score });
        
        // Also update score in the database
        fetch('http://localhost:5000/api/game/update-score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionId,
                playerName,
                score
            })
        }).then(response => {
            if (!response.ok) {
                console.error('Failed to update score in DB, status:', response.status);
            }
            return response.json();
        }).then(data => {
            console.log('Score update response:', data);
        }).catch(error => console.error('Error updating score in DB:', error));
    } else {
        console.log(`Incorrect answer. Correct was: ${currentQuestion.answer}`);
    }
}

// Start the timer
function startTimer() {
    // Clear any existing timer
    clearInterval(timer);

    let timeLeft = timeLimit;
    timerDisplay.textContent = `Time left: ${timeLeft}s`;

    // Start a new timer
    timer = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = `Time left: ${timeLeft}s`;

        if (timeLeft <= 0) {
            clearInterval(timer);
            alert('Time is up!');
            currentQuestionIndex++;
            if (currentQuestionIndex < window.quizQuestions.length) {
                displayQuestion(window.quizQuestions[currentQuestionIndex]);
                startTimer(); // Restart the timer for the next question
            } else {
                showResults(); // Show results when the quiz ends
            }
        }
    }, 1000);
}

// Show results after the quiz
function showResults() {
    resultsContainer.innerHTML = `
        <h2>Your Score: ${score}</h2>
        <p>Thank you for participating!</p>
        <button onclick="location.reload()">Retake Quiz</button>
    `;
}

function updateScoreboard(playerName, playerScore) {
    const scoreboardList = document.getElementById('scoreboard-list');
    let playerEntry = document.getElementById(`player-${playerName}`);

    if (!playerEntry) {
        // Create a new entry for the player if it doesn't exist
        playerEntry = document.createElement('li');
        playerEntry.id = `player-${playerName}`;
        playerEntry.textContent = `${playerName}: ${playerScore}`;
        scoreboardList.appendChild(playerEntry);
    } else {
        // Update the player's score
        playerEntry.textContent = `${playerName}: ${playerScore}`;
    }
}

function shuffleArray(array) {
    const newArray = [...array]; // Create a copy to avoid modifying the original
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// Event listener for the hint button
document.getElementById('get-hint')?.addEventListener('click', async () => {
    try {
        const questionEl = document.getElementById('question');
        if (!questionEl) {
            console.error('Question element not found');
            return;
        }
        
        const question = questionEl.textContent;
        console.log('Getting hint for question:', question);
        
        const response = await fetch('http://localhost:5000/api/ai/generate-hint', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question }),
        });

        const data = await response.json();
        document.getElementById('hint-container').textContent = data.hint;
    } catch (error) {
        console.error('Error getting hint:', error);
        document.getElementById('hint-container').textContent = 'Failed to get hint. Try again.';
    }
});

// Handle answer submission
submitButton.addEventListener('click', () => {
    const selectedOption = document.querySelector('input[name="answer"]:checked');
    if (selectedOption) {
        const answer = selectedOption.value;
        checkAnswer(answer);
        currentQuestionIndex++;
        if (currentQuestionIndex < window.quizQuestions.length) {
            displayQuestion(window.quizQuestions[currentQuestionIndex]);
            startTimer();
        } else {
            clearInterval(timer);
            showResults();
        }
    } else {
        alert('Please select an answer!');
    }
});

// Set up socket events when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    const playerName = localStorage.getItem("playerName");
    const sessionId = localStorage.getItem("sessionId") || "default-session";
    
    console.log(`Player: ${playerName}, Session: ${sessionId}`);
    
    // Join the session with the stored session ID
    socket.emit('joinSession', { sessionId: sessionId, userId: playerName });
    
    // Listen for updates from server
    socket.on('playerJoined', (data) => {
        console.log(`Player joined: ${data.userId}`);
    });
    
    socket.on('scoreUpdated', (data) => {
        console.log('Score updated event received:', data);
        updateScoreboard(data.playerName, data.playerScore);
    });
    
    socket.on('gameEnded', (data) => {
        console.log('Game ended:', data);
    });
    
    // Start the quiz
    startQuiz();
});