import './index.css';
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import { createRendererLogger, setupGlobalErrorCapture } from '@vienna/logger/renderer';

const logger = createRendererLogger();
void setupGlobalErrorCapture(logger);

const root = document.getElementById('root');
if (!root) {
  logger.error('Failed to find root element');
} else {
  const mode = new URLSearchParams(window.location.search).get('mode');

  if (mode === 'notification-drawer') {
    logger.info('Notification drawer started');
    import('./NotificationDrawerApp').then(({ NotificationDrawerApp }) => {
      createRoot(root).render(createElement(NotificationDrawerApp));
    });
  } else if (mode === 'action-form') {
    logger.info('Action form overlay started');
    import('./ActionFormApp').then(({ ActionFormApp }) => {
      createRoot(root).render(createElement(ActionFormApp));
    });
  } else if (mode === 'tray' || mode === 'inbox-panel') {
    logger.info(`${mode} window started`);
    import('./TrayApp').then(({ TrayApp }) => {
      createRoot(root).render(createElement(TrayApp, { mode }));
    });
  } else {
    logger.info('Renderer process started');
    Promise.all([
      import('@vienna/chat-ui'),
      import('./App'),
    ]).then(([{ registerDefaultRenderers }, { App }]) => {
      registerDefaultRenderers();
      createRoot(root).render(createElement(App));
    });
  }
}
