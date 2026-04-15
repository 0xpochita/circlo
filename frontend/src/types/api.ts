export type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

export type PaginatedResponse<T> = {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type ApiError = {
  success: false;
  message: string;
  statusCode: number;
};
