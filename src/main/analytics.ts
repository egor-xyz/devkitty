import { app } from 'electron';
import log from 'electron-log';
import { randomUUID } from 'node:crypto';

import { settings } from './settings';

const MEASUREMENT_ID = 'G-KVS84N7CDJ';
const COLLECT_URL = 'https://www.google-analytics.com/mp/collect';
const DEBUG_COLLECT_URL = 'https://www.google-analytics.com/debug/mp/collect';

// One session_id per app run.
const sessionId = String(Date.now());

const getClientId = (): string => {
  const existing = settings.get('clientId');
  if (existing) return existing;

  const clientId = randomUUID();
  settings.set('clientId', clientId);
  return clientId;
};

export const track = async (name: string, params?: Record<string, unknown>): Promise<void> => {
  try {
    const apiSecret = import.meta.env.MAIN_VITE_GA_API_SECRET;
    if (!apiSecret) return;

    const debug = import.meta.env.MAIN_VITE_GA_DEBUG === 'true';
    const enabled = debug || settings.get('appSettings')?.telemetry !== false;
    if (!enabled) return;

    const clientId = getClientId();
    const url = debug ? DEBUG_COLLECT_URL : COLLECT_URL;

    const collectUrl = `${url}?measurement_id=${MEASUREMENT_ID}&api_secret=${encodeURIComponent(apiSecret)}`;
    const response = await fetch(collectUrl, {
      body: JSON.stringify({
        client_id: clientId,
        events: [
          {
            name,
            params: {
              app_version: app.getVersion(),
              engagement_time_msec: '100',
              session_id: sessionId,
              ...params
            }
          }
        ]
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST'
    });
    const responseText = await response.text();

    if (!response.ok) {
      log.error('[analytics] GA4 send failed:', response.status, responseText);
    }

    if (debug) {
      log.info('[analytics] GA4 debug response:', responseText);
    }
  } catch (error) {
    log.error('[analytics] failed to send event', error);
  }
};
