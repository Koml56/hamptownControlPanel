# Real-Time Multi-Device Sync System — Документація

## Архітектура
- **Операційна модель:** Всі зміни даних (tasks, employees, prepItems, storeItems, dailyData, completedTasks) виконуються через SyncOperation.
- **WebSocket:** Всі операції надсилаються через WebSocketManager з пріоритетами (critical, normal, background).
- **Offline-черга:** Операції зберігаються в IndexedDB, автоматично надсилаються при відновленні зʼєднання.
- **VectorClock:** Для вирішення конфліктів між пристроями використовується векторний годинник.
- **Оптимізація:** Компакція журналу, TTL, batch, throttle-логування, моніторинг продуктивності.

## Основні компоненти
- **OperationManager:** Генерація, застосування, вирішення конфліктів, rollback операцій.
- **VectorClock:** Порівняння, злиття, інкремент годинників для кожного пристрою.
- **WebSocketManager:** Постійне зʼєднання, автоматичне відновлення, пріоритети.
- **OfflineQueue:** Зберігання, компакція, TTL, batch-обробка, видалення застосованих операцій.
- **SyncStatusIndicator:** UI-індикатор статусу синхронізації та конфліктів.

## Як додати новий тип даних у sync
1. Створіть файл `XOperations.ts` з функціями:
   - createOperation, applyOperation, resolveConflicts, rollbackOperations
2. Додавайте всі зміни через ці функції, а не напряму через setXxx.
3. Для відправки — використовуйте wsManager.sendOperation або sendTaskOperationWithOffline.
4. Для offline — всі операції автоматично потрапляють у IndexedDB.

## Пріоритети sync
- **critical:** (Layer 1) — миттєво, без batch (наприклад, завершення задачі)
- **normal:** (Layer 2) — batch, debounce (редагування задач, співробітників)
- **background:** (Layer 3) — великі дані, аналітика, з затримкою

## Вирішення конфліктів
- Всі операції мають vectorClock.
- При одночасних змінах — застосовується найсвіжіша операція (або за timestamp).
- Конфлікти відображаються у SyncStatusIndicator.

## Offline-режим
- Операції зберігаються у IndexedDB (offlineQueue).
- При поверненні онлайн — автоматично надсилаються з урахуванням пріоритету.
- Старі операції (TTL) та дублікати видаляються.

## Тестування
- Юніт-тести: OperationManager, VectorClock, OfflineQueue.
- Інтеграційні тести: багатопристроєва sync, offline, конфлікти.
- Запуск: `npx jest --config jest.config.js --verbose`

## Розширення
- Для повної fault-tolerance рекомендується додати SessionManager з heartbeat.
- Для складних конфліктів — UI для ручного вирішення.

---

**Питання/запити — звертайтесь до розробника!**
