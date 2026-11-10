const express = require('express');
const path = require('path');
const app = express();
app.use(express.json({ limit: '10mb' }));

// جعل السيرفر يخدم ملفات الموقع (مثل index.html) مباشرة للزوار
app.use(express.static(__dirname));

// متغير لتخزين أحدث إجابة لكي تستطيع لوحة الـ ESP32 سحبها وعرضها
let latestAnswerForESP32 = "مساعد الواجبات جاهز\nقم بتصوير الواجب من الموقع.";

// استقبال الإجابة من الموقع وتخزينها للوحة الـ ESP32
app.post('/update-answer', (req, res) => {
    latestAnswerForESP32 = req.body.answer;
    res.json({ success: true });
});

// مسار خاص بالـ ESP32 لجلب أحدث إجابة تم حلها
app.get('/latest-answer', (req, res) => {
    res.json({ answer: latestAnswerForESP32 });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});