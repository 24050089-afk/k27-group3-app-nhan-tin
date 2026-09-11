const test = require('node:test');
const assert = require('node:assert/strict');

const { sequelize } = require('../src/models');
const { upsertNearbyPresence, validateLocation } = require('../src/services/friendDiscovery.service');

test('validates and quantizes nearby coordinates', () => {
  assert.deepEqual(validateLocation({
    latitude: 10.776889,
    longitude: 106.700806,
    accuracy_m: 24.6,
  }), {
    latitude: 10.777,
    longitude: 106.701,
    accuracy_m: 25,
  });
  assert.equal(validateLocation({ latitude: 91, longitude: 0, accuracy_m: 10 }), null);
  assert.equal(validateLocation({ latitude: 10, longitude: 181, accuracy_m: 10 }), null);
  assert.equal(validateLocation({ latitude: 10, longitude: 106, accuracy_m: 0 }), null);
});

test('writes geographic points with SRID 4326 and explicit longitude-latitude axis order', async () => {
  const originalQuery = sequelize.query;
  let captured;
  sequelize.query = async (sql, options) => {
    captured = { sql, options };
    return [];
  };

  try {
    const result = await upsertNearbyPresence(7, {
      latitude: 10.776889,
      longitude: 106.700806,
      accuracy_m: 24.6,
    });
    assert.equal(result.active, true);
    assert.match(captured.sql, /ST_GeomFromText\(:pointWkt, 4326, 'axis-order=long-lat'\)/);
    assert.equal(captured.options.replacements.userId, 7);
    assert.equal(captured.options.replacements.pointWkt, 'POINT(106.701 10.777)');
    assert.equal(captured.options.replacements.accuracy, 25);
  } finally {
    sequelize.query = originalQuery;
  }
});
