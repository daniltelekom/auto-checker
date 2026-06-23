# autochecker

Next.js монорепозиторий с shadcn/ui (Radix, Vega).

## Структура

```
auto-checker/
├── apps/web/              # Next.js приложение
├── packages/ui/           # UI-компоненты (shadcn)
├── packages/eslint-config/
└── packages/typescript-config/
```

## Запуск

```bash
npm install
npm run dev
```

## Добавление компонентов shadcn

Команды запускайте из папки приложения:

```bash
cd apps/web
npx shadcn@latest add button textarea card
```

Компоненты создаются в `packages/ui/src/components/`.

## Использование компонентов

```tsx
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import { Textarea } from "@workspace/ui/components/textarea"
```
