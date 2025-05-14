document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    
    if (!registerForm) {
        console.error('Register form not found!');
        return;
    }
    
    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        if (!username || !password) {
            alert('Please enter both username and password');
            return;
        }
        
        try {
            console.log('Sending registration request for user:', username);
            
            const response = await fetch('http://localhost:5000/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            console.log('Registration response:', data);
            
            if (response.ok) {
                // Auto-login - store auth data in localStorage
                localStorage.setItem('token', data.token);
                localStorage.setItem('playerName', username);
                localStorage.setItem('userId', data.userId);
                localStorage.setItem('userRole', data.role);
                
                // Create session for the user
                try {
                    const sessionResponse = await fetch('http://localhost:5000/api/sessions/create', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${data.token}`
                        },
                        body: JSON.stringify({ userId: username })
                    });
                    
                    const sessionData = await sessionResponse.json();
                    
                    if (sessionResponse.ok) {
                        // Store session ID
                        localStorage.setItem('sessionId', sessionData.session.sessionId);
                        
                        // Navigate to homepage
                        window.location.href = 'index.html';
                    } else {
                        console.error('Error creating session:', sessionData.error);
                        // Still navigate to homepage even if session creation fails
                        window.location.href = 'index.html';
                    }
                } catch (sessionError) {
                    console.error('Error creating session:', sessionError);
                    // Still navigate to homepage even if session creation fails
                    window.location.href = 'index.html';
                }
            } else {
                alert(`Registration failed: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error during registration:', error);
            alert('Registration failed. Please try again later.');
        }
    });
});