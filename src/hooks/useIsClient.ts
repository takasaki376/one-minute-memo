"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => {
  return () => {};
};

const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * SSR では false、クライアントでは true を返す。
 * createPortal 等を SSR で実行しないためのガードに使う。
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
