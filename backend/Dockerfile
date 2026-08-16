FROM node:20-alpine

WORKDIR /app

# mongodb-memory-server binarini yuklab olishga urinmasin (biz mongo servisiga ulanamiz)
ENV MONGOMS_DISABLE_POSTINSTALL=1

# Avval faqat manifestlar — layer cache uchun
COPY package*.json ./
RUN npm ci --omit=dev

# Qolgan kod
COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
