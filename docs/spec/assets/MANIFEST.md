# Asset Manifest

> Bỏ vào đây: danh sách tài nguyên cần dùng trong app.  
> File thực tế → đặt vào thư mục tương ứng trong `mobile/assets/`.  
> AI đọc file này để biết import đường dẫn nào, dùng ở đâu.

---

## CẤU TRÚC THƯ MỤC ASSETS

```
mobile/assets/
├── images/          ← Ảnh tĩnh (logo, background, placeholder)
├── icons/           ← Icon custom (nếu không dùng thư viện icon)
├── fonts/           ← Font tùy chỉnh
└── mockups/         ← Mockup / wireframe (chỉ để tham khảo, không bundle vào app)
```

---

## TEMPLATE

```
## [Tên tài nguyên]

**File**: `assets/[thư mục]/[tên file]`
**Dùng ở**: [component / screen]
**Kích thước**: [width × height]
**Ghi chú**: [mô tả thêm]
```

---

## IMAGES

| Asset | File | Dùng ở | Kích thước |
|---|---|---|---|
| Logo app | `assets/images/logo.png` | LoginScreen, SplashScreen | 200×200 |
| Placeholder sản phẩm | `assets/images/product-placeholder.png` | ProductCard, ProductDetail | 80×80 |
| Avatar placeholder | `assets/images/avatar-placeholder.png` | ProfileScreen, ProductCard owner | 40×40 |

<!-- THÊM ẢNH VÀO ĐÂY -->

---

## ICONS

> Dự án dùng `@expo/vector-icons` (Ionicons) — không cần file icon riêng.  
> Chỉ thêm vào bảng này nếu cần icon custom (SVG, PNG).

| Icon | File | Dùng ở |
|---|---|---|
| — | — | — |

<!-- THÊM ICON CUSTOM VÀO ĐÂY -->

---

## FONTS

> Dự án dùng System font (SF Pro / Roboto) mặc định.  
> Thêm vào đây nếu cần custom font (cài qua `npx expo install expo-font`).

| Font | File | Weight | Dùng cho |
|---|---|---|---|
| — | — | — | — |

<!-- THÊM FONT VÀO ĐÂY -->

---

## MOCKUPS (chỉ để tham khảo)

| Màn hình | File |
|---|---|
| — | — |

<!-- ĐẶT FILE MOCKUP VÀO assets/mockups/ RỒI GHI VÀO ĐÂY -->
