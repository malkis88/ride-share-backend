const axios = require('axios');

/**
 * Calls Google Directions API to get real driving distance (km), duration (min),
 * and a route polyline between two coordinates. This runs server-side so a
 * malicious client can never fake a shorter distance to pay less.
 */
async function getRouteDistance(originLat, originLng, destLat, destLng) {
  const url = 'https://maps.googleapis.com/maps/api/directions/json';

  const response = await axios.get(url, {
    params: {
      origin: `${originLat},${originLng}`,
      destination: `${destLat},${destLng}`,
      key: process.env.GOOGLE_DIRECTIONS_API_KEY,
    },
  });

  const data = response.data;

  if (data.status !== 'OK' || !data.routes?.length) {
    throw new Error(`Could not calculate route: ${data.status}`);
  }

  const leg = data.routes[0].legs[0];
  const distanceKm = leg.distance.value / 1000;
  const durationMin = leg.duration.value / 60;
  const polyline = data.routes[0].overview_polyline.points;

  return {
    distanceKm: Math.round(distanceKm * 100) / 100,
    durationMin: Math.round(durationMin),
    polyline,
  };
}

module.exports = { getRouteDistance };