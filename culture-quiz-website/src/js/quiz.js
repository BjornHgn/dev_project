// DOM Elements
const quizContainer = document.getElementById('quiz');
const resultsContainer = document.getElementById('results');
const submitButton = document.getElementById('submit-answer'); // FIXED: consistent ID reference
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

// Quiz state
let currentQuestionIndex = 0;
let score = 0;
let timer;
let hintsUsed = 0;
const maxHints = 3;
const timeLimit = 15;
// Add a quiz completed flag to prevent automatic restart
let quizCompleted = false;
// Add global variable to track spectator mode
let isSpectatorMode = false;

// Create the socket connection with fallback handling
const socket = io(window.location.hostname.includes('localhost') 
    ? 'http://localhost:5000' 
    : 'http://10.33.75.205:5000', {
    reconnectionAttempts: 3,
    timeout: 10000
});

// Debug helpers and error handling
console.log('Quiz.js initialized');

// Socket connection status handling
socket.on('connect', () => {
    console.log('Socket connected with ID:', socket.id);
    showToast('Connected to game server!');
});

socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
    showToast('Connection issue. Using fallback mode...');
    
    // If we can't connect to the socket, try loading questions directly
    setTimeout(() => {
        if (!window.quizQuestions) {
            initializeWithFallback();
        }
    }, 2000);
});

// Emergency fallback initialization if socket fails
async function initializeWithFallback() {
    console.log('Initializing with fallback method');
    const questions = await fetchQuestionsDirectly();
    if (questions && questions.length > 0) {
        window.quizQuestions = questions;
        currentQuestionIndex = 0;
        displayQuestion(window.quizQuestions[currentQuestionIndex]);
        startTimer();
        
        // Initialize scoreboard manually
        initializeScoreboard();
    } else {
        showModal('Error', 'Could not load questions. Please try again later.');
    }
}

// Listen for session questions
socket.on('sessionQuestions', (data) => {
    // Only process if quiz is not completed
    if (quizCompleted) return;
    
    console.log('Received session questions:', data);
    if (data.questions && data.questions.length > 0) {
        window.quizQuestions = data.questions;
        
        // Update total questions count
        if (totalQuestionsSpan) {
            totalQuestionsSpan.textContent = data.questions.length;
        }
        
        // Start from the given question index or from beginning
        currentQuestionIndex = data.currentQuestionIndex || 0;
        
        // Display the current question
        displayQuestion(window.quizQuestions[currentQuestionIndex]);
        startTimer();
        
        // IMPORTANT: Re-apply spectator mode restrictions after questions are loaded
        if (isSpectatorMode) {
            setTimeout(disableAllQuizInteractions, 100);
        }
    } else {
        console.error('Received empty or invalid questions data');
    }
});

socket.on('scoreUpdate', (data) => {
    if (data.scores) {
        updateFullScoreboard(data.scores);
    }
});

// Listen for session updates
socket.on('sessionUpdate', (data) => {
    console.log('Received session update:', data);
    if (data.scores && Array.isArray(data.scores)) {
        updateFullScoreboard(data.scores);
    }
});

// Add this function to initialize the scoreboard
function initializeScoreboard() {
    const scoreboardList = document.getElementById('scoreboard-list');
    if (scoreboardList) {
        // Add the current player to the scoreboard initially
        const playerName = localStorage.getItem("playerName") || "Guest";
        scoreboardList.innerHTML = `
            <li class="current-player">
                <span class="rank">1</span>
                <span class="player-name">${playerName} (You)</span>
                <span class="score">0</span>
            </li>
        `;
    } else {
        console.error('Scoreboard list element not found');
    }
}

// Add fallback function to fetch questions directly
async function fetchQuestionsDirectly() {
    const difficulty = localStorage.getItem("difficulty") || "medium";
    const category = localStorage.getItem("category") || "all";
    const questionCount = parseInt(localStorage.getItem("questionCount") || "10");
    
    console.log(`Directly fetching ${questionCount} questions (${difficulty} difficulty, ${category} category)`);
    
    // Adapt URL based on environment - try multiple endpoints as fallback
    const endpoints = [
        `http://10.33.75.205:5000/api/game/questions?difficulty=${difficulty}&category=${category}`,
        `http://localhost:5000/api/game/questions?difficulty=${difficulty}&category=${category}`,
        'data/questions.json'
    ];
    
    // Try each endpoint until one works
    for (const endpoint of endpoints) {
        try {
            console.log(`Trying to fetch from: ${endpoint}`);
            const response = await fetch(endpoint);
            
            if (!response.ok) {
                console.warn(`Endpoint ${endpoint} returned ${response.status}`);
                continue;
            }
            
            const data = await response.json();
            console.log('Data received:', data);
            
            // Handle different response formats
            let questions;
            if (data.questions && Array.isArray(data.questions)) {
                questions = data.questions;
            } else if (Array.isArray(data)) {
                questions = data;
            } else {
                continue;
            }
            
            if (questions.length > 0) {
                // Shuffle and limit questions
                const shuffled = shuffleArray([...questions]);
                return shuffled.slice(0, questionCount);
            }
        } catch (error) {
            console.warn(`Failed to fetch from ${endpoint}:`, error);
        }
    }
    
    // If all else fails, use hardcoded questions
    console.log('Using hardcoded questions as last resort');
    return getHardcodedQuestions();
}

// Provide hardcoded questions as ultimate fallback
function getHardcodedQuestions() {
    return [
        {
            question: "Quelle est la capitale de la France ?",
            options: ["Londres", "Berlin", "Paris", "Madrid"],
            answer: "Paris"
        },
        {
            question: "Qui a peint La Joconde ?",
            options: ["Pablo Picasso", "Vincent van Gogh", "Leonardo da Vinci", "Claude Monet"],
            answer: "Leonardo da Vinci"
        },
        {
            question: "Quel est l'élément chimique de symbole O ?",
            options: ["Or", "Oxygène", "Osmium", "Oganesson"],
            answer: "Oxygène"
        },
        {
            question: "En quelle année a commencé la Seconde Guerre mondiale ?",
            options: ["1939", "1940", "1941", "1945"],
            answer: "1939"
        },
        {
            question: "Quel est le plus grand océan du monde ?",
            options: ["Océan Atlantique", "Océan Indien", "Océan Pacifique", "Océan Arctique"],
            answer: "Océan Pacifique"
        }
    ];
}

// Main initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded. Initializing quiz...');
    
    // Debug which elements were found
    console.log('Quiz container found:', !!quizContainer);
    console.log('Results container found:', !!resultsContainer);
    console.log('Submit button found:', !!submitButton);
    console.log('Player name span found:', !!playerNameSpan);
    
    // Reset quiz completed flag on page load
    quizCompleted = false;

    // IMPORTANT: Check spectator status first and log it clearly
    isSpectatorMode = localStorage.getItem("isSpectator") === "true";
    console.log('Spectator mode:', isSpectatorMode);
    
    // If in spectator mode, add the class to body immediately
    if (isSpectatorMode) {
        document.body.classList.add('spectator-mode');
    }
    
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
    
    // Set player name in UI
    const playerName = localStorage.getItem("playerName") || "Guest";
    if (playerNameSpan) {
        playerNameSpan.textContent = playerName;
        console.log(`Set player name to: ${playerName}`);
    } else {
        console.error('Player name span not found in DOM');
    }
    
    // Get quiz preferences from localStorage
    const difficulty = localStorage.getItem("difficulty") || "medium";
    const category = localStorage.getItem("category") || "all";
    const questionCount = parseInt(localStorage.getItem("questionCount") || "10");
    
    // Get the session ID from localStorage
    const sessionId = localStorage.getItem("sessionId") || generateFallbackSessionId();
    console.log(`Using session ID: ${sessionId}`);
    
    // Create session info display
    displaySessionInfo();
    
    if (isSpectatorMode) {
        console.log(`${playerName} is spectating session: ${sessionId}`);
        
        // Join as spectator
        socket.emit('spectateSession', { 
            sessionId, 
            userId: playerName
        });
        
        // Mark the document body with a spectator class
        document.body.classList.add('spectator-mode');
        
        // IMPORTANT: Use capture phase to ensure we catch events before they reach targets
        // Multiple event types for comprehensive coverage
        document.addEventListener('click', preventSpectatorInteraction, true);
        document.addEventListener('mousedown', preventSpectatorInteraction, true);
        document.addEventListener('touchstart', preventSpectatorInteraction, true);
        document.addEventListener('keydown', preventSpectatorInteraction, true);
        document.addEventListener('change', preventSpectatorInteraction, true);
        
        // Disable all interactive elements immediately
        disableAllQuizInteractions();
        
        // Add spectator badge
        const spectatorBadge = document.createElement('div');
        spectatorBadge.className = 'spectator-badge';
        spectatorBadge.innerHTML = '<i class="fas fa-eye"></i> Spectator Mode';
        document.querySelector('.quiz-container').prepend(spectatorBadge);
        
        // Apply visual indicator for spectator mode
        document.querySelector('.quiz-container').style.border = '2px solid rgba(155, 89, 182, 0.5)';
    } else {
        // Make sure we're not in spectator mode - double check
        localStorage.removeItem('isSpectator');
        isSpectatorMode = false;
        
        // Join as player
        console.log(`Starting quiz for player: ${playerName} with session: ${sessionId}`);
        
        // Join the session and include preferences
        socket.emit('joinSession', { 
            sessionId, 
            userId: playerName,
            difficulty,
            category,
            questionCount
        });
    }
    
    // Initialize UI elements
    initializeScoreboard();
    
    // Set a timer to fetch questions directly if they don't arrive via socket
    const questionsTimeout = setTimeout(async () => {
        if (!window.quizQuestions) {
            console.log('No questions received via socket after timeout, fetching directly...');
            initializeWithFallback();
        } else {
            console.log('Questions already loaded via socket');
        }
    }, 5000); // Wait 5 seconds before trying direct fetch
    
    // Clear the timeout if questions are received via socket
    socket.on('sessionQuestions', () => {
        clearTimeout(questionsTimeout);
    });
    
    // Force-reload the page if nothing appears after 10 seconds
    setTimeout(() => {
        if (!document.querySelector('#quiz h2') && !window.hasReloaded) {
            console.log('Quiz content not loaded after 10 seconds, reloading page...');
            window.hasReloaded = true;
            window.location.reload();
        }
    }, 10000);
    
    // Add an extra check after all initialization is done
    setTimeout(() => {
        if (isSpectatorMode) {
            console.log('Double-checking spectator restrictions...');
            disableAllQuizInteractions();
        }
    }, 1000);
});

// Add spectator event listeners
socket.on('spectatorJoined', (data) => {
    // Only process if quiz is not completed
    if (quizCompleted) return;
    
    // Update spectator count in the UI
    updateSpectatorCount(data.spectatorCount);
    
    // Show notification about new spectator
    const notification = document.createElement('div');
    notification.className = `player-notification spectator`;
    notification.innerHTML = `<i class="fas fa-eye"></i> ${data.userId} is now spectating`;
    document.querySelector('.quiz-container').appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => notification.remove(), 3000);
});

// Add event listener for restart button
document.getElementById('restart-quiz')?.addEventListener('click', () => {
    console.log('Restart button clicked');
    if (isSpectatorMode) {
        showToast('You are in spectator mode and cannot restart the quiz');
        return;
    }
    restartQuiz();
});

// IMPROVED: More comprehensive disabling of all quiz interactions
function disableAllQuizInteractions() {
    console.log('Disabling ALL quiz interactions for spectator');
    
    // Disable all radio buttons
    const radioButtons = document.querySelectorAll('input[type="radio"]');
    radioButtons.forEach(radio => {
        radio.disabled = true;
        radio.setAttribute('data-spectator-disabled', 'true');
        if (radio.parentElement) {
            radio.parentElement.classList.add('disabled');
            radio.parentElement.setAttribute('data-spectator-disabled', 'true');
        }
    });
    
    // Disable all buttons in the quiz container
    const allButtons = document.querySelectorAll('button:not(.spectator-exempt)');
    allButtons.forEach(button => {
        // Skip certain buttons that spectators should be able to use
        if (button.id === 'copy-spectate-link') return;
        
        button.disabled = true;
        button.style.opacity = "0.5";
        button.setAttribute('data-spectator-disabled', 'true');
        
        // Save original click handler and replace with spectator message
        if (!button.getAttribute('data-original-click')) {
            button.setAttribute('data-original-click', 'saved');
            const originalClick = button.onclick;
            button.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                showToast('You are in spectator mode and cannot interact with the quiz');
                return false;
            };
        }
    });
    
    // Specifically target the submit button which might be added dynamically later
    const submitBtn = document.getElementById('submit-answer');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = "0.5";
        submitBtn.setAttribute('data-spectator-disabled', 'true');
        
        // Add a safety measure - replace the click handler
        submitBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            showToast('You are in spectator mode and cannot submit answers');
            return false;
        };
    }
    
    // Also disable the hints button
    const hintBtn = document.getElementById('get-hint');
    if (hintBtn) {
        hintBtn.disabled = true;
        hintBtn.style.opacity = "0.5";
        hintBtn.setAttribute('data-spectator-disabled', 'true');
        
        // Replace click handler
        hintBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            showToast('You are in spectator mode and cannot get hints');
            return false;
        };
    }
    
    // Add CSS to prevent clicking on disabled elements
    if (!document.getElementById('spectator-style')) {
        const style = document.createElement('style');
        style.id = 'spectator-style';
        style.textContent = `
            [data-spectator-disabled="true"] {
                pointer-events: none !important;
                cursor: not-allowed !important;
                opacity: 0.6 !important;
            }
            .spectator-mode label {
                pointer-events: none !important;
                cursor: not-allowed !important;
            }
        `;
        document.head.appendChild(style);
    }
}

// Update spectator count
function updateSpectatorCount(count) {
    let spectatorCounter = document.getElementById('spectator-count');
    if (!spectatorCounter) {
        // Create spectator counter if it doesn't exist
        const sessionInfo = document.getElementById('session-info');
        if (sessionInfo) {
            spectatorCounter = document.createElement('p');
            spectatorCounter.id = 'spectator-count';
            spectatorCounter.className = 'spectator-count';
            sessionInfo.appendChild(spectatorCounter);
        }
    }
    
    if (spectatorCounter) {
        spectatorCounter.innerHTML = `<i class="fas fa-eye"></i> Spectators: ${count}`;
    }
}

// Function to handle full scoreboard updates
function updateFullScoreboard(scores) {
    console.log('Updating full scoreboard with scores:', scores);
    const scoreboardList = document.getElementById('scoreboard-list');
    if (!scoreboardList) {
        console.error('Scoreboard list element not found');
        return;
    }
    
    // Validate scores array
    if (!Array.isArray(scores) || scores.length === 0) {
        console.warn('No valid scores to display');
        return;
    }
    
    // Clear the current scoreboard
    scoreboardList.innerHTML = '';
    
    // Sort scores by score value (highest first)
    const sortedScores = [...scores].sort((a, b) => b.score - a.score);
    const currentPlayer = localStorage.getItem("playerName") || "Guest";
    
    // Add each player to the scoreboard
    sortedScores.forEach((scoreData, index) => {
        if (!scoreData.playerName) {
            console.warn('Skipping score entry without playerName', scoreData);
            return;
        }
        
        const playerEntry = document.createElement('li');
        playerEntry.id = `player-${scoreData.playerName}`;
        
        // Highlight the current player
        const isCurrentPlayer = scoreData.playerName === currentPlayer;
        if (isCurrentPlayer) {
            playerEntry.classList.add('current-player');
            // Update local score if this is the current player and we're not in the final results screen
            if (!quizCompleted) {
                score = scoreData.score;
            }
        }
        
        // Add rank number and handle ties
        let rank = index + 1;
        if (index > 0 && sortedScores[index-1].score === scoreData.score) {
            const previousRankElement = scoreboardList.lastChild.querySelector('.rank');
            if (previousRankElement) {
                rank = parseInt(previousRankElement.textContent);
            }
        }
        
        playerEntry.innerHTML = `
            <span class="rank">${rank}</span>
            <span class="player-name">${scoreData.playerName}${isCurrentPlayer ? ' (You)' : ''}</span>
            <span class="score">${scoreData.score}</span>
        `;
        scoreboardList.appendChild(playerEntry);
    });
}

// Creates and displays session info
function displaySessionInfo() {
    const sessionId = localStorage.getItem("sessionId");
    if (sessionId) {
        // Create a session info div if it doesn't exist
        let sessionInfo = document.getElementById('session-info');
        if (!sessionInfo) {
            sessionInfo = document.createElement('div');
            sessionInfo.id = 'session-info';
            sessionInfo.className = 'session-info';
            
            const quizContainer = document.querySelector('.quiz-container');
            const header = document.querySelector('header');
            
            if (quizContainer && header) {
                quizContainer.insertBefore(sessionInfo, header.nextSibling);
            } else {
                console.error('Quiz container or header not found');
                return;
            }
        }
        
        sessionInfo.innerHTML = `
            <p>Session Code: <strong>${sessionId}</strong></p>
            <p>Share this code with friends to play together or spectate!</p>
        `;
        
        // Add spectator count if not exists
        if (!document.getElementById('spectator-count')) {
            const spectatorCounter = document.createElement('p');
            spectatorCounter.id = 'spectator-count';
            spectatorCounter.className = 'spectator-count';
            spectatorCounter.innerHTML = `<i class="fas fa-eye"></i> Spectators: 0`;
            sessionInfo.appendChild(spectatorCounter);
        }
        
        // Add a spectator link to session info for sharing
        const spectateLink = document.createElement('p');
        spectateLink.className = 'spectate-link';
        spectateLink.innerHTML = `<button id="copy-spectate-link" class="btn btn-small spectator-exempt">
            <i class="fas fa-copy"></i> Copy Spectator Link
        </button>`;
        sessionInfo.appendChild(spectateLink);
        
        // Add copy functionality
        document.getElementById('copy-spectate-link')?.addEventListener('click', () => {
            const currentUrl = window.location.origin;
            const spectateUrl = `${currentUrl}/index.html?spectate=${sessionId}`;
            
            navigator.clipboard.writeText(spectateUrl).then(() => {
                showToast('Spectator link copied to clipboard!');
            }).catch(err => {
                console.error('Failed to copy:', err);
                showToast('Failed to copy link');
            });
        });
    }
}

// Function to restart the quiz
function restartQuiz() {
    // Don't allow spectators to restart
    if (isSpectatorMode) {
        showToast('You are in spectator mode and cannot restart the quiz');
        return;
    }
    
    // Reset quiz state
    currentQuestionIndex = 0;
    score = 0;
    hintsUsed = 0;
    quizCompleted = false; // Reset the quiz completed flag
    
    // Hide results section
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
    }
    
    // Show quiz elements
    if (quizContainer) {
        quizContainer.style.display = 'flex';
    }
    
    const timerContainer = document.querySelector('.timer-container');
    if (timerContainer) {
        timerContainer.style.display = 'block';
    }
    
    const buttonGroup = document.querySelector('.button-group');
    if (buttonGroup) {
        buttonGroup.style.display = 'flex';
    }
    
    // Hide quiz controls
    const quizControls = document.querySelector('.quiz-controls');
    if (quizControls) {
        quizControls.style.display = 'none';
    }
    
    // Create a new session
    const playerName = localStorage.getItem("playerName") || "Guest";
    const sessionId = generateFallbackSessionId();
    localStorage.setItem("sessionId", sessionId);
    
    // Get quiz preferences
    const difficulty = localStorage.getItem("difficulty") || "medium";
    const category = localStorage.getItem("category") || "all";
    const questionCount = parseInt(localStorage.getItem("questionCount") || "10");
    
    console.log(`Restarting quiz for player: ${playerName} with new session: ${sessionId}`);
    
    // Join session with preferences
    socket.emit('joinSession', { 
        sessionId, 
        userId: playerName,
        difficulty,
        category,
        questionCount
    });
    
    // Initialize UI
    initializeScoreboard();
    displaySessionInfo();
}

// Generate session ID if one doesn't exist
function generateFallbackSessionId() {
    const characters = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed confusing chars
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    console.log('Generated fallback session ID:', result);
    return result;
}

// Handle question display
function displayQuestion(question) {
    console.log('Displaying question:', question);
    
    if (!question) {
        console.error('No question to display');
        return;
    }
    
    if (!quizContainer) {
        console.error('Quiz container not found');
        return;
    }
    
    try {
        // Update progress bar
        const totalQuestions = window.quizQuestions ? window.quizQuestions.length : 10;
        const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;
        
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
        
        // Update question counter
        if (currentQuestionSpan) currentQuestionSpan.textContent = currentQuestionIndex + 1;
        if (totalQuestionsSpan) totalQuestionsSpan.textContent = totalQuestions;
        
        // Update player name if not set already
        if (playerNameSpan && !playerNameSpan.textContent) {
            playerNameSpan.textContent = localStorage.getItem("playerName") || "Guest";
        }
        
        // Make sure question has options
        if (!question.options || !Array.isArray(question.options) || question.options.length < 2) {
            console.warn('Question has no options, using defaults');
            question.options = ['Option 1', 'Option 2', 'Option 3', 'Option 4'];
            if (!question.answer) question.answer = 'Option 1';
        }
        
        // Shuffle the answer options
        const shuffledOptions = shuffleArray([...question.options]);
        
        // Store the shuffled options on the window object for later reference
        window.currentShuffledOptions = shuffledOptions;
        
        // IMPORTANT: Check spectator status before rendering
        const spectatorDisabled = isSpectatorMode ? 'disabled' : '';
        
        quizContainer.innerHTML = `
            <h2 id="question">${question.question}</h2>
            <ul>
                ${shuffledOptions.map((option, index) => `
                    <li class="${isSpectatorMode ? 'disabled' : ''}">
                        <input type="radio" name="answer" value="${option}" id="option${index}" ${spectatorDisabled}>
                        <label for="option${index}">${option}</label>
                    </li>
                `).join('')}
            </ul>
        `;

        // VERY IMPORTANT: Re-check spectator status on EVERY question display
        // Use multiple checks to ensure it catches correctly
        if (localStorage.getItem("isSpectator") === "true" || isSpectatorMode) {
            console.log("Re-applying spectator restrictions for new question");
            
            // Make sure we update the global variable
            isSpectatorMode = true;
            
            // Use multiple setTimeout calls with different delays to ensure UI is updated
            setTimeout(disableAllQuizInteractions, 0);
            setTimeout(disableAllQuizInteractions, 50);
            setTimeout(disableAllQuizInteractions, 200);
            
            // Make sure body has spectator class
            document.body.classList.add('spectator-mode');
            
            // Reattach event handlers - first remove to avoid duplicates
            document.removeEventListener('click', preventSpectatorInteraction, true);
            document.removeEventListener('mousedown', preventSpectatorInteraction, true);
            document.removeEventListener('touchstart', preventSpectatorInteraction, true);
            document.removeEventListener('keydown', preventSpectatorInteraction, true);
            document.removeEventListener('change', preventSpectatorInteraction, true);
            
            // Add all event listeners with capture phase
            document.addEventListener('click', preventSpectatorInteraction, true);
            document.addEventListener('mousedown', preventSpectatorInteraction, true);
            document.addEventListener('touchstart', preventSpectatorInteraction, true);
            document.addEventListener('keydown', preventSpectatorInteraction, true);
            document.addEventListener('change', preventSpectatorInteraction, true);
        }
        
        // Handle hints
        if (hintContainer) {
            hintContainer.style.display = 'none';
            hintContainer.classList.remove('visible');
        }
        
        // Update hint button
        if (getHintButton) {
            getHintButton.innerHTML = `<i class="fas fa-lightbulb"></i> Obtenir un indice`;
            getHintButton.disabled = hintsUsed >= maxHints || isSpectatorMode;
            
            if (isSpectatorMode) {
                getHintButton.setAttribute('data-spectator-disabled', 'true');
            }
        }
        
        // Emit event to synchronize with other players
        const sessionId = localStorage.getItem("sessionId");
        if (sessionId) {
            socket.emit('startQuizQuestion', {
                sessionId,
                questionIndex: currentQuestionIndex,
                question
            });
        }
    } catch (error) {
        console.error('Error displaying question:', error);
        showToast('Error displaying question. Please try again.');
    }
}

// Handle get hint button click
if (getHintButton) {
    getHintButton.addEventListener('click', async () => {
        // Don't allow spectators to get hints - multiple checks
        if (localStorage.getItem("isSpectator") === "true" || isSpectatorMode) {
            showToast('You are in spectator mode and cannot get hints');
            return;
        }
        
        if (hintsUsed >= maxHints) {
            showModal('Limite d\'indices atteinte', 'Vous avez utilisé tous vos indices disponibles.');
            return;
        }
        
        if (!window.quizQuestions || !window.quizQuestions[currentQuestionIndex]) {
            showModal('Erreur', 'Impossible de générer un indice pour cette question.');
            return;
        }
        
        hintsUsed++;
        getHintButton.innerHTML = `<i class="fas fa-lightbulb"></i> Indices utilisés: ${hintsUsed}/${maxHints}`;
        
        if (hintsUsed >= maxHints) {
            getHintButton.disabled = true;
        }
        
        const question = window.quizQuestions[currentQuestionIndex].question;
        
        // Show loading state
        hintContainer.classList.add('visible');
        hintContainer.style.display = 'flex';
        hintContent.textContent = 'Génération de l\'indice...';
        
        try {
            // Try multiple endpoints in case one fails
            let hintData = null;
            const endpoints = [
                'http://10.33.75.205:5000/api/ai/generate-hint',
                'http://localhost:5000/api/ai/generate-hint'
            ];
            
            for (const endpoint of endpoints) {
                try {
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ question }),
                    });
                    
                    if (response.ok) {
                        hintData = await response.json();
                        break;
                    }
                } catch (err) {
                    console.warn(`Failed to get hint from ${endpoint}:`, err);
                }
            }
            
            if (hintData && hintData.hint) {
                hintContent.textContent = hintData.hint;
            } else {
                // Fallback hint
                hintContent.textContent = 'Relisez attentivement la question et considérez toutes les réponses possibles.';
            }
        } catch (error) {
            console.error('Error getting hint:', error);
            hintContent.textContent = 'Impossible de générer un indice. Essayez à nouveau.';
        }
    });
}

// Add handler for when other players move to a question
socket.on('quizQuestionStarted', (data) => {
    // Only process if quiz is not completed
    if (quizCompleted) return;
    
    // Only update if we're not the one who sent this event
    if (data.questionIndex !== currentQuestionIndex) {
        currentQuestionIndex = data.questionIndex;
        displayQuestion(data.question);
        startTimer(); // Restart the timer
        
        // Re-check spectator status
        if (isSpectatorMode) {
            setTimeout(disableAllQuizInteractions, 100);
        }
    }
});

// Listen for player joined events
socket.on('playerJoined', (data) => {
    // Only process if quiz is not completed
    if (quizCompleted) return;
    
    // Update player count in the UI
    updatePlayerCount();
    
    // Show notification about new player
    const notification = document.createElement('div');
    notification.className = `player-notification join`;
    notification.innerHTML = `<i class="fas fa-user-plus"></i> ${data.userId} joined the game`;
    document.querySelector('.quiz-container')?.appendChild(notification);
    
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

// Add handler for when other players answer
socket.on('playerAnswered', (data) => {
    // Only process if quiz is not completed
    if (quizCompleted) return;
    
    // Show a notification about the other player's answer
    const { userId, isCorrect } = data;
    
    const notification = document.createElement('div');
    notification.className = `player-answer ${isCorrect ? 'correct' : 'incorrect'}`;
    notification.innerHTML = `<i class="fas fa-${isCorrect ? 'check' : 'times'}-circle"></i> ${userId} answered ${isCorrect ? 'correctly' : 'incorrectly'}`;
    document.querySelector('.quiz-container')?.appendChild(notification);
    
    // Remove the notification after 3 seconds
    setTimeout(() => notification.remove(), 3000);
});

// Handle answer submission
if (submitButton) {
    submitButton.addEventListener('click', () => {
        // IMPORTANT: Add multiple spectator checks
        if (localStorage.getItem("isSpectator") === "true" || isSpectatorMode) {
            console.log('Blocked submit attempt by spectator');
            showToast('You are in spectator mode and cannot submit answers');
            return false;
        }
        
        // Prevent submission if quiz is already completed
        if (quizCompleted) return; 
        
        const selectedOption = document.querySelector('input[name="answer"]:checked');
        if (selectedOption) {
            const answer = selectedOption.value;
            checkAnswer(answer);
            currentQuestionIndex++;
            if (window.quizQuestions && currentQuestionIndex < window.quizQuestions.length) {
                displayQuestion(window.quizQuestions[currentQuestionIndex]);
                startTimer();
            } else {
                clearInterval(timer);
                quizCompleted = true; // Set the quiz as completed
                
                // Show results immediately using our current local score
                showResults();
                
                // Still update the server for other players
                const playerName = localStorage.getItem("playerName") || "Guest";
                const sessionId = localStorage.getItem("sessionId") || "fallback-session";
                
                socket.emit('updateScore', { 
                    sessionId, 
                    playerName, 
                    playerScore: score 
                });
            }
        } else {
            showModal('Selection requise', 'Veuillez sélectionner une réponse avant de continuer.');
        }
    });
}

// Check the selected answer
function checkAnswer(answer) {
    // IMPORTANT: Don't allow spectators to check answers
    if (isSpectatorMode) {
        showToast('You are in spectator mode and cannot submit answers');
        return;
    }
    
    if (!window.quizQuestions || !window.quizQuestions[currentQuestionIndex]) {
        console.error('No current question to check answer against');
        return;
    }
    
    const currentQuestion = window.quizQuestions[currentQuestionIndex];
    const playerName = localStorage.getItem("playerName") || "Guest";
    const sessionId = localStorage.getItem("sessionId") || "fallback-session";

    if (answer === currentQuestion.answer) {
        score++;
        
        // Create a notification for correct answer
        const feedback = document.createElement('div');
        feedback.className = 'answer-feedback correct';
        feedback.innerHTML = `<i class="fas fa-check-circle"></i> Bonne réponse !`;
        document.querySelector('.quiz-container')?.appendChild(feedback);
        
        // Remove the notification after 2 seconds
        setTimeout(() => feedback.remove(), 2000);
        
        // Update score locally and in UI
        updateLocalScoreDisplay(playerName, score);
        
        // Also notify other players
        socket.emit('answerSelected', {
            sessionId,
            userId: playerName,
            questionIndex: currentQuestionIndex,
            selectedOption: answer,
            isCorrect: true
        });
    } else {
        // Create a notification for incorrect answer
        const feedback = document.createElement('div');
        feedback.className = 'answer-feedback incorrect';
        feedback.innerHTML = `<i class="fas fa-times-circle"></i> Mauvaise réponse. La bonne réponse était : ${currentQuestion.answer}`;
        document.querySelector('.quiz-container')?.appendChild(feedback);
        
        // Remove the notification after 2 seconds
        setTimeout(() => feedback.remove(), 2000);
        
        // Notify other players
        socket.emit('answerSelected', {
            sessionId,
            userId: playerName,
            questionIndex: currentQuestionIndex,
            selectedOption: answer,
            isCorrect: false
        });
    }
}

// Show modal dialog
function showModal(title, message) {
    if (!modal || !modalTitle || !modalBody) {
        console.error('Modal elements not found');
        alert(`${title}: ${message}`);
        return;
    }
    
    modalTitle.textContent = title;
    modalBody.textContent = message;
    modal.style.display = 'block';
    
    // Add click events for closing the modal
    modalConfirm.onclick = () => {
        modal.style.display = 'none';
    };
    
    modalCancel.onclick = () => {
        modal.style.display = 'none';
    };
    
    closeModal.onclick = () => {
        modal.style.display = 'none';
    };
    
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

// Timer function for each question
function startTimer() {
    if (!timerDisplay || !timeSpan) {
        console.error('Timer elements not found');
        return;
    }
    
    clearInterval(timer);

    let timeLeft = timeLimit;
    timeSpan.textContent = timeLeft;
    timerDisplay.classList.remove('warning');

    timer = setInterval(() => {
        if (quizCompleted) {
            clearInterval(timer);
            return;
        }
        
        timeLeft--;
        timeSpan.textContent = timeLeft;
        
        if (timeLeft <= 5) {
            timerDisplay.classList.add('warning');
        }

        if (timeLeft <= 0) {
            clearInterval(timer);
            
            // IMPORTANT: Only show timeout modal for non-spectators
            if (!isSpectatorMode) {
                showModal('Temps écoulé !', 'Vous avez dépassé le temps imparti pour cette question.');
            }
            
            currentQuestionIndex++;
            if (window.quizQuestions && currentQuestionIndex < window.quizQuestions.length) {
                displayQuestion(window.quizQuestions[currentQuestionIndex]);
                startTimer();
            } else {
                quizCompleted = true; // Set the quiz as completed
                showResults(); // Show results immediately with local score
                
                // Only update score for non-spectators
                if (!isSpectatorMode) {
                    const playerName = localStorage.getItem("playerName") || "Guest";
                    const sessionId = localStorage.getItem("sessionId") || "fallback-session";
                    socket.emit('updateScore', { 
                        sessionId, 
                        playerName, 
                        playerScore: score 
                    });
                }
            }
        }
    }, 1000);
}

// Show results after quiz completion
function showResults() {
    if (!resultsContainer) {
        console.error('Results container not found');
        showModal('Quiz Completed', `Your score: ${score}`);
        return;
    }
    
    // Set the quiz as completed to prevent background restart
    quizCompleted = true;
    
    const playerName = localStorage.getItem("playerName") || "Guest";
    const totalQuestions = window.quizQuestions ? window.quizQuestions.length : 0;
    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
    
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
    
    // Create the results HTML
    resultsContainer.innerHTML = `
        <h2>${resultEmoji} Quiz terminé ! ${resultEmoji}</h2>
        <p>${playerName}, votre score : ${score} sur ${totalQuestions} (${percentage}%)</p>
        <p>${resultMessage}</p>
        <div class="results-details">
            <p>Indices utilisés : ${hintsUsed} sur ${maxHints}</p>
            <p>Temps par question : ${timeLimit} secondes</p>
        </div>
        <div class="final-ranking">
            <h3>Classement Final</h3>
            <ul id="final-ranking-list"></ul>
        </div>
    `;
    
    // Create the final ranking with available data and our current local score
    const finalRankingList = document.getElementById('final-ranking-list');
    if (finalRankingList) {
        // Get the current scoreboard data
        const scoreboardList = document.getElementById('scoreboard-list');
        const players = [];
        
        // First add our current player with the correct score
        players.push({
            playerName: playerName,
            score: score,
            isCurrentPlayer: true
        });
        
        // Extract other players from the scoreboard if it exists
        if (scoreboardList) {
            const playerItems = scoreboardList.querySelectorAll('li:not(.current-player)');
            playerItems.forEach(item => {
                const name = item.querySelector('.player-name').textContent.replace(' (You)', '');
                const playerScore = parseInt(item.querySelector('.score').textContent, 10);
                
                if (name && !isNaN(playerScore) && name !== playerName) {
                    players.push({
                        playerName: name,
                        score: playerScore,
                        isCurrentPlayer: false
                    });
                }
            });
        }
        
        // Sort players by score (highest first)
        const sortedPlayers = players.sort((a, b) => b.score - a.score);
        
        // Create ranking list
        finalRankingList.innerHTML = sortedPlayers.map((player, index) => {
            let rank = index + 1;
            
            // Handle ties
            if (index > 0 && sortedPlayers[index-1].score === player.score) {
                const prevElement = finalRankingList.querySelector(`li:nth-child(${index})`);
                if (prevElement) {
                    const prevRank = prevElement.querySelector('.rank').textContent;
                    rank = parseInt(prevRank, 10);
                }
            }
            
            return `
                <li class="${player.isCurrentPlayer ? 'current-player' : ''}">
                    <span class="rank">${rank}</span>
                    <span class="player-name">${player.playerName}${player.isCurrentPlayer ? ' (You)' : ''}</span>
                    <span class="score">${player.score}</span>
                </li>
            `;
        }).join('');
    }
    
    // Hide quiz elements
    if (quizContainer) quizContainer.style.display = 'none';
    const timerContainer = document.querySelector('.timer-container');
    if (timerContainer) timerContainer.style.display = 'none';
    const buttonGroup = document.querySelector('.button-group');
    if (buttonGroup) buttonGroup.style.display = 'none';
    
    // Show quiz controls
    const quizControls = document.querySelector('.quiz-controls');
    if (quizControls) quizControls.style.display = 'flex';
    resultsContainer.style.display = 'flex';

    // Request latest scores from server for final scoreboard
    const sessionId = localStorage.getItem("sessionId") || "fallback-session";
    socket.emit('getSessionInfo', { sessionId });
    
    // Add a one-time listener for the final scores
    socket.once('sessionUpdate', (data) => {
        if (data.scores) {
            updateFinalRankingDisplay(data.scores);
        }
    });
    
    // If in spectator mode, disable restart button
    if (isSpectatorMode) {
        const restartBtn = document.getElementById('restart-quiz');
        if (restartBtn) {
            restartBtn.disabled = true;
            restartBtn.style.opacity = "0.5";
            restartBtn.setAttribute('data-spectator-disabled', 'true');
        }
    }
}

// Add this function to update the final ranking with server data
function updateFinalRankingDisplay(scores) {
    const finalRankingList = document.getElementById('final-ranking-list');
    if (!finalRankingList) return;
    
    // Sort scores by score value (highest first)
    const sortedScores = [...scores].sort((a, b) => b.score - a.score);
    const currentPlayer = localStorage.getItem("playerName") || "Guest";
    
    finalRankingList.innerHTML = '';
    
    // Create ranking list items with correct ranking
    sortedScores.forEach((player, index) => {
        let rank = index + 1;
        
        // Handle ties
        if (index > 0 && sortedScores[index-1].score === player.score) {
            rank = index; // Same rank as previous player
        }
        
        const isCurrentPlayer = player.playerName === currentPlayer;
        
        finalRankingList.innerHTML += `
            <li class="${isCurrentPlayer ? 'current-player' : ''}">
                <span class="rank">${rank}</span>
                <span class="player-name">${player.playerName}${isCurrentPlayer ? ' (You)' : ''}</span>
                <span class="score">${player.score}</span>
            </li>
        `;
    });
}

// Update scoreboard with a player's score (immediate local update)
function updateLocalScoreDisplay(playerName, playerScore) {
    // Don't update scores for spectators
    if (isSpectatorMode) return;
    
    const scoreboardList = document.getElementById('scoreboard-list');
    if (!scoreboardList) return;
    
    // Find the player's entry in the scoreboard
    let playerEntry = document.getElementById(`player-${playerName}`);
    
    if (playerEntry) {
        // Update existing player entry
        const scoreElement = playerEntry.querySelector('.score');
        if (scoreElement) {
            scoreElement.textContent = playerScore;
        }
    } else {
        // If player not in scoreboard yet, add them
        playerEntry = document.createElement('li');
        playerEntry.id = `player-${playerName}`;
        playerEntry.className = 'current-player';
        playerEntry.innerHTML = `
            <span class="rank">?</span>
            <span class="player-name">${playerName} (You)</span>
            <span class="score">${playerScore}</span>
        `;
        scoreboardList.appendChild(playerEntry);
    }
    
    // Send score update to server
    const sessionId = localStorage.getItem("sessionId") || "fallback-session";
    socket.emit('updateScore', { 
        sessionId, 
        playerName, 
        playerScore 
    });
}

// Show toast notification
function showToast(message) {
    // Remove existing toast if present
    const existingToast = document.getElementById('toast-notification');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// IMPROVED: Much more comprehensive function to prevent spectator interactions
function preventSpectatorInteraction(event) {
    // Only run this for spectator mode - multiple checks
    if (localStorage.getItem("isSpectator") !== "true" && !isSpectatorMode) return;
    
    // Update the global variable if it's inconsistent
    if (!isSpectatorMode) {
        isSpectatorMode = true;
    }
    
    // Get the clicked element
    let el = event.target;
    
    // Block interaction with ALL quiz elements except scrolling containers
    // Check both the element itself and its parents/ancestors
    if (el.tagName === 'INPUT' || 
        el.tagName === 'LABEL' || 
        el.tagName === 'BUTTON' ||
        el.closest('input') ||
        el.closest('label') ||
        el.closest('button:not(.spectator-exempt)') ||
        el.closest('#submit-answer') ||
        el.closest('#get-hint')) {
        
        // Allow spectator-exempt elements
        if (el.classList && el.classList.contains('spectator-exempt') ||
            (el.closest && el.closest('.spectator-exempt'))) {
            return true;
        }
        
        // Log attempt
        console.log('🚫 Spectator attempted to interact with:', el.tagName);
        
        // Stop the event completely
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        // Show a reminder
        showToast('You are in spectator mode and cannot interact with the quiz');
        
        return false;
    }
}

// Shuffle array (used for answer options)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}