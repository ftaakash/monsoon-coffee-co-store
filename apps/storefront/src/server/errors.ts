// An error the API turns into a JSON response with this HTTP status.
// Anything else thrown inside a route handler becomes a 500.
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
  }
}

export const badRequest = (message: string) => new ApiError(400, message)
export const unauthorized = (message = "Unauthorized") => new ApiError(401, message)
export const notFound = (message = "Not found") => new ApiError(404, message)
export const conflict = (message: string) => new ApiError(409, message)
