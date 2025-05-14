const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Question = require('../models/questionModel');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/culture_quiz', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected for import'))
.catch(err => console.error('MongoDB connection error:', err));

// Read questions from JSON file
const questionsFilePath = path.join(__dirname, '../../src/data/questions.json');

async function importQuestions() {
    try {
        // Read file content
        const fileContent = fs.readFileSync(questionsFilePath, 'utf8');
        
        // Remove comments (lines starting with //)
        const jsonContent = fileContent.replace(/^\s*\/\/.*$/gm, '');
        
        // Parse JSON content
        const questionsData = JSON.parse(jsonContent);

        // Ensure each question has difficulty and category
        const enhancedQuestions = questionsData.questions.map(q => ({
            ...q,
            difficulty: q.difficulty || 'medium',
            category: q.category || 'general'
        }));

        console.log(`Found ${enhancedQuestions.length} questions in JSON file`);

        // Clear existing questions
        await Question.deleteMany({});
        console.log('Cleared existing questions');

        // Insert enhanced questions
        const result = await Question.insertMany(enhancedQuestions);
        
        // Verify insertion
        const count = await Question.countDocuments();
        console.log(`Database now has ${count} questions`);
        
        mongoose.disconnect();
    } catch (error) {
        console.error('Error importing questions:', error);
        console.error('Error details:', error.message);
        mongoose.disconnect();
    }
}

importQuestions();