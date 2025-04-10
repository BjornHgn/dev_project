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
let timeLimit = 30; // seconds for each question
let questions = [];
let hintsUsed = 0;
const maxHints = 3; // Maximum number of hints allowed per quiz
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

// Get hint from AI
getHintButton.addEventListener('click', async () => {
    if (hintsUsed >= maxHints) {
        showModal('Plus d\'indices', 'Vous avez utilisé tous vos indices pour ce quiz. Essayez de répondre sans aide !');
        return;
    }

    const currentQuestion = questions[currentQuestionIndex];
    getHintButton.disabled = true;
    getHintButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Recherche d\'indice...';

    try {
        const response = await fetch('http://localhost:5000/api/ai/generate-hint', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: currentQuestion.question }),
        });

        const data = await response.json();
        hintContent.textContent = data.hint;
        hintContainer.style.display = 'block';
        hintContainer.classList.add('visible');
        hintsUsed++;
        
        // Update hint button to show remaining hints
        getHintButton.innerHTML = `<i class="fas fa-lightbulb"></i> Obtenir un indice (${maxHints - hintsUsed} restants)`;
        
        // Re-enable the button after a delay
        setTimeout(() => {
            getHintButton.disabled = false;
        }, 2000);
    } catch (error) {
        console.error('Error getting hint:', error);
        showModal('Erreur', 'Impossible d\'obtenir un indice. Veuillez réessayer plus tard.');
        getHintButton.disabled = false;
        getHintButton.innerHTML = '<i class="fas fa-lightbulb"></i> Obtenir un indice';
    }
});

// Restart quiz
restartQuizButton.addEventListener('click', () => {
    showModal('Recommencer le quiz', 'Êtes-vous sûr de vouloir recommencer le quiz ? Votre progression actuelle sera perdue.', () => {
        currentQuestionIndex = 0;
        score = 0;
        hintsUsed = 0;
        getHintButton.innerHTML = `<i class="fas fa-lightbulb"></i> Obtenir un indice (${maxHints} restants)`;
        getHintButton.disabled = false;
        hintContainer.style.display = 'none';
        hintContainer.classList.remove('visible');
        resultsContainer.innerHTML = '';
        startQuiz();
    });
});

// Share results
shareResultsButton.addEventListener('click', () => {
    const playerName = localStorage.getItem("playerName") || "Joueur";
    const shareText = `J'ai obtenu ${score} sur ${questions.length} au Quiz de Culture Générale ! Pouvez-vous faire mieux ?`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Résultats du Quiz de Culture Générale',
            text: shareText,
            url: window.location.href
        }).catch(error => {
            console.error('Error sharing:', error);
            showModal('Partager les résultats', `Copiez ce texte pour partager : ${shareText}`);
        });
    } else {
        showModal('Partager les résultats', `Copiez ce texte pour partager : ${shareText}`);
    }
});

// Modal functions
function showModal(title, message, confirmCallback = null) {
    modalTitle.textContent = title;
    modalBody.textContent = message;
    modal.style.display = 'block';
    
    // Set up confirm button
    if (confirmCallback) {
        modalConfirm.style.display = 'block';
        modalConfirm.onclick = () => {
            closeModalFunc();
            confirmCallback();
        };
    } else {
        modalConfirm.style.display = 'none';
    }
}

function closeModalFunc() {
    modal.style.display = 'none';
}

closeModal.onclick = closeModalFunc;
modalCancel.onclick = closeModalFunc;

// Close modal when clicking outside
window.onclick = (event) => {
    if (event.target === modal) {
        closeModalFunc();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const playerName = localStorage.getItem("playerName");
    if (!playerName) {
        showModal('Nom du joueur requis', 'Veuillez entrer votre nom avant de commencer le quiz.', () => {
            window.location.href = "index.html";
        });
        return;
    }

    // Display player name
    playerNameSpan.textContent = playerName;
    console.log(`Player Name: ${playerName}`); // Debugging: Ensure the name is retrieved
    socket.emit('joinSession', { sessionId: 'example-session-id', userId: playerName });

    // Add the player to the scoreboard with an initial score of 0
    updateScoreboard(playerName, 0);

    startQuiz();
});

// Load questions from JSON file
async function loadQuestions() {
    try {
        const response = await fetch('data/questions.json');
        const data = await response.json();
        console.log('Loaded questions from JSON:', data); // Debugging
        return data.questions; // Ensure you return the "questions" array
    } catch (error) {
        console.error('Error loading questions:', error);
        showModal('Erreur', 'Impossible de charger les questions. Veuillez rafraîchir la page et réessayer.');
        return [];
    }
}

// Start the quiz
async function startQuiz() {
    const playerName = localStorage.getItem("playerName");
    updateScoreboard(playerName, 0); // Add the player to the scoreboard with an initial score of 0

    questions = await loadQuestions();
    if (questions.length === 0) {
        return; // Exit if no questions loaded
    }

    const shuffledQuestions = shuffleArray(questions);
    window.quizQuestions = shuffledQuestions;
    
    // Update total questions count
    totalQuestionsSpan.textContent = shuffledQuestions.length;
    
    displayQuestion(window.quizQuestions[currentQuestionIndex]);
    startTimer();
}

// Display the current question
function displayQuestion(question) {
    console.log('Displaying question:', question); // Debugging
    
    // Update progress
    currentQuestionSpan.textContent = currentQuestionIndex + 1;
    const progressPercentage = ((currentQuestionIndex + 1) / window.quizQuestions.length) * 100;
    progressFill.style.width = `${progressPercentage}%`;
    
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
    
    // Hide hint container for new question
    hintContainer.style.display = 'none';
    hintContainer.classList.remove('visible');
    
    // Reset hint button
    getHintButton.innerHTML = `<i class="fas fa-lightbulb"></i> Obtenir un indice (${maxHints - hintsUsed} restants)`;
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
        showModal('Aucune réponse sélectionnée', 'Veuillez sélectionner une réponse avant de valider.');
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
        
        // Show correct answer feedback
        showAnswerFeedback(true, currentQuestion.answer);
    } else {
        // Show incorrect answer feedback
        showAnswerFeedback(false, currentQuestion.answer);
    }
}

// Show feedback for correct/incorrect answer
function showAnswerFeedback(isCorrect, correctAnswer) {
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = `answer-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    feedbackDiv.innerHTML = `
        <i class="fas ${isCorrect ? 'fa-check-circle' : 'fa-times-circle'}"></i>
        <p>${isCorrect ? 'Correct !' : `Incorrect. La bonne réponse est : ${correctAnswer}`}</p>
    `;
    
    quizContainer.appendChild(feedbackDiv);
    
    // Remove feedback after a delay
    setTimeout(() => {
        feedbackDiv.remove();
    }, 2000);
}

// Start the timer
function startTimer() {
    // Clear any existing timer
    clearInterval(timer);

    let timeLeft = timeLimit;
    timeSpan.textContent = timeLeft;
    timerDisplay.classList.remove('warning');

    // Start a new timer
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
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}