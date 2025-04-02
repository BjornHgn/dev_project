const { Configuration, OpenAIApi } = require('openai');

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY, // Add your OpenAI API key to .env
});
const openai = new OpenAIApi(configuration);

const generateHint = async (req, res) => {
    const { question } = req.body;

    try {
        const prompt = `Provide a helpful hint for the following question: "${question}"`;
        const response = await openai.createCompletion({
            model: 'text-davinci-003',
            prompt,
            max_tokens: 50,
        });

        const hint = response.data.choices[0].text.trim();
        res.json({ hint });
    } catch (error) {
        console.error('Error generating hint:', error);
        res.status(500).json({ error: 'Failed to generate hint' });
    }
};

const generateQuestion = async (req, res) => {
    const { category, difficulty } = req.body;

    try {
        const prompt = `Generate a ${difficulty} question about ${category} with 4 options and the correct answer.`;
        const response = await openai.createCompletion({
            model: 'text-davinci-003',
            prompt,
            max_tokens: 150,
        });

        const questionData = response.data.choices[0].text.trim();
        res.json({ question: questionData });
    } catch (error) {
        console.error('Error generating question:', error);
        res.status(500).json({ error: 'Failed to generate question' });
    }
};

module.exports = { generateHint };