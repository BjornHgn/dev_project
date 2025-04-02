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

// Load questions from JSON file
async function loadQuestions() {
    const response = await fetch('data/questions.json');
    const data = await response.json();
    console.log('Loaded questions from JSON:', data); // Debugging
    return data.questions; // Ensure you return the "questions" array
}

// Start the quiz
async function startQuiz() {
    console.log('Starting quiz...'); // Debugging
    const questions = await loadQuestions(); // Load questions from JSON
    console.log('Loaded questions:', questions); // Debugging
    const shuffledQuestions = shuffleArray(questions); // Shuffle the questions
    console.log('Shuffled questions:', shuffledQuestions); // Debugging
    window.quizQuestions = shuffledQuestions; // Save the shuffled questions globally
    displayQuestion(window.quizQuestions[currentQuestionIndex]); // Display the first question
    startTimer(); // Start the timer
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
        } else {
            clearInterval(timer);
            showResults(); // Show results when the quiz ends
        }
    } else {
        alert('Please select an answer!');
    }
});

// Check the selected answer
function checkAnswer(answer) {
    const currentQuestion = window.quizQuestions[currentQuestionIndex];
    if (answer === currentQuestion.answer) {
        score++;
    }
}

// Start the timer
function startTimer() {
    let timeLeft = timeLimit;
    timerDisplay.textContent = `Time left: ${timeLeft}s`;
    timer = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = `Time left: ${timeLeft}s`;
        if (timeLeft <= 0) {
            clearInterval(timer);
            alert('Time is up!');
            currentQuestionIndex++;
            if (currentQuestionIndex < window.quizQuestions.length) {
                displayQuestion(window.quizQuestions[currentQuestionIndex]);
                startTimer();
            } else {
                showResults();
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