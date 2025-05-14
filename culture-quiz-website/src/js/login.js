document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    
    if (!loginForm) {
        console.error('Login form not found!');
        return;
    }
    
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        if (!username || !password) {
            alert('Please enter both username and password');
            return;
        }
        
        try {
            console.log('Attempting login for user:', username);
            
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            console.log('Login response:', data);
            
            if (response.ok) {
                // Store token and username
                localStorage.setItem('token', data.token);
                localStorage.setItem('playerName', username);
                localStorage.setItem('userId', data.userId);
                localStorage.setItem('userRole', data.role);
                
                // Check if user is admin and redirect accordingly
                if (data.role === 'admin') {
                    console.log('Admin user detected - redirecting to admin panel');
                    window.location.href = 'admin.html';
                    return;
                }
                
                // For regular users, create a session but redirect to homepage instead of quiz
                const sessionResponse = await fetch('http://localhost:5000/api/sessions/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${data.token}`
                    },
                    body: JSON.stringify({ userId: username })
                });
                
                const sessionData = await sessionResponse.json();
                console.log('Session created:', sessionData);
                
                if (sessionResponse.ok) {
                    localStorage.setItem('sessionId', sessionData.session.sessionId);
                    // Redirect to homepage instead of quiz
                    window.location.href = 'index.html';
                } else {
                    alert(`Error creating session: ${sessionData.error || 'Unknown error'}`);
                }
            } else {
                alert(`Login failed: ${data.error || 'Invalid credentials'}`);
            }
        } catch (error) {
            console.error('Error during login:', error);
            alert('Login failed. Please try again later.');
        }
    });
});