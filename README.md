# Статичний сайт Sildram Studio

Структура проєкту:

- `index.html` — головна сторінка
- `business.html` — AI для бізнесу
- `personal.html` — персональні AI-асистенти
- `websites.html` — розробка сайтів
- `about.html` — сторінка про команду та контактна форма
- `contacts.html` — сторінка контактів і форма заявки
- `integrations.html` — додаткова сторінка про інтеграції
- `assets/` — спільні стилі, скрипти та майбутні локальні зображення

## Як відкрити локально

1. Відкрий папку проєкту Sildram Studio у VS Code.
2. Установи розширення Live Server.
3. Натисни правою кнопкою на `index.html` → відкрити через Live Server.

Для роботи AI-чату без видимого API-ключа запускай сайт через сервер:

1. Скопіюй `.env.example` у `.env`.
2. Додай у `.env` свій `OPENAI_API_KEY`.
3. Для CAPTCHA створи Cloudflare Turnstile widget і додай `TURNSTILE_SITE_KEY` та `TURNSTILE_SECRET_KEY` у `.env`.
4. Для відправлення заявок додай `RESEND_API_KEY`, `CONTACT_TO_EMAIL` та `CONTACT_FROM_EMAIL`.
5. Запусти `npm install`, потім `npm start`.
6. Відкрий `http://localhost:3000`.

API-ключ зберігається тільки на сервері та не потрапляє у браузер.
Turnstile secret key також зберігається тільки на сервері. У браузер передається лише публічний site key.
Resend API key використовується тільки в `server.js`; форма надсилає дані на `/api/contact`.

## Безпека

- `.env` і `.env.*` додані в `.gitignore`, щоб секрети не потрапили в репозиторій.
- Сервер не віддає dotfiles, архіви, `server.js`, `package.json` і `node_modules`.
- Для AI-чату є rate limit і перевірка Cloudflare Turnstile.
- Додані базові security headers: CSP, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.

## Як редагувати

Тексти змінюються прямо в HTML-файлах.
Спільні стилі знаходяться у `assets/site.css`.
Невелика логіка для плавного переходу до форми знаходиться у `assets/site.js`.
Перемикання мов UA/RU/EN також знаходиться у `assets/site.js`: сайт зберігає вибрану мову в браузері та перекладає видимі тексти після перемикання.

## Як деплоїти

Можна завантажити всю папку на Vercel або Node.js-хостинг.
Для звичайного хостингу головним файлом має бути `index.html`.

Папка `api/` містить Vercel Functions для конфігурації, AI-чату та контактної форми.
Локальний запуск через `npm start` продовжує використовувати `server.js`.

На Vercel додай у Project Settings → Environment Variables:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `RESEND_API_KEY`
- `CONTACT_TO_EMAIL`
- `CONTACT_FROM_EMAIL`

Для `CONTACT_FROM_EMAIL` потрібна адреса на домені, підтвердженому в Resend.
