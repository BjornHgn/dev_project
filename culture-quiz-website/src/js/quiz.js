const quizContainer = document.getElementById('quiz');
const resultsContainer = document.getElementById('results');
const submitButton = document.getElementById('submit');
const timerDisplay = document.getElementById('timer');
let currentQuestionIndex = 0;
let score = 0;
let timer;
const timeLimit = 15; // seconds for each question
const socket = io('http://localhost:5000'); // Connect to the backend server

// Join a game session
socket.emit('joinSession', { sessionId: 'example-session-id', userId: 'example-user-id' });

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
    socket.emit('endGame', { sessionId: 'example-session-id' });
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
    if (!playerName) {
        alert("Please enter your name before starting the quiz.");
        window.location.href = "index.html";
        return;
    }

    console.log(`Player Name: ${playerName}`); // Debugging: Ensure the name is retrieved
    socket.emit('joinSession', { sessionId: 'example-session-id', userId: playerName });

    // Add the player to the scoreboard with an initial score of 0
    updateScoreboard(playerName, 0);

    startQuiz();
});

// Load questions from JSON file
async function loadQuestions() {
    const response = await fetch('data/questions.json');
    const data = await response.json();
    console.log('Loaded questions from JSON:', data); // Debugging
    return data.questions; // Ensure you return the "questions" array
}

// Start the quiz
async function startQuiz() {
    const playerName = localStorage.getItem("playerName");
    updateScoreboard(playerName, 0); // Add the player to the scoreboard with an initial score of 0

    const questions = await loadQuestions();
    const shuffledQuestions = shuffleArray(questions);
    window.quizQuestions = shuffledQuestions;
    displayQuestion(window.quizQuestions[currentQuestionIndex]);
    startTimer();
}

// Display the current question
function displayQuestion(question) {
    console.log('Displaying question:', question); // Debugging
    quizContainer.innerHTML = `
        <h2>${question.question}</h2>
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

    if (answer === currentQuestion.answer) {
        score++;
        updateScoreboard(playerName, score); // Update the scoreboard with the new score
        socket.emit('updateScore', { sessionId: 'example-session-id', playerName, playerScore: score }); // Notify the server
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
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

document.addEventListener('DOMContentLoaded', () => {
startQuiz();
});