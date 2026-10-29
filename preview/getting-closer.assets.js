/* Independent watercolor layers; original chapter-01 art is never overwritten.
 * Held-can poses include hands + can to preserve a coherent grip; the resting
 * can remains a separate hotspot/layer. See assets/closer/ART-DIRECTION.md.
 */
window.CLOSER_ASSETS = Object.freeze({
  sky: 'assets/watercolor/dawn-sky-v1.png',
  planet: 'assets/watercolor/b612-ground-v1.png',
  prince: 'assets/watercolor/prince-crouching-v1.png',
  princeHolding: 'assets/closer/prince-holding-v2.png',
  princePouring: 'assets/closer/prince-pouring-v2.png',
  rose: 'assets/watercolor/rose-open-v1.png',
  petal: 'assets/watercolor/rose-petal-v1.png',
  wateringCan: 'assets/closer/watering-can-v3.png',
  dome: 'assets/closer/glass-dome-v2.png',
  temporary: Object.freeze([]),
  poseRegistration: Object.freeze({ mouth: [.995, .806], shiftX: .026, shiftY: .006 }),
  edition: 'closer-watercolor-v2'
});
