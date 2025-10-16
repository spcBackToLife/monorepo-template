#!/bin/bash


echo "✅ 手动确认完成，继续发布流程..."

# 检查并自动提交未保存的更改
if [ -n "$(git status --porcelain)" ]; then
    echo "Found uncommitted changes, automatically committing..."
    git add .
    git commit --no-verify -m "chore: prepare for release" || exit 1
fi

# 切换到 Node.js 22
echo "Switching to Node.js 22..."
. ~/.nvm/nvm.sh  # 加载 nvm
nvm use 22 || exit 1

# 执行 prerelease
echo "Running prerelease..."
pnpm run prerelease || exit 1

# 提交更改
# echo "Committing changes..."
# git add .
# read -p "Enter commit message (default: chore: release): " commit_message
# commit_message=${commit_message:-"chore: release"}
# git commit --no-verify -m "$commit_message" || exit 1

# 创建 changeset
echo "Creating changeset..."
pnpm changeset || exit 1

# 更新版本
echo "Updating versions..."
pnpm version-packages || exit 1

# 构建
echo "Building packages..."
pnpm build:jarvis || exit 1

# 切换到 Node.js 16
echo "Switching to Node.js 16..."
nvm use 16 || exit 1

# 登陆
echo "SSO 登陆..."
npm login --auth-type=sso || exit 1

# 登陆用户
echo "登陆用户..."
npm whoami || exit 1

# 发布
echo "Publishing packages..."
pnpm release:only || exit 1

# 执行 postrelease
# echo "Running postrelease..."
# pnpm run postrelease || exit 1

# 提交最终更改
echo "Committing final changes..."
git add .
git commit --no-verify -m "chore: update versions" || exit 1

# 推送到远程仓库
read -p "Do you want to push changes to remote? (y/N) " should_push

if [[ $should_push =~ ^[Yy]$ ]]; then
    echo "Pushing changes to origin/$current_branch..."
    git push origin "$current_branch" || exit 1
fi
echo "Switching to Node.js 22..."
nvm use 22 || exit 1

echo "Release process completed successfully!" 