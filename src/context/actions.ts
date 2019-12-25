import moment from 'moment';

import { Log } from 'context/types';

export const defaultLogAction = (text: string): Log => ({
  date: +moment(),
  intent: 'none',
  text
});

export const primaryLogAction = (text: string): Log => ({
  date: +moment(),
  intent: 'primary',
  text
});

export const successLogAction = (text: string): Log => ({
  date: +moment(),
  intent: 'none',
  text
});

export const dangerLogAction = (text: string): Log => ({
  date: +moment(),
  intent: 'danger',
  text
});

export const warningLogAction = (text: string): Log => ({
  date: +moment(),
  intent: 'warning',
  text
});