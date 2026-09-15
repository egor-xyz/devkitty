import { app } from 'electron';
import log from 'electron-log';
import { randomInt } from 'node:crypto';

import { settings } from './settings';

const MEASUREMENT_ID = 'G-KVS84N7CDJ';
const COLLECT_URL = 'https://www.google-analytics.com/mp/collect';
const DEBUG_COLLECT_URL = 'https://www.google-analytics.com/debug/mp/collect';

const CLIENT_ID_PATTERN = /^[1-9]\d*\.[1-9]\d*$/;

// One numeric session_id per app run.
const sessionId = Date.now();

const getClientId = (): string => {
  const existing = settings.get('clientId');
  if (existing && CLIENT_ID_PATTERN.test(existing)) return existing;

  const clientId = `${randomInt(1, 2_147_483_647)}.${Math.floor(Date.now() / 1000)}`;
  settings.set('clientId', clientId);
  return clientId;
};

export const track = async (name: string, params?: Record<string, unknown>): Promise<void> => {
  try {
    if (!app.isPackaged) return;

    const apiSecret = import.meta.env.MAIN_VITE_GA_API_SECRET;
    if (!apiSecret) return;

    if (settings.get('appSettings')?.telemetry === false) return;

    const debug = import.meta.env.MAIN_VITE_GA_DEBUG === 'true';
    const clientId = getClientId();
    const url = debug ? DEBUG_COLLECT_URL : COLLECT_URL;
    const appVersion = app.getVersion();

    const collectUrl = `${url}?measurement_id=${MEASUREMENT_ID}&api_secret=${encodeURIComponent(apiSecret)}`;
    const response = await fetch(collectUrl, {
      body: JSON.stringify({
        client_id: clientId,
        events: [
          {
            name,
            params: {
              ...params,
              app_version: appVersion,
              engagement_time_msec: 100,
              session_id: sessionId
            }
          }
        ],
        ...(debug && { validation_behavior: 'ENFORCE_RECOMMENDATIONS' })
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST'
    });

    let hasValidationMessages = false;
    if (debug && response.ok) {
      const reply = (await response.json()) as {
        validationMessages?: { fieldPath?: unknown; validationCode?: unknown }[];
      };
      const validationMessages = Array.isArray(reply.validationMessages)
        ? reply.validationMessages
        : [];
      hasValidationMessages = validationMessages.length > 0;

      if (hasValidationMessages) {
        const safeMessages = validationMessages.map(({ fieldPath, validationCode }) => ({
          fieldPath: typeof fieldPath === 'string' ? fieldPath : undefined,
          validationCode: typeof validationCode === 'string' ? validationCode : undefined
        }));
        log.error('[analytics] GA4 validation failed:', name, safeMessages, appVersion);
      }
    }

    if (!response.ok) {
      log.error('[analytics] GA4 send failed:', name, response.status, appVersion);
    } else if (!hasValidationMessages) {
      log.info('[analytics] GA4 event sent:', name, response.status, appVersion);
    }

    if (debug) {
      log.info('[analytics] GA4 debug reply:', response.status);
    }
  } catch {
    log.error('[analytics] failed to send event:', name, app.getVersion());
  }
};
