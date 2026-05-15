# Deploy Guide

## Phần 1: Deploy Apps Script Web App

### Bước 1: Mở Apps Script editor
1. Mở Google Sheet HTCV FPL
2. Extensions → Apps Script

### Bước 2: Copy code
1. Tạo các file: Code.gs, Index.html, Styles.html, Client.html
2. Copy nội dung từ repo vào từng file

### Bước 3: Deploy
1. Deploy → New deployment
2. Type: Web app
3. Execute as: Me
4. Who has access: Anyone
5. Click Deploy
6. Copy URL

### Bước 4: Test
1. Mở URL trong browser (không đăng nhập)
2. Kiểm tra dashboard load đúng
3. Test trên điện thoại

## Phần 2: Embed vào Google Sites

### Bước 1: Tạo/edit Google Site
1. sites.google.com
2. Tạo site mới hoặc edit site hiện có

### Bước 2: Embed dashboard
1. Insert → Embed → By URL
2. Paste Apps Script URL
3. Click Next → Insert

### Bước 3: Publish
1. Publish site
2. Set access: Anyone với link hoặc cụ thể

## Troubleshooting

### "Authorization required" khi xem
- Đảm bảo deploy với "Execute as: Me"
- Đảm bảo "Who has access: Anyone"

### Dashboard không load
- Check Apps Script editor → Executions xem có lỗi không
- Check browser console (F12) xem có error không

### Data không cập nhật
- Check FPL_Status sheet xem trigger có chạy không
- Run manual: HTCV FPL Tools → Refresh All Data Now
