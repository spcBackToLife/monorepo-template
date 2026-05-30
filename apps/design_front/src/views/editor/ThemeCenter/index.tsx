import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { App as AntdApp, Button, Card, ColorPicker, Divider, Input, InputNumber, Modal, Popconfirm, Segmented, Select, Space, Spin, Tag, Tooltip, Typography } from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined, CopyOutlined, DeleteOutlined, ExclamationCircleOutlined, PlusOutlined, SyncOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { editorStore } from '@/stores/editor';
import type { ColorScheme, ThemeConfig, ThemeDefinition, TokenKind } from '@globallink/design-schema';

const { Title, Text } = Typography;

/**
 * 主题风格中心 — 独立全屏页面
 *
 * 路由: /editor/:id/theme
 * 定位: 本项目的主题管理中心，管理多套主题和色彩方案
 */
export const ThemeCenterPage = observer(function ThemeCenterPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message, modal } = AntdApp.useApp();
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [addThemeVisible, setAddThemeVisible] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');
  const [newThemeId, setNewThemeId] = useState('');
  const [newThemeDescription, setNewThemeDescription] = useState('');
  const [copyFromCurrent, setCopyFromCurrent] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const themeConfig = editorStore.project?.themeConfig as ThemeConfig | undefined;

  if (!themeConfig) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="加载主题配置..." />
      </div>
    );
  }

  // 获取当前激活主题
  const activeTheme = themeConfig.themes.find(t => t.id === themeConfig.activeThemeId) ?? themeConfig.themes[0];
  if (!activeTheme) {
    return <div style={{ padding: 40 }}><Text type="danger">主题数据异常：没有可用主题</Text></div>;
  }

  // 获取当前色彩方案
  const activeScheme = activeTheme.colorSchemes.find(s => s.id === activeTheme.activeColorSchemeId) ?? activeTheme.colorSchemes[0];

  const handleCreateTheme = async () => {
    if (!newThemeId.trim() || !newThemeName.trim()) {
      message.error('主题 ID 与名称必填');
      return;
    }
    setSubmitting(true);
    try {
      await editorStore.scaffoldTheme({
        themeId: newThemeId.trim(),
        name: newThemeName.trim(),
        description: newThemeDescription.trim() || undefined,
        copyFrom: copyFromCurrent ? activeTheme.id : undefined,
        activate: true,
      });
      message.success(`主题 "${newThemeName}" 创建成功`);
      setAddThemeVisible(false);
      setNewThemeId('');
      setNewThemeName('');
      setNewThemeDescription('');
    } catch (err) {
      message.error(`创建失败：${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTheme = async () => {
    try {
      await editorStore.deleteTheme(activeTheme.id);
      message.success(`主题 "${activeTheme.name}" 已删除`);
    } catch (err) {
      message.error(`删除失败：${(err as Error).message}`);
    }
  };

  const handleCopyTheme = async () => {
    const copyId = `${activeTheme.id}-copy-${Date.now()}`;
    try {
      await editorStore.scaffoldTheme({
        themeId: copyId,
        name: `${activeTheme.name} 副本`,
        description: activeTheme.description,
        copyFrom: activeTheme.id,
        activate: true,
      });
      message.success('主题已复制');
    } catch (err) {
      message.error(`复制失败：${(err as Error).message}`);
    }
  };

  const handleValidate = async () => {
    try {
      const report = await editorStore.validateTheme();
      if (report.ok) {
        modal.success({
          title: '主题校验通过',
          icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
          content: `R-THEME-01~10 红线全部通过${report.warnings.length > 0 ? `（含 ${report.warnings.length} 条警告）` : ''}。`,
        });
      } else {
        modal.error({
          title: '主题校验失败',
          icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
          width: 720,
          content: (
            <div style={{ maxHeight: 400, overflow: 'auto' }}>
              {(report.errors as Array<{ rule: string; message: string }>).map((e, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <Tag color="red">{e.rule}</Tag> {e.message}
                </div>
              ))}
              {(report.warnings as Array<{ rule: string; message: string }>).map((w, i) => (
                <div key={`w${i}`} style={{ marginBottom: 8 }}>
                  <Tag color="orange">{w.rule}</Tag> {w.message}
                </div>
              ))}
            </div>
          ),
        });
      }
    } catch (err) {
      message.error(`校验失败：${(err as Error).message}`);
    }
  };

  const handleExport = () => {
    const json = JSON.stringify(themeConfig, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `theme-${id}-${activeTheme.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('主题配置已导出');
  };

  const navItems = [
    { key: 'overview', label: '📋 概览', group: '' },
    { key: 'intent', label: '🎯 风格意图', group: '' },
    { key: 'colors', label: '🎨 颜色', group: 'Token' },
    { key: 'spacing', label: '📐 间距', group: 'Token' },
    { key: 'radius', label: '⬜ 圆角', group: 'Token' },
    { key: 'typography', label: '🔤 字体', group: 'Token' },
    { key: 'shadows', label: '🌫 阴影', group: 'Token' },
    { key: 'transitions', label: '⚡ 动效', group: 'Token' },
    { key: 'components', label: '🔘 组件预览', group: '预览' },
    { key: 'decoration', label: '✨ 装饰规则', group: '预览' },
    { key: 'states', label: '🎭 状态规范', group: '预览' },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f5f5f5' }}>
      {/* 左侧导航 */}
      <div style={{ width: 240, background: '#fff', borderRight: '1px solid #f0f0f0', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* 顶部：返回 + 标题 */}
        <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #f0f0f0' }}>
          <Button type="text" size="small" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/editor/${id}`)} />
          <Title level={5} style={{ margin: 0 }}>主题风格</Title>
        </div>

        {/* 主题选择器 */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>当前主题</Text>
          <Select
            value={themeConfig.activeThemeId}
            style={{ width: '100%' }}
            options={themeConfig.themes.map(t => ({ label: t.name, value: t.id }))}
            onChange={(val) => editorStore.switchTheme(val)}
          />
          <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
            <Tooltip title="新增主题">
              <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => setAddThemeVisible(true)} block>
                新增主题
              </Button>
            </Tooltip>
          </div>
          {themeConfig.themes.length > 1 && (
            <div style={{ marginTop: 8, fontSize: 11, color: '#999' }}>
              共 {themeConfig.themes.length} 套主题
            </div>
          )}
        </div>

        {/* 色彩方案切换 */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>色彩方案</Text>
          <Segmented
            block
            size="small"
            options={activeTheme.colorSchemes.map(s => ({ label: s.label, value: s.id }))}
            value={activeTheme.activeColorSchemeId}
            onChange={(val) => editorStore.switchColorScheme(val as string)}
          />
          <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
            {!activeTheme.colorSchemes.some(s => s.id === 'dark') && (
              <Button
                size="small"
                block
                icon={<PlusOutlined />}
                onClick={async () => {
                  try {
                    await editorStore.addColorScheme({
                      schemeId: 'dark',
                      name: 'dark',
                      label: '深色模式',
                      kind: 'dark',
                    });
                    message.success('已添加深色模式');
                  } catch (err) {
                    message.error(`添加失败：${(err as Error).message}`);
                  }
                }}
              >
                添加深色模式
              </Button>
            )}
            {activeTheme.colorSchemes.length > 2 && activeTheme.activeColorSchemeId !== 'light' && activeTheme.activeColorSchemeId !== 'dark' && (
              <Popconfirm
                title={`删除色彩方案 "${activeScheme?.label}"？`}
                onConfirm={async () => {
                  if (!activeScheme) return;
                  try {
                    await editorStore.removeColorScheme(activeScheme.id);
                    message.success('已删除');
                  } catch (err) {
                    message.error(`删除失败：${(err as Error).message}`);
                  }
                }}
              >
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            )}
          </div>
        </div>

        {/* 导航菜单 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {(() => {
            let lastGroup = '';
            return navItems.map(item => {
              const showGroupHeader = item.group && item.group !== lastGroup;
              lastGroup = item.group;
              return (
                <div key={item.key}>
                  {showGroupHeader && (
                    <div style={{ padding: '12px 16px 4px', fontSize: 11, color: '#999', fontWeight: 500, textTransform: 'uppercase' }}>
                      {item.group}
                    </div>
                  )}
                  <div
                    onClick={() => setActiveSection(item.key)}
                    style={{
                      padding: '8px 16px',
                      cursor: 'pointer',
                      background: activeSection === item.key ? '#e6f4ff' : 'transparent',
                      borderRight: activeSection === item.key ? '2px solid #1677ff' : '2px solid transparent',
                      transition: 'all 150ms ease',
                      fontSize: 13,
                    }}
                  >
                    <Text strong={activeSection === item.key}>{item.label}</Text>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* 右侧内容区 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
        {/* 顶部操作栏 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              {activeTheme.name}
            </Title>
            <Text type="secondary">{activeTheme.description || '未设置描述'}</Text>
          </div>
          <Space>
            <Tag color={themeConfig.customized ? 'green' : 'orange'}>
              {themeConfig.customized ? '已定制' : '默认模板'}
            </Tag>
            <Tooltip title="跑 R-THEME-01~10 红线对账">
              <Button icon={<CheckCircleOutlined />} onClick={handleValidate}>校验</Button>
            </Tooltip>
            <Tooltip title="复制当前主题为新主题">
              <Button icon={<CopyOutlined />} onClick={handleCopyTheme}>复制主题</Button>
            </Tooltip>
            <Tooltip title="导出主题配置 JSON">
              <Button icon={<SyncOutlined />} onClick={handleExport}>导出</Button>
            </Tooltip>
            {themeConfig.themes.length > 1 && (
              <Popconfirm
                title={`删除主题 "${activeTheme.name}"？`}
                description="此操作不可恢复"
                onConfirm={handleDeleteTheme}
                okText="删除"
                okType="danger"
              >
                <Button danger icon={<DeleteOutlined />}>删除</Button>
              </Popconfirm>
            )}
          </Space>
        </div>

        {/* 内容区域 */}
        {activeSection === 'overview' && <OverviewSection theme={activeTheme} scheme={activeScheme} />}
        {activeSection === 'intent' && <IntentSection theme={activeTheme} />}
        {activeSection === 'colors' && <ColorsSection theme={activeTheme} scheme={activeScheme} />}
        {activeSection === 'spacing' && <SpacingSection theme={activeTheme} />}
        {activeSection === 'radius' && <RadiusSection theme={activeTheme} />}
        {activeSection === 'typography' && <TypographySection theme={activeTheme} />}
        {activeSection === 'shadows' && <ShadowsSection theme={activeTheme} scheme={activeScheme} />}
        {activeSection === 'transitions' && <TransitionsSection theme={activeTheme} />}
        {activeSection === 'components' && <ComponentsPreviewSection theme={activeTheme} scheme={activeScheme} />}
        {activeSection === 'decoration' && <DecorationSection theme={activeTheme} />}
        {activeSection === 'states' && <StatesSection theme={activeTheme} />}
      </div>

      {/* 新增主题弹窗 */}
      <Modal
        title="新增主题"
        open={addThemeVisible}
        onCancel={() => setAddThemeVisible(false)}
        onOk={handleCreateTheme}
        confirmLoading={submitting}
        okText="创建"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>主题 ID（kebab-case，如 spring-festival）</Text>
            <Input
              placeholder="spring-festival"
              value={newThemeId}
              onChange={e => setNewThemeId(e.target.value)}
            />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>主题名称（用户可见）</Text>
            <Input
              placeholder="春节红"
              value={newThemeName}
              onChange={e => setNewThemeName(e.target.value)}
            />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>描述（可选）</Text>
            <Input.TextArea
              placeholder="节日营销主题，主色由蓝紫切换为中国红"
              rows={2}
              value={newThemeDescription}
              onChange={e => setNewThemeDescription(e.target.value)}
            />
          </div>
          <div>
            <Segmented
              block
              options={[
                { label: `从当前主题（${activeTheme.name}）复制`, value: 'copy' },
                { label: '从默认模板创建', value: 'fresh' },
              ]}
              value={copyFromCurrent ? 'copy' : 'fresh'}
              onChange={(val) => setCopyFromCurrent(val === 'copy')}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
});

// ===== 辅助：根据色彩方案获取实际色值 =====
function getColor(theme: ThemeDefinition, scheme: ColorScheme | undefined, key: string): string {
  const override = scheme?.overrides?.colors?.[key];
  if (override) return override;
  return theme.tokens.colors[key]?.value ?? '#000';
}

function getShadow(theme: ThemeDefinition, scheme: ColorScheme | undefined, key: string): string {
  const override = scheme?.overrides?.shadows?.[key];
  if (override) return override;
  return theme.tokens.shadows[key]?.value ?? 'none';
}

// ===== 子区块组件 =====

function OverviewSection({ theme, scheme }: { theme: ThemeDefinition; scheme: ColorScheme | undefined }) {
  return (
    <div>
      <Card style={{ marginBottom: 24 }}>
        <Title level={5}>风格摘要</Title>
        <Text type="secondary" style={{ fontSize: 16 }}>{theme.intent.summary || '未设置风格描述'}</Text>
        <div style={{ marginTop: 12 }}>
          {theme.intent.aesthetics?.map(tag => <Tag key={tag} color="blue">{tag}</Tag>)}
          <Tag>{theme.intent.decoration}</Tag>
          <Tag>{theme.intent.colorTemperature}</Tag>
          <Tag>{theme.intent.brightness}</Tag>
        </div>
      </Card>

      <Card title="色板一览" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(theme.tokens.colors).map(([name, token]) => (
            <Tooltip key={name} title={`${name}: ${getColor(theme, scheme, name)}`}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 8, background: getColor(theme, scheme, name), border: '1px solid #e0e0e0' }} />
                <Text style={{ fontSize: 10, display: 'block', marginTop: 4 }}>{name}</Text>
              </div>
            </Tooltip>
          ))}
        </div>
      </Card>

      <Card title="组件快速预览">
        <Space>
          <button style={{ background: getColor(theme, scheme, 'primary'), color: getColor(theme, scheme, 'textInverse'), border: 'none', borderRadius: theme.tokens.radius.md?.value, height: 36, padding: '0 16px', cursor: 'pointer' }}>Primary</button>
          <button style={{ background: 'transparent', color: getColor(theme, scheme, 'primary'), border: `1px solid ${getColor(theme, scheme, 'primary')}`, borderRadius: theme.tokens.radius.md?.value, height: 36, padding: '0 16px', cursor: 'pointer' }}>Secondary</button>
          <button style={{ background: 'transparent', color: getColor(theme, scheme, 'textPrimary'), border: `1px solid ${getColor(theme, scheme, 'border')}`, borderRadius: theme.tokens.radius.md?.value, height: 36, padding: '0 16px', cursor: 'pointer' }}>Ghost</button>
          <button style={{ background: getColor(theme, scheme, 'error'), color: getColor(theme, scheme, 'textInverse'), border: 'none', borderRadius: theme.tokens.radius.md?.value, height: 36, padding: '0 16px', cursor: 'pointer' }}>Danger</button>
        </Space>
      </Card>
    </div>
  );
}

function IntentSection({ theme }: { theme: ThemeDefinition }) {
  const { message } = AntdApp.useApp();
  const [summary, setSummary] = useState(theme.intent.summary);

  const handleSave = async () => {
    try {
      await editorStore.setThemeIntent({ summary }, theme.id);
      message.success('已保存');
    } catch (err) {
      message.error(`保存失败：${(err as Error).message}`);
    }
  };

  return (
    <Card>
      <Title level={5}>风格意图</Title>
      <Input.TextArea
        rows={3}
        value={summary}
        onChange={e => setSummary(e.target.value)}
        onBlur={handleSave}
        placeholder="描述风格..."
        style={{ marginBottom: 16 }}
      />
      <Space wrap>
        <Text strong>标签:</Text>
        {theme.intent.aesthetics?.map(tag => <Tag key={tag} color="blue">{tag}</Tag>)}
      </Space>
      <Divider />
      <Space size="large">
        <div><Text strong>装饰:</Text> <Tag>{theme.intent.decoration}</Tag></div>
        <div><Text strong>色温:</Text> <Tag>{theme.intent.colorTemperature}</Tag></div>
        <div><Text strong>明暗:</Text> <Tag>{theme.intent.brightness}</Tag></div>
      </Space>
      {theme.intent.seedColors && theme.intent.seedColors.length > 0 && (
        <>
          <Divider />
          <Text strong>种子色:</Text>
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            {theme.intent.seedColors.map(c => (
              <div key={c} style={{ width: 32, height: 32, borderRadius: 6, background: c, border: '1px solid #d9d9d9' }} />
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

function ColorsSection({ theme, scheme }: { theme: ThemeDefinition; scheme: ColorScheme | undefined }) {
  const { message } = AntdApp.useApp();
  const groups = [
    { title: '品牌色', keys: ['primary', 'primaryHover', 'primaryActive', 'primaryLight', 'secondary', 'secondaryHover', 'secondaryActive'] },
    { title: '表面/背景', keys: ['background', 'surface', 'surfaceElevated', 'overlay'] },
    { title: '文字', keys: ['textPrimary', 'textSecondary', 'textTertiary', 'textInverse'] },
    { title: '边框', keys: ['border', 'borderLight', 'borderFocus'] },
    { title: '语义色', keys: ['success', 'warning', 'error', 'info'] },
  ];

  const handleChange = async (key: string, newValue: string) => {
    try {
      // 当前是非 base 色彩方案 → 写到 scheme.overrides
      // 当前是 base（无任何 override 的） → 写到 theme.tokens
      const isBaseScheme = !scheme || scheme.id === theme.colorSchemes[0]?.id;
      if (isBaseScheme) {
        await editorStore.setThemeTokens('colors', { [key]: newValue }, theme.id);
      } else if (scheme) {
        await editorStore.updateColorSchemeOverrides(scheme.id, 'colors', { [key]: newValue }, theme.id);
      }
      message.success(`${key} 已更新`);
    } catch (err) {
      message.error(`更新失败：${(err as Error).message}`);
    }
  };

  return (
    <div>
      {scheme && (
        <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
          <Text type="secondary">当前色彩方案: <Tag color="blue">{scheme.label}</Tag></Text>
          {Object.keys(scheme.overrides?.colors ?? {}).length > 0 && (
            <Text type="secondary"> (覆盖了 {Object.keys(scheme.overrides?.colors ?? {}).length} 个颜色)</Text>
          )}
          <Text type="secondary" style={{ marginLeft: 12, fontSize: 11 }}>
            修改将写入当前色彩方案的 overrides；切到 base 方案可改主题原色
          </Text>
        </Card>
      )}
      {groups.map(group => (
        <Card key={group.title} title={group.title} style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {group.keys.map(key => {
              const actualValue = getColor(theme, scheme, key);
              const isOverridden = scheme?.overrides?.colors?.[key] !== undefined;
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 6, background: isOverridden ? '#fff7e6' : 'transparent' }}>
                  <ColorPicker
                    value={actualValue}
                    size="small"
                    onChangeComplete={(c) => handleChange(key, c.toRgbString())}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text strong style={{ fontSize: 12 }}>{key}</Text>
                    {isOverridden && <Tag color="orange" style={{ fontSize: 10, marginLeft: 4, lineHeight: '16px', padding: '0 4px' }}>覆盖</Tag>}
                    <br />
                    <Text type="secondary" style={{ fontSize: 11 }}>{actualValue}</Text>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}

function SpacingSection({ theme }: { theme: ThemeDefinition }) {
  const { message } = AntdApp.useApp();
  const handleChange = async (key: string, px: number | null) => {
    if (px == null) return;
    if (px % 4 !== 0 && px !== 2) {
      message.warning('间距应为 4 的倍数（保留 2 用于极小场景）');
    }
    try {
      await editorStore.setThemeTokens('spacing', { [key]: px }, theme.id);
      message.success(`${key} 已更新为 ${px}px`);
    } catch (err) {
      message.error(`更新失败：${(err as Error).message}`);
    }
  };
  return (
    <Card title="间距 Token">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Object.entries(theme.tokens.spacing).map(([name, token]) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Text strong style={{ width: 40 }}>{name}</Text>
            <div style={{ width: token.px, height: 24, background: '#1677ff', borderRadius: 4, opacity: 0.7, transition: 'width 300ms ease' }} />
            <InputNumber
              value={token.px}
              min={0}
              max={256}
              step={4}
              size="small"
              addonAfter="px"
              onBlur={(e) => handleChange(name, Number((e.target as HTMLInputElement).value))}
              style={{ width: 120 }}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>{token.description}</Text>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RadiusSection({ theme }: { theme: ThemeDefinition }) {
  const { message } = AntdApp.useApp();
  const handleChange = async (key: string, value: string) => {
    try {
      await editorStore.setThemeTokens('radius', { [key]: value }, theme.id);
      message.success(`${key} 已更新`);
    } catch (err) {
      message.error(`更新失败：${(err as Error).message}`);
    }
  };
  return (
    <Card title="圆角 Token">
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {Object.entries(theme.tokens.radius).map(([name, token]) => (
          <div key={name} style={{ textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, border: '2px solid #1677ff', borderRadius: token.value, background: '#e6f4ff' }} />
            <Text strong style={{ display: 'block', marginTop: 8 }}>{name}</Text>
            <Input
              defaultValue={token.value}
              size="small"
              onBlur={e => handleChange(name, e.target.value)}
              style={{ width: 80, marginTop: 4 }}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}

function TypographySection({ theme }: { theme: ThemeDefinition }) {
  return (
    <Card title="字体层级">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {Object.entries(theme.tokens.typography).map(([name, token]) => (
          <div key={name} style={{ display: 'flex', alignItems: 'baseline', gap: 16, borderBottom: '1px solid #f0f0f0', paddingBottom: 12 }}>
            <Text style={{ fontSize: token.fontSize, lineHeight: token.lineHeight, fontWeight: Number(token.fontWeight), fontFamily: token.fontFamily, minWidth: 240 }}>
              {token.description || name}
            </Text>
            <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
              {token.fontSize} / {token.lineHeight} / {token.fontWeight}
            </Text>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ShadowsSection({ theme, scheme }: { theme: ThemeDefinition; scheme: ColorScheme | undefined }) {
  const { message } = AntdApp.useApp();
  const isBaseScheme = !scheme || scheme.id === theme.colorSchemes[0]?.id;
  const handleChange = async (key: string, value: string) => {
    try {
      if (isBaseScheme) {
        await editorStore.setThemeTokens('shadows', { [key]: value }, theme.id);
      } else if (scheme) {
        await editorStore.updateColorSchemeOverrides(scheme.id, 'shadows', { [key]: value }, theme.id);
      }
      message.success(`${key} 已更新`);
    } catch (err) {
      message.error(`更新失败：${(err as Error).message}`);
    }
  };
  return (
    <Card title="阴影层级">
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        {Object.entries(theme.tokens.shadows).map(([name, token]) => {
          const actual = getShadow(theme, scheme, name);
          return (
            <div key={name} style={{ textAlign: 'center', minWidth: 220 }}>
              <div style={{ width: 120, height: 80, background: '#fff', borderRadius: 8, boxShadow: actual, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                <Text>{name}</Text>
              </div>
              <Input
                defaultValue={actual}
                size="small"
                onBlur={e => handleChange(name, e.target.value)}
                style={{ marginTop: 8, fontSize: 11 }}
              />
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function TransitionsSection({ theme }: { theme: ThemeDefinition }) {
  return (
    <Card title="动效 Token">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Object.entries(theme.tokens.transitions).map(([name, token]) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Tag color="blue">{name}</Tag>
            <Text>{token.value}</Text>
            <Text type="secondary">({token.durationMs}ms)</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>{token.description}</Text>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ComponentsPreviewSection({ theme, scheme }: { theme: ThemeDefinition; scheme: ColorScheme | undefined }) {
  const primary = getColor(theme, scheme, 'primary');
  const surface = getColor(theme, scheme, 'surface');
  const background = getColor(theme, scheme, 'background');
  const textPrimary = getColor(theme, scheme, 'textPrimary');
  const textSecondary = getColor(theme, scheme, 'textSecondary');
  const textInverse = getColor(theme, scheme, 'textInverse');
  const border = getColor(theme, scheme, 'border');
  const radius = theme.tokens.radius.md?.value ?? '8px';
  const shadowSm = getShadow(theme, scheme, 'sm');

  return (
    <div style={{ background, padding: 24, borderRadius: 12, border: `1px solid ${border}` }}>
      <Title level={5} style={{ color: textPrimary }}>组件在当前主题+色彩方案下的效果</Title>

      <Card title="按钮（3 尺寸 × 4 变体）" style={{ marginBottom: 16, background: surface }}>
        <Space size="large" direction="vertical">
          {['sm', 'md', 'lg'].map(size => {
            const h = size === 'sm' ? 28 : size === 'md' ? 36 : 44;
            const px = size === 'sm' ? '12px' : size === 'md' ? '16px' : '24px';
            return (
              <div key={size}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 4, color: textSecondary }}>{size.toUpperCase()}</Text>
                <Space>
                  <button style={{ background: primary, color: textInverse, border: 'none', borderRadius: radius, height: h, padding: `0 ${px}`, cursor: 'pointer', boxShadow: shadowSm }}>Primary</button>
                  <button style={{ background: 'transparent', color: primary, border: `1px solid ${primary}`, borderRadius: radius, height: h, padding: `0 ${px}`, cursor: 'pointer' }}>Secondary</button>
                  <button style={{ background: 'transparent', color: textPrimary, border: `1px solid ${border}`, borderRadius: radius, height: h, padding: `0 ${px}`, cursor: 'pointer' }}>Ghost</button>
                  <button style={{ background: getColor(theme, scheme, 'error'), color: textInverse, border: 'none', borderRadius: radius, height: h, padding: `0 ${px}`, cursor: 'pointer' }}>Danger</button>
                </Space>
              </div>
            );
          })}
        </Space>
      </Card>

      <Card title="卡片" style={{ marginBottom: 16, background: surface }}>
        <div style={{ background: surface, borderRadius: radius, border: `1px solid ${border}`, padding: theme.tokens.spacing.lg?.value ?? '24px', boxShadow: shadowSm, maxWidth: 360 }}>
          <div style={{ color: textPrimary, fontSize: theme.tokens.typography.h4?.fontSize, fontWeight: 600, marginBottom: 8 }}>卡片标题</div>
          <div style={{ color: textSecondary, fontSize: theme.tokens.typography.body?.fontSize, marginBottom: 16 }}>描述文字展示当前主题下卡片效果。</div>
          <button style={{ background: primary, color: textInverse, border: 'none', borderRadius: radius, height: 32, padding: '0 16px', cursor: 'pointer' }}>操作按钮</button>
        </div>
      </Card>

      <Card title="输入框" style={{ background: surface }}>
        <Space direction="vertical" size="middle" style={{ width: 320 }}>
          <input placeholder="默认状态" style={{ width: '100%', height: 36, borderRadius: radius, border: `1px solid ${border}`, padding: '0 12px', fontSize: theme.tokens.typography.body?.fontSize, background: surface, color: textPrimary, outline: 'none' }} />
          <input placeholder="聚焦状态" style={{ width: '100%', height: 36, borderRadius: radius, border: `2px solid ${primary}`, padding: '0 12px', fontSize: theme.tokens.typography.body?.fontSize, background: surface, color: textPrimary, outline: 'none' }} />
          <input placeholder="禁用状态" disabled style={{ width: '100%', height: 36, borderRadius: radius, border: `1px solid ${border}`, padding: '0 12px', fontSize: theme.tokens.typography.body?.fontSize, background: surface, color: textSecondary, outline: 'none', opacity: 0.5 }} />
        </Space>
      </Card>
    </div>
  );
}

function DecorationSection({ theme }: { theme: ThemeDefinition }) {
  return (
    <Card title="装饰规则">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div><Text strong>背景策略:</Text> <Tag style={{ marginLeft: 8 }}>{theme.decorationRules.background.strategy}</Tag></div>
        <div><Text strong>边框策略:</Text> <Tag style={{ marginLeft: 8 }}>{theme.decorationRules.border.strategy}</Tag></div>
        <div><Text strong>阴影策略:</Text> <Tag style={{ marginLeft: 8 }}>{theme.decorationRules.shadow.strategy}</Tag></div>
        <div><Text strong>动效策略:</Text> <Tag style={{ marginLeft: 8 }}>{theme.decorationRules.motion.strategy}</Tag></div>
        <div><Text strong>圆角风格:</Text> <Tag style={{ marginLeft: 8 }}>{theme.decorationRules.cornerStyle}</Tag></div>
        <div><Text strong>图标风格:</Text> <Tag style={{ marginLeft: 8 }}>{theme.decorationRules.iconStyle}</Tag></div>
      </div>
    </Card>
  );
}

function StatesSection({ theme }: { theme: ThemeDefinition }) {
  return (
    <div>
      <Card title="Hover 态" style={{ marginBottom: 16 }}>
        <Space size="large">
          <div><Text strong>亮度偏移:</Text> <Tag>+{theme.stateSpec.hover.backgroundLightnessShift}%</Tag></div>
          <div><Text strong>阴影:</Text> <Tag>{theme.stateSpec.hover.shadowLevel}</Tag></div>
          <div><Text strong>缩放:</Text> <Tag>{theme.stateSpec.hover.scale}</Tag></div>
          <div><Text strong>过渡:</Text> <Tag>{theme.stateSpec.hover.transition}</Tag></div>
        </Space>
      </Card>
      <Card title="Active 态" style={{ marginBottom: 16 }}>
        <Space size="large">
          <div><Text strong>亮度偏移:</Text> <Tag>{theme.stateSpec.active.backgroundLightnessShift}%</Tag></div>
          <div><Text strong>阴影:</Text> <Tag>{theme.stateSpec.active.shadowLevel}</Tag></div>
          <div><Text strong>缩放:</Text> <Tag>{theme.stateSpec.active.scale}</Tag></div>
        </Space>
      </Card>
      <Card title="Focus 态" style={{ marginBottom: 16 }}>
        <Space size="large">
          <div><Text strong>Ring 颜色:</Text> <Tag>{theme.stateSpec.focus.ringColor}</Tag></div>
          <div><Text strong>Ring 宽度:</Text> <Tag>{theme.stateSpec.focus.ringWidth}</Tag></div>
          <div><Text strong>Ring 偏移:</Text> <Tag>{theme.stateSpec.focus.ringOffset}</Tag></div>
          <div><Text strong>动画:</Text> <Tag>{theme.stateSpec.focus.animated ? '是' : '否'}</Tag></div>
        </Space>
      </Card>
      <Card title="Disabled 态" style={{ marginBottom: 16 }}>
        <Space size="large">
          <div><Text strong>透明度:</Text> <Tag>{theme.stateSpec.disabled.opacity}</Tag></div>
          <div><Text strong>去阴影:</Text> <Tag>{theme.stateSpec.disabled.removeShadow ? '是' : '否'}</Tag></div>
          <div><Text strong>灰度:</Text> <Tag>{theme.stateSpec.disabled.grayscale ? '是' : '否'}</Tag></div>
        </Space>
      </Card>
    </div>
  );
}
