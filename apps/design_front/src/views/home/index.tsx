import { useEffect, useState } from 'react';
import { Button, Card, Empty, Spin, Typography } from 'antd';
import { PlusOutlined, DesktopOutlined, MobileOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { projectStore } from '@/stores/project';
import { CreateModal } from './CreateModal';
import './home.css';

export const HomePage = observer(function HomePage() {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    void projectStore.fetchProjects();
  }, []);

  const handleCreated = (id: string) => {
    setShowCreate(false);
    navigate(`/editor/${id}`);
  };

  if (projectStore.loading && projectStore.projects.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          我的设计稿
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreate(true)}>
          新建项目
        </Button>
      </div>

      {projectStore.projects.length === 0 ? (
        <Empty description="暂无设计稿，点击右上角新建" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div className="home-grid">
          {projectStore.projects.map((p) => (
            <Card
              key={p.id}
              hoverable
              className="project-card"
              onClick={() => navigate(`/editor/${p.id}`)}
            >
              <div className="project-thumb">
                {p.platform === 'mobile' ? <MobileOutlined /> : <DesktopOutlined />}
              </div>
              <Card.Meta
                title={p.name}
                description={new Date(p.updatedAt).toLocaleString('zh-CN')}
                style={{ marginTop: 12 }}
              />
            </Card>
          ))}
        </div>
      )}

      <CreateModal
        open={showCreate}
        onCancel={() => setShowCreate(false)}
        onCreated={handleCreated}
      />
    </div>
  );
});
