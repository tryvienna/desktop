import type { ApiHandlers } from '@vienna/ipc';
import type { filesApi } from './contract';
import { getFileIndexService } from '../../main/file-index/FileIndexService';
import { getContentSearchService } from '../../main/file-index/ContentSearchService';

export const filesHandlers: ApiHandlers<typeof filesApi> = {
  files: {
    searchFiles: async ({ query, limit, extensions }) => {
      const service = getFileIndexService();
      const results = service.search({ query, limit, extensions });
      return { results };
    },
    indexDirectories: async ({ directories }) => {
      const service = getFileIndexService();
      for (const dir of directories) {
        service.addDirectory(dir);
      }
      return { success: true };
    },
    setDirectories: async ({ directories }) => {
      const service = getFileIndexService();
      service.setDirectories(directories);
      return { success: true };
    },
    getIndexStatus: async () => {
      const service = getFileIndexService();
      return service.getStatus();
    },
    searchContent: async (input) => {
      const service = getContentSearchService();
      return service.search(input);
    },
  },
};
