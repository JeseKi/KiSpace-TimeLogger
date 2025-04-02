# 使用 node:22 作为基础镜像
FROM node:22

# 安装 Python 3.10
RUN apt-get update && apt-get install -y \
    python3.10 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# 设置 pip 源为清华源
RUN pip3 config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple

# 设置工作目录
WORKDIR /app

# 复制前端和后端代码
COPY frontend /app/frontend
COPY src /app/src

# 安装前端依赖
WORKDIR /app/frontend
RUN pnpm install

# 安装后端依赖
WORKDIR /app/src
RUN pip3 install -r requirements.txt

# 复制 .env 文件到前端 src 目录
COPY .env /app/frontend/src/.env

# 打包前端
WORKDIR /app/frontend
RUN pnpm build

# 将 dist 文件复制到后端目录
RUN cp -r /app/frontend/dist /app/src/dist

# 启动应用
WORKDIR /app/src
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]