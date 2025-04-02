// quiz.js
import { io } from 'socket.io-client';
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
    const questions = await response.json();
    return questions;
}

// Start the quiz
async function startQuiz() {
    const questions = await loadQuestions();
    displayQuestion(questions[currentQuestionIndex]);
    startTimer();
}

// Display the current question
function displayQuestion(question) {
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
        checkAnswer(answer);
        currentQuestionIndex++;
        if (currentQuestionIndex < questions.length) {
            displayQuestion(questions[currentQuestionIndex]);
        } else {
            clearInterval(timer);
            showResults();
        }
    } else {
        alert('Please select an answer!');
    }
});

// Check the selected answer
function checkAnswer(answer) {
    const questions = loadQuestions();
    if (answer === questions[currentQuestionIndex].correctAnswer) {
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
            if (currentQuestionIndex < questions.length) {
                displayQuestion(questions[currentQuestionIndex]);
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

// Initialize the quiz
startQuiz();