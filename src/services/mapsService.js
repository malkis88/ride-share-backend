const axios = require('axios');

/**
 * Haversine straight-line distance (km) — used only as a fallback if the
 * Directions API is unreachable or returns no route, so fare estimation
 * never completely breaks. Real road distance from Google is always
 * preferred since it reflects actual driving distance, not "as the crow flies."
 */
function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calls Google Directions API to get real driving distance (km), duration
 * (min, traffic-aware), and a route polyline between two coordinates.
 * This runs server-side so a malicious client can never fake a shorter
 * distance to pay less.
 */
async function getRouteDistance(originLat, originLng, destLat, destLng) {
  const url = 'https://maps.googleapis.com/maps/api/directions/json';

  try {
    const response = await axios.get(url, {
      params: {
        origin: `${originLat},${originLng}`,
        destination: `${destLat},${destLng}`,
        key: process.env.GOOGLE_DIRECTIONS_API_KEY,
        mode: 'driving',
        units: 'metric',
        // Traffic-aware duration — "now" tells Google to factor in current
        // traffic conditions instead of returning a static free-flow time.
        departure_time: 'now',
        // Prevents Google returning a route that skips a leg due to
        // temporary closures without at least trying to route around it.
        alternatives: false,
      },
      timeout: 8000,
    });

    const data = response.data;

    if (data.status !== 'OK' || !data.routes?.length) {
      throw new Error(`Directions API returned status: ${data.status}`);
    }

    const route = data.routes[0];
    const leg = route.legs[0];

    // duration_in_traffic is only present when departure_time is set and
    // traffic data is available for the route; fall back to plain duration
    // otherwise (e.g. remote areas with no traffic data).
    const durationSeconds =
      leg.duration_in_traffic?.value ?? leg.duration.value;

    const distanceKm = leg.distance.value / 1000;
    const durationMin = durationSeconds / 60;

    return {
      distanceKm: Math.round(distanceKm * 100) / 100,
      durationMin: Math.round(durationMin),
      polyline: route.overview_polyline.points,
      source: 'directions_api',
    };
  } catch (err) {
    console.error('Directions API error, falling back to straight-line distance:', err.message);

    // Fallback path: still return a usable estimate rather than blocking
    // ride/trip creation entirely. Straight-line distance is padded by a
    // small road-factor multiplier (1.3x) since real roads are never
    // perfectly direct — this keeps fare estimates from being unfairly low.
    const straightLineKm = haversineDistanceKm(originLat, originLng, destLat, destLng);
    const estimatedRoadKm = straightLineKm * 1.3;

    // Rough average urban driving speed assumption (30 km/h) purely for a
    // ballpark ETA when we have no real routing data at all.
    const estimatedMinutes = (estimatedRoadKm / 30) * 60;

    return {
      distanceKm: Math.round(estimatedRoadKm * 100) / 100,
      durationMin: Math.round(estimatedMinutes),
      polyline: null,
      source: 'haversine_fallback',
    };
  }
}

module.exports = { getRouteDistance, haversineDistanceKm };