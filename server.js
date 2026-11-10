const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();
app.use(express.json({ limit: '10mb' }));

// جعل السيرفر يخدم ملفات الموقع (مثل index.html) مباشرة للزوار
app.use(express.static(__dirname));

// متغير لتخزين أحدث إجابة لكي تستطيع لوحة الـ ESP32 سحبها وعرضها
let latestAnswerForESP32 = "مساعد الواجبات جاهز\nقم بتصوير الواجب من الموقع.";

// مفاتيح الذكاء الاصطناعي الخاصة بك
const GEMINI_API_KEY = "AQ.Ab8RN6K8xNJSiOGViR7uWYUfnXtl98N-PbB7lGavpP9HI4hw2Q";
const OPENAI_API_KEY = "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";

app.post('/analyze', async (req, res) => {
    const { imageBase64, subject } = req.body; 
    let promptText = `قم بتحليل الأسئلة في الصورة لمادة ${subject}. إذا كانت الأسئلة خيارات، اعطني رقم السؤال مع الحرف الصحيح (مثلاً: 1: A). وإذا كانت بدون خيارات، اعطني رقم السؤال مع الإجابة المختصرة جداً. نسّق الإجابة بأسطر مرتبة.`;

    let finalAnswer = null;
    let usedModel = "";

    try {
        console.log("محاولة التحليل عبر Gemini...");
        usedModel = "Gemini";
        
        const geminiResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                contents: [{
                    parts: [
                        { text: promptText },
                        { inline_data: { mime_type: "image/jpeg", data: imageBase64 } }
                    ]
                }]
            }
        );

        finalAnswer = geminiResponse.data.candidates[0].content.parts[0].text;
        console.log("تم الحل بنجاح عبر Gemini");

    } catch (geminiError) {
        console.log("فشل Gemini، جاري التحويل الاحتياطي إلى ChatGPT...");
        
        try {
            usedModel = "ChatGPT";
            const openaiResponse = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: "gpt-4o",
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: promptText },
                                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
                            ]
                        }
                    ],
                    max_tokens: 500
                },
                {
                    headers: {
                        'Authorization': `Bearer ${OPENAI_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            finalAnswer = openaiResponse.data.choices[0].message.content;
            console.log("تم الحل بنجاح عبر ChatGPT");

        } catch (openaiError) {
            console.error("فشل كلا النماذج:", openaiError.message);
            return res.status(500).json({ success: false, error: "تعذر تحليل الصورة." });
        }
    }

    // حفظ الإجابة لتستطيع لوحة الـ ESP32 جلبها وعرضها
    latestAnswerForESP32 = finalAnswer;

    res.json({
        success: true,
        modelUsed: usedModel,
        answers: finalAnswer
    });
});

// مسار جديد خاص بالـ ESP32 لجلب أحدث إجابة تم حلها
app.get('/latest-answer', (req, res) => {
    res.json({ answer: latestAnswerForESP32 });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
