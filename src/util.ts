import { hostname, userInfo } from 'node:os';
import type { UserInfo } from 'node:os';

export function generateInstanceId(): string {
  let info: UserInfo<string> | undefined;
  try {
    info = userInfo();
  } catch (error: unknown) {
    // unable to read info;
  }

  // TODO uuid를 사용하는게 좋을듯?
  const prefix = info
    ? info.username
    : `generated-${Math.round(Math.random() * 1000000)}-${process.pid}`;
  return `${prefix}-${hostname()}`;
}
