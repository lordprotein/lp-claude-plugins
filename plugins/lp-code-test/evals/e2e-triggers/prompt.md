---
max_turns: 12
allowed_tools: [Read, Glob, Grep, Skill]
timeout_seconds: 600
---

Нужен e2e-тест в браузере (Playwright) на сценарий входа: пользователь открывает /login, вводит email и пароль, нажимает «Войти» и попадает на /profile со своим именем в шапке. При неверном пароле остаётся на /login и видит ошибку «Неверный email или пароль».
