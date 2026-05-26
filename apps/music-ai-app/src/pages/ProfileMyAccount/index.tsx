import { useState } from 'react';
import { PageWrapper } from './components/PageWrapper';
import styles from './index.module.less';

export function ProfileMyAccount() {
  const [user] = useState({"email":"","isPro":false,"avatar":"","joinDate":"","displayName":""});
  const [stats] = useState({"hours":0,"shared":0,"creations":0});





  return (
    <div className={styles.profilePage}>
      <PageWrapper user={user} stats={stats} />
    </div>
  );
}
