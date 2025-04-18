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
    const playerName = localStorage.getItem("playerName");
    // Get the session ID from localStorage - this is set when creating a session in main.js
    const sessionId = localStorage.getItem("sessionId") || generateFallbackSessionId();
    
    console.log(`Starting quiz for player: ${playerName} with session: ${sessionId}`);
    
    // Use the actual session ID from localStorage
    socket.emit('joinSession', { sessionId: sessionId, userId: playerName });
    
    // Rest of your DOMContentLoaded code...
});

// Load questions from JSON file
async function loadQuestions() {
    const response = await fetch('data/questions.json');
    const data = await response.json();
    console.log('Loaded questions from JSON:', data); // Debugging
    return data.questions; // Ensure you return the "questions" array
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
    
    displayQuestion(window.quizQuestions[currentQuestionIndex]);
    startTimer();
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
}

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
