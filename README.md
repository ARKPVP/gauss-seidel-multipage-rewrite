# Gauss–Seidel Multi-page Calculator — Rewritten Version

เว็บ static 6 หน้า สำหรับแก้ระบบสมการเชิงเส้นด้วย Gauss–Seidel แบบทำซ้ำ โดยเขียนใหม่จาก repository ที่รีวิว และอิงวิธีจาก `NUM-Chapter-04 (1).pdf` หัวข้อ 3.6

## จุดสำคัญ

- ไม่มีการสุ่มข้อมูล
- ตัวอย่างในโปรแกรมคือ Example 3.6 จากเอกสารที่ให้มา
- รองรับ 2-8 ตัวแปร
- ปฏิเสธช่องว่าง/NaN/Infinity แทนการแปลงเป็น 0
- ตรวจระบบไม่มีคำตอบร่วม / ไม่มีคำตอบเอกลักษณ์ก่อน iterate
- สลับเฉพาะทั้งแถวสมการเมื่อ diagonal เป็นศูนย์หรือใกล้ศูนย์
- ใช้ค่าที่เพิ่งคำนวณได้ทันทีในรอบเดียวกันตาม Gauss–Seidel
- แสดง formula, substitution, iteration history, stopping error และ residual `||b-Ax||∞`
- มีเกณฑ์หยุดแบบตามเอกสาร และเกณฑ์ max-relative / max-absolute สำหรับการใช้งานทั่วไป
- มี automated tests

## โครงสร้าง

1. `index.html` — หลักการ
2. `input.html` — กรอก A และ b
3. `settings.html` — initial guess / tolerance / criterion / max iterations
4. `formulas.html` — การจัดรูปและที่มาของตัวเลข
5. `steps.html` — การแทนค่าทีละ iteration
6. `results.html` — ตารางผลและคำตอบ
7. `gauss-seidel.js` — numerical core เดียวที่ทุกหน้าใช้
8. `app.js` — UI/shared helpers
9. `style.css` — styles
10. `tests/` — Node tests
11. `REVIEW.md` — รายงาน review โค้ดเดิม

## รันเว็บไซต์

ไม่ต้องติดตั้ง dependency

```bash
python -m http.server 8000
```

จากโฟลเดอร์นี้ แล้วเปิด `http://localhost:8000/`

## รันทดสอบ

ต้องมี Node.js 18+

```bash
npm test
```

Expected: 12 tests pass.

## การอ้างอิงตัวอย่างในเอกสาร

ใช้ Example 3.6 จาก `NUM-Chapter-04 (1).pdf` หน้า 38-40:

```text
2x1 + 3x2 - 2x3 + 7x4 = -11
5x1       + 4x3       =  37
      2x2 + 5x3 - 4x4 =  31
6x1 + 2x2 + 3x3 + 5x4 =  28
```

เพื่อให้ diagonal ไม่เป็นศูนย์ ระบบคำนวณใช้ลำดับสมการ 1, 3, 2, 4 ซึ่งตรงกับการจัดรูปในตัวอย่างเอกสาร

## หมายเหตุเชิงตัวเลข

Diagonal dominance และ Sassenfeld criterion เป็นเงื่อนไขเพียงพอบางกรณี ไม่ใช่เงื่อนไขจำเป็นของการลู่เข้าทุกระบบ ดังนั้นโปรแกรมรายงานเป็น diagnostics เท่านั้น หากไม่ผ่านเกณฑ์ ระบบยังสามารถ iterate ได้จนกว่าจะผ่าน stopping criterion หรือครบ max iterations.

การตรวจ rank ก่อนคำนวณมีหน้าที่ปฏิเสธระบบที่ไม่มีคำตอบเอกลักษณ์เท่านั้น ไม่ได้ใช้หาคำตอบแทน Gauss–Seidel.
