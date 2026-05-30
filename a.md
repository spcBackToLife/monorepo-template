{
    "id": "d84c140e-0437-4c80-a786-c1f389bcbb02",
    "meta": {
        "plan": [
            {
                "id": "P-overview",
                "notes": "md: analysis-notes/d84c140e-0437-4c80-a786-c1f389bcbb02/00-overview.md",
                "stage": "product",
                "title": "项目总览（产品定位/领域/MVP/IA/风格）",
                "status": "done"
            },
            {
                "id": "P-global-concerns",
                "notes": "md: analysis-notes/.../global/concerns.md",
                "stage": "product",
                "title": "5 类全局态识别（globalConcerns）",
                "status": "done"
            },
            {
                "id": "P-global-state",
                "notes": "md: analysis-notes/.../global/state.md",
                "stage": "product",
                "title": "globalStateInit.view 占位",
                "status": "done"
            },
            {
                "id": "P-global-overlays",
                "notes": "md: analysis-notes/.../global/overlays.md",
                "stage": "product",
                "title": "globalOverlays 兜底层骨架",
                "status": "done"
            },
            {
                "id": "P-integrity",
                "notes": "整项目 integrity 0 错 0 警 0 信息",
                "stage": "product",
                "title": "全项目自检",
                "status": "done"
            },
            {
                "id": "P-trigger-theme",
                "notes": "建议下一步：theme-generator skill，喂入 styleDirection.summary='简约时尚 + 校园温度（极简留白 / 大字号品牌强调字 / 圆角输入框 / 单一强调色 / 极细几何装饰；避开浓郁渐变、卡通插画、纯黑白极简）'",
                "stage": "product",
                "title": "触发或建议 theme-generator",
                "status": "done"
            },
            {
                "id": "P-handover",
                "notes": "00-login phase=analyzed；schema 已就绪供 interaction-designer 接力（events / bind / repeat / visibleWhen / 派生 view 变量 + mock 场景待补）",
                "stage": "product",
                "title": "移交 interaction-designer",
                "status": "done"
            },
            {
                "id": "T1-intent",
                "notes": "md: analysis-notes/d84c140e-0437-4c80-a786-c1f389bcbb02/theme/T1-intent.md；intent={minimal+flat / minimal decoration / neutral / both / #5B6CFF}",
                "stage": "design",
                "title": "[theme] 风格意图提取（7 维度）",
                "status": "done"
            },
            {
                "id": "T2-colors",
                "notes": "重跑 ✓ 32 个 color token 落到 themes[default].tokens.colors（含 6 个品牌色 + 9 个语义色 + 9 个灰阶）",
                "stage": "design",
                "title": "[theme] 色彩计算（HSL + APCA）",
                "status": "done"
            },
            {
                "id": "T3-typo-spacing",
                "notes": "重跑 ✓ typography(9 sizes) + spacing(8) + radius(6) + shadows(soft 4) + transitions(3) 全部落到 themes[default].tokens",
                "stage": "design",
                "title": "[theme] 字体/间距/圆角/阴影/动效",
                "status": "done"
            },
            {
                "id": "T4-decoration",
                "notes": "md: analysis-notes/.../theme/T4-decoration.md；6 类装饰规则全部落库：bg=solid, border=subtle 1px, shadow=soft(弱化), motion=smooth+ease, corner=rounded, icon=geometric",
                "stage": "design",
                "title": "[theme] 装饰规则（aesthetics 映射）",
                "status": "done"
            },
            {
                "id": "T5-icon-state",
                "notes": "重落 ✓ iconSpec(outline + simple + uniformStrokeWidth + geometricOnly) + stateSpec(hover scale 1.02 + focus ring 2px primary + disabled opacity 0.4)",
                "stage": "design",
                "title": "[theme] iconSpec + stateSpec",
                "status": "done"
            },
            {
                "id": "T6-variants",
                "notes": "md: analysis-notes/.../theme/T6-variants.md ✓ dark scheme 32 colors + 4 shadows overrides 落库；APCA 6 项实测全过；light 留空继承 base",
                "stage": "design",
                "title": "[theme] 主题变体（≥2 套）",
                "status": "done"
            },
            {
                "id": "T7-handover",
                "notes": "validate.ok=true（修了 textSecondary alpha 0.65→0.80 解 R-THEME-03）；md 全套 7 个完成；可移交 interaction-designer",
                "stage": "design",
                "title": "[theme] 自检 + 移交 interaction-designer",
                "status": "done"
            },
            {
                "id": "VERIFY-mechanism",
                "notes": "机制验证完成：上次 update_plan_task done 被 service 端拒绝并返回详细原因——v2.2 expectedArtifacts 机器对账机制工作正常。",
                "stage": "product",
                "title": "v2.2 机制验证：测试 expectedArtifacts 拦截",
                "status": "skipped",
                "expectedArtifacts": [
                    {
                        "min": 1,
                        "kind": "arrayMin",
                        "path": "globalOverlays"
                    }
                ]
            },
            {
                "id": "VERIFY-positive",
                "notes": "已被 VERIFY-D-globalOverlays-top（done）接替；本任务为 v2.2 早期验证遗留，不属于 interaction-designer 阶段职责，由本阶段顺手清理。",
                "stage": "product",
                "title": "v2.2 正向验证：写真产物再标 done",
                "status": "skipped",
                "expectedArtifacts": [
                    {
                        "min": 1,
                        "kind": "arrayMin",
                        "path": "globalOverlays"
                    },
                    {
                        "kind": "eachItem",
                        "path": "globalOverlays",
                        "check": {
                            "keys": [
                                "id",
                                "type",
                                "showWhen",
                                "rootNode"
                            ],
                            "kind": "hasKeys",
                            "path": "$"
                        }
                    }
                ]
            },
            {
                "id": "VERIFY-positive-2",
                "notes": "已废弃：v2.2 早期验证用，path=meta.globalOverlays（错位置）。D 修复后用新任务 VERIFY-D-globalOverlays-top 验证正确路径 globalOverlays 顶层。",
                "stage": "product",
                "title": "v2.2 正向验证 (path 修正为 meta.globalOverlays)",
                "status": "skipped",
                "expectedArtifacts": [
                    {
                        "min": 1,
                        "kind": "arrayMin",
                        "path": "meta.globalOverlays"
                    },
                    {
                        "kind": "eachItem",
                        "path": "meta.globalOverlays",
                        "check": {
                            "keys": [
                                "id",
                                "type",
                                "showWhen",
                                "rootNode"
                            ],
                            "kind": "hasKeys",
                            "path": "$"
                        }
                    }
                ]
            },
            {
                "id": "VERIFY-D-globalOverlays-top",
                "notes": "D 修复验证：globalOverlays 现在真在 DesignProject 顶层；机器对账通过。",
                "stage": "product",
                "title": "v2.2 D 修复验证：globalOverlays 真在顶层",
                "status": "done",
                "expectedArtifacts": [
                    {
                        "min": 1,
                        "kind": "arrayMin",
                        "path": "globalOverlays"
                    },
                    {
                        "kind": "eachItem",
                        "path": "globalOverlays",
                        "check": {
                            "keys": [
                                "id",
                                "type",
                                "showWhen",
                                "rootNode"
                            ],
                            "kind": "hasKeys",
                            "path": "$"
                        }
                    }
                ]
            },
            {
                "id": "I-global-state-fill",
                "notes": "md: analysis-notes/d84c140e-.../global/state-fill.md；4 类全局态子结构完整化（session: 6 字段完整登录态对象 / network: 补 lastOnlineAt + slow 枚举 / preferences: 补 a11y / nav: 字段不动幂等 update）；含 6 决策 D-GS1~D-GS6；errorBoundary 按 concerns 决策不引入；与 operations/boundaries/state-vars 7 处全局态引用全部一致",
                "stage": "interaction",
                "title": "globalStateInit.view 子结构完整化（含默认值/枚举）",
                "status": "done",
                "expectedArtifacts": [
                    {
                        "keys": [
                            "session",
                            "network",
                            "preferences",
                            "nav"
                        ],
                        "kind": "hasKeys",
                        "path": "globalStateInit.view"
                    }
                ]
            },
            {
                "id": "I-global-overlay-events",
                "notes": "md: analysis-notes/d84c140e-.../global/overlay-events.md；2 个 overlay 整组替换写入：offlineRetryBtn 补 click event（retryCount++ + custom platform.checkNetwork）+ sessionReLoginBtn 补 click event（写 authRedirectTo=lastVisited + 全清 session + nav.go 00-login）；含 5 决策 D-GO0~D-GO4（含 D-GO0 操作路径强制走 meta/set_global_overlays、D-GO2 复用 nav.lastVisited、D-GO3 重登全清 session.user）；error-boundary 按 concerns/overlays 决策不引入",
                "stage": "interaction",
                "title": "globalOverlays 节点补 events + 动态行为",
                "status": "done",
                "expectedArtifacts": [
                    {
                        "min": 1,
                        "kind": "arrayMin",
                        "path": "globalOverlays"
                    }
                ]
            },
            {
                "id": "I-global-coverage",
                "notes": "md: analysis-notes/d84c140e-.../global/coverage.md；4 类全局态跨屏读写矩阵全核对（session/network/preferences/nav 字段+枚举值+引用点）全部 ✓；含 3 决策 D-GC1~D-GC3；7 项未来工作识别（M2-M4 占位 + 宿主合约责任）但不在本期落库；红线 R-GLOBAL-STATE-01/R-GLOBAL-OVERLAY-01/02 + R-OVERLAY-CONFLICT-01 + R-EVENTS-02 全部通过；R-COVERAGE-01 屏级由 I-M1-coverage 负责",
                "stage": "interaction",
                "title": "全局态被各屏正确读写的覆盖检查",
                "status": "done"
            },
            {
                "id": "I-handover",
                "stage": "interaction",
                "title": "移交 design-planner",
                "status": "pending"
            },
            {
                "id": "P-revise-C-TEST-002",
                "title": "[challenge-test] 测试 raise",
                "stage": "product",
                "status": "skipped",
                "notes": "自动追加：来自 challenge C-TEST-002；处理流程见 STAGE-CONTRACT.md §0.1.9\n[resolved at 2026-05-30T15:02:27.182Z] accepted=false; decision: analysis-notes/d84c140e-0437-4c80-a786-c1f389bcbb02/challenges/C-TEST-002-decision.md",
                "upstreamChallenge": {
                    "raisedBy": "I-M1-view-business",
                    "challengeId": "C-TEST-002",
                    "challengeMd": "analysis-notes/d84c140e-0437-4c80-a786-c1f389bcbb02/challenges/C-TEST-002.md",
                    "targetStage": "product",
                    "raisedByScope": "screen",
                    "targetTaskIds": [
                        {
                            "scope": "screen",
                            "taskId": "M1-skeleton",
                            "screenId": "sc_27ee2293945046b69cc00"
                        }
                    ],
                    "raisedByScreenId": "sc_27ee2293945046b69cc00",
                    "phase": "rejected",
                    "decision": {
                        "accepted": false,
                        "rationale": "test challenge cleanup; not a real challenge",
                        "appliedAt": "2026-05-30T15:02:27.182Z"
                    },
                    "decisionMd": "analysis-notes/d84c140e-0437-4c80-a786-c1f389bcbb02/challenges/C-TEST-002-decision.md"
                }
            },
            {
                "id": "P-revise-C-INT-00-login-001",
                "title": "[challenge] wrap Root 三节点为 NormalFormView 容器以承载账号锁定状态机",
                "stage": "product",
                "status": "done",
                "notes": "自动追加：来自 challenge C-INT-00-login-001；处理流程见 STAGE-CONTRACT.md §0.1.9\n[resolved at 2026-05-30T15:02:27.189Z] accepted=true; decision: analysis-notes/d84c140e-0437-4c80-a786-c1f389bcbb02/challenges/C-INT-00-login-001-decision.md",
                "upstreamChallenge": {
                    "raisedBy": "I-M1-view-business",
                    "challengeId": "C-INT-00-login-001",
                    "challengeMd": "analysis-notes/d84c140e-0437-4c80-a786-c1f389bcbb02/challenges/C-INT-00-login-001.md",
                    "targetStage": "product",
                    "raisedByScope": "screen",
                    "targetTaskIds": [
                        {
                            "scope": "screen",
                            "taskId": "M1-skeleton",
                            "screenId": "sc_27ee2293945046b69cc00"
                        }
                    ],
                    "raisedByScreenId": "sc_27ee2293945046b69cc00",
                    "phase": "accepted",
                    "decision": {
                        "accepted": true,
                        "rationale": "账号锁定状态机是 product rules 第 3 条已明文要求的业务规则，NormalFormView/LockedView 双子树是 methodology/07 类 5 的标准视觉模式，product 阶段当时只是没机会预见这个结构。本次结构调整零破坏（3 个节点全保留 + ID 不变 + meta.product 不变），仅在 Root 与三节点之间插入一层语义容器，是 product 阶段补一次正确的业务态分支视图划分。",
                        "appliedAt": "2026-05-30T15:02:27.189Z"
                    },
                    "decisionMd": "analysis-notes/d84c140e-0437-4c80-a786-c1f389bcbb02/challenges/C-INT-00-login-001-decision.md"
                }
            }
        ],
        "modules": {
            "M1": {
                "name": "用户认证-登录",
                "summary": "本项目唯一交付：手机号免密+密码两种登录入口",
                "priority": "P0"
            },
            "M2": {
                "name": "注册",
                "summary": "本期不实现，仅 nav.go 占位 00-register",
                "priority": "P3"
            },
            "M3": {
                "name": "找回密码",
                "summary": "本期不实现，仅 nav.go 占位 00-forgot-password",
                "priority": "P3"
            },
            "M4": {
                "name": "主屏",
                "summary": "本期不实现，仅 nav.go 占位 01-home",
                "priority": "P3"
            },
            "M5": {
                "name": "协议合规",
                "summary": "用户/隐私协议勾选，未勾不可提交",
                "priority": "P0"
            },
            "M6": {
                "name": "登录安全防刷",
                "summary": "短信冷却 60s/日限 10 次；密码错 5 次锁 30min",
                "priority": "P0"
            }
        },
        "navigation": {
            "flows": [
                {
                    "to": "01-home",
                    "from": "00-login",
                    "trigger": "登录成功",
                    "transition": "fade"
                },
                {
                    "to": "00-register",
                    "from": "00-login",
                    "trigger": "点击注册账号",
                    "transition": "push"
                },
                {
                    "to": "00-forgot-password",
                    "from": "00-login",
                    "trigger": "点击忘记密码",
                    "transition": "push"
                }
            ],
            "tabBar": []
        },
        "targetUser": {
            "summary": "Primary: 18-22 在校大学生（开学季 / 换机 / 重登场景，对学生范儿敏感）；Secondary: 23-26 研究生应届，希望'不像学生玩具'，对设计审美敏感"
        },
        "constraints": {
            "decisions": [
                {
                    "id": "D1",
                    "summary": "本期不做第三方授权（微信/Apple/QQ）——理由：作用域仅登录屏；微信授权多一步获取手机号；手机号+密码已覆盖 90%+"
                },
                {
                    "id": "D2",
                    "summary": "登录方式做手机号验证码免密 + 密码两种（互斥切换 view.loginMode）"
                },
                {
                    "id": "D3",
                    "summary": "本项目作用域仅登录页 00-login；注册/找回/主屏作为 nav.go 占位 screenId，由后续项目实现"
                },
                {
                    "id": "D4",
                    "summary": "合规红线：用户/隐私协议必勾才能提交（view.form.policy = true）"
                },
                {
                    "id": "D5",
                    "summary": "安全规则：验证码同号 60s 冷却 + 当日 ≤ 10 次；密码错 ≥ 5 次锁定 30 分钟"
                }
            ]
        },
        "coreScenarios": [
            {
                "id": "S1",
                "summary": "高频首次：下载 App 第一次打开，期待 + 略焦虑，Wi-Fi/4G/5G"
            },
            {
                "id": "S2",
                "summary": "中频复登：换机 / 清缓存 / token 失效后重登，求快"
            },
            {
                "id": "S3",
                "summary": "低频找回：忘记密码 / 切换账号后回到登录页，焦躁"
            }
        ],
        "globalConcerns": {
            "network": {
                "summary": "系统监听 online/offline；status=offline 触发 global-offline-banner 并阻断登录提交"
            },
            "session": {
                "summary": "登录页写入；status ∈ {anonymous|active|expired}；含 token/user/expiresAt；过期触发 global-session-expired"
            },
            "fallback": {
                "summary": "项目级兜底层：global-offline-banner（提示性）+ global-session-expired（阻断 modal），后续 app-update/error-boundary 按需补"
            },
            "navigation": {
                "summary": "authRedirectTo 让后续要登录屏跳来登录页时记录目的地；登录成功消费后跳回，否则默认跳 01-home"
            },
            "preferences": {
                "summary": "本期占位：theme=light / fontSize=md / lang=zh-CN；theme-generator 阶段决定 dark 变体"
            }
        },
        "styleDirection": {
            "summary": "简约时尚 + 校园温度：极简留白 / 大字号品牌强调字 / 圆角输入框 / 单一强调色 / 极细几何装饰；避开浓郁渐变、卡通插画、纯黑白极简"
        }
    },
    "name": "校园社交-登录页",
    "screens": [
        {
            "id": "sc_27ee2293945046b69cc00",
            "meta": {
                "plan": [
                    {
                        "id": "M1-stories",
                        "refs": [
                            "module:M1"
                        ],
                        "notes": "md: analysis-notes/d84c140e-0437-4c80-a786-c1f389bcbb02/modules/M1/A-stories.md",
                        "stage": "product",
                        "title": "用户故事穷举（M1 登录）",
                        "status": "done"
                    },
                    {
                        "id": "M1-flows",
                        "refs": [
                            "module:M1"
                        ],
                        "notes": "md: analysis-notes/.../modules/M1/B-flows.md",
                        "stage": "product",
                        "title": "核心流程 + 异常分支",
                        "status": "done"
                    },
                    {
                        "id": "M1-rules",
                        "refs": [
                            "module:M1",
                            "module:M5",
                            "module:M6"
                        ],
                        "notes": "md: analysis-notes/.../modules/M1/C-rules.md，6 条 rules 覆盖 4 类齐",
                        "stage": "product",
                        "title": "业务规则 4 类齐 ★",
                        "status": "done"
                    },
                    {
                        "id": "M1-data",
                        "refs": [
                            "module:M1"
                        ],
                        "notes": "md: analysis-notes/.../modules/M1/D-data.md；建 ds-login/ds-send-code/ds-policy-text + data.user 占位",
                        "stage": "product",
                        "title": "数据模型 + API typeDef",
                        "status": "done"
                    },
                    {
                        "id": "M1-skeleton",
                        "refs": [
                            "module:M1"
                        ],
                        "notes": "md: analysis-notes/.../screens/00-login/skeleton.md；建 24 个业务节点 + 全部 meta.product 已写。\n\n[2026-05-30 challenge C-INT-00-login-001 accepted 结构补充] Root.children 三段（HeaderArea/FormCard/FooterLinks）已 wrap 进 NormalFormView 容器（id=nd_legacy_wrap_217_fixed），承载账号锁定状态机视图分支（NormalFormView ↔ LockedView 互斥）。LockedView 子树由 I-M1-view-business 任务建。decision md: analysis-notes/.../challenges/C-INT-00-login-001-decision.md。",
                        "stage": "product",
                        "title": "节点骨架（业务原子+容器）",
                        "status": "done"
                    },
                    {
                        "id": "M1-state-shape",
                        "refs": [
                            "module:M1"
                        ],
                        "notes": "md: analysis-notes/.../screens/00-login/state-shape.md；建 loginMode/form/submitting 三个 view 占位",
                        "stage": "product",
                        "title": "屏 stateInit.view + data 占位",
                        "status": "done"
                    },
                    {
                        "id": "M1-coverage",
                        "refs": [
                            "module:M1"
                        ],
                        "notes": "md: analysis-notes/.../screens/00-login/coverage.md；三轴通过",
                        "stage": "product",
                        "title": "三轴覆盖核对",
                        "status": "done"
                    },
                    {
                        "id": "M1-integrity",
                        "refs": [
                            "module:M1"
                        ],
                        "notes": "integrity 0 错 0 警 0 信息；phase=analyzed 已打",
                        "stage": "product",
                        "title": "屏自检 + phase=analyzed",
                        "status": "done"
                    },
                    {
                        "id": "I-M1-statemachine",
                        "notes": "md: analysis-notes/d84c140e-0437-4c80-a786-c1f389bcbb02/interaction/00-login/statemachine.md；9 个状态入 schema，summary 完整含主线 + locked 副状态机 + screenExit 副效果",
                        "stage": "interaction",
                        "title": "状态机三要素",
                        "status": "done"
                    },
                    {
                        "id": "I-M1-operations",
                        "notes": "md: analysis-notes/d84c140e-.../interaction/00-login/operations.md；16 条 operations（14 用户主动 + 2 系统生命周期）入 schema；含 6 个关键决策记录 D1-D6；与 transitions 21 条 + product rules 6 条全覆盖对账",
                        "stage": "interaction",
                        "title": "操作清单 7 列穷举",
                        "status": "done"
                    },
                    {
                        "id": "I-M1-loading",
                        "notes": "md: analysis-notes/d84c140e-.../interaction/00-login/loading.md；5 场景全部显式（仅 button 适用，其余 — 不适用），含决策 L1/L2/L4 论证；衍生节点 SubmitSpinner/CodeSendSpinner 留给 I-M1-view-loading",
                        "stage": "interaction",
                        "title": "加载策略 5 场景",
                        "status": "done"
                    },
                    {
                        "id": "I-M1-errors",
                        "notes": "md: analysis-notes/d84c140e-.../interaction/00-login/errors.md；6 类全部显式给值；含 6 个决策 D-E1~D-E6；onError actions 链骨架两套（ds-login/ds-send-code）已留 md，等 events 任务直接搬；列出 5 个错误相关 view 变量清单留给 state-vars 任务",
                        "stage": "interaction",
                        "title": "错误处理 6 类 + 校验 4 时机",
                        "status": "done"
                    },
                    {
                        "id": "I-M1-boundaries",
                        "notes": "md: analysis-notes/d84c140e-.../interaction/00-login/boundaries.md；13 条 boundaries 入 schema（7 类标准 + 5 条本屏特有 X1~X5 + 重入恢复独立成条）；含 10 个决策 D-B1~D-B10；与 product rules 边界视角全部覆盖",
                        "stage": "interaction",
                        "title": "边界 Case 7 类",
                        "status": "done"
                    },
                    {
                        "id": "I-M1-state-vars",
                        "notes": "md: analysis-notes/d84c140e-.../interaction/00-login/state-vars.md；新增 6 个派生 view 变量（errors/passwordVisible/failureCount/lockedUntil/lockedCountdown/codeCountdown）；含 5 个决策 D-S1~D-S5；不建 canSubmit/codeSending（用 condition 表达式 + effects.status 替代）；data 不动",
                        "stage": "interaction",
                        "title": "state.view 派生态完整化",
                        "status": "done",
                        "expectedArtifacts": [
                            {
                                "kind": "nonEmpty",
                                "path": "stateInit.view"
                            }
                        ]
                    },
                    {
                        "id": "I-M1-datasources",
                        "notes": "md: analysis-notes/d84c140e-.../interaction/00-login/datasources.md；ds-login 6 mock 场景（success/wrongCredential/locked/limitExceeded/serverError/networkTimeout）+ ds-send-code 4 场景（success/limitExceeded/serverError/networkTimeout）+ 两 ds 默认激活 success + defaultParams 显式 {}；含 8 决策 D-DS1~D-DS8（含 D-DS2 locked 用 423 而非模板 429、D-DS6 endpoint.timeout 暂不动）；ds-policy-text(static) 不动；onError 分支 mock 全覆盖",
                        "stage": "interaction",
                        "title": "dataSources 完整化（mock 场景 + autoFetch + defaultParams）",
                        "status": "done",
                        "expectedArtifacts": [
                            {
                                "min": 1,
                                "kind": "arrayMin",
                                "path": "dataSources"
                            }
                        ]
                    },
                    {
                        "id": "I-M1-events",
                        "notes": "md: analysis-notes/d84c140e-.../interaction/00-login/events.md；23 MCP 调用全成功：3 bind（PhoneInput/CredentialInput/PolicyCheckbox）+ 4 visibleWhen（PhoneError/CredentialError/GetCodeBtn/PasswordToggleEye）+ 5 dynamic props（PhoneError/CredentialLabel/CredentialInput 5 字段/CredentialError/GetCodeBtn）+ 11 events（PhoneInput.blur 校验 / CodeModeBtn+PasswordModeBtn 模式切换 / CredentialInput.blur 校验 / PasswordToggleEye 切换显隐 / GetCodeBtn 完整 click 含 60s timer + 4-case onError / Register+Forgot nav / Root screenEnter 门禁+lockedCD 重启 / Root screenExit 取消双 fetch + 停双 timer / SubmitBtn 主流程含 condition 复合表达式 + onSuccess 写 globalView.session + 消费 authRedirectTo + onError 5-case logic.switch 含 CREDENTIAL 第5次锁定特殊文案）；含 6 决策 D-EV1~D-EV6（PolicyText 双链接延后 design-planner / 复合表达式 / 不抢 focus / lockedCountdown duration 动态 / 不恢复 codeCountdown / ds-login 用 endpoint.body 表达式不传 params）；覆盖 boundaries 13 条 + errors 6 类 + operations 16 条全部",
                        "stage": "interaction",
                        "title": "节点 events.actions 落库（核心）+ bind + repeat + visibleWhen + 动态文案",
                        "status": "done"
                    },
                    {
                        "id": "I-M1-view-loading",
                        "stage": "interaction",
                        "title": "数据加载态视图（骨架/spinner/refresh）",
                        "status": "done",
                        "notes": "md: analysis-notes/d84c140e-.../interaction/00-login/view-loading.md；建 SubmitSpinner(nd_4363095a27b24f7a8aae6) + CodeSendSpinner(nd_3b4bbe8807f44729998f0) 两个按钮内 spinner 节点 + visibleWhen + meta；同步追加 SubmitBtn/GetCodeBtn 动态文案（登录中…/发送中…）；其他 6 类加载视图（FeedSkeleton/LoadingOverlay/Refresh/ListLoadingMore/SilentSyncIndicator）按 loading.md 全部不建。含 5 决策 D-VL1~D-VL5"
                    },
                    {
                        "id": "I-M1-view-empty",
                        "stage": "interaction",
                        "title": "空态视图（list/search/filter/offline 空）",
                        "status": "skipped",
                        "notes": "md: analysis-notes/d84c140e-.../interaction/00-login/view-empty.md；否决理由：本屏无列表型/搜索/筛选/离线缓存型 dataSource（ds-login/ds-send-code 写入型 + ds-policy-text static 常量），无 repeat 节点；表单'空'是默认态非异常态（决策 D-VE1）；未发码空 credential 由 boundaries D-B3 后端兜底（D-VE2）；locked 态归 I-M1-view-business（D-VE3）。R-VIEW-EMPTY-01/CONTENT-01 均不触发"
                    },
                    {
                        "id": "I-M1-view-error",
                        "stage": "interaction",
                        "title": "错误态视图（5xx 整页/网络错/业务错条/字段行内）",
                        "status": "done",
                        "notes": "md: analysis-notes/d84c140e-.../interaction/00-login/view-error.md；不新建错误视图节点（5xx 走 Toast 沿用 D-E3、网络错走 globalOverlays banner、业务错走 Toast/Locked 由 view-business 接管），仅给已有 PhoneError(nd_905bbf8e...)/CredentialError(nd_d7657df8...) 补 meta.interaction.summary 让节点叙事完整化。含 5 决策 D-VR1~D-VR5（全部对齐 errors.md D-E3）"
                    },
                    {
                        "id": "I-M1-view-auth",
                        "stage": "interaction",
                        "title": "权限/身份态视图（未登录/游客/VIP/实名）",
                        "status": "skipped",
                        "notes": "md: analysis-notes/d84c140e-.../interaction/00-login/view-auth.md；否决理由：登录页本身即 anonymous 入口（整表单就是未登录引导）；active 进屏由 Root.screenEnter 直跳 01-home（D-VA1）；expired 由 globalOverlays.global-session-expired 接管（D-VA2）；authRedirectTo 静默消费无需前置 hint（D-VA3）；MVP 无游客/VIP/实名概念。R-VIEW-AUTH-01 不适用本屏（适用于业务内容屏）"
                    },
                    {
                        "id": "I-M1-view-business",
                        "stage": "interaction",
                        "title": "业务状态分支视图（账号锁定状态机 locked 视图）",
                        "status": "done",
                        "upstreamChallenge": {
                            "raisedBy": "I-M1-view-business",
                            "challengeId": "C-INT-00-login-001",
                            "challengeMd": "analysis-notes/d84c140e-0437-4c80-a786-c1f389bcbb02/challenges/C-INT-00-login-001.md",
                            "targetStage": "product",
                            "raisedByScope": "screen",
                            "targetTaskIds": [
                                {
                                    "scope": "screen",
                                    "taskId": "M1-skeleton",
                                    "screenId": "sc_27ee2293945046b69cc00"
                                }
                            ],
                            "raisedByScreenId": "sc_27ee2293945046b69cc00",
                            "phase": "accepted",
                            "decision": {
                                "accepted": true,
                                "rationale": "账号锁定状态机是 product rules 第 3 条已明文要求的业务规则，NormalFormView/LockedView 双子树是 methodology/07 类 5 的标准视觉模式，product 阶段当时只是没机会预见这个结构。本次结构调整零破坏（3 个节点全保留 + ID 不变 + meta.product 不变），仅在 Root 与三节点之间插入一层语义容器，是 product 阶段补一次正确的业务态分支视图划分。",
                                "appliedAt": "2026-05-30T15:02:27.189Z"
                            },
                            "decisionMd": "analysis-notes/d84c140e-0437-4c80-a786-c1f389bcbb02/challenges/C-INT-00-login-001-decision.md"
                        },
                        "notes": "md: analysis-notes/d84c140e-.../interaction/00-login/view-business.md；走完 v2.3 UpstreamChallenge 协议（C-INT-00-login-001 accepted）后续做：① NormalFormView(nd_legacy_wrap_217_fixed) 挂 unlocked visibleWhen ② 在 Root 末尾 insert_subtree LockedView(nd_aa8a0633ce354664a8d1a) 子树（5 子节点：LockedIcon/LockedTitle/LockedCountdown/LockedHint/LockedForgotLink）+ locked visibleWhen + LockedForgotLink.click → nav.go(00-forgot-password) ③ 7 个节点全部补 meta.interaction.summary。含 5 决策 D-VB1~D-VB5。这是 Schema-First v2.3 的双重首发试点：UpstreamChallenge 协议 + 路径 A 严格 ID 契约（generateNodeId 唯一合法位置 = ensureDeterministicIds）",
                        "expectedArtifacts": [
                            {
                                "min": 2,
                                "kind": "arrayMin",
                                "path": "rootNode.children"
                            }
                        ]
                    },
                    {
                        "id": "I-M1-view-feedback",
                        "stage": "interaction",
                        "title": "过渡反馈节点（toast/snackbar/inline-success/progress/countdown）",
                        "status": "pending"
                    },
                    {
                        "id": "I-M1-overlays",
                        "stage": "interaction",
                        "title": "屏级 overlays（modal/bottomSheet/drawer）",
                        "status": "pending"
                    },
                    {
                        "id": "I-M1-meta",
                        "stage": "interaction",
                        "title": "meta.interaction 叙事落库（屏 + 各交互节点）",
                        "status": "pending",
                        "expectedArtifacts": [
                            {
                                "kind": "nonEmpty",
                                "path": "meta.interaction.summary"
                            }
                        ]
                    },
                    {
                        "id": "I-M1-coverage",
                        "stage": "interaction",
                        "title": "三轴覆盖核对（rules / 业务状态机 / dataSource 三态）",
                        "status": "pending"
                    },
                    {
                        "id": "I-M1-integrity",
                        "stage": "interaction",
                        "title": "本屏 integrity 自检（0 个 R-EVENTS-* / R-VIEW-* / R-COVERAGE-*）",
                        "status": "pending"
                    }
                ],
                "status": {
                    "notes": "三轴覆盖通过，integrity 0 错 0 警",
                    "phase": "analyzed"
                },
                "product": {
                    "rules": [
                        "数据规则: 手机号 /^1[3-9]\\d{9}$/ 11 位；验证码 6 位纯数字；密码 6-20 位含字母+数字；view.loginMode ∈ {'code'|'password'}（默认 'code'）；view.form.policy ∈ {true|false}（默认 false 必勾才能提交）",
                        "业务规则: 登录成功写 globalView.session = {status:'active',token,user,expiresAt} 并消费 globalView.nav.authRedirectTo 跳回（无则 nav.go '01-home'）；进屏 session.status === 'active' 立即跳 01-home 避免重登",
                        "业务规则: 失败状态机——view.failureCount 累加；连续 ≥5 触发 view.lockedUntil = now()+30min 进入锁定；now() > lockedUntil 自动解锁（failureCount=0 + lockedUntil=null）；登录成功也清零",
                        "业务规则: 验证码倒计时 view.codeCountdown ∈ [0,60]；发送成功 0→60 启动 ui.startTimer；每秒 -1；screenExit 时 stopTimer 归 0",
                        "安全规则: 验证码同号 60s 冷却（view.codeCountdown>0 按钮 disabled）+ 当日 ≤10 次（后端 LIMIT_EXCEEDED 兜底提示）；密码错 ≥5 次锁 30 分钟；协议必勾才能提交（合规红线）；离线状态（globalView.network.status==='offline'）阻断提交",
                        "边界 Case: 提交 800ms 防抖 + view.submitting 守卫忽略重复点击；screenExit 触发 effect.cancel ds-login + ui.stopTimer codeCD；PhoneInput maxLength=11 自动截断"
                    ],
                    "summary": "校园社交 App 登录入口：手机号 + 验证码免密 / 密码两种方式互斥切换；协议必勾才能提交；含 60s 验证码冷却、密码错 5 次锁 30min 的安全策略；登录成功跳主屏，提供注册账号 / 忘记密码两个出口。主线: 进入屏(若已 active 直跳主屏) → 输入手机号(失焦校验) → 选模式(code/password) → 输凭证 → 勾协议 → 提交(800ms 防抖+submitting 守卫) → onSuccess 写 session+消费 authRedirectTo 跳转 / onError 按 code 分支(CREDENTIAL/LOCKED/LIMIT_EXCEEDED/5xx)；screenExit 取消 fetch+停止倒计时",
                    "fromModules": [
                        "M1",
                        "M5",
                        "M6"
                    ]
                },
                "interaction": {
                    "states": [
                        "idle",
                        "inputting",
                        "field-validating",
                        "code-sending",
                        "code-countdown",
                        "submitting",
                        "success",
                        "error",
                        "locked"
                    ],
                    "summary": "登录屏主状态机：entry-checking → idle → inputting/field-validating ↔ (mode 切换/code-sending/code-countdown) → submitting → success(nav.go) | error(按 code 分支：CREDENTIAL/LIMIT_EXCEEDED/NETWORK/5xx；累加 failureCount，≥5 进入 locked) → locked(持续态 30min 倒计时，到点自动回 idle)；screenExit 取消 ds-login/ds-send-code + 停止 codeCD/lockedCountdown 计时器。",
                    "boundaries": [
                        "重复点击/防抖: SubmitBtn condition.when 含 '!view.submitting' + 进入 actions 立即 state.set submitting=true（onSuccess/onError 末尾置 false）+ 800ms 防抖；GetCodeBtn condition.when 'state.effects[ds-send-code].status!==pending && view.codeCountdown===0' 双保险拦连点。",
                        "请求超时: ds-login endpoint.timeout=15000ms / ds-send-code endpoint.timeout=10000ms（超时由 effect.fetch 自动转 onError code='NETWORK_ERROR'）；超时分支不累加 view.failureCount（决策 D-B1，避免弱网误锁）；Toast '网络异常，请检查后重试'。",
                        "离开页面: rootNode.screenExit → effect.cancel ds-login + effect.cancel ds-send-code + ui.stopTimer codeCD + ui.stopTimer lockedCountdown，全部副作用幂等清理。",
                        "重入恢复: rootNode.screenEnter 顺序检查：(1) globalView.session.status==='active' → nav.go 01-home；(2) view.lockedUntil>now() → 重启 lockedCountdown 定时器；(3) view.codeCountdown 不恢复（决策 D-B2：60s 是服务端同号冷却，由 LIMIT_EXCEEDED 兜底；离屏已归 0）。",
                        "并发冲突: 两个 fetch 用不同 dataSourceId，effect.fetch 互不干扰；condition 守卫保证同一按钮同时只一个 pending；决策 D-B3 不在前端拦'未发码即登录'，由后端 ds-login 校验验证码有效性。",
                        "离线: 前置 condition.when 含 globalView.network.status!=='offline' 拦提交（决策 D-E2 不再 Toast，避免与全局横幅噪音重复）；运行时断网走 errors.network 类；离线全局横幅复用 globalOverlays.global-offline-banner；决策 D-B4 不做离线缓存待发——凭证类不应离线代发。",
                        "极端数据: PhoneInput maxLength=11 + type='tel' + autocomplete='tel'；CredentialInput maxLength 动态={{state.view.loginMode==='code'?6:20}}（决策 D-B5 单节点动态 props 不建双节点）；code 模式 inputmode='numeric' + autocomplete='one-time-code' 启用 iOS 短信预填；password 模式 autocomplete='current-password' 启用密码管理器（决策 D-B6）；emoji/SQL 不做前端 escape，maxLength + 后端校验兜底；协议链接 ui.openUrl openInNewTab=true 不污染 history。",
                        "键盘遮挡: 决策 D-B7 不强制 sticky-bottom——登录表单短，依赖浏览器 focus 时默认 scrollIntoView；FormCard padding-bottom 留余量（design 阶段 CSS 实施）；envelope 测试覆盖 iOS Safari + Android Chrome 两种弹键盘场景。",
                        "锁定时间精度: lockedCountdown ui.startTimer interval=1000 onTick state.set view.lockedCountdown-=1，onComplete state.set view.lockedUntil=null + view.failureCount=0 自动解锁；最多 1s 视觉滞后可接受。",
                        "设备时间篡改: 决策 D-B8 不做前端防改；后端 ds-login 二次判 LOCKED 兜底，errors.business LOCKED 分支重新写 view.lockedUntil。",
                        "locked 中切模式: 决策 D-B9 locked 期间整表单 disabled（含 ModeToggle/GetCodeBtn/Inputs/Submit），仅 LockedView 子树可见——与 statemachine.md → locked Effects 一致；I-M1-view-business 建 NormalFormView/LockedView 双子树 visibleWhen 互斥。",
                        "authRedirectTo 跨屏消费: SubmitBtn ds-login.onSuccess 末尾 logic.if globalView.nav.authRedirectTo then nav.go {{authRedirectTo}}+清空 else nav.go 01-home（决策 D-B10 消费即清空避免污染下次登录）；来源屏写入 authRedirectTo 是来源屏责任，本屏只负责消费。",
                        "token 过期但 status='active': 本屏不做主动校验（避免无谓 ping）；由全局 401 拦截器写 globalView.session.status='expired' 触发 global-session-expired Modal；本屏 screenEnter 只信 status 字段。"
                    ],
                    "operations": [
                        {
                            "op": "进屏门禁检查",
                            "boundary": "若 view.lockedUntil>now() 启动 lockedCountdown 定时器；fail-safe 路径不阻塞",
                            "onFailure": "—",
                            "onSuccess": "session.status==='active' 立即 nav.go 01-home；否则留在 idle",
                            "inProgress": "—",
                            "feedbackLevel": "L0",
                            "triggerNodePath": "Root",
                            "immediateFeedback": "无视觉过路态（同步本地判断，避免闪烁）"
                        },
                        {
                            "op": "输入手机号",
                            "boundary": "iOS 短信验证码预填可能一次性灌满 11 位；type=tel 触发数字键盘",
                            "onFailure": "—（输入本身不会失败）",
                            "onSuccess": "受控 bind 同步写 view.form.phone",
                            "inProgress": "—",
                            "feedbackLevel": "L0",
                            "triggerNodePath": "FormCard/PhoneField/PhoneInput",
                            "immediateFeedback": "字符显示 + maxLength=11 自动截断"
                        },
                        {
                            "op": "失焦校验手机号",
                            "boundary": "空 phone 不触发校验（避免 idle 阶段瞎报）",
                            "onFailure": "PhoneError 显示红字 '请输入正确的手机号' + aria-live=polite",
                            "onSuccess": "view.errors.phone='' 清错",
                            "inProgress": "—",
                            "feedbackLevel": "L1",
                            "triggerNodePath": "FormCard/PhoneField/PhoneInput",
                            "immediateFeedback": "—（无即时态，校验在 blur 后）"
                        },
                        {
                            "op": "切换到验证码模式",
                            "boundary": "保留已输入 phone（用户意图通常不变）；当前已是 code 模式则 condition 拒绝",
                            "onFailure": "—",
                            "onSuccess": "state.set view.loginMode='code' + 清 credential + 清 credential error；CredentialLabel 文字 → '验证码'；GetCodeBtn 显示 / EyeIcon 隐藏",
                            "inProgress": "—",
                            "feedbackLevel": "L0",
                            "triggerNodePath": "FormCard/ModeToggle/CodeModeBtn",
                            "immediateFeedback": "按钮 active 视觉切换（design 阶段写 visualState）"
                        },
                        {
                            "op": "切换到密码模式",
                            "boundary": "保留 phone；当前已是 password 模式则 condition 拒绝",
                            "onFailure": "—",
                            "onSuccess": "state.set view.loginMode='password' + 清 credential + 清 credential error；CredentialLabel 文字 → '密码'；GetCodeBtn 隐藏 / EyeIcon 显示",
                            "inProgress": "—",
                            "feedbackLevel": "L0",
                            "triggerNodePath": "FormCard/ModeToggle/PasswordModeBtn",
                            "immediateFeedback": "按钮 active 视觉切换"
                        },
                        {
                            "op": "输入凭证",
                            "boundary": "code 模式 maxLength=6 数字；password 模式 maxLength=20",
                            "onFailure": "—",
                            "onSuccess": "受控 bind 同步写 view.form.credential",
                            "inProgress": "—",
                            "feedbackLevel": "L0",
                            "triggerNodePath": "FormCard/CredentialField/CredentialInput",
                            "immediateFeedback": "字符显示；密码模式按 view.passwordVisible 决定 type=password/text"
                        },
                        {
                            "op": "失焦校验凭证",
                            "boundary": "空 credential 不触发；切模式后旧错误已被切换 op 清掉",
                            "onFailure": "CredentialError 显示红字（code 模式：'请输入 6 位数字验证码'；password 模式：'密码需 6-20 位且包含字母+数字'）+ aria-live",
                            "onSuccess": "view.errors.credential='' 清错",
                            "inProgress": "—",
                            "feedbackLevel": "L1",
                            "triggerNodePath": "FormCard/CredentialField/CredentialInput",
                            "immediateFeedback": "—"
                        },
                        {
                            "op": "获取验证码",
                            "boundary": "倒计时期间按钮始终 disabled；condition 守卫: loginMode==='code' && phone 合法 && codeCountdown===0 && network online；screenExit 触发 ui.stopTimer codeCD",
                            "onFailure": "Toast(error) 按 logic.switch 错误 code 分支：LIMIT_EXCEEDED='今日发送次数已达上限' / NETWORK='网络异常' / 5xx='服务繁忙'；按钮恢复 '获取验证码'",
                            "onSuccess": "Toast(success) '验证码已发送' + state.set view.codeCountdown=60 + ui.startTimer codeCD 60s（每秒 onTick -1，onComplete 归 0）；按钮文字切 '重新获取 (Ns)' + disabled",
                            "inProgress": "按钮 spinner（按钮内反馈，不全屏遮罩）",
                            "feedbackLevel": "L2",
                            "triggerNodePath": "FormCard/CredentialField/GetCodeBtn",
                            "immediateFeedback": "按钮 scale(0.97) (L0)；按钮文字 → '发送中…' + disabled"
                        },
                        {
                            "op": "切换密码显隐",
                            "boundary": "切换不清空已输入密码；不影响 focus；condition: loginMode==='password'",
                            "onFailure": "—",
                            "onSuccess": "state.toggle view.passwordVisible；CredentialInput type 切 text/password",
                            "inProgress": "—",
                            "feedbackLevel": "L0",
                            "triggerNodePath": "FormCard/CredentialField/PasswordToggleEye",
                            "immediateFeedback": "眼睛图标切换（design 阶段实施 visualState）"
                        },
                        {
                            "op": "勾选/取消协议",
                            "boundary": "已勾后取消 → SubmitBtn 立刻回 disabled",
                            "onFailure": "—",
                            "onSuccess": "受控 bind 同步写 view.form.policy；勾选后 SubmitBtn 由 disabled → 可点（条件计算）",
                            "inProgress": "—",
                            "feedbackLevel": "L0",
                            "triggerNodePath": "FormCard/PolicyRow/PolicyCheckbox",
                            "immediateFeedback": "checkbox 视觉切换"
                        },
                        {
                            "op": "点开《用户服务协议》",
                            "boundary": "不阻塞主流程；移动端走系统浏览器；不需要二次确认（决策 D2）",
                            "onFailure": "—",
                            "onSuccess": "ui.openUrl ds-policy-text.termsUrl openInNewTab=true",
                            "inProgress": "—",
                            "feedbackLevel": "L0",
                            "triggerNodePath": "FormCard/PolicyRow/PolicyText",
                            "immediateFeedback": "文字色 hover 变化（design 阶段实施）"
                        },
                        {
                            "op": "点开《隐私协议》",
                            "boundary": "同上",
                            "onFailure": "—",
                            "onSuccess": "ui.openUrl ds-policy-text.privacyUrl openInNewTab=true",
                            "inProgress": "—",
                            "feedbackLevel": "L0",
                            "triggerNodePath": "FormCard/PolicyRow/PolicyText",
                            "immediateFeedback": "文字色 hover 变化"
                        },
                        {
                            "op": "提交登录",
                            "boundary": "800ms 防抖 + view.submitting 守卫 + condition.when: formValid && policy=true && !submitting && network online && (!lockedUntil || lockedUntil<now())；screenExit 自动 effect.cancel ds-login",
                            "onFailure": "按钮恢复 + 表单 shake (ui.animate shake 300ms) + logic.switch $last.error.code: CREDENTIAL→Toast '账号或密码错误' + focus credential + view.failureCount+=1（决策 D6：第5次 Toast '尝试次数过多已锁 30min' + 写 view.lockedUntil=now()+30*60*1000）；LIMIT_EXCEEDED→Toast；LOCKED→直接进 locked 态；NETWORK→Toast '网络异常'；5xx→Toast '服务繁忙'",
                            "onSuccess": "按钮 ✓ 0.5s（visualState=success）+ 写 globalView.session={status:'active',token,user,expiresAt} + 消费 globalView.nav.authRedirectTo（有则 nav.go 该屏，无则 nav.go 01-home）",
                            "inProgress": "按钮内 spinner + 文字 '登录中…' + 全表单 disabled（决策 D1：不用全屏 LoadingOverlay）",
                            "feedbackLevel": "L2",
                            "triggerNodePath": "FormCard/SubmitBtn",
                            "immediateFeedback": "按钮 scale(0.97) + shadow 降级 (L0)；触觉 custom hapticFeedback strength=medium"
                        },
                        {
                            "op": "跳转注册",
                            "boundary": "注册屏占位本期不实现；点击不阻塞",
                            "onFailure": "—",
                            "onSuccess": "nav.go 00-register",
                            "inProgress": "—",
                            "feedbackLevel": "L0",
                            "triggerNodePath": "FooterLinks/RegisterLink",
                            "immediateFeedback": "文字色 hover 变化"
                        },
                        {
                            "op": "跳转忘记密码",
                            "boundary": "忘记密码屏占位本期不实现",
                            "onFailure": "—",
                            "onSuccess": "nav.go 00-forgot-password",
                            "inProgress": "—",
                            "feedbackLevel": "L0",
                            "triggerNodePath": "FooterLinks/ForgotLink",
                            "immediateFeedback": "文字色 hover 变化"
                        },
                        {
                            "op": "离屏副作用清理",
                            "boundary": "多次进出屏不泄漏定时器；fetch 取消是幂等的",
                            "onFailure": "—",
                            "onSuccess": "effect.cancel ds-login + effect.cancel ds-send-code + ui.stopTimer codeCD + ui.stopTimer lockedCountdown",
                            "inProgress": "—",
                            "feedbackLevel": "L0",
                            "triggerNodePath": "Root",
                            "immediateFeedback": "—（系统触发）"
                        }
                    ],
                    "errorHandling": {
                        "server": "5xx → Toast(error) '服务繁忙，请稍后重试' + custom platform.reportError（payload: {scope, error}）。决策 D-E3：不切整页 ErrorView——登录页关键路径短，整页错误反而让用户找不到表单和重试入口。",
                        "network": "运行时 NETWORK_ERROR → Toast(error) '网络异常，请检查后重试'，本屏不直接改 globalView.network.status（由全局 listener 维护）；前置 globalView.network.status==='offline' → SubmitBtn/GetCodeBtn condition 守卫直接拒绝提交（决策 D-E2 不再 Toast，避免与全局横幅重复）；离线全局横幅复用 globalOverlays.global-offline-banner。",
                        "unknown": "logic.switch default 分支 → Toast(error) '出了点问题，请稍后重试' + custom platform.reportError 上报（兜底未知 error.code）。",
                        "business": "ds-login.onError logic.switch 按 $last.error.code 分支：CREDENTIAL→view.failureCount++ + Toast(error)（第5次特殊文案 '已锁 30min' + 写 view.lockedUntil）+ password 模式清密码 + shake FormCard 300ms（决策 D-E6 仅 password 清，code 不清）；LOCKED→state.set view.lockedUntil=$last.error.lockedUntil 直接进 locked 态；LIMIT_EXCEEDED→Toast(error) '今日登录尝试次数已达上限' 不累加 failureCount。ds-send-code.onError 仅 LIMIT_EXCEEDED→Toast '今日发送次数已达上限'。",
                        "permission": "—（登录页即 anonymous 入口；ds-login/ds-send-code 接口设计上不会返回 401/403）",
                        "validation": "PhoneInput/CredentialInput onBlur 触发；行内红字（PhoneError/CredentialError 节点 textContent + visibleWhen）+ 输入框红框（design 阶段 visualState）+ aria-live=polite；blur 阶段不抢 focus（决策 D-E1）。校验时机：onBlur+onSubmit 两档（决策 D-E4 不用 onChange，决策 D-E5 不做 debounce 查重）。空字段不触发校验。"
                    },
                    "loadingStrategy": {
                        "button": "两类按钮请求均按钮内 spinner——SubmitBtn=spinner+文字'登录中…'+全表单 disabled（驱动表达式 state.view.submitting 或 state.effects['ds-login'].status==='pending'）；GetCodeBtn=spinner+文字'发送中…'+仅按钮 disabled（驱动表达式 state.effects['ds-send-code'].status==='pending'）。均不使用全屏 LoadingOverlay（决策 D1：风格契合 + 守卫已足够）",
                        "silent": "—",
                        "initial": "无（首屏 cold start 无异步 fetch；ds-login/ds-send-code 均 autoFetchOnEnter=false；ds-policy-text 是 static 同步可读）",
                        "refresh": "—",
                        "pagination": "—"
                    }
                }
            },
            "name": "00-login",
            "rootNode": {
                "id": "nd_6a7f2492b59b4e7eab7e1",
                "meta": {
                    "product": {
                        "summary": "00-login 屏根容器；纵向布局（HeaderArea / FormCard / FooterLinks 三段）",
                        "fromModules": [
                            "M1"
                        ]
                    }
                },
                "name": "Root",
                "type": "div",
                "label": "屏根",
                "props": {},
                "events": [
                    {
                        "actions": [
                            {
                                "else": [
                                    {
                                        "then": [
                                            {
                                                "path": "view.lockedCountdown",
                                                "type": "state.set",
                                                "value": "{{ Math.max(0, Math.floor((state.view.lockedUntil - Date.now()) / 1000)) }}"
                                            },
                                            {
                                                "type": "ui.startTimer",
                                                "onTick": [
                                                    {
                                                        "path": "view.lockedCountdown",
                                                        "type": "state.set",
                                                        "value": "{{ state.view.lockedCountdown - 1 }}"
                                                    }
                                                ],
                                                "timerId": "lockedCountdown",
                                                "duration": "{{ state.view.lockedUntil - Date.now() }}",
                                                "interval": 1000,
                                                "onComplete": [
                                                    {
                                                        "path": "view.lockedUntil",
                                                        "type": "state.set",
                                                        "value": null
                                                    },
                                                    {
                                                        "path": "view.lockedCountdown",
                                                        "type": "state.set",
                                                        "value": 0
                                                    },
                                                    {
                                                        "path": "view.failureCount",
                                                        "type": "state.set",
                                                        "value": 0
                                                    }
                                                ]
                                            }
                                        ],
                                        "type": "logic.if",
                                        "when": "{{ state.view.lockedUntil && state.view.lockedUntil > Date.now() }}"
                                    }
                                ],
                                "then": [
                                    {
                                        "type": "nav.go",
                                        "targetScreenId": "01-home"
                                    }
                                ],
                                "type": "logic.if",
                                "when": "{{ globalView.session && globalView.session.status === 'active' }}"
                            }
                        ],
                        "trigger": "screenEnter",
                        "description": "进屏门禁：(1) session.status='active' 直跳 01-home；(2) lockedUntil>now 重启 lockedCountdown timer 同步剩余秒数；codeCountdown 不恢复（决策 D-B2）。来源 operations #1 + boundaries 重入恢复。"
                    },
                    {
                        "actions": [
                            {
                                "type": "effect.cancel",
                                "dataSourceId": "ds-login"
                            },
                            {
                                "type": "effect.cancel",
                                "dataSourceId": "ds-send-code"
                            },
                            {
                                "type": "ui.stopTimer",
                                "timerId": "codeCD"
                            },
                            {
                                "type": "ui.stopTimer",
                                "timerId": "lockedCountdown"
                            }
                        ],
                        "trigger": "screenExit",
                        "description": "离屏副作用清理：取消 ds-login / ds-send-code 未完成 fetch；停 codeCD / lockedCountdown 两个 timer。来源 operations #16 + boundaries '离开页面'。"
                    }
                ],
                "locked": false,
                "states": [],
                "styles": {
                    "width": "100%",
                    "display": "flex",
                    "minHeight": "100%",
                    "flexDirection": "column",
                    "backgroundColor": "#ffffff"
                },
                "visible": true,
                "children": [
                    {
                        "id": "nd_legacy_wrap_217_fixed",
                        "type": "div",
                        "styles": {
                            "flex": 1
                        },
                        "children": [
                            {
                                "id": "nd_451ec7c1336d478a810d9",
                                "meta": {
                                    "product": {
                                        "summary": "顶部品牌区，承载品牌强调字 + 标语，给用户'在哪儿'的安全感",
                                        "fromModules": [
                                            "M1"
                                        ]
                                    }
                                },
                                "name": "HeaderArea",
                                "type": "div",
                                "label": "顶部品牌区",
                                "props": {},
                                "events": [],
                                "locked": false,
                                "states": [],
                                "styles": {},
                                "visible": true,
                                "children": [
                                    {
                                        "id": "nd_d7d8b56e2d934187bbb9b",
                                        "meta": {
                                            "product": {
                                                "summary": "校园社交 App 的品牌 Logo（design 阶段决定具体素材）",
                                                "fromModules": [
                                                    "M1"
                                                ]
                                            }
                                        },
                                        "name": "BrandLogo",
                                        "type": "img",
                                        "label": "品牌 Logo",
                                        "props": {
                                            "alt": "Logo"
                                        },
                                        "events": [],
                                        "locked": false,
                                        "states": [],
                                        "styles": {},
                                        "visible": true,
                                        "children": [],
                                        "activeState": "default"
                                    },
                                    {
                                        "id": "nd_db3a01b4935c412a96005",
                                        "meta": {
                                            "product": {
                                                "summary": "品牌标语 '找到校园同好'，体现简约时尚 + 校园温度的语言基调",
                                                "fromModules": [
                                                    "M1"
                                                ]
                                            }
                                        },
                                        "name": "BrandSlogan",
                                        "type": "div",
                                        "label": "品牌标语",
                                        "props": {
                                            "textContent": "找到校园同好"
                                        },
                                        "events": [],
                                        "locked": false,
                                        "states": [],
                                        "styles": {},
                                        "visible": true,
                                        "children": [],
                                        "activeState": "default"
                                    }
                                ],
                                "activeState": "default"
                            },
                            {
                                "id": "nd_e60fb832933f4b86a6638",
                                "meta": {
                                    "product": {
                                        "summary": "核心表单卡片，承载手机号 / 模式切换 / 凭证 / 协议 / 登录主 CTA 整套交互",
                                        "fromModules": [
                                            "M1"
                                        ]
                                    }
                                },
                                "name": "FormCard",
                                "type": "div",
                                "label": "表单卡片",
                                "props": {},
                                "events": [],
                                "locked": false,
                                "states": [],
                                "styles": {},
                                "visible": true,
                                "children": [
                                    {
                                        "id": "nd_6a8ce0b8189b4f789fc07",
                                        "meta": {
                                            "product": {
                                                "summary": "手机号字段复合（label + input + error）",
                                                "fromModules": [
                                                    "M1"
                                                ]
                                            }
                                        },
                                        "name": "PhoneField",
                                        "type": "div",
                                        "label": "手机号字段",
                                        "props": {},
                                        "events": [],
                                        "locked": false,
                                        "states": [],
                                        "styles": {},
                                        "visible": true,
                                        "children": [
                                            {
                                                "id": "nd_44ef1e21abb846ef9bc9f",
                                                "meta": {
                                                    "product": {
                                                        "summary": "'手机号' 静态标签",
                                                        "fromModules": [
                                                            "M1"
                                                        ]
                                                    }
                                                },
                                                "name": "PhoneLabel",
                                                "type": "div",
                                                "label": "手机号标签",
                                                "props": {
                                                    "textContent": "手机号"
                                                },
                                                "events": [],
                                                "locked": false,
                                                "states": [],
                                                "styles": {},
                                                "visible": true,
                                                "children": [],
                                                "activeState": "default"
                                            },
                                            {
                                                "id": "nd_083c744e1699418e9d01e",
                                                "bind": {
                                                    "path": "view.form.phone"
                                                },
                                                "meta": {
                                                    "product": {
                                                        "summary": "手机号输入；受控绑定 view.form.phone（interaction 写 bind）；失焦校验 /^1[3-9]\\d{9}$/；maxLength=11 自动截断",
                                                        "fromModules": [
                                                            "M1"
                                                        ]
                                                    }
                                                },
                                                "name": "PhoneInput",
                                                "type": "input",
                                                "label": "手机号输入框",
                                                "props": {
                                                    "type": "tel",
                                                    "maxLength": 11,
                                                    "placeholder": "请输入手机号"
                                                },
                                                "events": [
                                                    {
                                                        "actions": [
                                                            {
                                                                "else": [
                                                                    {
                                                                        "path": "view.errors.phone",
                                                                        "type": "state.set",
                                                                        "value": ""
                                                                    }
                                                                ],
                                                                "then": [
                                                                    {
                                                                        "path": "view.errors.phone",
                                                                        "type": "state.set",
                                                                        "value": "{{ /^1[3-9]\\d{9}$/.test(state.view.form.phone) ? '' : '请输入正确的手机号' }}"
                                                                    }
                                                                ],
                                                                "type": "logic.if",
                                                                "when": "{{ state.view.form.phone && state.view.form.phone.length > 0 }}"
                                                            }
                                                        ],
                                                        "trigger": "blur",
                                                        "description": "失焦校验手机号格式：空不触发；非空且不符 11 位 1[3-9] 规则 → 行内错；合法 → 清错。来源 operations #3 + errors D-E1/D-E4。"
                                                    }
                                                ],
                                                "locked": false,
                                                "states": [],
                                                "styles": {},
                                                "visible": true,
                                                "children": [],
                                                "activeState": "default"
                                            },
                                            {
                                                "id": "nd_905bbf8e8ae84435bd1c5",
                                                "meta": {
                                                    "product": {
                                                        "summary": "手机号校验错误行内提示位（动态文案 由 interaction 写 textContent 表达式 + visibleWhen）",
                                                        "fromModules": [
                                                            "M1"
                                                        ]
                                                    },
                                                    "interaction": {
                                                        "states": [
                                                            "showing",
                                                            "hidden"
                                                        ],
                                                        "summary": "手机号失焦校验错的行内提示位：textContent 接 {{state.view.errors.phone}}；visibleWhen 接 {{!!state.view.errors.phone}}；空字符串隐藏，非空显示。文案由 PhoneInput.blur 事件根据 /^1[3-9]\\d{9}$/ 写入 '请输入正确的手机号' / ''。aria-live=polite（design 阶段补 role 属性 + 红字红框 visualState）。来源 errors.md 类 1 + events.md PhoneInput.blur。"
                                                    }
                                                },
                                                "name": "PhoneError",
                                                "type": "div",
                                                "label": "手机号错误提示",
                                                "props": {
                                                    "textContent": "{{ state.view.errors.phone }}"
                                                },
                                                "events": [],
                                                "locked": false,
                                                "states": [],
                                                "styles": {},
                                                "visible": true,
                                                "children": [],
                                                "activeState": "default",
                                                "visibleWhen": "{{ !!state.view.errors.phone }}"
                                            }
                                        ],
                                        "activeState": "default"
                                    },
                                    {
                                        "id": "nd_edee969db25d4440b9169",
                                        "meta": {
                                            "product": {
                                                "summary": "登录方式互斥切换容器：影响 CredentialInput 的 placeholder/type/校验规则与 GetCodeBtn / PasswordToggleEye 可见性",
                                                "fromModules": [
                                                    "M1"
                                                ]
                                            }
                                        },
                                        "name": "ModeToggle",
                                        "type": "div",
                                        "label": "登录方式切换",
                                        "props": {},
                                        "events": [],
                                        "locked": false,
                                        "states": [],
                                        "styles": {},
                                        "visible": true,
                                        "children": [
                                            {
                                                "id": "nd_fea83ab543584619ab847",
                                                "meta": {
                                                    "product": {
                                                        "summary": "切换到验证码登录（state.set view.loginMode='code'）；选中态由 visualState 表达",
                                                        "fromModules": [
                                                            "M1"
                                                        ]
                                                    }
                                                },
                                                "name": "CodeModeBtn",
                                                "type": "button",
                                                "label": "验证码模式按钮",
                                                "props": {
                                                    "textContent": "验证码登录"
                                                },
                                                "events": [
                                                    {
                                                        "actions": [
                                                            {
                                                                "path": "view.loginMode",
                                                                "type": "state.set",
                                                                "value": "code"
                                                            },
                                                            {
                                                                "path": "view.form.credential",
                                                                "type": "state.set",
                                                                "value": ""
                                                            },
                                                            {
                                                                "path": "view.errors.credential",
                                                                "type": "state.set",
                                                                "value": ""
                                                            }
                                                        ],
                                                        "trigger": "click",
                                                        "condition": {
                                                            "when": "{{ state.view.loginMode !== 'code' }}"
                                                        },
                                                        "description": "切换到验证码登录：清 credential + 清 credential error；保留 phone。已是 code 模式则 condition 拒绝。来源 operations #4 + 决策 D4。"
                                                    }
                                                ],
                                                "locked": false,
                                                "states": [],
                                                "styles": {},
                                                "visible": true,
                                                "children": [],
                                                "activeState": "default"
                                            },
                                            {
                                                "id": "nd_fc9f672d68824795b92cd",
                                                "meta": {
                                                    "product": {
                                                        "summary": "切换到密码登录（state.set view.loginMode='password'）；选中态由 visualState 表达",
                                                        "fromModules": [
                                                            "M1"
                                                        ]
                                                    }
                                                },
                                                "name": "PasswordModeBtn",
                                                "type": "button",
                                                "label": "密码模式按钮",
                                                "props": {
                                                    "textContent": "密码登录"
                                                },
                                                "events": [
                                                    {
                                                        "actions": [
                                                            {
                                                                "path": "view.loginMode",
                                                                "type": "state.set",
                                                                "value": "password"
                                                            },
                                                            {
                                                                "path": "view.form.credential",
                                                                "type": "state.set",
                                                                "value": ""
                                                            },
                                                            {
                                                                "path": "view.errors.credential",
                                                                "type": "state.set",
                                                                "value": ""
                                                            }
                                                        ],
                                                        "trigger": "click",
                                                        "condition": {
                                                            "when": "{{ state.view.loginMode !== 'password' }}"
                                                        },
                                                        "description": "切换到密码登录：清 credential + 清 credential error；保留 phone。已是 password 模式则 condition 拒绝。来源 operations #5 + 决策 D4。"
                                                    }
                                                ],
                                                "locked": false,
                                                "states": [],
                                                "styles": {},
                                                "visible": true,
                                                "children": [],
                                                "activeState": "default"
                                            }
                                        ],
                                        "activeState": "default"
                                    },
                                    {
                                        "id": "nd_af20c6a53caf4bed8d0b6",
                                        "meta": {
                                            "product": {
                                                "summary": "凭证字段复合；内含模式相关的 GetCodeBtn / PasswordToggleEye 后缀按钮",
                                                "fromModules": [
                                                    "M1"
                                                ]
                                            }
                                        },
                                        "name": "CredentialField",
                                        "type": "div",
                                        "label": "凭证字段",
                                        "props": {},
                                        "events": [],
                                        "locked": false,
                                        "states": [],
                                        "styles": {},
                                        "visible": true,
                                        "children": [
                                            {
                                                "id": "nd_bd114d45f07f45caabdd9",
                                                "meta": {
                                                    "product": {
                                                        "summary": "凭证标签（动态文案 '验证码' / '密码' 由 interaction 阶段挂表达式）",
                                                        "fromModules": [
                                                            "M1"
                                                        ]
                                                    }
                                                },
                                                "name": "CredentialLabel",
                                                "type": "div",
                                                "label": "凭证标签",
                                                "props": {
                                                    "textContent": "{{ state.view.loginMode === 'code' ? '验证码' : '密码' }}"
                                                },
                                                "events": [],
                                                "locked": false,
                                                "states": [],
                                                "styles": {},
                                                "visible": true,
                                                "children": [],
                                                "activeState": "default"
                                            },
                                            {
                                                "id": "nd_989c02eb1f224e0c9f973",
                                                "bind": {
                                                    "path": "view.form.credential"
                                                },
                                                "meta": {
                                                    "product": {
                                                        "summary": "凭证输入；受控绑定 view.form.credential；type/placeholder 由 interaction 按 view.loginMode 切换（验证码 6 位数字 / 密码 6-20 位字母+数字）",
                                                        "fromModules": [
                                                            "M1"
                                                        ]
                                                    }
                                                },
                                                "name": "CredentialInput",
                                                "type": "input",
                                                "label": "凭证输入框",
                                                "props": {
                                                    "type": "{{ state.view.loginMode === 'code' ? 'text' : (state.view.passwordVisible ? 'text' : 'password') }}",
                                                    "inputmode": "{{ state.view.loginMode === 'code' ? 'numeric' : 'text' }}",
                                                    "maxLength": "{{ state.view.loginMode === 'code' ? 6 : 20 }}",
                                                    "placeholder": "{{ state.view.loginMode === 'code' ? '请输入 6 位验证码' : '请输入密码（6-20 位含字母+数字）' }}",
                                                    "autocomplete": "{{ state.view.loginMode === 'code' ? 'one-time-code' : 'current-password' }}"
                                                },
                                                "events": [
                                                    {
                                                        "actions": [
                                                            {
                                                                "else": [
                                                                    {
                                                                        "path": "view.errors.credential",
                                                                        "type": "state.set",
                                                                        "value": ""
                                                                    }
                                                                ],
                                                                "then": [
                                                                    {
                                                                        "path": "view.errors.credential",
                                                                        "type": "state.set",
                                                                        "value": "{{ state.view.loginMode === 'code' ? (/^\\d{6}$/.test(state.view.form.credential) ? '' : '请输入 6 位数字验证码') : (/^(?=.*[A-Za-z])(?=.*\\d).{6,20}$/.test(state.view.form.credential) ? '' : '密码需 6-20 位且包含字母和数字') }}"
                                                                    }
                                                                ],
                                                                "type": "logic.if",
                                                                "when": "{{ state.view.form.credential && state.view.form.credential.length > 0 }}"
                                                            }
                                                        ],
                                                        "trigger": "blur",
                                                        "description": "失焦校验凭证：空不触发；code 模式校 6 位数字；password 模式校 6-20 位含字母+数字。不抢 focus。来源 operations #7 + errors 类 1 + D-E1。"
                                                    }
                                                ],
                                                "locked": false,
                                                "states": [],
                                                "styles": {},
                                                "visible": true,
                                                "children": [],
                                                "activeState": "default"
                                            },
                                            {
                                                "id": "nd_d7657df85d8049aa8251c",
                                                "meta": {
                                                    "product": {
                                                        "summary": "凭证错误行内提示位（动态文案 + visibleWhen 由 interaction 写）",
                                                        "fromModules": [
                                                            "M1"
                                                        ]
                                                    },
                                                    "interaction": {
                                                        "states": [
                                                            "showing",
                                                            "hidden"
                                                        ],
                                                        "summary": "凭证失焦校验错的行内提示位：textContent 接 {{state.view.errors.credential}}；visibleWhen 接 {{!!state.view.errors.credential}}；CredentialInput.blur 按 view.loginMode 分支两套文案（code: '请输入 6 位数字验证码' / password: '密码需 6-20 位且包含字母和数字'）；模式切换时 CodeModeBtn/PasswordModeBtn 已自动清错。来源 errors.md 类 1 + events.md CredentialInput.blur + 决策 D-E1 不抢 focus。"
                                                    }
                                                },
                                                "name": "CredentialError",
                                                "type": "div",
                                                "label": "凭证错误提示",
                                                "props": {
                                                    "textContent": "{{ state.view.errors.credential }}"
                                                },
                                                "events": [],
                                                "locked": false,
                                                "states": [],
                                                "styles": {},
                                                "visible": true,
                                                "children": [],
                                                "activeState": "default",
                                                "visibleWhen": "{{ !!state.view.errors.credential }}"
                                            },
                                            {
                                                "id": "nd_e6783f85edb3499c9f131",
                                                "meta": {
                                                    "product": {
                                                        "summary": "验证码模式专属：点击触发 ds-send-code + 启动 60s 倒计时；visibleWhen=loginMode==='code' 由 interaction 写；按钮 disabled 守卫 view.codeCountdown>0 由 interaction 写",
                                                        "fromModules": [
                                                            "M1",
                                                            "M6"
                                                        ]
                                                    }
                                                },
                                                "name": "GetCodeBtn",
                                                "type": "button",
                                                "label": "获取验证码按钮",
                                                "props": {
                                                    "textContent": "{{ state.effects['ds-send-code'].status === 'pending' ? '发送中…' : (state.view.codeCountdown > 0 ? '重新获取 (' + state.view.codeCountdown + 's)' : '获取验证码') }}"
                                                },
                                                "events": [
                                                    {
                                                        "actions": [
                                                            {
                                                                "type": "effect.fetch",
                                                                "params": {
                                                                    "phone": "{{ state.view.form.phone }}"
                                                                },
                                                                "onError": [
                                                                    {
                                                                        "type": "logic.switch",
                                                                        "cases": [
                                                                            {
                                                                                "when": "LIMIT_EXCEEDED",
                                                                                "actions": [
                                                                                    {
                                                                                        "type": "ui.showToast",
                                                                                        "message": "今日发送次数已达上限",
                                                                                        "toastType": "error"
                                                                                    }
                                                                                ]
                                                                            },
                                                                            {
                                                                                "when": "NETWORK_ERROR",
                                                                                "actions": [
                                                                                    {
                                                                                        "type": "ui.showToast",
                                                                                        "message": "网络异常，请检查后重试",
                                                                                        "toastType": "error"
                                                                                    }
                                                                                ]
                                                                            },
                                                                            {
                                                                                "when": "SERVER_ERROR",
                                                                                "actions": [
                                                                                    {
                                                                                        "type": "ui.showToast",
                                                                                        "message": "服务繁忙，请稍后重试",
                                                                                        "toastType": "error"
                                                                                    },
                                                                                    {
                                                                                        "type": "custom",
                                                                                        "handler": "platform.reportError",
                                                                                        "payload": {
                                                                                            "error": "{{ $last.error }}",
                                                                                            "scope": "ds-send-code"
                                                                                        }
                                                                                    }
                                                                                ]
                                                                            }
                                                                        ],
                                                                        "value": "{{ $last.error.code }}",
                                                                        "default": [
                                                                            {
                                                                                "type": "ui.showToast",
                                                                                "message": "出了点问题，请稍后重试",
                                                                                "toastType": "error"
                                                                            },
                                                                            {
                                                                                "type": "custom",
                                                                                "handler": "platform.reportError",
                                                                                "payload": {
                                                                                    "error": "{{ $last.error }}",
                                                                                    "scope": "ds-send-code"
                                                                                }
                                                                            }
                                                                        ]
                                                                    }
                                                                ],
                                                                "onSuccess": [
                                                                    {
                                                                        "type": "ui.showToast",
                                                                        "message": "验证码已发送",
                                                                        "toastType": "success"
                                                                    },
                                                                    {
                                                                        "path": "view.codeCountdown",
                                                                        "type": "state.set",
                                                                        "value": 60
                                                                    },
                                                                    {
                                                                        "type": "ui.startTimer",
                                                                        "onTick": [
                                                                            {
                                                                                "path": "view.codeCountdown",
                                                                                "type": "state.set",
                                                                                "value": "{{ state.view.codeCountdown - 1 }}"
                                                                            }
                                                                        ],
                                                                        "timerId": "codeCD",
                                                                        "duration": 60000,
                                                                        "interval": 1000,
                                                                        "onComplete": [
                                                                            {
                                                                                "path": "view.codeCountdown",
                                                                                "type": "state.set",
                                                                                "value": 0
                                                                            }
                                                                        ]
                                                                    }
                                                                ],
                                                                "dataSourceId": "ds-send-code"
                                                            }
                                                        ],
                                                        "trigger": "click",
                                                        "condition": {
                                                            "when": "{{ state.view.loginMode === 'code' && /^1[3-9]\\d{9}$/.test(state.view.form.phone) && state.view.codeCountdown === 0 && state.effects['ds-send-code'].status !== 'pending' && globalView.network.status !== 'offline' && !(state.view.lockedUntil && state.view.lockedUntil > Date.now()) }}"
                                                        },
                                                        "description": "获取验证码：condition 守卫 code 模式 + phone 合法 + 倒计时为 0 + ds-send-code 非 pending + 非离线 + 非锁定；onSuccess 启动 60s 倒计时；onError 按 logic.switch 分支。来源 operations #8 + boundaries D-B1 + errors §4。"
                                                    }
                                                ],
                                                "locked": false,
                                                "states": [],
                                                "styles": {},
                                                "visible": true,
                                                "children": [
                                                    {
                                                        "id": "nd_3b4bbe8807f44729998f0",
                                                        "name": "CodeSendSpinner",
                                                        "type": "div",
                                                        "label": "获取验证码加载指示",
                                                        "props": {
                                                            "aria-label": "发送验证码中"
                                                        },
                                                        "events": [],
                                                        "locked": false,
                                                        "states": [],
                                                        "styles": {},
                                                        "visible": true,
                                                        "children": [],
                                                        "activeState": "default",
                                                        "visibleWhen": "{{ state.effects['ds-send-code'].status === 'pending' }}",
                                                        "meta": {
                                                            "interaction": {
                                                                "states": [
                                                                    "showing",
                                                                    "hidden"
                                                                ],
                                                                "summary": "GetCodeBtn 发送期间按钮内 spinner（visibleWhen 接 state.effects['ds-send-code'].status==='pending'；与文字'发送中…'协同）"
                                                            }
                                                        }
                                                    }
                                                ],
                                                "activeState": "default",
                                                "visibleWhen": "{{ state.view.loginMode === 'code' }}"
                                            },
                                            {
                                                "id": "nd_017aac6774174ea08b133",
                                                "meta": {
                                                    "product": {
                                                        "summary": "密码模式专属：点击切换 view.passwordVisible（state.toggle）；visibleWhen=loginMode==='password' 由 interaction 写",
                                                        "fromModules": [
                                                            "M1"
                                                        ]
                                                    }
                                                },
                                                "name": "PasswordToggleEye",
                                                "type": "div",
                                                "label": "密码显隐切换",
                                                "props": {},
                                                "events": [
                                                    {
                                                        "actions": [
                                                            {
                                                                "path": "view.passwordVisible",
                                                                "type": "state.toggle"
                                                            }
                                                        ],
                                                        "trigger": "click",
                                                        "description": "切换密码可见性。来源 operations #9。"
                                                    }
                                                ],
                                                "locked": false,
                                                "states": [],
                                                "styles": {},
                                                "visible": true,
                                                "children": [],
                                                "activeState": "default",
                                                "visibleWhen": "{{ state.view.loginMode === 'password' }}"
                                            }
                                        ],
                                        "activeState": "default"
                                    },
                                    {
                                        "id": "nd_36cea068f4af4b8fbdbb3",
                                        "meta": {
                                            "product": {
                                                "summary": "协议同意行（合规红线）",
                                                "fromModules": [
                                                    "M5"
                                                ]
                                            }
                                        },
                                        "name": "PolicyRow",
                                        "type": "div",
                                        "label": "协议同意行",
                                        "props": {},
                                        "events": [],
                                        "locked": false,
                                        "states": [],
                                        "styles": {},
                                        "visible": true,
                                        "children": [
                                            {
                                                "id": "nd_42b79eb04cfe4a51bc3e2",
                                                "bind": {
                                                    "path": "view.form.policy"
                                                },
                                                "meta": {
                                                    "product": {
                                                        "summary": "协议勾选；受控绑定 view.form.policy；未勾时 SubmitBtn disabled",
                                                        "fromModules": [
                                                            "M5"
                                                        ]
                                                    }
                                                },
                                                "name": "PolicyCheckbox",
                                                "type": "input",
                                                "label": "协议勾选框",
                                                "props": {
                                                    "type": "checkbox"
                                                },
                                                "events": [],
                                                "locked": false,
                                                "states": [],
                                                "styles": {},
                                                "visible": true,
                                                "children": [],
                                                "activeState": "default"
                                            },
                                            {
                                                "id": "nd_5b891f2d60734104b50b8",
                                                "meta": {
                                                    "product": {
                                                        "summary": "协议文案静态展示；点击《用户服务协议》《隐私协议》跳外链由 interaction 阶段挂 ui.openUrl（读 ds-policy-text 的 termsUrl/privacyUrl）",
                                                        "fromModules": [
                                                            "M5"
                                                        ]
                                                    }
                                                },
                                                "name": "PolicyText",
                                                "type": "div",
                                                "label": "协议文案",
                                                "props": {
                                                    "textContent": "我已阅读并同意《用户服务协议》和《隐私协议》"
                                                },
                                                "events": [],
                                                "locked": false,
                                                "states": [],
                                                "styles": {},
                                                "visible": true,
                                                "children": [],
                                                "activeState": "default"
                                            }
                                        ],
                                        "activeState": "default"
                                    },
                                    {
                                        "id": "nd_5a15fd87f060436295b4f",
                                        "meta": {
                                            "product": {
                                                "summary": "登录主 CTA；点击 effect.fetch ds-login（params 来自 view.form + view.loginMode）；守卫 form 完整 + policy=true + !submitting + network online + !lockedUntil；onSuccess 写 globalView.session + 消费 nav.authRedirectTo 跳回（无则 01-home）；onError 按 code 分支（CREDENTIAL/LOCKED/LIMIT_EXCEEDED/5xx）",
                                                "fromModules": [
                                                    "M1",
                                                    "M5",
                                                    "M6"
                                                ]
                                            }
                                        },
                                        "name": "SubmitBtn",
                                        "type": "button",
                                        "label": "登录按钮",
                                        "props": {
                                            "textContent": "{{ state.view.submitting ? '登录中…' : '登录' }}"
                                        },
                                        "events": [
                                            {
                                                "actions": [
                                                    {
                                                        "type": "custom",
                                                        "handler": "hapticFeedback",
                                                        "payload": {
                                                            "strength": "medium"
                                                        }
                                                    },
                                                    {
                                                        "path": "view.submitting",
                                                        "type": "state.set",
                                                        "value": true
                                                    },
                                                    {
                                                        "type": "effect.fetch",
                                                        "onError": [
                                                            {
                                                                "path": "view.submitting",
                                                                "type": "state.set",
                                                                "value": false
                                                            },
                                                            {
                                                                "type": "logic.switch",
                                                                "cases": [
                                                                    {
                                                                        "when": "CREDENTIAL",
                                                                        "actions": [
                                                                            {
                                                                                "path": "view.failureCount",
                                                                                "type": "state.set",
                                                                                "value": "{{ state.view.failureCount + 1 }}"
                                                                            },
                                                                            {
                                                                                "else": [
                                                                                    {
                                                                                        "type": "ui.showToast",
                                                                                        "message": "账号或密码错误",
                                                                                        "toastType": "error"
                                                                                    }
                                                                                ],
                                                                                "then": [
                                                                                    {
                                                                                        "type": "ui.showToast",
                                                                                        "message": "尝试次数过多，账号已锁定 30 分钟",
                                                                                        "toastType": "error"
                                                                                    },
                                                                                    {
                                                                                        "path": "view.lockedUntil",
                                                                                        "type": "state.set",
                                                                                        "value": "{{ Date.now() + 30*60*1000 }}"
                                                                                    }
                                                                                ],
                                                                                "type": "logic.if",
                                                                                "when": "{{ state.view.failureCount >= 5 }}"
                                                                            },
                                                                            {
                                                                                "then": [
                                                                                    {
                                                                                        "path": "view.form.credential",
                                                                                        "type": "state.set",
                                                                                        "value": ""
                                                                                    }
                                                                                ],
                                                                                "type": "logic.if",
                                                                                "when": "{{ state.view.loginMode === 'password' }}"
                                                                            },
                                                                            {
                                                                                "type": "ui.animate",
                                                                                "nodeId": "nd_e60fb832933f4b86a6638",
                                                                                "duration": 300,
                                                                                "animation": "shake"
                                                                            }
                                                                        ]
                                                                    },
                                                                    {
                                                                        "when": "LOCKED",
                                                                        "actions": [
                                                                            {
                                                                                "path": "view.lockedUntil",
                                                                                "type": "state.set",
                                                                                "value": "{{ $last.error.lockedUntil }}"
                                                                            }
                                                                        ]
                                                                    },
                                                                    {
                                                                        "when": "LIMIT_EXCEEDED",
                                                                        "actions": [
                                                                            {
                                                                                "type": "ui.showToast",
                                                                                "message": "今日登录尝试次数已达上限",
                                                                                "toastType": "error"
                                                                            }
                                                                        ]
                                                                    },
                                                                    {
                                                                        "when": "NETWORK_ERROR",
                                                                        "actions": [
                                                                            {
                                                                                "type": "ui.showToast",
                                                                                "message": "网络异常，请检查后重试",
                                                                                "toastType": "error"
                                                                            }
                                                                        ]
                                                                    },
                                                                    {
                                                                        "when": "SERVER_ERROR",
                                                                        "actions": [
                                                                            {
                                                                                "type": "ui.showToast",
                                                                                "message": "服务繁忙，请稍后重试",
                                                                                "toastType": "error"
                                                                            },
                                                                            {
                                                                                "type": "custom",
                                                                                "handler": "platform.reportError",
                                                                                "payload": {
                                                                                    "error": "{{ $last.error }}",
                                                                                    "scope": "ds-login"
                                                                                }
                                                                            }
                                                                        ]
                                                                    }
                                                                ],
                                                                "value": "{{ $last.error.code }}",
                                                                "default": [
                                                                    {
                                                                        "type": "ui.showToast",
                                                                        "message": "出了点问题，请稍后重试",
                                                                        "toastType": "error"
                                                                    },
                                                                    {
                                                                        "type": "custom",
                                                                        "handler": "platform.reportError",
                                                                        "payload": {
                                                                            "error": "{{ $last.error }}",
                                                                            "scope": "ds-login"
                                                                        }
                                                                    }
                                                                ]
                                                            }
                                                        ],
                                                        "onSuccess": [
                                                            {
                                                                "type": "node.setVisualState",
                                                                "state": "success",
                                                                "nodeId": "nd_5a15fd87f060436295b4f",
                                                                "autoRevertMs": 500
                                                            },
                                                            {
                                                                "path": "data.user",
                                                                "type": "state.set",
                                                                "value": "{{ $last.response.user }}"
                                                            },
                                                            {
                                                                "path": "globalView.session",
                                                                "type": "state.set",
                                                                "value": {
                                                                    "user": "{{ $last.response.user }}",
                                                                    "token": "{{ $last.response.token }}",
                                                                    "status": "active",
                                                                    "expiresAt": "{{ Date.now() + $last.response.expiresIn * 1000 }}",
                                                                    "refreshToken": null,
                                                                    "lastActivityAt": "{{ Date.now() }}"
                                                                }
                                                            },
                                                            {
                                                                "path": "view.submitting",
                                                                "type": "state.set",
                                                                "value": false
                                                            },
                                                            {
                                                                "path": "view.failureCount",
                                                                "type": "state.set",
                                                                "value": 0
                                                            },
                                                            {
                                                                "path": "view.lockedUntil",
                                                                "type": "state.set",
                                                                "value": null
                                                            },
                                                            {
                                                                "type": "ui.delay",
                                                                "duration": 500
                                                            },
                                                            {
                                                                "else": [
                                                                    {
                                                                        "type": "nav.go",
                                                                        "targetScreenId": "01-home"
                                                                    }
                                                                ],
                                                                "then": [
                                                                    {
                                                                        "type": "nav.go",
                                                                        "targetScreenId": "{{ globalView.nav.authRedirectTo }}"
                                                                    },
                                                                    {
                                                                        "path": "globalView.nav.authRedirectTo",
                                                                        "type": "state.set",
                                                                        "value": null
                                                                    }
                                                                ],
                                                                "type": "logic.if",
                                                                "when": "{{ !!globalView.nav.authRedirectTo }}"
                                                            }
                                                        ],
                                                        "dataSourceId": "ds-login"
                                                    }
                                                ],
                                                "trigger": "click",
                                                "condition": {
                                                    "when": "{{ /^1[3-9]\\d{9}$/.test(state.view.form.phone) && (state.view.loginMode === 'code' ? /^\\d{6}$/.test(state.view.form.credential) : /^(?=.*[A-Za-z])(?=.*\\d).{6,20}$/.test(state.view.form.credential)) && state.view.form.policy === true && !state.view.submitting && globalView.network.status !== 'offline' && !(state.view.lockedUntil && state.view.lockedUntil > Date.now()) }}"
                                                },
                                                "description": "登录提交主流程：condition 守卫表单合法 + policy + 非提交中 + 非离线 + 非锁定；进入提交态 → effect.fetch ds-login → onSuccess 写 globalView.session 消费 nav.authRedirectTo；onError logic.switch 按 code 分支（CREDENTIAL 累 failureCount，≥5 写 lockedUntil + 特殊文案；LOCKED 信任后端 ts；LIMIT_EXCEEDED/NETWORK/SERVER 各 Toast；default 兜底）。来源 operations #13 + errors §4 + boundaries D-B10 + 决策 D1/D6/D-E1/D-E6。"
                                            }
                                        ],
                                        "locked": false,
                                        "states": [],
                                        "styles": {},
                                        "visible": true,
                                        "children": [
                                            {
                                                "id": "nd_4363095a27b24f7a8aae6",
                                                "name": "SubmitSpinner",
                                                "type": "div",
                                                "label": "登录按钮加载指示",
                                                "props": {
                                                    "aria-label": "登录中"
                                                },
                                                "events": [],
                                                "locked": false,
                                                "states": [],
                                                "styles": {},
                                                "visible": true,
                                                "children": [],
                                                "activeState": "default",
                                                "visibleWhen": "{{ state.view.submitting }}",
                                                "meta": {
                                                    "interaction": {
                                                        "states": [
                                                            "showing",
                                                            "hidden"
                                                        ],
                                                        "summary": "SubmitBtn 提交期间按钮内 spinner（visibleWhen 接 view.submitting；与 SubmitBtn 文字'登录中…'协同；样式细节由 design 阶段补 visualState）"
                                                    }
                                                }
                                            }
                                        ],
                                        "activeState": "default"
                                    }
                                ],
                                "activeState": "default"
                            },
                            {
                                "id": "nd_c04451d9d8f243489f1c1",
                                "meta": {
                                    "product": {
                                        "summary": "底部辅助导航容器（注册 / 忘记密码出口）",
                                        "fromModules": [
                                            "M1",
                                            "M2",
                                            "M3"
                                        ]
                                    }
                                },
                                "name": "FooterLinks",
                                "type": "div",
                                "label": "底部链接",
                                "props": {},
                                "events": [],
                                "locked": false,
                                "states": [],
                                "styles": {},
                                "visible": true,
                                "children": [
                                    {
                                        "id": "nd_bc2793bdb54c4603a22be",
                                        "meta": {
                                            "product": {
                                                "summary": "跳转 00-register（占位屏，本期不实现）；交互 nav.go 由 interaction 挂",
                                                "fromModules": [
                                                    "M2"
                                                ]
                                            }
                                        },
                                        "name": "RegisterLink",
                                        "type": "div",
                                        "label": "注册账号链接",
                                        "props": {
                                            "textContent": "注册账号"
                                        },
                                        "events": [
                                            {
                                                "actions": [
                                                    {
                                                        "type": "nav.go",
                                                        "targetScreenId": "00-register"
                                                    }
                                                ],
                                                "trigger": "click",
                                                "description": "跳转注册账号屏（本期占位，由 nav.go 触发；目标屏未实现时由宿主路由层兜底）。来源 operations #14。"
                                            }
                                        ],
                                        "locked": false,
                                        "states": [],
                                        "styles": {},
                                        "visible": true,
                                        "children": [],
                                        "activeState": "default"
                                    },
                                    {
                                        "id": "nd_24bb133804bb40f1b2833",
                                        "meta": {
                                            "product": {
                                                "summary": "跳转 00-forgot-password（占位屏，本期不实现）；交互 nav.go 由 interaction 挂",
                                                "fromModules": [
                                                    "M3"
                                                ]
                                            }
                                        },
                                        "name": "ForgotLink",
                                        "type": "div",
                                        "label": "忘记密码链接",
                                        "props": {
                                            "textContent": "忘记密码？"
                                        },
                                        "events": [
                                            {
                                                "actions": [
                                                    {
                                                        "type": "nav.go",
                                                        "targetScreenId": "00-forgot-password"
                                                    }
                                                ],
                                                "trigger": "click",
                                                "description": "跳转忘记密码屏（本期占位）。来源 operations #15。"
                                            }
                                        ],
                                        "locked": false,
                                        "states": [],
                                        "styles": {},
                                        "visible": true,
                                        "children": [],
                                        "activeState": "default"
                                    }
                                ],
                                "activeState": "default"
                            }
                        ],
                        "props": {},
                        "states": [],
                        "activeState": "default",
                        "events": [],
                        "locked": false,
                        "visible": true,
                        "name": "NormalFormView",
                        "label": "正常表单子树",
                        "meta": {
                            "product": {
                                "summary": "正常态业务子树容器（账号未锁定时可见）；包含品牌区/表单卡片/底部链接三段；与 LockedView 互斥（visibleWhen 由 interaction 阶段挂）。来自 challenge C-INT-00-login-001 accepted 后的结构补充。",
                                "fromModules": [
                                    "M1"
                                ]
                            },
                            "interaction": {
                                "states": [
                                    "showing",
                                    "hidden"
                                ],
                                "summary": "正常态业务子树容器（unlocked 表达式：!lockedUntil || lockedUntil <= now()）；包含品牌/表单/底部三段，与 LockedView 互斥；locked 时整体隐藏"
                            }
                        },
                        "visibleWhen": "{{ !state.view.lockedUntil || state.view.lockedUntil <= Date.now() }}"
                    },
                    {
                        "id": "nd_aa8a0633ce354664a8d1a",
                        "name": "LockedView",
                        "type": "div",
                        "label": "锁定态视图",
                        "props": {},
                        "styles": {},
                        "children": [
                            {
                                "id": "nd_8b4253353f804cc89e563",
                                "name": "LockedIcon",
                                "type": "div",
                                "label": "锁定图标",
                                "props": {
                                    "aria-label": "锁定"
                                },
                                "styles": {},
                                "children": [],
                                "meta": {
                                    "interaction": {
                                        "summary": "锁图标占位（design-planner 阶段补 svg/icon 素材；本阶段仅占位 div）"
                                    }
                                },
                                "states": [],
                                "events": [],
                                "activeState": "default",
                                "locked": false,
                                "visible": true
                            },
                            {
                                "id": "nd_2cb66aa7ab7445c893846",
                                "name": "LockedTitle",
                                "type": "div",
                                "label": "锁定标题",
                                "props": {
                                    "textContent": "账号已锁定"
                                },
                                "styles": {},
                                "children": [],
                                "meta": {
                                    "interaction": {
                                        "summary": "锁定状态固定标题（静态文本）"
                                    }
                                },
                                "states": [],
                                "events": [],
                                "activeState": "default",
                                "locked": false,
                                "visible": true
                            },
                            {
                                "id": "nd_e3c2865fa1b04412936ea",
                                "name": "LockedCountdown",
                                "type": "div",
                                "label": "锁定倒计时",
                                "props": {
                                    "textContent": "{{ Math.floor(state.view.lockedCountdown/60) }}:{{ String(state.view.lockedCountdown%60).padStart(2,'0') }} 后可重试"
                                },
                                "styles": {},
                                "children": [],
                                "meta": {
                                    "interaction": {
                                        "states": [
                                            "counting"
                                        ],
                                        "summary": "锁定倒计时实时文案；绑 state.view.lockedCountdown（每秒由 Root.screenEnter 设的 setInterval -1 驱动；归零时由 events 副效果清 lockedUntil 让 NormalFormView 重现）；mm:ss 由内联表达式格式化"
                                    }
                                },
                                "states": [],
                                "events": [],
                                "activeState": "default",
                                "locked": false,
                                "visible": true
                            },
                            {
                                "id": "nd_d7e9c4159d7343e9a019b",
                                "name": "LockedHint",
                                "type": "div",
                                "label": "锁定提示",
                                "props": {
                                    "textContent": "为保障账号安全，连续 5 次密码错误后锁定 30 分钟"
                                },
                                "styles": {},
                                "children": [],
                                "meta": {
                                    "interaction": {
                                        "summary": "锁定规则解释文案（静态），传达「是触发风控不是账号被盗」的安抚 UX"
                                    }
                                },
                                "states": [],
                                "events": [],
                                "activeState": "default",
                                "locked": false,
                                "visible": true
                            },
                            {
                                "id": "nd_d620d7ba69e2460aa7e16",
                                "name": "LockedForgotLink",
                                "type": "button",
                                "label": "去重置密码",
                                "props": {
                                    "textContent": "去重置密码"
                                },
                                "events": [
                                    {
                                        "actions": [
                                            {
                                                "type": "nav.go",
                                                "targetScreenId": "00-forgot-password"
                                            }
                                        ],
                                        "trigger": "click",
                                        "description": "锁定态用户的逃生路径——跳到忘记密码页"
                                    }
                                ],
                                "styles": {},
                                "children": [],
                                "meta": {
                                    "interaction": {
                                        "states": [
                                            "enabled"
                                        ],
                                        "summary": "锁定态用户的逃生路径按钮——click → nav.go(\"00-forgot-password\")，让用户不必干等 30 分钟"
                                    }
                                },
                                "states": [],
                                "activeState": "default",
                                "locked": false,
                                "visible": true
                            }
                        ],
                        "visibleWhen": "{{ state.view.lockedUntil && state.view.lockedUntil > Date.now() }}",
                        "meta": {
                            "interaction": {
                                "states": [
                                    "showing",
                                    "hidden"
                                ],
                                "summary": "锁定态业务子树容器（locked 表达式：lockedUntil && lockedUntil > now()）；展示锁图示 + 标题 + 倒计时 + 提示 + 重置密码出口；与 NormalFormView 互斥"
                            }
                        },
                        "states": [],
                        "events": [],
                        "activeState": "default",
                        "locked": false,
                        "visible": true
                    }
                ],
                "activeState": "default"
            },
            "stateInit": {
                "data": {
                    "user": null
                },
                "view": {
                    "form": {
                        "name": "form",
                        "label": "表单数据",
                        "defaultValue": {
                            "phone": "",
                            "policy": false,
                            "credential": ""
                        }
                    },
                    "errors": {
                        "name": "errors",
                        "label": "字段错误",
                        "defaultValue": {
                            "phone": "",
                            "credential": ""
                        }
                    },
                    "loginMode": {
                        "enum": [
                            {
                                "label": "验证码免密",
                                "value": "code"
                            },
                            {
                                "label": "密码登录",
                                "value": "password"
                            }
                        ],
                        "name": "loginMode",
                        "label": "登录方式",
                        "defaultValue": "code"
                    },
                    "submitting": {
                        "name": "submitting",
                        "label": "提交中",
                        "defaultValue": false
                    },
                    "lockedUntil": {
                        "name": "lockedUntil",
                        "label": "锁定截止时间戳",
                        "defaultValue": null
                    },
                    "failureCount": {
                        "name": "failureCount",
                        "label": "失败次数",
                        "defaultValue": 0
                    },
                    "codeCountdown": {
                        "name": "codeCountdown",
                        "label": "验证码倒计时秒",
                        "defaultValue": 0
                    },
                    "lockedCountdown": {
                        "name": "lockedCountdown",
                        "label": "锁定倒计时秒",
                        "defaultValue": 0
                    },
                    "passwordVisible": {
                        "name": "passwordVisible",
                        "label": "密码可见",
                        "defaultValue": false
                    }
                },
                "dataTypes": {
                    "user": {
                        "isArray": false,
                        "typeName": "User"
                    }
                }
            },
            "dataSources": [
                {
                    "id": "ds-login",
                    "mock": {
                        "scenarios": [
                            {
                                "id": "success",
                                "name": "登录成功",
                                "delay": 800,
                                "statusCode": 200,
                                "description": "返回 token + user + expiresIn（验证 onSuccess 主线）",
                                "responseBody": {
                                    "user": {
                                        "id": "u_1001",
                                        "phone": "138****8888",
                                        "avatar": "https://example.edu/avatar/u_1001.png",
                                        "nickname": "校园同学"
                                    },
                                    "token": "fake-jwt-token-eyJhbGciOiJIUzI1NiJ9",
                                    "expiresIn": 86400
                                }
                            },
                            {
                                "id": "wrongCredential",
                                "name": "凭证错误",
                                "delay": 600,
                                "statusCode": 401,
                                "description": "401 验证 onError CREDENTIAL 分支（普通 1-4 次：Toast '账号或密码错误' + failureCount++）",
                                "responseBody": {
                                    "code": "CREDENTIAL",
                                    "message": "账号或密码错误"
                                }
                            },
                            {
                                "id": "locked",
                                "name": "账户锁定",
                                "delay": 500,
                                "statusCode": 423,
                                "description": "423 验证 onError LOCKED 分支（直接进 locked 态，UI 切到 LockedView）；lockedUntil 用极大占位 ts 让 design 期可视化锁定 UI",
                                "responseBody": {
                                    "code": "LOCKED",
                                    "message": "账户已锁定，请稍后重试",
                                    "lockedUntil": 9999999999999
                                }
                            },
                            {
                                "id": "limitExceeded",
                                "name": "登录限流",
                                "delay": 500,
                                "statusCode": 429,
                                "description": "429 验证 onError LIMIT_EXCEEDED 分支（仅 Toast，不累加 failureCount）",
                                "responseBody": {
                                    "code": "LIMIT_EXCEEDED",
                                    "message": "今日登录尝试次数已达上限"
                                }
                            },
                            {
                                "id": "serverError",
                                "name": "服务错误",
                                "delay": 800,
                                "statusCode": 500,
                                "description": "500 验证 onError SERVER_ERROR 分支（Toast '服务繁忙' + custom platform.reportError 上报）",
                                "responseBody": {
                                    "code": "SERVER_ERROR",
                                    "message": "服务繁忙，请稍后重试"
                                }
                            },
                            {
                                "id": "networkTimeout",
                                "name": "网络超时",
                                "delay": 16000,
                                "isTimeout": true,
                                "statusCode": 0,
                                "description": "delay 16000ms 触发 effect.fetch 超时（boundaries D-B1 ds-login timeout=15000ms）；onError NETWORK_ERROR 分支：Toast '网络异常'，不计 failureCount",
                                "responseBody": null
                            }
                        ],
                        "activeScenarioId": "success"
                    },
                    "name": "登录接口",
                    "type": "api",
                    "typeDef": {
                        "paramsName": "LoginParams",
                        "paramsFields": [
                            {
                                "name": "phone",
                                "type": "string"
                            },
                            {
                                "name": "credential",
                                "type": "string"
                            },
                            {
                                "name": "mode",
                                "type": "'code' | 'password'"
                            }
                        ],
                        "responseName": "LoginResponse",
                        "responseShape": "object",
                        "responseFields": [
                            {
                                "name": "token",
                                "type": "string",
                                "description": "JWT 凭证"
                            },
                            {
                                "name": "user",
                                "type": "User",
                                "description": "用户信息"
                            },
                            {
                                "name": "expiresIn",
                                "type": "number",
                                "description": "过期秒数"
                            }
                        ]
                    },
                    "endpoint": {
                        "body": {
                            "mode": "{{ view.loginMode }}",
                            "phone": "{{ view.form.phone }}",
                            "credential": "{{ view.form.credential }}"
                        },
                        "path": "/api/auth/login",
                        "method": "POST",
                        "responseSchema": {
                            "type": "object",
                            "properties": {
                                "user": {
                                    "type": "object",
                                    "properties": {
                                        "id": {
                                            "type": "string"
                                        },
                                        "phone": {
                                            "type": "string"
                                        },
                                        "avatar": {
                                            "type": "string"
                                        },
                                        "nickname": {
                                            "type": "string"
                                        }
                                    }
                                },
                                "token": {
                                    "type": "string"
                                },
                                "expiresIn": {
                                    "type": "number"
                                }
                            }
                        }
                    },
                    "description": "提交手机号 + 凭证（验证码或密码），返回 token + user + expiresIn",
                    "defaultParams": {},
                    "autoFetchOnEnter": false
                },
                {
                    "id": "ds-send-code",
                    "mock": {
                        "scenarios": [
                            {
                                "id": "success",
                                "name": "发送成功",
                                "delay": 600,
                                "statusCode": 200,
                                "description": "返回 success=true（验证 onSuccess 启动 60s 倒计时）",
                                "responseBody": {
                                    "success": true,
                                    "cooldownSeconds": 60
                                }
                            },
                            {
                                "id": "limitExceeded",
                                "name": "发送限流",
                                "delay": 400,
                                "statusCode": 429,
                                "description": "429 验证 onError LIMIT_EXCEEDED 分支（同号 60s 冷却 / 当日 ≥10 次；Toast '今日发送次数已达上限'）",
                                "responseBody": {
                                    "code": "LIMIT_EXCEEDED",
                                    "message": "今日发送次数已达上限"
                                }
                            },
                            {
                                "id": "serverError",
                                "name": "服务错误",
                                "delay": 600,
                                "statusCode": 500,
                                "description": "500 验证 onError SERVER_ERROR 分支（Toast '服务繁忙' + custom reportError）",
                                "responseBody": {
                                    "code": "SERVER_ERROR",
                                    "message": "服务繁忙，请稍后重试"
                                }
                            },
                            {
                                "id": "networkTimeout",
                                "name": "网络超时",
                                "delay": 11000,
                                "isTimeout": true,
                                "statusCode": 0,
                                "description": "delay 11000ms 触发超时（boundaries D-B1 ds-send-code timeout=10000ms）；onError NETWORK 分支 Toast '网络异常'",
                                "responseBody": null
                            }
                        ],
                        "activeScenarioId": "success"
                    },
                    "name": "发送短信验证码",
                    "type": "api",
                    "typeDef": {
                        "paramsName": "SendCodeParams",
                        "paramsFields": [
                            {
                                "name": "phone",
                                "type": "string"
                            }
                        ],
                        "responseName": "SendCodeResponse",
                        "responseShape": "object",
                        "responseFields": [
                            {
                                "name": "success",
                                "type": "boolean",
                                "description": "是否发送成功"
                            },
                            {
                                "name": "cooldownSeconds",
                                "type": "number",
                                "description": "冷却秒数（默认 60）"
                            }
                        ]
                    },
                    "endpoint": {
                        "body": {
                            "phone": "{{ view.form.phone }}"
                        },
                        "path": "/api/auth/send-code",
                        "method": "POST",
                        "responseSchema": {
                            "type": "object",
                            "properties": {
                                "success": {
                                    "type": "boolean"
                                },
                                "cooldownSeconds": {
                                    "type": "number"
                                }
                            }
                        }
                    },
                    "description": "向手机号发送 6 位短信验证码（同号 60s 冷却 + 当日 10 次）",
                    "defaultParams": {},
                    "autoFetchOnEnter": false
                },
                {
                    "id": "ds-policy-text",
                    "name": "协议文案",
                    "type": "static",
                    "initial": {
                        "termsUrl": "https://example.edu/terms",
                        "privacyUrl": "https://example.edu/privacy",
                        "termsTitle": "《用户服务协议》",
                        "privacyTitle": "《隐私协议》"
                    },
                    "description": "登录页底部协议链接的文案 + URL"
                }
            ],
            "backgroundColor": "#ffffff"
        }
    ],
    "platform": "mobile",
    "createdAt": "2026-05-30T04:24:35.895Z",
    "updatedAt": "2026-05-30T15:02:27.194Z",
    "themeConfig": {
        "themes": [
            {
                "id": "default",
                "name": "默认主题",
                "intent": {
                    "summary": "简约时尚 + 校园温度（极简留白 + 单一蓝紫强调色）",
                    "aesthetics": [
                        "minimal",
                        "flat"
                    ],
                    "brightness": "both",
                    "decoration": "minimal",
                    "seedColors": [
                        "#5B6CFF"
                    ],
                    "colorTemperature": "neutral"
                },
                "tokens": {
                    "colors": {
                        "info": {
                            "value": "#2D7DD2",
                            "description": "信息"
                        },
                        "error": {
                            "value": "#DD4747",
                            "description": "错误"
                        },
                        "border": {
                            "value": "#DEE0E6",
                            "description": "默认边框"
                        },
                        "gray100": {
                            "value": "#F1F2F4"
                        },
                        "gray200": {
                            "value": "#D5D7DC"
                        },
                        "gray300": {
                            "value": "#B9BCC4"
                        },
                        "gray400": {
                            "value": "#8F94A0"
                        },
                        "gray500": {
                            "value": "#787E8B"
                        },
                        "gray600": {
                            "value": "#5E6470"
                        },
                        "gray700": {
                            "value": "#474B55"
                        },
                        "gray800": {
                            "value": "#2F323A"
                        },
                        "gray900": {
                            "value": "#181A1F"
                        },
                        "overlay": {
                            "value": "rgba(0, 0, 0, 0.45)",
                            "description": "遮罩"
                        },
                        "primary": {
                            "value": "#5B6CFF",
                            "description": "主色"
                        },
                        "success": {
                            "value": "#2DCC75",
                            "description": "成功"
                        },
                        "surface": {
                            "value": "#F6F7F9",
                            "description": "卡片表面"
                        },
                        "warning": {
                            "value": "#FBBE2E",
                            "description": "警告"
                        },
                        "secondary": {
                            "value": "#A776FF",
                            "description": "辅色"
                        },
                        "background": {
                            "value": "#FCFCFD",
                            "description": "页面底色"
                        },
                        "borderFocus": {
                            "value": "#5B6CFF",
                            "description": "聚焦边框"
                        },
                        "borderLight": {
                            "value": "#E9EBEE",
                            "description": "分割线"
                        },
                        "textInverse": {
                            "value": "#FFFFFF",
                            "description": "反色文字"
                        },
                        "textPrimary": {
                            "value": "rgba(0, 0, 0, 0.88)",
                            "description": "正文"
                        },
                        "primaryHover": {
                            "value": "#7B89FF",
                            "description": "主色悬浮"
                        },
                        "primaryLight": {
                            "value": "#EBEDFA",
                            "description": "主色浅底"
                        },
                        "textTertiary": {
                            "value": "rgba(0, 0, 0, 0.45)",
                            "description": "占位符"
                        },
                        "primaryActive": {
                            "value": "#3346FF",
                            "description": "主色按下"
                        },
                        "textSecondary": {
                            "value": "rgba(0, 0, 0, 0.80)",
                            "description": "辅助"
                        },
                        "secondaryHover": {
                            "value": "#F6B188",
                            "description": "辅色悬浮"
                        },
                        "secondaryActive": {
                            "value": "#E07D40",
                            "description": "辅色按下"
                        },
                        "surfaceElevated": {
                            "value": "#FFFFFF",
                            "description": "悬浮面"
                        }
                    },
                    "radius": {
                        "lg": {
                            "value": "12px",
                            "description": "大圆角"
                        },
                        "md": {
                            "value": "8px",
                            "description": "中圆角"
                        },
                        "sm": {
                            "value": "4px",
                            "description": "小圆角"
                        },
                        "xl": {
                            "value": "16px",
                            "description": "超大圆角"
                        },
                        "full": {
                            "value": "9999px",
                            "description": "全圆（药丸/圆形）"
                        },
                        "none": {
                            "value": "0",
                            "description": "无圆角"
                        }
                    },
                    "shadows": {
                        "lg": {
                            "value": "0 8px 24px rgba(0, 0, 0, 0.10)",
                            "description": "大阴影（弹窗）"
                        },
                        "md": {
                            "value": "0 4px 12px rgba(0, 0, 0, 0.06)",
                            "description": "中阴影（下拉）"
                        },
                        "sm": {
                            "value": "0 1px 3px rgba(0, 0, 0, 0.04)",
                            "description": "小阴影（卡片）"
                        },
                        "xl": {
                            "value": "0 12px 48px rgba(0, 0, 0, 0.14)",
                            "description": "超大阴影（模态）"
                        }
                    },
                    "spacing": {
                        "lg": {
                            "px": 24,
                            "value": "24px",
                            "description": "大"
                        },
                        "md": {
                            "px": 16,
                            "value": "16px",
                            "description": "中"
                        },
                        "sm": {
                            "px": 8,
                            "value": "8px",
                            "description": "小"
                        },
                        "xl": {
                            "px": 32,
                            "value": "32px",
                            "description": "超大"
                        },
                        "xs": {
                            "px": 4,
                            "value": "4px",
                            "description": "超小"
                        },
                        "2xl": {
                            "px": 48,
                            "value": "48px",
                            "description": "极大"
                        },
                        "2xs": {
                            "px": 2,
                            "value": "2px",
                            "description": "极小"
                        },
                        "3xl": {
                            "px": 64,
                            "value": "64px",
                            "description": "巨大"
                        }
                    },
                    "typography": {
                        "h1": {
                            "fontSize": "36px",
                            "fontFamily": "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
                            "fontWeight": "700",
                            "lineHeight": "1.2",
                            "description": "一级标题"
                        },
                        "h2": {
                            "fontSize": "28px",
                            "fontFamily": "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
                            "fontWeight": "700",
                            "lineHeight": "1.2",
                            "description": "二级标题"
                        },
                        "h3": {
                            "fontSize": "24px",
                            "fontFamily": "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
                            "fontWeight": "600",
                            "lineHeight": "1.3",
                            "description": "三级标题"
                        },
                        "h4": {
                            "fontSize": "20px",
                            "fontFamily": "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
                            "fontWeight": "600",
                            "lineHeight": "1.3",
                            "description": "四级标题"
                        },
                        "h5": {
                            "fontSize": "18px",
                            "fontFamily": "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
                            "fontWeight": "500",
                            "lineHeight": "1.4",
                            "description": "五级标题"
                        },
                        "body": {
                            "fontSize": "14px",
                            "fontFamily": "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
                            "fontWeight": "400",
                            "lineHeight": "1.5",
                            "description": "正文"
                        },
                        "body-lg": {
                            "fontSize": "16px",
                            "fontFamily": "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
                            "fontWeight": "400",
                            "lineHeight": "1.5",
                            "description": "大正文"
                        },
                        "caption": {
                            "fontSize": "12px",
                            "fontFamily": "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
                            "fontWeight": "400",
                            "lineHeight": "1.4",
                            "description": "辅助文字"
                        },
                        "display": {
                            "fontSize": "48px",
                            "fontFamily": "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
                            "fontWeight": "700",
                            "lineHeight": "1.1",
                            "description": "展示标题"
                        },
                        "overline": {
                            "fontSize": "10px",
                            "fontFamily": "Inter, -apple-system, sans-serif",
                            "fontWeight": "500",
                            "lineHeight": "1.4",
                            "description": "上标文字",
                            "letterSpacing": "0.08em"
                        }
                    },
                    "transitions": {
                        "fast": {
                            "value": "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
                            "durationMs": 150,
                            "description": "快速（微交互）"
                        },
                        "slow": {
                            "value": "all 400ms cubic-bezier(0, 0, 0.2, 1)",
                            "durationMs": 400,
                            "description": "缓慢（页面切换）"
                        },
                        "normal": {
                            "value": "all 250ms cubic-bezier(0.4, 0, 0.2, 1)",
                            "durationMs": 250,
                            "description": "正常（状态切换）"
                        }
                    }
                },
                "iconSpec": {
                    "style": "outline",
                    "colors": {
                        "active": "$token:primary",
                        "default": "$token:textSecondary",
                        "inactive": "$token:textTertiary"
                    },
                    "sizing": {
                        "minPadding": 6,
                        "containerRatio": 0.55,
                        "strokeCompensation": true
                    },
                    "stroke": {
                        "width": 1.5,
                        "linecap": "round",
                        "linejoin": "round",
                        "cornerRadius": 0
                    },
                    "variants": {
                        "hover": {
                            "opacity": 0.85
                        },
                        "active": {
                            "color": "$token:primary",
                            "opacity": 1,
                            "strokeWidth": 1.8
                        },
                        "disabled": {
                            "opacity": 0.35,
                            "grayscale": true
                        },
                        "inactive": {
                            "color": "$token:textTertiary",
                            "opacity": 0.6
                        }
                    },
                    "consistency": {
                        "geometricOnly": true,
                        "targetComplexity": "simple",
                        "uniformStrokeWidth": true
                    }
                },
                "createdAt": "2026-01-01T00:00:00Z",
                "stateSpec": {
                    "focus": {
                        "animated": false,
                        "ringColor": "$token:primary",
                        "ringWidth": "2px",
                        "ringOffset": "2px"
                    },
                    "hover": {
                        "scale": 1.02,
                        "transition": "$token:transition-fast",
                        "shadowLevel": "up",
                        "backgroundLightnessShift": 6
                    },
                    "active": {
                        "scale": 0.98,
                        "transition": "$token:transition-fast",
                        "shadowLevel": "down",
                        "backgroundLightnessShift": -8
                    },
                    "loading": {
                        "opacity": 0.8,
                        "skeleton": false,
                        "spinnerColor": "$token:primary"
                    },
                    "disabled": {
                        "cursor": "not-allowed",
                        "opacity": 0.4,
                        "grayscale": true,
                        "removeShadow": true
                    }
                },
                "updatedAt": "2026-05-30T10:02:33.707Z",
                "description": "简洁专业的默认风格（基于 Ant Design）",
                "colorSchemes": [
                    {
                        "id": "light",
                        "name": "light",
                        "label": "浅色模式",
                        "overrides": {}
                    },
                    {
                        "id": "dark",
                        "name": "dark",
                        "label": "深色模式",
                        "overrides": {
                            "colors": {
                                "info": "#5DA8E8",
                                "error": "#FF6B6B",
                                "border": "#2A2F3D",
                                "gray100": "#1A1D26",
                                "gray200": "#252934",
                                "gray300": "#373B47",
                                "gray400": "#5E6470",
                                "gray500": "#787E8B",
                                "gray600": "#8F94A0",
                                "gray700": "#B9BCC4",
                                "gray800": "#D5D7DC",
                                "gray900": "#F1F2F4",
                                "overlay": "rgba(0, 0, 0, 0.65)",
                                "primary": "#7B89FF",
                                "success": "#5DE095",
                                "surface": "#191C26",
                                "warning": "#FFD466",
                                "secondary": "#B894FF",
                                "background": "#11131A",
                                "borderFocus": "#7B89FF",
                                "borderLight": "#1E222D",
                                "textInverse": "#11131A",
                                "textPrimary": "rgba(255, 255, 255, 0.92)",
                                "primaryHover": "#9AA5FF",
                                "primaryLight": "#1F2333",
                                "textTertiary": "rgba(255, 255, 255, 0.45)",
                                "primaryActive": "#5B6CFF",
                                "textSecondary": "rgba(255, 255, 255, 0.65)",
                                "secondaryHover": "#F8C5A4",
                                "secondaryActive": "#F39B66",
                                "surfaceElevated": "#222633"
                            },
                            "shadows": {
                                "lg": "0 8px 24px rgba(0, 0, 0, 0.60)",
                                "md": "0 4px 12px rgba(0, 0, 0, 0.50)",
                                "sm": "0 2px 4px rgba(0, 0, 0, 0.40)",
                                "xl": "0 12px 48px rgba(0, 0, 0, 0.70)"
                            }
                        }
                    }
                ],
                "decorationRules": {
                    "border": {
                        "color": "$token:borderDefault",
                        "width": "1px",
                        "strategy": "subtle"
                    },
                    "motion": {
                        "easing": "ease",
                        "strategy": "smooth"
                    },
                    "shadow": {
                        "strategy": "soft"
                    },
                    "iconStyle": "geometric",
                    "background": {
                        "strategy": "solid"
                    },
                    "cornerStyle": "rounded"
                },
                "activeColorSchemeId": "light"
            }
        ],
        "customized": true,
        "activeThemeId": "default",
        "schemaVersion": "1.0"
    },
    "globalOverlays": [
        {
            "id": "global-offline-banner",
            "name": "全局离线条",
            "type": "custom",
            "rootNode": {
                "id": "offlineBannerRoot",
                "meta": {
                    "product": {
                        "summary": "网络断开时全局提示，提示性非阻断"
                    }
                },
                "name": "OfflineBanner",
                "type": "div",
                "props": {},
                "events": [],
                "locked": false,
                "states": [],
                "styles": {},
                "visible": true,
                "children": [
                    {
                        "id": "offlineIcon",
                        "meta": {
                            "product": {
                                "summary": "离线图标占位"
                            }
                        },
                        "name": "WifiOffIcon",
                        "type": "div",
                        "props": {},
                        "events": [],
                        "locked": false,
                        "states": [],
                        "styles": {},
                        "visible": true,
                        "children": [],
                        "activeState": "default"
                    },
                    {
                        "id": "offlineText",
                        "meta": {
                            "product": {
                                "summary": "离线提示文字"
                            }
                        },
                        "name": "OfflineText",
                        "type": "div",
                        "props": {
                            "textContent": "网络已断开，部分功能受限"
                        },
                        "events": [],
                        "locked": false,
                        "states": [],
                        "styles": {},
                        "visible": true,
                        "children": [],
                        "activeState": "default"
                    },
                    {
                        "id": "offlineRetryBtn",
                        "meta": {
                            "product": {
                                "summary": "点击重新检测网络（events 留给 interaction）"
                            }
                        },
                        "name": "RetryButton",
                        "type": "button",
                        "props": {
                            "textContent": "重试"
                        },
                        "events": [
                            {
                                "actions": [
                                    {
                                        "path": "globalView.network.retryCount",
                                        "type": "state.set",
                                        "value": "{{ globalView.network.retryCount + 1 }}"
                                    },
                                    {
                                        "type": "custom",
                                        "handler": "platform.checkNetwork"
                                    }
                                ],
                                "trigger": "click",
                                "description": "用户主动重试网络：retryCount+1 + 调用宿主 platform.checkNetwork（宿主回写 globalView.network.status）"
                            }
                        ],
                        "locked": false,
                        "states": [],
                        "styles": {},
                        "visible": true,
                        "children": [],
                        "activeState": "default"
                    }
                ],
                "activeState": "default"
            },
            "showWhen": "{{ globalView.network.status === 'offline' }}"
        },
        {
            "id": "global-session-expired",
            "name": "登录过期 Modal",
            "type": "modal",
            "backdrop": {
                "color": "rgba(0,0,0,0.5)",
                "dismissible": false
            },
            "rootNode": {
                "id": "sessionExpiredRoot",
                "meta": {
                    "product": {
                        "summary": "session 过期时全屏拦截重登"
                    }
                },
                "name": "SessionExpiredModal",
                "type": "div",
                "props": {},
                "events": [],
                "locked": false,
                "states": [],
                "styles": {},
                "visible": true,
                "children": [
                    {
                        "id": "sessionExpiredTitle",
                        "meta": {
                            "product": {
                                "summary": "标题"
                            }
                        },
                        "name": "ExpiredTitle",
                        "type": "div",
                        "props": {
                            "textContent": "登录已过期"
                        },
                        "events": [],
                        "locked": false,
                        "states": [],
                        "styles": {},
                        "visible": true,
                        "children": [],
                        "activeState": "default"
                    },
                    {
                        "id": "sessionExpiredDesc",
                        "meta": {
                            "product": {
                                "summary": "描述"
                            }
                        },
                        "name": "ExpiredDesc",
                        "type": "div",
                        "props": {
                            "textContent": "请重新登录以继续使用"
                        },
                        "events": [],
                        "locked": false,
                        "states": [],
                        "styles": {},
                        "visible": true,
                        "children": [],
                        "activeState": "default"
                    },
                    {
                        "id": "sessionReLoginBtn",
                        "meta": {
                            "product": {
                                "summary": "重登入口（events 留 interaction：跳 00-login + 写 nav.authRedirectTo）"
                            }
                        },
                        "name": "ReLoginBtn",
                        "type": "button",
                        "props": {
                            "textContent": "去登录"
                        },
                        "events": [
                            {
                                "actions": [
                                    {
                                        "path": "globalView.nav.authRedirectTo",
                                        "type": "state.set",
                                        "value": "{{ globalView.nav.lastVisited }}"
                                    },
                                    {
                                        "path": "globalView.session",
                                        "type": "state.set",
                                        "value": {
                                            "user": null,
                                            "token": null,
                                            "status": "anonymous",
                                            "expiresAt": null,
                                            "refreshToken": null,
                                            "lastActivityAt": null
                                        }
                                    },
                                    {
                                        "type": "nav.go",
                                        "targetScreenId": "00-login"
                                    }
                                ],
                                "trigger": "click",
                                "description": "session 过期跳登录页：写 authRedirectTo 保留来源屏 + 全清 session + nav.go 00-login"
                            }
                        ],
                        "locked": false,
                        "states": [],
                        "styles": {},
                        "visible": true,
                        "children": [],
                        "activeState": "default"
                    }
                ],
                "activeState": "default"
            },
            "showWhen": "{{ globalView.session && globalView.session.status === 'expired' }}"
        }
    ],
    "componentAssets": [],
    "currentViewport": {
        "name": "iPhone 15 Pro",
        "width": 393,
        "height": 852,
        "platform": "mobile",
        "devicePixelRatio": 3
    },
    "defaultViewport": {
        "name": "iPhone 15 Pro",
        "width": 393,
        "height": 852,
        "platform": "mobile",
        "devicePixelRatio": 3
    },
    "globalStateInit": {
        "view": {
            "nav": {
                "name": "nav",
                "label": "导航上下文",
                "defaultValue": {
                    "lastVisited": null,
                    "authRedirectTo": null,
                    "pendingDeepLink": null
                }
            },
            "network": {
                "name": "network",
                "label": "网络状态",
                "defaultValue": {
                    "status": "online",
                    "retryCount": 0,
                    "lastOnlineAt": null
                }
            },
            "session": {
                "name": "session",
                "label": "会话信息",
                "defaultValue": {
                    "user": null,
                    "token": null,
                    "status": "anonymous",
                    "expiresAt": null,
                    "refreshToken": null,
                    "lastActivityAt": null
                }
            },
            "preferences": {
                "name": "preferences",
                "label": "用户偏好",
                "defaultValue": {
                    "a11y": {
                        "highContrast": false,
                        "reduceMotion": false
                    },
                    "lang": "zh-CN",
                    "theme": "light",
                    "fontSize": "md"
                }
            }
        }
    },
    "viewportPresets": [
        {
            "name": "iPhone SE",
            "width": 375,
            "height": 667,
            "platform": "mobile",
            "devicePixelRatio": 2
        },
        {
            "name": "iPhone 14",
            "width": 390,
            "height": 844,
            "platform": "mobile",
            "devicePixelRatio": 3
        },
        {
            "name": "iPhone 14 Pro",
            "width": 393,
            "height": 852,
            "platform": "mobile",
            "devicePixelRatio": 3
        },
        {
            "name": "iPhone 14 Pro Max",
            "width": 430,
            "height": 932,
            "platform": "mobile",
            "devicePixelRatio": 3
        },
        {
            "name": "iPhone 15",
            "width": 393,
            "height": 852,
            "platform": "mobile",
            "devicePixelRatio": 3
        },
        {
            "name": "iPhone 15 Pro",
            "width": 393,
            "height": 852,
            "platform": "mobile",
            "devicePixelRatio": 3
        },
        {
            "name": "iPhone 15 Pro Max",
            "width": 430,
            "height": 932,
            "platform": "mobile",
            "devicePixelRatio": 3
        },
        {
            "name": "iPhone 16",
            "width": 393,
            "height": 852,
            "platform": "mobile",
            "devicePixelRatio": 3
        },
        {
            "name": "iPhone 16 Pro",
            "width": 402,
            "height": 874,
            "platform": "mobile",
            "devicePixelRatio": 3
        },
        {
            "name": "iPhone 16 Pro Max",
            "width": 440,
            "height": 956,
            "platform": "mobile",
            "devicePixelRatio": 3
        },
        {
            "name": "Pixel 7",
            "width": 412,
            "height": 915,
            "platform": "mobile",
            "devicePixelRatio": 2.625
        },
        {
            "name": "Pixel 8",
            "width": 412,
            "height": 915,
            "platform": "mobile",
            "devicePixelRatio": 2.625
        },
        {
            "name": "Pixel 8 Pro",
            "width": 448,
            "height": 998,
            "platform": "mobile",
            "devicePixelRatio": 2.625
        },
        {
            "name": "Samsung Galaxy S24",
            "width": 360,
            "height": 780,
            "platform": "mobile",
            "devicePixelRatio": 3
        },
        {
            "name": "Samsung Galaxy S24 Ultra",
            "width": 412,
            "height": 915,
            "platform": "mobile",
            "devicePixelRatio": 3.5
        },
        {
            "name": "iPad Mini",
            "width": 744,
            "height": 1133,
            "platform": "tablet",
            "devicePixelRatio": 2
        },
        {
            "name": "iPad Air",
            "width": 820,
            "height": 1180,
            "platform": "tablet",
            "devicePixelRatio": 2
        },
        {
            "name": "iPad Pro 11\"",
            "width": 834,
            "height": 1194,
            "platform": "tablet",
            "devicePixelRatio": 2
        },
        {
            "name": "iPad Pro 13\"",
            "width": 1024,
            "height": 1366,
            "platform": "tablet",
            "devicePixelRatio": 2
        },
        {
            "name": "Samsung Galaxy Tab S9",
            "width": 753,
            "height": 1205,
            "platform": "tablet",
            "devicePixelRatio": 2
        }
    ]
}