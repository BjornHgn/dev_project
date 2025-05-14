document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('question-submission-form');
    const optionsContainer = document.getElementById('options-container');
    const addOptionBtn = document.getElementById('add-option-btn');
    const correctAnswerSelect = document.getElementById('correct-answer');
    
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
        // Redirect to login page if not logged in
        window.location.href = 'login.html?redirect=submit-question.html';
        return;
    }
    
    // Add option button event
    addOptionBtn.addEventListener('click', () => {
        addOption();
        updateCorrectAnswerDropdown();
    });
    
    // Setup event delegation for delete option buttons
    optionsContainer.addEventListener('click', (e) => {
        if (e.target.closest('.delete-option')) {
            const optionInput = e.target.closest('.option-input');
            const totalOptions = document.querySelectorAll('.option-input').length;
            
            if (totalOptions > 2) {
                optionInput.remove();
                updateCorrectAnswerDropdown();
            } else {
                showNotification('You need at least 2 options', 'error');
            }
        }
    });
    
    // Option input change event
    optionsContainer.addEventListener('input', (e) => {
        if (e.target.classList.contains('option-text')) {
            updateCorrectAnswerDropdown();
        }
    });
    
    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            // Get form values
            const questionText = document.getElementById('question-text').value.trim();
            const category = document.getElementById('question-category').value;
            const difficulty = document.getElementById('question-difficulty').value; // Add this line
            const correctAnswer = document.getElementById('correct-answer').value;
            const imageUrl = document.getElementById('image-url').value.trim();
            
            // Get options
            const optionInputs = document.querySelectorAll('.option-text');
            const options = Array.from(optionInputs).map(input => input.value.trim());
            
            // Validate inputs
            if (!questionText || options.some(option => !option) || !correctAnswer) {
                showNotification('Please fill all required fields', 'error');
                return;
            }
                
            const response = await fetch('http://localhost:5000/api/questions/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    question: questionText,
                    options,
                    answer: correctAnswer,
                    category,
                    difficulty, // Add this line
                    imageUrl: imageUrl || undefined
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showNotification('Question submitted successfully!', 'success');
                form.reset();
                // Clear extra option inputs
                const optionInputs = document.querySelectorAll('.option-input');
                for (let i = 2; i < optionInputs.length; i++) {
                    optionInputs[i].remove();
                }
                updateCorrectAnswerDropdown();
            } else {
                showNotification(data.error || 'Error submitting question', 'error');
            }
        } catch (error) {
            console.error('Error submitting question:', error);
            showNotification('Error submitting question. Please try again.', 'error');
        }
    });
    
    // Helper functions
    function addOption() {
        const optionInput = document.createElement('div');
        optionInput.className = 'option-input';
        const placeholder = `Option ${document.querySelectorAll('.option-input').length + 1}`;
        
        optionInput.innerHTML = `
            <input type="text" class="option-text" placeholder="${placeholder}" required>
            <span class="delete-option"><i class="fas fa-times"></i></span>
        `;
        
        optionsContainer.appendChild(optionInput);
    }
    
    function updateCorrectAnswerDropdown() {
        const optionInputs = document.querySelectorAll('.option-text');
        const options = Array.from(optionInputs).map(input => input.value.trim()).filter(Boolean);
        
        correctAnswerSelect.innerHTML = '';
        
        if (options.length === 0) {
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = 'Add options first';
            placeholder.disabled = true;
            placeholder.selected = true;
            correctAnswerSelect.appendChild(placeholder);
        } else {
            options.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option;
                optionElement.textContent = option;
                correctAnswerSelect.appendChild(optionElement);
            });
        }
    }
    
    function showNotification(message, type) {
        const notification = document.getElementById('notification');
        const notificationMessage = document.getElementById('notification-message');
        
        notification.className = `notification ${type}`;
        notificationMessage.textContent = message;
        
        notification.classList.remove('hidden');
        
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    }
    
    // Initialize correct answer dropdown
    updateCorrectAnswerDropdown();
});