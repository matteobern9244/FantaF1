type RuntimeEnvironment = 'development' | 'production';

type SaveErrorPayload = {
  error?: unknown;
  code?: unknown;
  requestId?: unknown;
  details?: unknown;
};

class SaveRequestError extends Error {
  status: number;
  code?: string;
  requestId?: string;
  details?: string;
  userMessage: string;

  constructor(
    message: string,
    {
      status,
      code,
      requestId,
      details,
      userMessage,
    }: {
      status: number;
      code?: string;
      requestId?: string;
      details?: string;
      userMessage: string;
    },
  ) {
    super(message);
    this.name = 'SaveRequestError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
    this.userMessage = userMessage;
  }
}

function normalizeText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
function buildDevelopmentMessage(
  fallbackMessage: string,
  payload: SaveErrorPayload,
  fallbackDetails?: string,
) {
  const backendMessage = normalizeText(payload.error) ?? fallbackMessage;
  const code = normalizeText(payload.code);
  const requestId = normalizeText(payload.requestId);

  const rawDetails = normalizeText(payload.details) ?? fallbackDetails;
  let details: string | undefined = undefined;

  if (rawDetails) {
    const firstLine = rawDetails.split('\n').map((line) => line.trim()).find(Boolean);
    if (firstLine) {
      details = firstLine.length > 240 ? `${firstLine.slice(0, 237)}...` : firstLine;
    }
  }

  const messageLines = [backendMessage];

  if (code) {
    messageLines.push(`Codice: ${code}`);
  }

  if (details) {
    messageLines.push(`Dettagli: ${details}`);
  }

  if (requestId) {
    messageLines.push(`Request ID: ${requestId}`);
  }

  return messageLines.join('\n');
}

function buildProductionMessage(fallbackMessage: string, requestId?: string) {
  return requestId ? `${fallbackMessage} (ref: ${requestId})` : fallbackMessage;
}

function getSaveErrorAlertMessage({
  error,
  fallbackMessage,
  environment,
}: {
  error: unknown;
  fallbackMessage: string;
  environment: RuntimeEnvironment;
}) {
  if (error instanceof SaveRequestError) {
    return error.userMessage;
  }

  if (environment === 'production') {
    return fallbackMessage;
  }

  const fallbackDetails = error instanceof Error ? error.message : String(error ?? '');
  return buildDevelopmentMessage(fallbackMessage, {}, fallbackDetails);
}

async function createSaveRequestError(
  response: Response,
  {
    fallbackMessage,
    environment,
  }: {
    fallbackMessage: string;
    environment: RuntimeEnvironment;
  },
) {
  const payload: SaveErrorPayload = await response.json().catch(() => ({}));

  const code = normalizeText(payload.code);
  const requestId = normalizeText(payload.requestId);
  const details = normalizeText(payload.details);
  const backendMessage = normalizeText(payload.error) ?? fallbackMessage;
  const userMessage =
    environment === 'production'
      ? buildProductionMessage(fallbackMessage, requestId)
      : buildDevelopmentMessage(fallbackMessage, payload);

  return new SaveRequestError(backendMessage, {
    status: response.status,
    code,
    requestId,
    details,
    userMessage,
  });
}

export { SaveRequestError, createSaveRequestError, getSaveErrorAlertMessage };
export type { RuntimeEnvironment, SaveErrorPayload };
