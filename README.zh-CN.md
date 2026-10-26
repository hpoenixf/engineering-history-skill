# 工程历史维护 Skill

将大量开发过程压缩为少量可追溯、可复习的工程知识。[English README](README.md)

包含可独立复制的 Agent Skill 和无依赖 Node CLI。使用 Node 26.11.1–26.x，无模型调用、数据库或账户配置。

**技术文章：** [文档不是给 Agent 全部读完的：工程知识治理与开源 History Skill](https://hpoenixf.github.io/eff-agent-article/articles/027-agent-context-document-history)（[English](https://hpoenixf.github.io/eff-agent-article/en/articles/027-agent-context-document-history)）。正文介绍四层 History 的设计动机、Skill 使用及人工内容保护。

## 先运行

```sh
node bin/engineering-history.mjs validate --root examples --history-dir history
```

接入自己的项目：

```sh
npm install --save-dev github:hpoenixf/engineering-history-skill#v0.1.0
npx --no-install engineering-history init
npx --no-install engineering-history candidate --task "一次值得保留的判断" --summary "问题、选择、实际结果和可复用经验" --source-id "project:change:event"
npx --no-install engineering-history validate
```

默认正文目录 `docs/history/`、候选目录 `.work/history-candidates/`。通过 `--root` 选项目、`--history-dir` 选正文目录；事件记录可传 `--timezone Asia/Shanghai`。相同 `--source-id` 在跨日重试和改写摘要后仍去重。

## 四层分工

- candidate 宽进，只留下可能有价值的素材。
- time 保存事实正文，讲清问题、取舍、结果和证据。
- daily 按主题精选，帮助快速回看一天。
- type 概括主题演进，链接代表案例。

程序负责日期、去重、路径、链接与人工内容保护；模型或人负责素材价值和总结。面试价值、分享价值分别判断。

将完整 `skills/engineering-history/` 目录复制到 Agent 支持的 Skill 目录即可安装，脚本和许可随目录携带。已有同名目录时先核对本地修改。更多命令及保护说明见 [README](README.md)。
