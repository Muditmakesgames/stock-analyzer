import formidable from "formidable";
import fs from "fs";
import fetch from "node-fetch";

export const config = {
  api: { bodyParser: false } // required to handle file uploads
};

export default async function handler(req, res) {
  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: err.message });

    const { timeHorizon, riskTolerance, goals, concerns } = fields;
    const imageFile = files.image;

    if (!imageFile) {
      return res.status(400).json({ error: "No image uploaded." });
    }

    try {
      // Convert image to base64
      const imageData = fs.readFileSync(imageFile.filepath, { encoding: "base64" });

      // Call Claude/OpenAI API
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": process.env.CLAUDE_API_KEY
        },
        body: JSON.stringify({
          model: "claude-2",
          max_tokens: 3000,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: { type: "base64", media_type: "image/png", data: imageData }
                },
                {
                  type: "text",
                  text: `Analyze this portfolio based on the user's profile below and give detailed, step-by-step recommendations:

Time Horizon: ${timeHorizon}
Risk Tolerance: ${riskTolerance}
Goals: ${goals}
Concerns: ${concerns}

Be very detailed and personalized.`
                }
              ]
            }
          ]
        })
      });

      const data = await response.json();
      const analysis = data.content?.[0]?.text || "No response from AI.";

      res.status(200).json({ analysis });

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to analyze portfolio." });
    }
  });
}


