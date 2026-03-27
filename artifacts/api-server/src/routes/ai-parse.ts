import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth.js";
import { ParseJobWithAIBody as ParseJobBodySchema } from "@workspace/api-zod";
import { GoogleGenAI } from "@google/genai";

const router: IRouter = Router();

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY ?? "",
  httpOptions: {
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

router.post("/parse-job", requireAuth, async (req, res) => {
  const parsed = ParseJobBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: parsed.error.message });
    return;
  }
  const { text, language } = parsed.data;

  const prompt = `You are a job posting parser for a labor marketplace in Israel. Extract structured job data from the following text.

Input text: "${text}"
Language hint: ${language ?? "auto-detect (could be Arabic, Hebrew, or English)"}

Return ONLY a valid JSON object with these fields (all optional except title):
- title (string): Job title/role in English
- location (string): Specific location/address
- city (string): City name in English (e.g. "Rahat", "Beer Sheva", "Nazareth", "Tel Aviv")
- salary (number): Salary amount as a number
- salaryType (string): one of "hourly", "daily", "fixed"  
- jobDate (string): Date in YYYY-MM-DD format if mentioned, or descriptive like "tomorrow"
- description (string): Any additional details

Infer salaryType from context: if per hour → "hourly", if for a full day/shift → "daily", if total for job → "fixed".
If ILS/₪/شيكل/שקל is mentioned, that's the currency (ignore it, just extract the number).

Return only the JSON, no explanation.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json", maxOutputTokens: 8192 },
    });

    const rawText = response.text ?? "{}";
    let jsonStr = rawText.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "");
    }
    const result = JSON.parse(jsonStr);
    res.json({
      title: result.title ?? "Job Position",
      location: result.location ?? null,
      city: result.city ?? null,
      salary: result.salary ?? null,
      salaryType: result.salaryType ?? null,
      jobDate: result.jobDate ?? null,
      description: result.description ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "AI parsing failed");
    res.status(500).json({ error: "AIError", message: "Failed to parse job description" });
  }
});

export default router;
