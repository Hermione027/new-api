客户端配置教程

<div style="margin: 12px 0 16px; padding: 14px 16px; border: 2px solid #ff4d4f; border-radius: 10px; background: #fff1f0;">
  <p style="margin: 0 0 8px; color: #cf1322; font-size: 20px; font-weight: 700;">🔥 QQ 交流群：1082916395</p>
  <p style="margin: 0 0 8px; color: #cf1322; font-weight: 600;">🔗 加群链接：<a href="https://qm.qq.com/q/KeuCKEMzim">https://qm.qq.com/q/KeuCKEMzim</a></p>
  <p style="margin: 0; color: #cf1322; font-weight: 600;">💬 建议先加群：很多时候平台通知不一定能及时送达，发货通知、维护通知、模型变动通知都会更方便同步；不会配置、遇到报错也可以直接进群咨询</p>
</div>

本文适用于站点：<https://newapi.20200626.xyz>

如果你还没决定用哪个客户端，**首推 Cherry Studio**：界面友好、配置简单、适合新手，日常使用也很方便。

常用页面：

- 控制台地址：<https://newapi.20200626.xyz/console>
- 令牌管理：<https://newapi.20200626.xyz/console/token>
- 模型价格页：<https://newapi.20200626.xyz/pricing>

---

## 一、接入前先准备好 3 个信息

在接入任何客户端前，你只需要准备下面 3 项：

1. **站点地址**
   - `https://newapi.20200626.xyz`
2. **OpenAI Base URL**
   - `https://newapi.20200626.xyz/v1`
3. **API Key**
   - 在令牌管理页面创建并复制
   - 完整密钥格式为：`sk-xxxxxxxx`

> 大多数客户端只要填好 `Base URL + API Key + 模型名称` 就能直接使用。

---

## 二、创建 API Key（令牌）

### 1）登录站点

- 登录页：<https://newapi.20200626.xyz/login>
- 如果你还没有账号，请先注册或联系管理员开通账号。
- 如果你已经购买了额度，请先到额度兑换页面完成兑换：<https://newapi.20200626.xyz/console/topup>

![额度兑换流程](./images/额度兑换流程.gif)

### 2）打开令牌管理

进入：

- <https://newapi.20200626.xyz/console/token>

### 3）点击“新建”创建令牌

创建时建议这样填写：

- **名称**：随意，方便自己区分即可
- **令牌分组**：按你的实际使用选择
- **过期时间**：按需设置，可先留空
- **额度**：按需设置
- **模型限制列表**：如果没有特殊需求，建议先留空
- **IP 白名单**：没有特殊需求可先留空

![创建 API Key（令牌）](./images/创建令牌.gif)

### 4）创建完成后复制密钥

创建成功后，在令牌列表中点击复制，拿到完整的：

```text
sk-xxxxxxxxxxxxxxxx
```

后面所有客户端都填写这个完整 key。

---

## 三、查看可用模型和价格

模型与价格页：

- <https://newapi.20200626.xyz/pricing>

常见模型示例包括：

- `gpt-5.4`
- `gpt-5.3-codex`
- `gpt-5.2`
- `gpt-5.1-codex-mini`
- `claude-opus-4-6-c`
- `claude-sonnet-4-6-c`
- `gemini-3-flash-c`
- `gemini-3.1-pro-low-c`

### 按次模型怎么看？

在本站当前模型命名里，很多 **带 `-c` 后缀** 的模型都是 **按次模型**。

例如：

- `gemini-3.1-pro-high-c`
- `gemini-3.1-pro-low-c`
- `gemini-3-flash-c`
- `claude-sonnet-4-6-c`
- `claude-opus-4-6-c`

这类模型更适合很多酒馆用户的使用习惯。  
不过最终仍请以 <https://newapi.20200626.xyz/pricing> 页面实际显示为准。

> 实际可用模型、分组和价格，请以你的账号页面显示为准。

---

## 四、通用填写说明

### 1）客户端填写 Base URL 时

如果客户端写的是 **OpenAI / OpenAI Compatible / OpenAI API / 自定义 OpenAI**，就填：

```text
https://newapi.20200626.xyz/v1
```

### 2）客户端填写站点主页时

如果客户端写的是 **站点地址 / 服务商主页 / Homepage**，就填：

```text
https://newapi.20200626.xyz
```

### 3）模型列表拉取失败时

如果客户端支持自动拉取模型列表但拉取失败，直接手动填模型 ID 即可。

### 4）API Key 的填写方式

API Key 一律填写你创建的完整密钥：

```text
sk-xxxxxxxxxxxxxxxx
```

---

## 五、常见客户端接入

### 1）Cherry Studio（首推）

**优先推荐 Cherry Studio**。

- 界面直观，适合新手
- 配置简单，上手快
- 日常对话、模型切换都比较方便
- 配置简单，推荐直接手动填写

#### 下载地址

- 官网下载：<https://www.cherry-ai.com>

#### 首次打开时先选对接入方式

> **重要提醒：** Cherry Studio 安装完成后，首次打开会优先展示 **Cherry Studio 自己的收费服务**。  
> 如果你是要接入本站，请不要选它自带的付费方案，**而是选择「第三方 API」相关方式** 再继续配置。

#### 配置方式：手动填写

在 Cherry Studio 中推荐使用 **OpenAI 兼容**方式接入：

- 提供商：`OpenAI` 或 `OpenAI Compatible`
- API地址（Base URL）：`https://newapi.20200626.xyz/v1`
- API Key：你的 `sk-...`
- 模型：点击获取模型列表

![Cherry Studio 手动填写演示](./images/手动填写.gif)

> **重要提醒：** 配置保存完成后，回到聊天界面时，**记得切换到你刚刚配置好的模型**。  
> 很多人已经成功配置了接口，但聊天时仍停留在原来的默认模型，结果看起来像是“没有配成功”。

#### Cherry Studio 常见说明

- 如果拉取不到模型列表，直接去 <https://newapi.20200626.xyz/pricing> 复制模型名
- 如果首次打开时弹出了 Cherry Studio 官方付费服务页面，请返回并选择 **第三方 API / OpenAI Compatible**，不要选错入口
- 如果界面里写的是 `API Host`、`Base URL`、`OpenAI API 地址`，本质上都填同一个地址：`https://newapi.20200626.xyz/v1`
- 初次接入建议先选一个常用模型测试，确认连通后再切换正式模型
- 如果你已经手动配置成功，但聊天还是不对，请先检查聊天界面当前选中的模型是不是你刚配置的那个

---

### 2）ChatBox（电脑 / 安卓 / iPhone / iPad）

- ChatBox 官网：<https://chatboxai.app/zh>
- ChatBox 提供桌面端，也有 **Android / iOS / iPadOS** 客户端
- 不同平台界面会有一点区别，但核心填写内容完全一样

#### 桌面端配置

在 ChatBox 中添加自定义 OpenAI 服务商：

- API Host / Base URL：`https://newapi.20200626.xyz/v1`
- API Key：你的 `sk-...`
- 模型：手动选择或填写模型 ID

推荐先用一个简单模型测试，确认连通后再切换常用模型。

#### 手机端配置（安卓 / 苹果）

1. 先从 ChatBox 官网下载，或按官网指引前往应用商店安装  
   <https://chatboxai.app/zh>
2. 打开 ChatBox App，进入 **设置 / 模型提供商 / API 提供商** 相关页面
3. 选择 **OpenAI** 或 **自定义 OpenAI 兼容接口**
4. 按下面内容填写：
   - API Host / Base URL：`https://newapi.20200626.xyz/v1`
   - API Key：你的 `sk-...`
   - 模型：自动获取或者手动填写你要使用的模型名
5. 保存后新建对话，先用一个简单问题测试是否连接成功

#### 手机端常见说明

- 如果手机端拉取不到模型列表，直接去 <https://newapi.20200626.xyz/pricing> 复制模型名手动填写即可
- 如果你看到的是 `API Host`、`Base URL`、`OpenAI API 地址` 之类名称，填的都是同一个地址：`https://newapi.20200626.xyz/v1`
- 部分版本入口名称可能略有不同，但只要找到 **OpenAI / OpenAI Compatible / 自定义接口** 相关设置即可

---

### 3）VS Code / Cursor（Cline、Roo Code、Kilo Code）

这类插件建议统一按 **OpenAI Compatible** 配置：

- Provider：`OpenAI Compatible`
- Base URL：`https://newapi.20200626.xyz/v1`
- API Key：你的 `sk-...`
- Model：例如 `gpt-5.4`、`gpt-5.3-codex`

如果插件支持“获取模型列表”，可以先尝试拉取；拉取不到时，直接手动填模型 ID。

---

### 4）酒馆（SillyTavern）

酒馆推荐使用 **Chat Completion + Custom (OpenAI-compatible)** 方式接入。

请按以下内容填写：

- API / Source：`Chat Completion`
- Chat Completion Source：`Custom (OpenAI-compatible)`
- API URL / Endpoint：

```text
https://newapi.20200626.xyz/v1
```

- API Key：

```text
sk-你的密钥
```

- Model：手动填写或下拉选择

> 注意：地址填写 `https://newapi.20200626.xyz/v1` 即可，不要手动再加 `/chat/completions`

#### 酒馆推荐模型

使用酒馆的大多数用户更常用 **按次模型**，建议优先选择带 `-c` 后缀的模型，例如：

- `gemini-3.1-pro-high-c`
- `gemini-3.1-pro-low-c`
- `gemini-3-flash-c`
- `claude-sonnet-4-6-c`

#### 酒馆常见问题

- **连不上 / 报错**
  - 先确认你填的是 `https://newapi.20200626.xyz/v1`
  - 不要填成 `https://newapi.20200626.xyz/v1/chat/completions`
- **看不到模型列表**
  - 直接去 <https://newapi.20200626.xyz/pricing> 复制模型名手动填
- **想控制成本**
  - 优先选择带 `-c` 后缀的按次模型

---

### 5）CC Switch（Claude / Codex / Gemini）

本站已支持 **CC Switch** 快捷导入。

你可以在 **令牌管理** 页面，对应令牌右侧点击：

- **聊天**
- 或聊天按钮下拉菜单中的 **CC Switch**

然后按页面提示选择：

- 应用：`Claude` / `Codex` / `Gemini`
- 名称：随意
- 主模型：按需选择

#### 手动填写

- **Codex**
  - Endpoint：`https://newapi.20200626.xyz/v1`
- **Claude / Gemini**
  - Endpoint：`https://newapi.20200626.xyz`
- API Key：
  - 你的 `sk-...`
- Homepage：
  - `https://newapi.20200626.xyz`

> 如无特殊需求，优先使用站内一键导入，更省事也不容易填错。

---

### 6）Claude Code / Codex / Gemini CLI（下载安装）

如果需要在本地使用 **Claude Code、Codex、Gemini CLI**，建议按下面方式安装。

#### 通用准备

- Node.js 官网：<https://nodejs.org/en/download>
- CC Switch 下载地址：<https://github.com/farion1231/cc-switch/releases>

#### 通用步骤

1. 先安装 **Node.js**
2. 根据你要使用的客户端，执行对应安装命令
3. 下载并安装 **CC Switch**
4. 打开本站 **令牌管理**
5. 找到对应令牌，点击 **聊天** -> **CC Switch**
6. 在弹窗里选择对应应用和模型
7. 打开 CC Switch，启用刚导入的配置
8. 重启终端后再执行对应命令启动

#### Claude Code

- 官方文档：<https://docs.anthropic.com/en/docs/claude-code/getting-started>
- 安装命令：

```bash
npm install -g @anthropic-ai/claude-code
```

- CC Switch 中选择：
  - 应用：`Claude`
  - 主模型：按需选择
- 启动命令：

```bash
claude
```

#### Codex

- 官方仓库：<https://github.com/openai/codex>
- 官方帮助文档：<https://help.openai.com/en/articles/11096431-openai-codex-ci-getting-started>
- 安装命令：

```bash
npm install -g @openai/codex
```

- CC Switch 中选择：
  - 应用：`Codex`
  - 主模型：例如 `gpt-5.3-codex`、`gpt-5.4`
- 启动命令：

```bash
codex
```

> OpenAI 官方文档说明 Codex 官方主要支持 macOS 和 Linux，Windows 可能需要 WSL。

#### Gemini CLI

- 官方仓库：<https://github.com/google-gemini/gemini-cli>
- 安装命令：

```bash
npm install -g @google/gemini-cli
```

- CC Switch 中选择：
  - 应用：`Gemini`
  - 主模型：例如 `gemini-3.1-pro-high-c`、`gemini-3-flash-c`
- 启动命令：

```bash
gemini
```

> Gemini CLI 官方说明要求较新的 Node.js 版本，安装最新版 LTS 即可。

#### 补充说明

- 如果命令执行后提示找不到 `claude`、`codex` 或 `gemini`，请先重开终端再试
- 如无特殊需求，优先使用 CC Switch 导入，不建议手动改配置文件

---

### 7）站内一键导入

当前已支持的一键导入目标包括：

- Cherry Studio
- AionUI
- 流畅阅读
- CC Switch
- Lobe Chat 官方示例
- AI as Workspace
- AMA 问天
- OpenCat

使用方法：

1. 进入令牌管理
2. 找到你的令牌
3. 点击右侧 **聊天**
4. 选择目标客户端
5. 按提示完成导入

---

## 六、接口测试

如果需要先测试接口是否正常，可直接执行下面的请求：

```bash
curl https://newapi.20200626.xyz/v1/chat/completions ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer sk-你的密钥" ^
  -d "{\"model\":\"gpt-5.4\",\"messages\":[{\"role\":\"user\",\"content\":\"你好，做个自我介绍\"}]}"
```

如果你在 Linux 或 macOS 终端中执行，把 `^` 改成 `\` 即可。

---

## 七、常见问题

### 1）为什么报 401？

通常是下面几种原因：

- API Key 填错
- 没有带 `sk-` 前缀
- 令牌已禁用或已过期
- 请求头没有使用 `Authorization: Bearer sk-...`

### 2）为什么报 404？

最常见原因是地址填错了，尤其是少了 `/v1`。

OpenAI 兼容客户端请优先填写：

```text
https://newapi.20200626.xyz/v1
```

### 3）为什么看不到模型？

- 某些客户端不会自动拉取模型列表
- 某些模型受令牌分组限制
- 直接去 `/pricing` 页面复制模型名手动填写即可

### 4）为什么报 429？

表示请求过快，触发了频率限制。  
请降低并发、减少短时间重复请求，或更换模型再试。

### 5）为什么报 403？

一般表示：

- 当前分组不允许该模型
- 额度不足
- 模型权限不足

### 6）为什么同一个问题扣费比想象中快？

常见原因：

- 使用了高倍率模型
- 客户端自动多轮调用
- 上下文太长
- 开启了 Agent / 工具调用 / 长上下文模式

建议先用便宜模型测试，稳定后再切主模型。

---

## 八、推荐使用顺序

如果你是第一次使用，建议按这个顺序：

1. 先登录站点并创建令牌
2. 去 `/pricing` 查看可用模型
3. **优先使用 Cherry Studio**（推荐新手首选）
4. 如需排查连通性，再用上面的 `curl` 做最小测试
5. 需要 VS Code / Cursor / 酒馆 / CLI 工作流时，再接入对应客户端

如果你只想选一个客户端，**就选 Cherry Studio**，配置最省心。
