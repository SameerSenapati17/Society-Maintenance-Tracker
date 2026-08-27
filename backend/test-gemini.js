require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

async function main() {
  console.log("API key:", process.env.GEMINI_API_KEY ? "PRESENT" : "MISSING");
  console.log("Model:", process.env.AI_MODEL);

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const start = Date.now();

  try {
    const interaction = await ai.interactions.create({
      model: process.env.AI_MODEL || "gemini-3.7-flash",
      input: "Classify this incident in one word: garbage scattered on a residential street.",
      generation_config: {
        thinking_level: "low",
      },
    });

    console.log("SUCCESS");
    console.log("Time:", Date.now() - start, "ms");
    console.log("Output:", interaction.output_text);
  } catch (error) {
    console.error("FAILED");
    console.error(error);
  }
}

main();