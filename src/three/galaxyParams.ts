// 星系参数 — 从诗云移植，适配历史人物星图
export const GALAXY = {
  RADIUS: 3600,
  BRANCHES: 4,
  TWIST: 5.2,
  ARM_SPREAD: 0.42,
  THICKNESS: 0.11,
};

export function gauss3(a: number, b: number, c: number): number {
  return a + b + c - 1.5;
}

export const galaxySpin = { angle: 0, decorAngle: 0 };
export const SPIN_RATE = 0.012;
export const DECOR_RATE = 0.019;

export function advanceSpin(dt: number) {
  galaxySpin.angle = (galaxySpin.angle + dt * SPIN_RATE) % (Math.PI * 2);
  galaxySpin.decorAngle = (galaxySpin.decorAngle + dt * DECOR_RATE) % (Math.PI * 2);
}

export function spinXZ(x: number, z: number): [number, number] {
  const a = galaxySpin.angle, c = Math.cos(a), s = Math.sin(a);
  return [x * c + z * s, -x * s + z * c];
}
export function unspinXZ(x: number, z: number): [number, number] {
  const a = galaxySpin.angle, c = Math.cos(a), s = Math.sin(a);
  return [x * c - z * s, x * s + z * c];
}
