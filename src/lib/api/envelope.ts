export function ok<T>(data: T): { success: true; data: T } {
  return { success: true, data };
}

export function fail(
  code: string,
  message: string,
): { success: false; error: { code: string; message: string } } {
  return { success: false, error: { code, message } };
}
