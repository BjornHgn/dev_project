// Main JavaScript file for the K-Culture Quiz Website

// Function to initialize the application
function init() {
    // Check if the user is on the homepage
    if (window.location.pathname === '/index.html') {
        document.getElementById('start-button').addEventListener('click', startQuiz);
    }
}

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

document.addEventListener('DOMContentLoaded', function() {
    // Éléments du DOM
    const playerForm = document.getElementById('player-form');
    const playerNameInput = document.getElementById('player-name');
    const difficultySelect = document.getElementById('difficulty');
    const categorySelect = document.getElementById('category');
    const questionCountInput = document.getElementById('question-count');
    const questionCountValue = document.getElementById('question-count-value');
    const startQuizButton = document.getElementById('start-quiz');
    const avatarOptions = document.querySelectorAll('.avatar-option');
    
    // Variables pour stocker les données du joueur
    let selectedAvatar = 'user';
    let playerName = '';
    let difficulty = 'medium';
    let category = 'all';
    let questionCount = 10;
    
    // Mise à jour de l'affichage du nombre de questions
    questionCountInput.addEventListener('input', function() {
        questionCountValue.textContent = this.value;
        questionCount = parseInt(this.value);
    });
    
    // Gestion de la sélection d'avatar
    avatarOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Retirer la classe selected de tous les avatars
            avatarOptions.forEach(opt => opt.classList.remove('selected'));
            
            // Ajouter la classe selected à l'avatar cliqué
            this.classList.add('selected');
            
            // Stocker l'avatar sélectionné
            selectedAvatar = this.getAttribute('data-avatar');
            
            // Animation de sélection
            this.style.transform = 'scale(1.1)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 200);
        });
    });
    
    // Gestion de la soumission du formulaire
    playerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Récupérer les valeurs du formulaire
        playerName = playerNameInput.value.trim();
        difficulty = difficultySelect.value;
        category = categorySelect.value;
        
        // Vérifier si le nom est vide
        if (!playerName) {
            showError('Veuillez entrer votre nom');
            return;
        }
        
        // Stocker les données du joueur dans le localStorage
        const playerData = {
            name: playerName,
            avatar: selectedAvatar,
            difficulty: difficulty,
            category: category,
            questionCount: questionCount
        };
        
        localStorage.setItem('playerData', JSON.stringify(playerData));
        
        // Animation du bouton avant la redirection
        startQuizButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Chargement...';
        startQuizButton.disabled = true;
        
        // Simuler un délai de chargement
        setTimeout(() => {
            // Rediriger vers la page du quiz
            window.location.href = 'quiz.html';
        }, 1000);
    });
    
    // Fonction pour afficher une erreur
    function showError(message) {
        // Créer un élément d'erreur
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        errorElement.style.color = 'var(--error-color)';
        errorElement.style.marginTop = '10px';
        errorElement.style.fontSize = '0.9rem';
        errorElement.style.animation = 'fadeIn 0.3s ease';
        
        // Supprimer les messages d'erreur précédents
        const existingErrors = document.querySelectorAll('.error-message');
        existingErrors.forEach(error => error.remove());
        
        // Ajouter le message d'erreur après le champ de nom
        playerNameInput.parentNode.appendChild(errorElement);
        
        // Mettre en évidence le champ de nom
        playerNameInput.style.borderColor = 'var(--error-color)';
        
        // Supprimer le message d'erreur après 3 secondes
        setTimeout(() => {
            errorElement.style.opacity = '0';
            errorElement.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                errorElement.remove();
                playerNameInput.style.borderColor = '';
            }, 300);
        }, 3000);
    }
    
    // Animation des cartes de fonctionnalités au survol
    const featureCards = document.querySelectorAll('.feature-card');
    
    featureCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateX(10px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateX(0)';
        });
    });
    
    // Vérifier si des données de joueur existent déjà
    const savedPlayerData = localStorage.getItem('playerData');
    if (savedPlayerData) {
        const playerData = JSON.parse(savedPlayerData);
        
        // Pré-remplir le formulaire avec les données sauvegardées
        playerNameInput.value = playerData.name || '';
        difficultySelect.value = playerData.difficulty || 'medium';
        categorySelect.value = playerData.category || 'all';
        questionCountInput.value = playerData.questionCount || 10;
        questionCountValue.textContent = questionCountInput.value;
        
        // Sélectionner l'avatar sauvegardé
        const savedAvatar = playerData.avatar || 'user';
        avatarOptions.forEach(option => {
            if (option.getAttribute('data-avatar') === savedAvatar) {
                option.classList.add('selected');
                selectedAvatar = savedAvatar;
            } else {
                option.classList.remove('selected');
            }
        });
    }
});