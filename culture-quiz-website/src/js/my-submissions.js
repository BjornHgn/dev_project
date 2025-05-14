document.addEventListener('DOMContentLoaded', async () => {
    const submissionsList = document.getElementById('submissions-list');
    const statusBtns = document.querySelectorAll('.status-btn');
    
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html?redirect=my-submissions.html';
        return;
    }
    
    // Load submissions
    let allSubmissions = [];
    
    try {
        const response = await fetch('http://10.33.75.205:5000/api/questions/my-submissions', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch submissions');
        }
        
        allSubmissions = await response.json();
        displaySubmissions(allSubmissions, 'all');
        
    } catch (error) {
        console.error('Error fetching submissions:', error);
        submissionsList.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load submissions. Please try again later.</p>
            </div>
        `;
    }
    
    // Set up filter buttons
    statusBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            statusBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const status = btn.dataset.status;
            displaySubmissions(allSubmissions, status);
        });
    });
    
    function displaySubmissions(submissions, statusFilter) {
        if (submissions.length === 0) {
            submissionsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>You haven't submitted any questions yet.</p>
                    <a href="submit-question.html" class="btn">Submit a Question</a>
                </div>
            `;
            return;
        }
        
        // Filter submissions by status if needed
        const filteredSubmissions = statusFilter === 'all' 
            ? submissions 
            : submissions.filter(sub => sub.status === statusFilter);
        
        if (filteredSubmissions.length === 0) {
            submissionsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-filter"></i>
                    <p>No ${statusFilter} submissions found.</p>
                </div>
            `;
            return;
        }
        
        // Display submissions
        submissionsList.innerHTML = filteredSubmissions.map(submission => `
            <div class="submission-card status-${submission.status}">
                <div class="submission-header">
                    <h3>${submission.question}</h3>
                    <span class="status-badge ${submission.status}">
                        ${submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                    </span>
                </div>
                <div class="submission-details">
                    <p><strong>Category:</strong> ${submission.category}</p>
                    <p><strong>Options:</strong> ${submission.options.join(', ')}</p>
                    <p><strong>Correct Answer:</strong> ${submission.answer}</p>
                    <p><strong>Submitted:</strong> ${new Date(submission.createdAt).toLocaleDateString()}</p>
                    ${submission.adminFeedback ? `
                        <div class="admin-feedback">
                            <p><strong>Admin Feedback:</strong></p>
                            <p class="feedback-text">${submission.adminFeedback}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }
});