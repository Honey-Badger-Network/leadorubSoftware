FROM node:20-slim

WORKDIR /app

# 1. Копируем файлы зависимостей (ОБА файла обязательны для npm ci)
COPY package.json package-lock.json ./

# 2. Запускаем чистую установку пакетов (теперь без ошибок)
RUN npm ci

# 3. Копируем готовый клиентский билд и файлы сервера
COPY client/dist ./client/dist
COPY server/ ./server

EXPOSE 4000
EXPOSE 8000

CMD ["npm", "start"]
