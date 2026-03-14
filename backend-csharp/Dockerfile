# Stage 1: Build React Frontend
FROM node:22-alpine AS frontend-build
WORKDIR /app

# Copy package files and .npmrc
COPY package.json package-lock.json .npmrc ./
RUN npm ci

# Copy frontend source and config
COPY src/ ./src/
COPY backend/ ./backend/
COPY config/ ./config/
COPY public/ ./public/
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY eslint.config.js ./
COPY index.html ./

# Build React app
RUN npm run build

# Stage 2: Build .NET Backend
FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS backend-build
WORKDIR /app

# Copy solution and projects
COPY backend-csharp/FantaF1.Backend.sln ./backend-csharp/
COPY backend-csharp/src/FantaF1.Api/FantaF1.Api.csproj ./backend-csharp/src/FantaF1.Api/
COPY backend-csharp/src/FantaF1.Application/FantaF1.Application.csproj ./backend-csharp/src/FantaF1.Application/
COPY backend-csharp/src/FantaF1.Domain/FantaF1.Domain.csproj ./backend-csharp/src/FantaF1.Domain/
COPY backend-csharp/src/FantaF1.Infrastructure/FantaF1.Infrastructure.csproj ./backend-csharp/src/FantaF1.Infrastructure/
# Test projects referenced in the solution
COPY backend-csharp/tests/FantaF1.Tests.Unit/FantaF1.Tests.Unit.csproj ./backend-csharp/tests/FantaF1.Tests.Unit/
COPY backend-csharp/tests/FantaF1.Tests.Integration/FantaF1.Tests.Integration.csproj ./backend-csharp/tests/FantaF1.Tests.Integration/
COPY backend-csharp/tests/FantaF1.Tests.Contract/FantaF1.Tests.Contract.csproj ./backend-csharp/tests/FantaF1.Tests.Contract/

# Restore dependencies
RUN dotnet restore backend-csharp/FantaF1.Backend.sln

# Copy all C# source code
COPY backend-csharp/ ./backend-csharp/

# Publish Api
RUN dotnet publish backend-csharp/src/FantaF1.Api/FantaF1.Api.csproj -c Release -o /app/publish

# Stage 3: Final Runtime Image
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS runtime
WORKDIR /app

# Install dependencies if any (e.g., icu-libs for globalization)
RUN apk add --no-cache icu-libs
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false

# Copy React build
COPY --from=frontend-build /app/dist ./dist

# Copy .NET publish
COPY --from=backend-build /app/publish .

# Copy necessary project markers for the path resolution logic
COPY AGENTS.md PROJECT.md ./

# Copy config files
COPY config/ ./config/

# Environment variables
ENV ASPNETCORE_URLS=http://+:3001
ENV Frontend__BuildPath=./dist
ENV DOTNET_ENVIRONMENT=Production

EXPOSE 3001

ENTRYPOINT ["dotnet", "FantaF1.Api.dll"]
