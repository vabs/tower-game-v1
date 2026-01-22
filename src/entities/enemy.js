export class Enemy {
  constructor({ hp, speed, path }) {
    this.hp = hp;
    this.baseSpeed = speed;
    this.speedMultiplier = 1;
    this.path = path;
    this.alive = true;
    this.distance = 0;
    this.status = { slowUntil: 0, slowFactor: 1 };
  }

  update(dt) {
    const now = (this._time = (this._time || 0) + dt);
    if (now > this.status.slowUntil) {
      this.speedMultiplier = 1;
    } else {
      this.speedMultiplier = this.status.slowFactor;
    }
    this.distance += this.baseSpeed * this.speedMultiplier * dt;
  }
}
