// Admin panel JavaScript

// Make sure the user is logged in and has admin rights
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in as admin
    const token = localStorage.getItem('token');
    
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    // Set up navigation
    setupNavigation();
    
    // Load dashboard statistics
    loadDashboardStats();
    
    // Set up question management
    setupQuestionManagement();
    
    // Set up user management
    setupUserManagement();
    
    // Set up session management
    loadSessions();
    
    // Set up logout functionality
    document.querySelector('.logout').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        window.location.href = 'login.html';
    });
});

// Tab navigation
function setupNavigation() {
    const menuItems = document.querySelectorAll('.admin-menu li');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    menuItems.forEach(item => {
        if (item.classList.contains('logout')) return;
        
        item.addEventListener('click', () => {
            // Remove active class from all menu items
            menuItems.forEach(i => i.classList.remove('active'));
            
            // Add active class to clicked item
            item.classList.add('active');
            
            // Hide all tab panes
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            // Show the selected tab pane
            const tabId = item.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// Dashboard statistics
async function loadDashboardStats() {
    try {
        const response = await fetch('http://localhost:5000/api/admin/stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch dashboard statistics');
        }
        
        const data = await response.json();
        
        // Update dashboard stats
        document.getElementById('question-count').textContent = data.stats.questions;
        document.getElementById('user-count').textContent = data.stats.users;
        document.getElementById('session-count').textContent = data.stats.activeSessions;
        
        // Simplified chart placeholder
        document.getElementById('activity-chart').innerHTML = `
            <p>Recent Activity: ${data.recentSessions.length} new sessions in the last 24 hours</p>
        `;
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showNotification('Failed to load dashboard statistics', 'error');
    }
}

// Question Management
function setupQuestionManagement() {
    // Load all questions
    loadQuestions();
    
    // Add question button event
    document.getElementById('add-question-btn').addEventListener('click', () => {
        openQuestionModal();
    });
    
    // Question form submit event
    document.getElementById('question-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const questionId = document.getElementById('question-id').value;
        const questionText = document.getElementById('question-text').value;
        const category = document.getElementById('question-category').value;
        const answer = document.getElementById('question-answer').value;
        const imageUrl = document.getElementById('question-image').value;
        
        // Get all options
        const optionInputs = document.querySelectorAll('.option-text');
        const options = Array.from(optionInputs).map(input => input.value);
        
        const questionData = {
            question: questionText,
            options,
            answer,
            category,
            imageUrl: imageUrl || undefined
        };
        
        if (questionId) {
            // Update existing question
            await updateQuestion(questionId, questionData);
        } else {
            // Create new question
            await createQuestion(questionData);
        }
        
        closeQuestionModal();
        loadQuestions();
    });
    
    // Add option button event
    document.getElementById('add-option-btn').addEventListener('click', () => {
        addOptionInput();
    });
    
    // Cancel button event
    document.querySelector('#question-modal .btn-cancel').addEventListener('click', () => {
        closeQuestionModal();
    });
    
    // Close modal event
    document.querySelector('#question-modal .close-modal').addEventListener('click', () => {
        closeQuestionModal();
    });
    
    // Setup delete option event delegation
    document.querySelector('.option-inputs').addEventListener('click', (e) => {
        if (e.target.closest('.delete-option')) {
            const optionInput = e.target.closest('.option-input');
            if (document.querySelectorAll('.option-input').length > 2) {
                optionInput.remove();
                updateAnswerDropdown();
            } else {
                showNotification('At least 2 options are required', 'warning');
            }
        }
    });
}

// Load questions into table
async function loadQuestions() {
    try {
        const response = await fetch('http://localhost:5000/api/admin/questions', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch questions');
        
        const questions = await response.json();
        const tableBody = document.querySelector('#questions-table tbody');
        
        if (questions.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="loading-message">No questions found. Add some questions!</td>
                </tr>
            `;
            return;
        }
        
        tableBody.innerHTML = '';
        
        questions.forEach(question => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${question.question}</td>
                <td>${question.category || 'General'}</td>
                <td>${question.options.join(', ')}</td>
                <td>${question.answer}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit-btn" data-id="${question._id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn" data-id="${question._id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tableBody.appendChild(row);
            
            // Add event listeners for edit and delete buttons
            row.querySelector('.edit-btn').addEventListener('click', () => {
                editQuestion(question);
            });
            
            row.querySelector('.delete-btn').addEventListener('click', () => {
                confirmDelete('question', question._id, `Are you sure you want to delete the question: "${question.question}"?`);
            });
        });
    } catch (error) {
        console.error('Error loading questions:', error);
        showNotification('Failed to load questions', 'error');
    }
}

// Create a new question
async function createQuestion(questionData) {
    try {
        const response = await fetch('http://localhost:5000/api/admin/questions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(questionData)
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to create question');
        }
        
        showNotification('Question created successfully', 'success');
    } catch (error) {
        console.error('Error creating question:', error);
        showNotification(error.message, 'error');
    }
}

// Update an existing question
async function updateQuestion(id, questionData) {
    try {
        const response = await fetch(`http://localhost:5000/api/admin/questions/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(questionData)
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to update question');
        }
        
        showNotification('Question updated successfully', 'success');
    } catch (error) {
        console.error('Error updating question:', error);
        showNotification(error.message, 'error');
    }
}

// Delete a question
async function deleteQuestion(id) {
    try {
        const response = await fetch(`http://localhost:5000/api/admin/questions/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to delete question');
        }
        
        showNotification('Question deleted successfully', 'success');
        loadQuestions();
    } catch (error) {
        console.error('Error deleting question:', error);
        showNotification(error.message, 'error');
    }
}

// Open the question modal for adding a new question
function openQuestionModal(question = null) {
    document.getElementById('question-id').value = question ? question._id : '';
    document.getElementById('question-text').value = question ? question.question : '';
    document.getElementById('question-category').value = question ? (question.category || 'general') : 'general';
    document.getElementById('question-image').value = question ? (question.imageUrl || '') : '';
    
    // Clear existing options
    const optionInputs = document.querySelector('.option-inputs');
    optionInputs.innerHTML = '';
    
    // Add option inputs
    const options = question ? question.options : ['', '', '', ''];
    options.forEach(option => {
        const optionInput = document.createElement('div');
        optionInput.className = 'option-input';
        optionInput.innerHTML = `
            <input type="text" class="option-text" required value="${option}">
            <span class="delete-option"><i class="fas fa-times"></i></span>
        `;
        optionInputs.appendChild(optionInput);
    });
    
    // Update the answer dropdown
    updateAnswerDropdown(question ? question.answer : null);
    
    // Update modal title
    document.getElementById('question-modal-title').textContent = question ? 'Edit Question' : 'Add Question';
    
    // Show modal
    document.getElementById('question-modal').style.display = 'block';
}

// Close the question modal
function closeQuestionModal() {
    document.getElementById('question-modal').style.display = 'none';
}

// Add a new option input
function addOptionInput() {
    const optionInputs = document.querySelector('.option-inputs');
    const optionInput = document.createElement('div');
    optionInput.className = 'option-input';
    optionInput.innerHTML = `
        <input type="text" class="option-text" required>
        <span class="delete-option"><i class="fas fa-times"></i></span>
    `;
    optionInputs.appendChild(optionInput);
    
    updateAnswerDropdown();
}

// Update the answer dropdown based on available options
function updateAnswerDropdown(selectedAnswer = null) {
    const answerSelect = document.getElementById('question-answer');
    const options = Array.from(document.querySelectorAll('.option-text')).map(input => input.value);
    
    answerSelect.innerHTML = '';
    options.forEach(option => {
        if (option.trim()) {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            answerSelect.appendChild(optionElement);
        }
    });
    
    if (selectedAnswer) {
        answerSelect.value = selectedAnswer;
    }
}

// Edit a question
function editQuestion(question) {
    openQuestionModal(question);
}

// User Management
function setupUserManagement() {
    // Load all users
    loadUsers();
    
    // Add user button event
    document.getElementById('add-user-btn').addEventListener('click', () => {
        openUserModal();
    });
    
    // User form submit event
    document.getElementById('user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const userId = document.getElementById('user-id').value;
        const username = document.getElementById('user-username').value;
        const password = document.getElementById('user-password').value;
        const role = document.getElementById('user-role').value;
        
        const userData = {
            username,
            role
        };
        
        if (password) {
            userData.password = password;
        }
        
        if (userId) {
            // Update existing user
            await updateUser(userId, userData);
        } else {
            // Create new user
            if (!password) {
                showNotification('Password is required for new users', 'error');
                return;
            }
            
            await createUser(userData);
        }
        
        closeUserModal();
        loadUsers();
    });
    
    // Cancel button event
    document.querySelector('#user-modal .btn-cancel').addEventListener('click', () => {
        closeUserModal();
    });
    
    // Close modal event
    document.querySelector('#user-modal .close-modal').addEventListener('click', () => {
        closeUserModal();
    });
}

// Load users into table
async function loadUsers() {
    try {
        const response = await fetch('http://localhost:5000/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch users');
        
        const users = await response.json();
        const tableBody = document.querySelector('#users-table tbody');
        
        if (users.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="loading-message">No users found.</td>
                </tr>
            `;
            return;
        }
        
        tableBody.innerHTML = '';
        
        users.forEach(user => {
            const row = document.createElement('tr');
            
            // Format date
            const createdDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A';
            
            row.innerHTML = `
                <td>${user.username} ${user.role === 'admin' ? '<span class="badge">Admin</span>' : ''}</td>
                <td>${createdDate}</td>
                <td>-</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit-btn" data-id="${user._id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn" data-id="${user._id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tableBody.appendChild(row);
            
            // Add event listeners for edit and delete buttons
            row.querySelector('.edit-btn').addEventListener('click', () => {
                editUser(user);
            });
            
            row.querySelector('.delete-btn').addEventListener('click', () => {
                confirmDelete('user', user._id, `Are you sure you want to delete the user: "${user.username}"?`);
            });
        });
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('Failed to load users', 'error');
    }
}

// Create a new user
async function createUser(userData) {
    try {
        const response = await fetch('http://localhost:5000/api/admin/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(userData)
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to create user');
        }
        
        showNotification('User created successfully', 'success');
    } catch (error) {
        console.error('Error creating user:', error);
        showNotification(error.message, 'error');
    }
}

// Update an existing user
async function updateUser(id, userData) {
    try {
        const response = await fetch(`http://localhost:5000/api/admin/users/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(userData)
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to update user');
        }
        
        showNotification('User updated successfully', 'success');
    } catch (error) {
        console.error('Error updating user:', error);
        showNotification(error.message, 'error');
    }
}

// Delete a user
async function deleteUser(id) {
    try {
        const response = await fetch(`http://localhost:5000/api/admin/users/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to delete user');
        }
        
        showNotification('User deleted successfully', 'success');
        loadUsers();
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification(error.message, 'error');
    }
}

// Open the user modal for adding a new user
function openUserModal(user = null) {
    document.getElementById('user-id').value = user ? user._id : '';
    document.getElementById('user-username').value = user ? user.username : '';
    document.getElementById('user-password').value = '';
    document.getElementById('user-role').value = user ? (user.role || 'user') : 'user';
    
    // Update modal title
    document.getElementById('user-modal-title').textContent = user ? 'Edit User' : 'Add User';
    
    // Show modal
    document.getElementById('user-modal').style.display = 'block';
}

// Close the user modal
function closeUserModal() {
    document.getElementById('user-modal').style.display = 'none';
}

// Edit a user
function editUser(user) {
    openUserModal(user);
}

// Session Management
async function loadSessions() {
    try {
        const response = await fetch('http://localhost:5000/api/admin/sessions', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch sessions');
        
        const sessions = await response.json();
        const tableBody = document.querySelector('#sessions-table tbody');
        
        if (sessions.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="loading-message">No sessions found.</td>
                </tr>
            `;
            return;
        }
        
        tableBody.innerHTML = '';
        
        sessions.forEach(session => {
            const row = document.createElement('tr');
            
            // Format date
            const createdDate = session.createdAt ? new Date(session.createdAt).toLocaleString() : 'N/A';
            
            row.innerHTML = `
                <td>${session.sessionId}</td>
                <td>${session.players.join(', ')}</td>
                <td>${createdDate}</td>
                <td>${session.isActive ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-inactive">Inactive</span>'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn delete-btn" data-id="${session._id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tableBody.appendChild(row);
            
            // Add event listeners for delete button
            row.querySelector('.delete-btn').addEventListener('click', () => {
                confirmDelete('session', session._id, `Are you sure you want to delete the session: "${session.sessionId}"?`);
            });
        });
    } catch (error) {
        console.error('Error loading sessions:', error);
        showNotification('Failed to load sessions', 'error');
    }
}

// Delete a session
async function deleteSession(id) {
    try {
        const response = await fetch(`http://localhost:5000/api/admin/sessions/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to delete session');
        }
        
        showNotification('Session deleted successfully', 'success');
        loadSessions();
    } catch (error) {
        console.error('Error deleting session:', error);
        showNotification(error.message, 'error');
    }
}

// Confirm delete modal
function confirmDelete(type, id, message) {
    document.getElementById('confirm-message').textContent = message;
    
    // Show modal
    document.getElementById('confirm-modal').style.display = 'block';
    
    // Set up yes button
    document.getElementById('confirm-yes').onclick = async () => {
        document.getElementById('confirm-modal').style.display = 'none';
        
        switch (type) {
            case 'question':
                await deleteQuestion(id);
                break;
            case 'user':
                await deleteUser(id);
                break;
            case 'session':
                await deleteSession(id);
                break;
        }
    };
    
    // Set up no button
    document.getElementById('confirm-no').onclick = () => {
        document.getElementById('confirm-modal').style.display = 'none';
    };
    
    // Set up close button
    document.querySelector('#confirm-modal .close-modal').onclick = () => {
        document.getElementById('confirm-modal').style.display = 'none';
    };
}

// Show notification
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'times-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remove the notification after a few seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}