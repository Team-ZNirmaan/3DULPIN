import { Ion } from 'cesium'

// Your own token comes from .env.local (see .env.example). Without one, CesiumJS keeps its
// built-in evaluation token, which is fine for local testing but not for a hosted demo.
const envToken = import.meta.env.VITE_CESIUM_ION_TOKEN?.trim()
if (envToken) Ion.defaultAccessToken = envToken

export const usingEvaluationToken = !envToken

// Shivaji Nagar metro station, Pune (Purple Line, underground section).
// Source: Wikipedia, "Shivaji Nagar metro station (Pune)".
export const SHIVAJINAGAR = { lon: 73.84955, lat: 18.53269 }

// Camera height (metres above the ellipsoid) for the opening, top-down parcel view.
export const OPENING_HEIGHT_M = 1500

// Off-white "architect's study model" look for the surrounding real buildings.
export const CONTEXT_BUILDING_COLOUR = '#F2EEE4'
