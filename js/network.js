export class NetworkManager {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.isConnected = false;
    this.roomCode = null;
    this.playerIndex = -1;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${window.location.host}`;

      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          this.isConnected = true;
          this.emit('connected', {});
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.emit(data.type, data);
          } catch (err) {
            console.error('Failed to parse WS payload:', err);
          }
        };

        this.ws.onerror = (err) => {
          console.warn('WebSocket connection error:', err);
          this.emit('connection_error', err);
          reject(err);
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          this.emit('disconnected', {});
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not open. State:', this.ws ? this.ws.readyState : 'null');
    }
  }

  createRoom() {
    this.send({ type: 'create_room' });
  }

  joinRoom(roomCode) {
    this.send({ type: 'join_room', roomCode });
  }

  sendFleetReady(ships) {
    this.send({ type: 'fleet_ready', ships });
  }

  fire(x, y) {
    this.send({ type: 'fire', x, y });
  }

  sendChat(text) {
    this.send({ type: 'chat', text });
  }

  sendRematch() {
    this.send({ type: 'rematch' });
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((cb) => cb(data));
    }
  }
}

export const net = new NetworkManager();
