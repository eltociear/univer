# style-univer

简体中文 | [English](./README.md)

## 介绍

UniverSheet Group 插件

### 安装

```shell
npm i @univerjs/sheets-plugin-group
```

### 使用

```js
import { Group } from '@univerjs/sheets-plugin-group';

const univerSheet = new UniverSheet();
univerSheet.installPlugin(new Group());
```

## 本地开发

### 环境

-   [Node.js](https://nodejs.org/en/) Version >= 10
-   [npm](https://www.npmjs.com/) Version >= 6

### 安装

```
pnpm install
```

### 开发

```
# 当前目录 ./packages/sheets-plugin-group/
npm run dev

# 或者项目根目录 ./
pnpm run --filter  @univerjs/sheets-plugin-group dev
```

### 打包

```
# 当前目录 ./packages/sheets-plugin-group/
npm run build

# 或者根目录 ./
pnpm run --filter  @univerjs/sheets-plugin-group build
```