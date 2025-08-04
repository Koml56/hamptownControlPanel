// Dummy WebSocketManager implementation
// This file is intentionally left as a no-op to prevent import errors.
// All real-time sync is handled by Firebase Realtime Database.
// You can safely remove any usage of this class.

export class WebSocketManager {
  constructor(url: string) {
    console.info('WebSocketManager is disabled. Firebase handles all real-time sync.');
  }
  connect() {
    return Promise.resolve();
  }
  onOperationReceived() {}
}
