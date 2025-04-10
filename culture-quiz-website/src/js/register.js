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
                alert('Registration successful! Please log in.');
                window.location.href = 'login.html';
            } else {
                alert(`Registration failed: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error during registration:', error);
            alert('Registration failed. Please try again later.');
        }
    });
});