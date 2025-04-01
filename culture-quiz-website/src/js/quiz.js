// quiz.js

const quizContainer = document.getElementById('quiz');
const resultsContainer = document.getElementById('results');
const submitButton = document.getElementById('submit');
const timerDisplay = document.getElementById('timer');
let currentQuestionIndex = 0;
let score = 0;
let timer;
const timeLimit = 15; // seconds for each question

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