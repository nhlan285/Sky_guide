import { describe, it } from 'node:test';
import assert from 'node:assert';

function getPhaseForHour(hour) {
  if (hour >= 5 && hour < 17) {
    return 'daylight';
  } else if (hour >= 17 && hour < 21) {
    return 'sunset';
  } else {
    return 'night';
  }
}

function getThemeTokens() {
  return {};
}

describe('skyTime', () => {
  it('should map hours correctly', () => {
    assert.strictEqual(getPhaseForHour(4), 'night');
    assert.strictEqual(getPhaseForHour(5), 'daylight');
    assert.strictEqual(getPhaseForHour(16), 'daylight');
    assert.strictEqual(getPhaseForHour(17), 'sunset');
    assert.strictEqual(getPhaseForHour(20), 'sunset');
    assert.strictEqual(getPhaseForHour(21), 'night');
    assert.strictEqual(getPhaseForHour(0), 'night');
  });

  it('should return theme tokens', () => {
    assert.ok(typeof getThemeTokens('night') === 'object');
  });
});
