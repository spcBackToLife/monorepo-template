#!/bin/bash

# 检查当前分支是否为 feature/ai-ui-task
echo "Checking current branch..."
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$current_branch" != "feature/ai-ui-task" ]; then
    echo "❌ Error: Current branch is '$current_branch', but release must be done from 'feature/ai-ui-task' branch."
    echo "Please switch to the correct branch: git checkout feature/ai-ui-task"
    exit 1
fi
echo "✅ Current branch check passed: $current_branch"

# 检查分支是否为最新
echo "Checking if branch is up to date..."
git fetch origin >/dev/null 2>&1

# 获取本地和远程分支的 commit hash
local_commit=$(git rev-parse HEAD)
remote_commit=$(git rev-parse origin/$current_branch 2>/dev/null)

if [ $? -ne 0 ]; then
    echo "❌ Error: Remote branch 'origin/$current_branch' not found."
    echo "Please push your branch to remote first or check if the branch name is correct."
    exit 1
fi

# 检查本地分支是否落后于远程分支
behind_count=$(git rev-list --count HEAD..origin/$current_branch 2>/dev/null)
ahead_count=$(git rev-list --count origin/$current_branch..HEAD 2>/dev/null)

if [ "$behind_count" -gt 0 ]; then
    echo "❌ Error: Your local branch is $behind_count commit(s) behind the remote branch."
    echo "Please pull the latest changes: git pull origin $current_branch"
    exit 1
fi

if [ "$ahead_count" -gt 0 ]; then
    echo "⚠️  Warning: Your local branch is $ahead_count commit(s) ahead of the remote branch."
    echo "This means you have unpushed commits."
    read -p "Do you want to continue with release? (y/N) " confirm_ahead
    if [[ ! $confirm_ahead =~ ^[Yy]$ ]]; then
        echo "Release cancelled. Please push your commits first: git push origin $current_branch"
        exit 1
    fi
fi

if [ "$local_commit" = "$remote_commit" ]; then
    echo "✅ Branch is up to date with remote."
else
    echo "✅ Branch sync check completed."
fi

# 手动确认 Merge Request 状态
echo "⚠️  请手动确认以下事项："
echo "  1. 所有相关的 Merge Request 已经被合并或关闭"
echo "  2. 没有待处理的 MR 会影响此次发布"
echo "  3. 代码审查已经完成"
echo "  4. 测试已经通过"
echo ""
echo "如果以上所有事项都已确认完成，请输入：已经完成确认"
echo ""
read -p "请输入确认信息: " confirmation

if [ "$confirmation" != "已经完成确认" ]; then
    echo "❌ 确认信息不正确。发布已取消。"
    echo "请确保所有 MR 都已处理完成后再次运行此脚本。"
    exit 1
fi

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