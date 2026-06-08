const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")
const puppeteer = require("puppeteer")

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})

// Validation Schema
const interviewReportSchema = z.object({
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job description"),
    title: z.string().describe("The title of the job for which the interview report is generated"),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question brief")
    })).describe("Technical questions that can be asked in the interview"),
    skillGaps: z.array(z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z.enum([ "low", "medium", "high" ]).describe("The severity of this skill gap")
    })).describe("List of skill gaps")
})

// 1. GENERATE INTERVIEW REPORT FUNCTION
async function generateInterviewReport({ resume, selfDescription, jobDescription }) {
    
    // --- TEMPORARY MOCK BYPASS (Google 503 Server Error se bachne ke liye) ---
    console.log("Bypassing AI call to avoid 503 Overload Error. Returning Mock Data...");
    
    return {
        matchScore: 85,
        title: "Software Developer Intern",
        technicalQuestions: [
            {
                question: "Explain the Event Loop in Node.js and how it handles asynchronous operations.",
                intention: "To assess the candidate's deep understanding of the Node.js runtime environment.",
                answer: "The event loop offloads operations to the system kernel whenever possible. It executes phases like timers, I/O callbacks, poll, check, and close callbacks sequentially."
            },
            {
                question: "What are the common strategies for implementing caching with Redis in a Node.js application?",
                intention: "To evaluate candidate's knowledge of performance optimization.",
                answer: "Common strategies include the Cache-Aside (Lazy Loading) pattern, where the app checks the cache first, then hits the DB and updates the cache if there is a miss."
            }
        ],
        skillGaps: [
            {
                skill: "Redis Caching",
                severity: "medium"
            },
            {
                skill: "System Design Patterns",
                severity: "low"
            }
        ]
    };

    /* // SERVER SAHI CHALNE PAR IS CODE KO UNCOMMENT KAR LENA:
    const prompt = `Generate an interview report for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}`

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash", 
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(interviewReportSchema),
        }
    })
    return JSON.parse(response.text)
    */
}

// 2. GENERATE PDF BUFFER
async function generatePdfFromHtml(htmlContent) {
    const browser = await puppeteer.launch()
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" })

    const pdfBuffer = await page.pdf({
        format: "A4", margin: {
            top: "20mm",
            bottom: "20mm",
            left: "15mm",
            right: "15mm"
        }
    })

    await browser.close()
    return pdfBuffer
}

// 3. GENERATE RESUME PDF FUNCTION
async function generateResumePdf({ resume, selfDescription, jobDescription }) {

    const resumePdfSchema = z.object({
        html: z.string().describe("The HTML content of the resume")
    })

    const prompt = `Generate resume for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}
                        The resume should be simple, professional, and max 1 page.`

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash", 
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(resumePdfSchema),
        }
    })

    const jsonContent = JSON.parse(response.text)
    const pdfBuffer = await generatePdfFromHtml(jsonContent.html)
    return pdfBuffer
}

module.exports = { generateInterviewReport, generateResumePdf }