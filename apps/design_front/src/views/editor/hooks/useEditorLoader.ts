import { useEffect, useState } from 'react';
import { projectStore } from '@/stores/project';
import { editorStore } from '@/stores/editor';
import { syncStore } from '@/stores/sync';

/** Load a project into the editor and start sync. Returns loading state. */
export function useEditorLoader(projectId: string | undefined): boolean {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        await projectStore.loadProject(projectId);
        if (cancelled) return;
        const project = projectStore.currentProject;
        if (project) {
          editorStore.initProject(project);
          syncStore.startSync(projectId);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return loading;
}
