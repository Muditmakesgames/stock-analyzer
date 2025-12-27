const formidable = require("formidable");
const fs = require("fs");
const fetch = require("node-fetch");

module.exports.config = { api: { bodyParser: false } };

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  console.log("OPENAI_API_KEY exists?", !!process.env.OPENAI_API_KEY);
  if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: "OpenAI API key missing" });

  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: "Form parsing failed" });

    const { timeHorizon, riskTolerance, goals, concerns } = fields;
    const imageFile = files.image;

    if (!imageFile) return res.status(400).json({ error: "No image uploaded" });

    try {
      const imageData = fs.readFileSync(imageFile.filepath, { encoding: "base64" });

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
              content: `Analyze this portfolio image (base64) with Time Horizon: ${timeHorizon}, Risk: ${riskTolerance}, Goals: ${goals}, Concerns: ${concerns}.`
            }
          ],
          max_tokens: 3000
        })
      });

      // If OpenAI fails, read text safely
      if (!response.ok) {
        const text = await response.text();
        console.error("OpenAI error:", text);
        return res.status(response.status).json({ error: text });
      }

      const data = await response.json();
      const analysis = data.choices?.[0]?.message?.content || "No response from AI.";
      res.status(200).json({ analysisText: analysis });

    } catch (error) {
      console.error("Backend error:", error);
      res.status(500).json({ error: "Failed to analyze portfolio" });
    }
  });
};
