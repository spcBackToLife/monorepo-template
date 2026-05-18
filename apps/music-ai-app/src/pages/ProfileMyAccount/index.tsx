import { useState } from 'react';
import { PageWrapper } from './components/PageWrapper';
import type { ProfileUser, UserStats } from './types';
import styles from './index.module.less';

export function ProfileMyAccount() {
  const [user] = useState<ProfileUser>({"name":"","email":"","isPro":false,"avatar":"","joinDate":""});
  const [stats] = useState<UserStats>({"totalLikes":0,"totalPlays":0,"totalCreations":0});





  return (
    <div className={styles.profilePage}>
      <PageWrapper user={user} stats={stats} />
    </div>
  );
}
