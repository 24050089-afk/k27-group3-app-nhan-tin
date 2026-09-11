# Proxy

Ung dung nhan tin full-stack gom backend Express/Sequelize/MySQL va mobile React Native Expo.

## Tinh Nang

- Dang ky, dang nhap, quen/doi mat khau.
- Tim user, ket ban, chan user.
- Chat rieng va chat nhom.
- Tin nhan realtime bang Socket.IO.
- Trang thai gui/nhan/xem, reaction va thu hoi.
- Gui anh toi da 10 MB.
- Giao dien sang/toi va safe-area mobile.

## Chay Du An

Backend + MySQL:

```bash
docker compose up --build
```

Mobile:

```bash
cd mobile
npm install
npm run start:clear
```

API development duoc expose tai port `4000`; mobile tu resolve LAN host cua Expo.

## Tai Lieu

- `docs/INDEX.md`: chi muc runtime hien tai.
- `docs/spec/data/api.md`: API contracts.
- `docs/spec/data/schema.md`: Sequelize schema.
- `docs/features/messaging.md`: trace messaging.
- `docs/AGENTS.md`: quy tac lam viec.

Code commerce cu da duoc go khoi runtime. Cac bang MySQL cu, neu con, khong bi drop tu dong va can migration/backup rieng de xoa.
