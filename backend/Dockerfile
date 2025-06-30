# Stage 2: Run the app
FROM docker.io/node:20-alpine
WORKDIR /app
COPY --from=build /app .

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

ENV MONGO_URL=mongodb://mongo:27017/mydb
EXPOSE 3000
CMD ["node", "index.js"]
