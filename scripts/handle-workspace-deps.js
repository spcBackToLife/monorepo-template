const fs = require('fs');
const path = require('path');

// 获取所有包的路径
function getPackagePaths() {
    const dirs = ['packages', 'apps', 'tooling'].map((dir) => path.join(__dirname, '..', dir));
    const paths = [];

    dirs.forEach((dir) => {
        if (fs.existsSync(dir)) {
            const packages = fs
                .readdirSync(dir)
                .map((name) => path.join(dir, name, 'package.json'))
                .filter((file) => fs.existsSync(file));
            paths.push(...packages);
        }
    });

    // 添加根目录的 package.json
    const rootPackage = path.join(__dirname, '../package.json');
    if (fs.existsSync(rootPackage)) {
        paths.push(rootPackage);
    }

    return paths;
}

// 读取包信息
function readPackageJson(path) {
    return JSON.parse(fs.readFileSync(path, 'utf8'));
}

// 写入包信息
function writePackageJson(path, content) {
    fs.writeFileSync(path, JSON.stringify(content, null, 2) + '\n');
}

// 获取实际版本号
function getActualVersion(packageName, allPackages) {
    // 打印调试信息
    // console.log(`Looking for package: ${packageName}`, allPackages);

    const pkg = allPackages.find((p) => {
        // console.log(`Checking package: ${p.name} with version: ${p.version}`);
        return p.name === packageName;
    });

    if (!pkg) {
        // console.warn(`Warning: Could not find package ${packageName} in workspace`);
        return null;
    }

    if (!pkg.version) {
        // console.warn(`Warning: Package ${packageName} has no version specified`);
        return null;
    }

    return pkg.version;
}

// 处理依赖
function handleDependencies(dependencies, allPackages) {
    if (!dependencies) return dependencies;

    const newDeps = { ...dependencies };
    for (const [name, version] of Object.entries(newDeps)) {
        // 检查所有 workspace 相关的版本声明
        if (
            version === 'workspace:*' ||
            version === 'workspace:^' ||
            version.startsWith('workspace:')
        ) {
            const actualVersion = getActualVersion(name, allPackages);
            if (actualVersion) {
                newDeps[name] = actualVersion;
            }
        }
    }
    return newDeps;
}

// 转换 workspace 依赖为实际版本号
function replaceWorkspaceDeps() {
    const packagePaths = getPackagePaths();
    const packages = packagePaths.map((path) => ({
        path,
        ...readPackageJson(path),
    }));

    packages.forEach((pkg) => {
        const originalPkg = readPackageJson(pkg.path);
        // 只修改依赖相关的字段
        const newPkg = {
            ...originalPkg,
            dependencies: handleDependencies(originalPkg.dependencies, packages),
            devDependencies: handleDependencies(originalPkg.devDependencies, packages),
            peerDependencies: handleDependencies(originalPkg.peerDependencies, packages),
        };

        writePackageJson(pkg.path, newPkg);
    });
}

// 恢复 workspace 依赖
function restoreWorkspaceDeps() {
    const packagePaths = getPackagePaths();
    const packages = packagePaths.map((path) => ({
        path,
        ...readPackageJson(path),
    }));

    packages.forEach((pkg) => {
        const originalPkg = readPackageJson(pkg.path);
        const newPkg = { ...originalPkg };

        ['dependencies', 'devDependencies', 'peerDependencies'].forEach((depType) => {
            if (newPkg[depType]) {
                Object.keys(newPkg[depType]).forEach((dep) => {
                    if (packages.some((p) => p.name === dep)) {
                        newPkg[depType][dep] = 'workspace:*';
                    }
                });
            }
        });

        writePackageJson(pkg.path, newPkg);
    });
}

// 导出函数
module.exports = {
    replaceWorkspaceDeps,
    restoreWorkspaceDeps,
};
