const quizContainer = document.getElementById('quiz');
const resultsContainer = document.getElementById('results');
const submitButton = document.getElementById('submit');
const timerDisplay = document.getElementById('timer');
const timeSpan = document.getElementById('time');
const progressFill = document.getElementById('progress-fill');
const currentQuestionSpan = document.getElementById('current-question');
const totalQuestionsSpan = document.getElementById('total-questions');
const playerNameSpan = document.getElementById('player-name');
const hintContainer = document.getElementById('hint-container');
const hintContent = document.querySelector('.hint-content');
const getHintButton = document.getElementById('get-hint');
const restartQuizButton = document.getElementById('restart-quiz');
const shareResultsButton = document.getElementById('share-results');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalConfirm = document.getElementById('modal-confirm');
const modalCancel = document.getElementById('modal-cancel');
const closeModal = document.querySelector('.close');

let currentQuestionIndex = 0;
let score = 0;
let timer;
// Add these variable declarations at the top with your other variables
let hintsUsed = 0;
const maxHints = 3; // Maximum number of hints a player can use
const timeLimit = 15; // seconds for each question
const socket = io('http://localhost:5000'); // Connect to the backend server


// Add this after your other socket event listeners
socket.on('sessionUpdate', (data) => {
    console.log('Received session update:', data);
    if (data.scores && Array.isArray(data.scores)) {
        updateFullScoreboard(data.scores);
    }
});

// Listen for game start
socket.on('gameStarted', (data) => {
    console.log('Game started:', data);
    // Start the quiz
});

socket.on('scoreUpdated', (data) => {
    const { playerName, playerScore } = data;
    updateScoreboard(playerName, playerScore); // Update the scoreboard dynamically
});

// Notify the server when the game ends
function endGame() {
    const sessionId = localStorage.getItem("sessionId") || "fallback-session";
    console.log(`Ending game for session: ${sessionId}`);
    socket.emit('endGame', { sessionId: sessionId });
}

document.getElementById('get-hint').addEventListener('click', async () => {
    const question = document.getElementById('question').textContent;
    const response = await fetch('http://localhost:5000/api/ai/generate-hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
    });

    const data = await response.json();
    document.getElementById('hint-container').textContent = data.hint;
});

document.addEventListener('DOMContentLoaded', () => {
    // Check for session ID in URL parameters (for direct joining)
    const urlParams = new URLSearchParams(window.location.search);
    const sessionParam = urlParams.get('session');
    
    if (sessionParam) {
        // Store the session ID from URL parameter
        localStorage.setItem("sessionId", sessionParam);
        
        // Remove the session parameter from URL (cleaner appearance)
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        
        showToast('Joined shared session!');
    }
    
    const playerName = localStorage.getItem("playerName");
    // Get the session ID from localStorage - this is set when creating a session in main.js
    const sessionId = localStorage.getItem("sessionId") || generateFallbackSessionId();
    
    console.log(`Starting quiz for player: ${playerName} with session: ${sessionId}`);
    
    // Use the actual session ID from localStorage
    socket.emit('joinSession', { sessionId: sessionId, userId: playerName });
    
    // Start the quiz
    startQuiz();
});

// Add event listener for restart button
document.getElementById('restart-quiz').addEventListener('click', () => {
    console.log('Restart button clicked');
    restartQuiz();
});

// Add this new function to handle full scoreboard updates
function updateFullScoreboard(scores) {
    const scoreboardList = document.getElementById('scoreboard-list');
    if (!scoreboardList) return;
    
    // Clear the current scoreboard
    scoreboardList.innerHTML = '';
    
    // Sort scores by value (highest first)
    const sortedScores = [...scores].sort((a, b) => b.score - a.score);
    const currentPlayer = localStorage.getItem("playerName");
    
    // Add each player to the scoreboard
    sortedScores.forEach((scoreData, index) => {
        const playerEntry = document.createElement('li');
        playerEntry.id = `player-${scoreData.playerName}`;
        
        // Highlight current player
        if (scoreData.playerName === currentPlayer) {
            playerEntry.classList.add('current-player');
        }
        
        // Calculate rank (handle ties)
        let rank = index + 1;
        if (index > 0 && sortedScores[index-1].score === scoreData.score) {
            // Keep same rank as previous player for ties
            const prevEntry = scoreboardList.lastChild;
            if (prevEntry) {
                const prevRankElement = prevEntry.querySelector('.rank');
                if (prevRankElement) {
                    rank = parseInt(prevRankElement.textContent);
                }
            }
        }
        
        playerEntry.innerHTML = `
            <span class="rank">${rank}</span>
            <span class="player-name">${scoreData.playerName}${scoreData.playerName === currentPlayer ? ' (You)' : ''}</span>
            <span class="score">${scoreData.score}</span>
        `;
        
        scoreboardList.appendChild(playerEntry);
    });
}

// Add this after you initialize the quiz
function displaySessionInfo() {
    const sessionId = localStorage.getItem("sessionId");
    if (sessionId) {
        // Create a session info div if it doesn't exist
        let sessionInfo = document.getElementById('session-info');
        if (!sessionInfo) {
            sessionInfo = document.createElement('div');
            sessionInfo.id = 'session-info';
            sessionInfo.className = 'session-info';
            document.querySelector('.quiz-container').prepend(sessionInfo);
        }
        
        sessionInfo.innerHTML = `
            <p>Session Code: <strong>${sessionId}</strong></p>
            <p>Share this code with friends to play together!</p>
        `;
    }
}

// Function to restart the quiz
function restartQuiz() {
    // Reset quiz state
    currentQuestionIndex = 0;
    score = 0;
    hintsUsed = 0;
    
    // Hide results section
    resultsContainer.style.display = 'none';
    
    // Show quiz elements
    quizContainer.style.display = 'flex';
    document.querySelector('.timer-container').style.display = 'block';
    document.querySelector('.button-group').style.display = 'flex';
    
    // Hide quiz controls
    document.querySelector('.quiz-controls').style.display = 'none';
    
    // Optionally create a new session
    const playerName = localStorage.getItem("playerName");
    const sessionId = generateFallbackSessionId();
    localStorage.setItem("sessionId", sessionId);
    
    console.log(`Restarting quiz for player: ${playerName} with new session: ${sessionId}`);
    
    // Emit join session event
    socket.emit('joinSession', { sessionId: sessionId, userId: playerName });
    
    // Restart the quiz
    startQuiz();
}

// Load questions from database via API
async function loadQuestions() {
    const difficulty = localStorage.getItem("difficulty") || "medium";
    const category = localStorage.getItem("category") || "all";
    
    try {
        console.log(`Fetching questions with difficulty=${difficulty}, category=${category}`);
        const response = await fetch(`http://10.33.75.205:5000/api/game/questions?difficulty=${difficulty}&category=${category}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch questions from server');
        }
        
        const data = await response.json();
        console.log('Loaded questions from API:', data);
        return data.questions;
    } catch (error) {
        console.error('Error loading questions:', error);
        // Fallback to local JSON if API fails
        console.log('Falling back to local questions file');
        const fallbackResponse = await fetch('data/questions.json');
        const fallbackData = await fallbackResponse.json();
        return fallbackData.questions;
    }
}

// Modify the startQuiz function to use the question count
async function startQuiz() {
    const playerName = localStorage.getItem("playerName");
    const questionCount = parseInt(localStorage.getItem("questionCount") || "10");
    
    updateScoreboard(playerName, 0);
    
    const questions = await loadQuestions();
    const shuffledQuestions = shuffleArray(questions);
    
    // Limit questions to the selected count
    window.quizQuestions = shuffledQuestions.slice(0, questionCount);
    console.log(`Starting quiz with ${window.quizQuestions.length} questions`);
    displaySessionInfo();
    displayQuestion(window.quizQuestions[currentQuestionIndex]);
    startTimer();
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
    socket.emit('getSessionInfo', { sessionId });
    }
}

function generateFallbackSessionId() {
    // Create a fallback random hex ID if one wasn't stored
    const characters = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 16; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    console.log('Generated fallback session ID:', result);
    return result;
}

// Update the displayQuestion function
function displayQuestion(question) {
    console.log('Displaying question:', question);
    
    // Update progress bar
    const totalQuestions = window.quizQuestions.length;
    const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;
    progressFill.style.width = `${progress}%`;
    
    // Update question counter
    currentQuestionSpan.textContent = currentQuestionIndex + 1;
    totalQuestionsSpan.textContent = totalQuestions;
    
    // Update player name if not set already
    if (playerNameSpan && !playerNameSpan.textContent) {
        playerNameSpan.textContent = localStorage.getItem("playerName") || "Guest";
    }
    
    // Shuffle the answer options
    const shuffledOptions = shuffleArray([...question.options]);
    
    // Store the shuffled options on the window object for later reference
    window.currentShuffledOptions = shuffledOptions;
    
    quizContainer.innerHTML = `
        <h2 id="question">${question.question}</h2>
        <ul>
            ${shuffledOptions.map((option, index) => `
                <li>
                    <input type="radio" name="answer" value="${option}" id="option${index}">
                    <label for="option${index}">${option}</label>
                </li>
            `).join('')}
        </ul>
    `;
    
    // Handle hints
    hintContainer.style.display = 'none';
    hintContainer.classList.remove('visible');
    
    // Fix undefined variables by defining them if not already defined
    if (typeof hintsUsed === 'undefined') {
        window.hintsUsed = 0;
    }
    
    if (typeof maxHints === 'undefined') {
        window.maxHints = 3; // Default to 3 hints total
    }
    
    // Update hint button
    getHintButton.innerHTML = `<i class="fas fa-lightbulb"></i> Obtenir un indice`;
    getHintButton.disabled = false;
    
        // Emit event to synchronize with other players
        const sessionId = localStorage.getItem("sessionId");
        socket.emit('startQuizQuestion', {
            sessionId,
            questionIndex: currentQuestionIndex,
            question // Send the question data too
        });
    }

// Add handler for when other players move to a question
socket.on('quizQuestionStarted', (data) => {
    // Only update if we're not the one who sent this event
    if (data.questionIndex !== currentQuestionIndex) {
        currentQuestionIndex = data.questionIndex;
        displayQuestion(data.question);
        startTimer(); // Restart the timer
    }
});

// Listen for player joined events
socket.on('playerJoined', (data) => {
    // Update player count in the UI
    updatePlayerCount();
    
    // Show notification about new player
    const notification = document.createElement('div');
    notification.className = `player-notification join`;
    notification.innerHTML = `<i class="fas fa-user-plus"></i> ${data.userId} joined the game`;
    document.querySelector('.quiz-container').appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => notification.remove(), 3000);
});

// Function to update player count
function updatePlayerCount() {
    const playerCountElement = document.getElementById('player-count');
    if (playerCountElement) {
        const sessionId = localStorage.getItem("sessionId");
        // Request current player count from server
        socket.emit('getSessionInfo', { sessionId });
    }
}

// Listen for session info updates
socket.on('sessionInfo', (data) => {
    const playerCountElement = document.getElementById('player-count');
    if (playerCountElement && data.playerCount) {
        playerCountElement.textContent = data.playerCount;
    }
});

// Add handler for when other players answer
socket.on('playerAnswered', (data) => {
    // You can use this to show who answered what
    const { userId, questionIndex, selectedOption, isCorrect } = data;
    
    // Show a notification about the other player's answer
    const notification = document.createElement('div');
    notification.className = `player-answer ${isCorrect ? 'correct' : 'incorrect'}`;
    notification.textContent = `${userId} answered ${isCorrect ? 'correctly' : 'incorrectly'}`;
    document.querySelector('.quiz-container').appendChild(notification);
    
    // Remove the notification after 3 seconds
    setTimeout(() => notification.remove(), 3000);
});

// Handle answer submission
submitButton.addEventListener('click', () => {
    const selectedOption = document.querySelector('input[name="answer"]:checked');
    if (selectedOption) {
        const answer = selectedOption.value;
        checkAnswer(answer); // Check the selected answer
        currentQuestionIndex++;
        if (currentQuestionIndex < window.quizQuestions.length) {
            displayQuestion(window.quizQuestions[currentQuestionIndex]); // Display the next question
            startTimer(); // Restart the timer for the next question
        } else {
            clearInterval(timer); // Stop the timer when the quiz ends
            showResults(); // Show results
        }
    } else {
        alert('Please select an answer!');
    }
});

// Check the selected answer
function checkAnswer(answer) {
    const currentQuestion = window.quizQuestions[currentQuestionIndex];
    const playerName = localStorage.getItem("playerName");
    const sessionId = localStorage.getItem("sessionId") || "fallback-session";

    if (answer === currentQuestion.answer) {
        score++;
        updateScoreboard(playerName, score);
        
        // Use the correct session ID from localStorage
        socket.emit('updateScore', { 
            sessionId: sessionId, 
            playerName, 
            playerScore: score 
        });
        
        // Also update the database
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
        }).catch(err => console.error('Error updating score:', err));
    }
}

// Add this function to your file
function showModal(title, message) {
    modalTitle.textContent = title;
    modalBody.textContent = message;
    modal.style.display = 'block';
    
    // Close modal handlers
    closeModal.onclick = () => {
        modal.style.display = 'none';
    };
    
    modalCancel.onclick = () => {
        modal.style.display = 'none';
    };
    
    modalConfirm.onclick = () => {
        modal.style.display = 'none';
    };
    
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

// Fix the startTimer function
function startTimer() {
    // Clear any existing timer
    clearInterval(timer);

    let timeLeft = timeLimit;
    timeSpan.textContent = timeLeft;
    timerDisplay.classList.remove('warning');

    // Start a new timer - FIXED implementation
    timer = setInterval(() => {
        timeLeft--;
        timeSpan.textContent = timeLeft;
        
        // Add warning class when time is running low
        if (timeLeft <= 5) {
            timerDisplay.classList.add('warning');
        }

        if (timeLeft <= 0) {
            clearInterval(timer);
            showModal('Temps écoulé !', 'Vous avez dépassé le temps imparti pour cette question.');
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
    const playerName = localStorage.getItem("playerName");
    const totalQuestions = window.quizQuestions.length;
    const percentage = Math.round((score / totalQuestions) * 100);
    
    let resultMessage = '';
    let resultEmoji = '';
    
    if (percentage >= 90) {
        resultMessage = 'Excellent ! Vous êtes un expert en culture générale !';
        resultEmoji = '🌟';
    } else if (percentage >= 70) {
        resultMessage = 'Très bien ! Vous avez une bonne culture générale !';
        resultEmoji = '👍';
    } else if (percentage >= 50) {
        resultMessage = 'Bien ! Continuez à enrichir votre culture générale !';
        resultEmoji = '💪';
    } else {
        resultMessage = 'Continuez à apprendre ! La culture générale s\'enrichit avec le temps !';
        resultEmoji = '📚';
    }
    
    resultsContainer.innerHTML = `
        <h2>${resultEmoji} Quiz terminé ! ${resultEmoji}</h2>
        <p>${playerName}, votre score : ${score} sur ${totalQuestions} (${percentage}%)</p>
        <p>${resultMessage}</p>
        <div class="results-details">
            <p>Indices utilisés : ${hintsUsed} sur ${maxHints}</p>
            <p>Temps par question : ${timeLimit} secondes</p>
        </div>
    `;
    
    // Hide quiz elements
    quizContainer.style.display = 'none';
    document.querySelector('.timer-container').style.display = 'none';
    document.querySelector('.button-group').style.display = 'none';
    
    // Show quiz controls
    document.querySelector('.quiz-controls').style.display = 'flex';
}

function updateScoreboard(playerName, playerScore) {
    const scoreboardList = document.getElementById('scoreboard-list');
    let playerEntry = document.getElementById(`player-${playerName}`);

    if (!playerEntry) {
        // Create a new entry for the player if it doesn't exist
        playerEntry = document.createElement('li');
        playerEntry.id = `player-${playerName}`;
        playerEntry.innerHTML = `
            <span>${playerName}</span>
            <span class="score">${playerScore}</span>
        `;
        scoreboardList.appendChild(playerEntry);
    } else {
        // Update the player's score
        playerEntry.querySelector('.score').textContent = playerScore;
    }
    
    // Sort scoreboard by score (highest first)
    const entries = Array.from(scoreboardList.children);
    entries.sort((a, b) => {
        const scoreA = parseInt(a.querySelector('.score').textContent);
        const scoreB = parseInt(b.querySelector('.score').textContent);
        return scoreB - scoreA;
    });
    
    // Clear and re-append sorted entries
    scoreboardList.innerHTML = '';
    entries.forEach(entry => scoreboardList.appendChild(entry));
}

function shuffleArray(array) {
    const newArray = [...array]; // Create a copy to avoid modifying the original
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray; // Return the shuffled copy, not the original array
}
document.addEventListener('DOMContentLoaded', () => {
startQuiz();
});

