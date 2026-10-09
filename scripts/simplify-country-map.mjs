import fs from "node:fs"

const sourcePath = new URL("../public/data/countries.geojson", import.meta.url)
const data = JSON.parse(fs.readFileSync(sourcePath, "utf8"))
const tolerance = 0.12

function distanceToSegment(point, start, end) {
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  if (dx === 0 && dy === 0) return Math.hypot(point[0] - start[0], point[1] - start[1])
  const t = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(point[0] - (start[0] + t * dx), point[1] - (start[1] + t * dy))
}

function simplifyLine(points) {
  if (points.length <= 4) return points
  let greatest = 0
  let index = 0
  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = distanceToSegment(points[i], points[0], points[points.length - 1])
    if (distance > greatest) { greatest = distance; index = i }
  }
  if (greatest <= tolerance) return [points[0], points[points.length - 1]]
  return [...simplifyLine(points.slice(0, index + 1)).slice(0, -1), ...simplifyLine(points.slice(index))]
}

function simplifyRing(ring) {
  const simplified = simplifyLine(ring.slice(0, -1))
  if (simplified.length < 3) return ring
  return [...simplified, simplified[0]]
}

for (const feature of data.features) {
  const polygons = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates
  const simplified = polygons.map((polygon) => polygon.map(simplifyRing))
  feature.geometry.coordinates = feature.geometry.type === "Polygon" ? simplified[0] : simplified
  feature.properties = { name: feature.properties.name }
}

fs.writeFileSync(sourcePath, JSON.stringify(data))
