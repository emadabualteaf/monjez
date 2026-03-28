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

  const prompt = `You are an expert job posting parser for a labor marketplace in Israel serving the Arab and Jewish communities.

You must understand local dialects, slang, and mixed-language expressions including:
- Palestinian/Israeli Arabic dialects (Negev Bedouin, Triangle/Wadi Ara, Galilee Arabic)
- Hebrew slang mixed with Arabic (e.g., "بدي عمال للבנייה", "צריך פועלים בנגב")
- Common Israeli Arab work slang:
  * "بدي شخص" / "בدي بنده" = I need someone
  * "شيفت" = shift
  * "يومية" / "יומי" = daily wage
  * "يهودية" = Jewish cities/areas
  * "مقاول" = contractor
  * "بناء" / "בנייה" = construction
  * "نظافة" / "נקיון" = cleaning
  * "مطعم" / "מסעדה" = restaurant
  * "מחר" / "بكرا" / "بكره" = tomorrow
  * "ألف" / "אלף" = thousand (salary indicator)
  * "شيكل" / "שקל" / "₪" = ILS currency
  * Cities: رهط (Rahat), كفر قاسم (Kafr Qasim), أم الفحم (Umm al-Fahm), شفا عمر (Shfaram), الناصرة (Nazareth/النصره), بئر السبع (Beer Sheva), تل ابيب (Tel Aviv)

Input text: "${text}"
Language hint: ${language ?? "auto-detect (likely Arabic, Hebrew, or mixed)"}

Return ONLY a valid JSON object with these fields (all optional except title):
- title (string): Job title/role in Arabic (keep it natural, e.g. "نادل", "عامل بناء", "سائق")
- location (string): Specific location/address if mentioned
- city (string): City name in Arabic as commonly used (e.g. "رهط", "الناصرة", "حيفا", "تل أبيب")
- salary (number): Salary amount as a number only
- salaryType (string): one of "hourly", "daily", "fixed"
  * hourly: if per hour (ساعة/שעה)
  * daily: if for a full day/shift (يوم/يومي/שיפט/יום)
  * fixed: if total for the whole job (مقطوع/כולל)
- jobDate (string): Date in YYYY-MM-DD format if exact, or "غداً" / "اليوم" if relative
- description (string): Any additional job details, requirements, or context

Return only the JSON, no explanation, no markdown.`;

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
      title: result.title ?? "وظيفة",
      location: result.location ?? null,
      city: result.city ?? null,
      salary: result.salary ?? null,
      salaryType: result.salaryType ?? null,
      jobDate: result.jobDate ?? null,
      description: result.description ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "AI parsing failed");
    res.status(500).json({ error: "AIError", message: "فشل تحليل الوصف الوظيفي" });
  }
});

export default router;
