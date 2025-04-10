// const { Configuration, OpenAIApi } = require('openai');

// const configuration = new Configuration({
//     apiKey: process.env.OPENAI_API_KEY, // Add your OpenAI API key to .env
// });
// const openai = new OpenAIApi(configuration);

const generateHint = async (req, res) => {
    const { question } = req.body;

    try {
        // Instead of calling OpenAI API, return pre-defined hints
        const hints = {
            "What is the name of the popular K-Pop group known for their hit song 'Dynamite'?": "They are a 7-member boy band.",
            "Which K-Drama features a love story between a goblin and a human?": "The main character is a 939-year-old immortal.",
            "What is the traditional Korean dish made of fermented vegetables?": "It's often made with napa cabbage and Korean radishes.",
            "What is the capital city of South Korea?": "It's located in the northwest region of the country.",
            // Add more pre-defined hints for your questions
        };

        const hint = hints[question] || "Think about what might be popular in Korean culture!";
        res.json({ hint });
    } catch (error) {
        console.error('Error generating hint:', error);
        res.status(500).json({ error: 'Failed to generate hint' });
    }
};

const generateQuestion = async (req, res) => {
    const { category, difficulty } = req.body;

    try {
        // Return a pre-defined question instead of calling OpenAI
        const question = {
            question: "What is the traditional Korean dress called?",
            options: ["Hanbok", "Kimono", "Cheongsam", "Ao Dai"],
            answer: "Hanbok",
            category: category || "Culture",
            difficulty: difficulty || "medium"
        };

        res.json({ question });
    } catch (error) {
        console.error('Error generating question:', error);
        res.status(500).json({ error: 'Failed to generate question' });
    }
};

module.exports = { generateHint, generateQuestion };