const formidable = require("formidable");
const fs = require("fs");
const fetch = require("node-fetch");

module.exports.config = {
  api: { bodyParser: false } // required for file uploads
};

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: err.message });

    const { timeHorizon, riskTolerance, goals, concerns } = fields;
    const imageFile = files.image;

    if (!imageFile) {
      return res.status(400).json({ error: "No image uploaded." });
    }

    try {
      // Convert uploaded image to base64
      const imageData = fs.readFileSync(imageFile.filepath, { encoding: "base64" });

      // Call OpenAI Chat Completion API
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "user",
              content: `Analyze this stock portfolio based on the user's profile. Provide very detailed, step-by-step recommendations. Respond specifically for this portfolio image.

Time Horizon: ${timeHorizon}
Risk Tolerance: ${riskTolerance}
Goals: ${goals}
Concerns: ${concerns}

Image (base64): ${imageData}`
            }
          ],
          max_tokens: 3000
        })
      });

      const data = await response.json();
      const analysis = data.choices?.[0]?.message?.content || "No response from AI.";

      res.status(200).json({ analysis });

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to analyze portfolio." });
    }
  });
};



