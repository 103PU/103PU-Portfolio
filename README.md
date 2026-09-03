# 103PU — Portfolio

Portfolio tĩnh, không build step, không `package.json`: HTML + CSS + JS thuần.

Ngôn ngữ thiết kế: kính mờ trên nền tối lạnh, một accent duy nhất
(`#0A84FF` ở dark, `#0066CC` ở light), chữ Geist. Hero có một cụm kính 3D
xoay theo con trỏ, dựng bằng Three.js nạp từ CDN.

## Cấu trúc

| Đường dẫn | Việc của nó |
|---|---|
| `index.html` | trang chủ |
| `cv.html` | CV, có chế độ in đen trắng (Ctrl+P) |
| `css/style.css` | trang chủ |
| `css/cv.css` | CV |
| `js/main.js` | nav, reveal khi scroll, chuyển VI/EN |
| `js/scene.js` | cụm kính 3D (Three.js, ES module) |
| `assets/` | favicon, avatar, icon |

## Chạy local

`js/scene.js` là ES module nên `file://` không nạp được (origin `null`).
Cần một server tĩnh:

```bash
python -m http.server 8000
# rồi mở http://127.0.0.1:8000
```

Mở trực tiếp bằng `file://` vẫn xem được toàn trang — chỉ mất cụm kính 3D,
chỗ đó rơi về ảnh tĩnh.

## Khả năng truy cập

- `prefers-reduced-motion: reduce` → không mount WebGL, dùng nền tĩnh thay thế
- `prefers-color-scheme` → sáng/tối, tint của cụm kính đổi theo
- Vòng `:focus-visible` trên mọi control bàn phím

## Còn dở

- 4 ảnh project là placeholder Unsplash, chưa phải capture thật
- Form liên hệ chưa có endpoint, submit không đi đâu cả
