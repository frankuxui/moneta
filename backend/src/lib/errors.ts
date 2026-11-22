export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function required<T>(value: T | undefined): T {
  if (!value) throw new AppError(404, 'No se encontró el registro.');
  return value;
}
