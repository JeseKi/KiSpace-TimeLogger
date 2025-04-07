# 使用 node:22 作为基础镜像
FROM node:22

# 安装 Python 3.10
RUN apt-get update && apt-get install -y \
    python3.10 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 复制前端代码
COPY frontend /app/frontend

# 复制后端代码
COPY backend /app/backend

# 安装前端依赖
WORKDIR /app/frontend
RUN npm install -g pnpm && pnpm i

# 安装后端依赖
WORKDIR /app/backend
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip3 install -r /app/backend/requirements.txt

# 复制 .env 文件到前端
COPY .env /app/frontend

# 打包前端
WORKDIR /app/frontend
RUN pnpm run build

# 将 dist 文件复制到后端目录
RUN cp -r /app/frontend/dist /app/backend

# 启动应用
WORKDIR /app/backend
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]