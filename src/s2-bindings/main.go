package main

import (
	"fmt"

	"github.com/golang/geo/s1"
	"github.com/golang/geo/s2"
)

// Point to S2 cells
// Rectangle to covering cells

//export cellIDFromLatLng
func cellIDFromLatLng(latDeg float64, lngDeg float64) uint64 {
	leaf := s2.CellIDFromLatLng(s2.LatLngFromDegrees(latDeg, lngDeg))
	return uint64(leaf)
}

//export cellIDParent
func cellIDParent(cellID uint64, level int) uint64 {
	return uint64(s2.CellID(cellID).Parent(level))
}

const TOKEN_BUFFER_SIZE int = 16

var tokenBuffer [TOKEN_BUFFER_SIZE]uint8

//export tokenBufferPtr
func tokenBufferPtr() *[TOKEN_BUFFER_SIZE]uint8 {
	return &tokenBuffer
}

//export cellIDToken
func cellIDToken(cellID uint64) int {
	token := s2.CellID(cellID).ToToken()
	if len(token) > TOKEN_BUFFER_SIZE {
		return -1
	}
	copy(tokenBuffer[:], token)
	return len(token)
}

//export cellIDLevel
func cellIDLevel(cellID uint64) int {
	return s2.CellID(cellID).Level()
}

const COVER_RECTANGLE_BUFFER_SIZE int = 1536

var coverRectangleBuffer [COVER_RECTANGLE_BUFFER_SIZE]uint64

//export coverRectangleBufferPtr
func coverRectangleBufferPtr() *[COVER_RECTANGLE_BUFFER_SIZE]uint64 {
	return &coverRectangleBuffer
}

//export coverRectangle
func coverRectangle(latDeg1 float64, lngDeg1 float64, latDeg2 float64, lngDeg2 float64, minLevel int, maxLevel int, levelMod int, maxCells int) int {
	rect := s2.RectFromLatLng(s2.LatLngFromDegrees(latDeg1, lngDeg1))
	rect = rect.AddPoint(s2.LatLngFromDegrees(latDeg2, lngDeg2))
	rc := s2.RegionCoverer{
		MinLevel: minLevel,
		MaxLevel: maxLevel,
		MaxCells: maxCells,
		LevelMod: levelMod,
	}
	covering := rc.Covering(s2.Region(rect))
	if len(covering) > COVER_RECTANGLE_BUFFER_SIZE {
		return -1
	}
	for i, cellID := range covering {
		coverRectangleBuffer[i] = uint64(cellID)
	}
	return len(covering)
}

//export rectangleContains
func rectangleContains(latDeg1 float64, lngDeg1 float64, latDeg2 float64, lngDeg2 float64, pLat float64, pLng float64) bool {
	rect := s2.RectFromLatLng(s2.LatLngFromDegrees(latDeg1, lngDeg1))
	rect = rect.AddPoint(s2.LatLngFromDegrees(latDeg2, lngDeg2))
	point := s2.LatLngFromDegrees(pLat, pLng)
	return rect.ContainsPoint(s2.PointFromLatLng(point))
}

// Polygon support: buffer holds interleaved lat/lng pairs (max 1000 vertices)
const POLYGON_BUFFER_SIZE int = 2000

var polygonBuffer [POLYGON_BUFFER_SIZE]float64

//export polygonBufferPtr
func polygonBufferPtr() *[POLYGON_BUFFER_SIZE]float64 {
	return &polygonBuffer
}

// buildPolygonFromBuffer creates a normalized polygon from the buffer.
// numPoints is the number of vertices (buffer contains numPoints*2 floats).
func buildPolygonFromBuffer(numPoints int) *s2.Polygon {
	points := make([]s2.Point, numPoints)
	for i := 0; i < numPoints; i++ {
		lat := polygonBuffer[i*2]
		lng := polygonBuffer[i*2+1]
		points[i] = s2.PointFromLatLng(s2.LatLngFromDegrees(lat, lng))
	}
	loop := s2.LoopFromPoints(points)
	loop.Normalize() // Ensure CCW orientation (interior on left side of edges)
	return s2.PolygonFromLoops([]*s2.Loop{loop})
}

//export coverPolygon
func coverPolygon(numPoints int, minLevel int, maxLevel int, levelMod int, maxCells int) int {
	if numPoints < 3 {
		return -1 // Need at least 3 points for a polygon
	}
	if numPoints*2 > POLYGON_BUFFER_SIZE {
		return -1 // Too many points
	}

	polygon := buildPolygonFromBuffer(numPoints)
	rc := s2.RegionCoverer{
		MinLevel: minLevel,
		MaxLevel: maxLevel,
		MaxCells: maxCells,
		LevelMod: levelMod,
	}
	covering := rc.Covering(polygon)

	if len(covering) > COVER_RECTANGLE_BUFFER_SIZE {
		return -1
	}
	for i, cellID := range covering {
		coverRectangleBuffer[i] = uint64(cellID)
	}
	return len(covering)
}

//export polygonContainsPoint
func polygonContainsPoint(numPoints int, pLat float64, pLng float64) bool {
	if numPoints < 3 || numPoints*2 > POLYGON_BUFFER_SIZE {
		return false
	}

	polygon := buildPolygonFromBuffer(numPoints)
	testPoint := s2.PointFromLatLng(s2.LatLngFromDegrees(pLat, pLng))
	return polygon.ContainsPoint(testPoint)
}

//export cellVertexLatDegrees
func cellVertexLatDegrees(cellID uint64, k int) float64 {
	cell := s2.CellFromCellID((s2.CellID(cellID)))
	point := cell.Vertex(k)
	return s2.LatLngFromPoint(point).Lat.Degrees()
}

//export cellVertexLngDegrees
func cellVertexLngDegrees(cellID uint64, k int) float64 {
	cell := s2.CellFromCellID((s2.CellID(cellID)))
	point := cell.Vertex(k)
	return s2.LatLngFromPoint(point).Lng.Degrees()
}

// The mean radius of the Earth in meters.
const EARTH_RADIUS_METERS float64 = 6371010.0

//export metersToChordAngle
func metersToChordAngle(meters float64) float64 {
	angle := s1.Angle(meters / EARTH_RADIUS_METERS)
	chordAngle := s1.ChordAngleFromAngle(angle)
	return float64(chordAngle)
}

//export chordAngleToMeters
func chordAngleToMeters(chordAngle float64) float64 {
	angle := s1.ChordAngle(chordAngle).Angle()
	meters := angle.Radians() * EARTH_RADIUS_METERS
	return meters
}

//export pointDistance
func pointDistance(latDeg1 float64, lngDeg1 float64, latDeg2 float64, lngDeg2 float64) float64 {
	point1 := s2.PointFromLatLng(s2.LatLngFromDegrees(latDeg1, lngDeg1))
	point2 := s2.PointFromLatLng(s2.LatLngFromDegrees(latDeg2, lngDeg2))
	angle := point1.Distance(point2)
	chordAngle := s1.ChordAngleFromAngle(angle)
	return float64(chordAngle)
}

const CELLS_BUFFER_SIZE int = 4096

var cellsBuffer [CELLS_BUFFER_SIZE]uint64

//export cellsBufferPtr
func cellsBufferPtr() *[CELLS_BUFFER_SIZE]uint64 {
	return &cellsBuffer
}

//export initialCells
func initialCells(minLevel int) int {
	count := 0
	for face := 0; face < 6; face++ {
		root := s2.CellIDFromFace(face)
		if minLevel == 0 {
			if count >= CELLS_BUFFER_SIZE {
				return -1
			}
			cellsBuffer[count] = uint64(root)
			count++
			continue
		}
		// Get all cells at minLevel that intersect with the search area
		for cellID := root.ChildBeginAtLevel(minLevel); cellID != root.ChildEndAtLevel(minLevel); cellID = cellID.Next() {
			if count >= CELLS_BUFFER_SIZE {
				return -1
			}
			cellsBuffer[count] = uint64(cellID)
			count++
		}
	}
	return count
}

//export minDistanceToCell
func minDistanceToCell(latDeg float64, lngDeg float64, cellID uint64) float64 {
	point := s2.PointFromLatLng(s2.LatLngFromDegrees(latDeg, lngDeg))
	cell := s2.CellFromCellID((s2.CellID(cellID)))
	distance := cell.Distance(point)
	return float64(distance)
}

//export cellIDChildren
func cellIDChildren(cellIDInt uint64, level int) int {
	cellID := s2.CellID(cellIDInt)
	count := 0
	for childCellID := cellID.ChildBeginAtLevel(level); childCellID != cellID.ChildEndAtLevel(level); childCellID = childCellID.Next() {
		if count >= CELLS_BUFFER_SIZE {
			fmt.Printf("cellIDChildren: buffer overflow for cellID %d at level %d, count %d\n", cellIDInt, level, count)
			return -1
		}
		cellsBuffer[count] = uint64(childCellID)
		count++
	}
	return count
}

// Polyline support: buffer holds interleaved lat/lng pairs (max 1000 vertices)
const POLYLINE_BUFFER_SIZE int = 2000

var polylineBuffer [POLYLINE_BUFFER_SIZE]float64

//export polylineBufferPtr
func polylineBufferPtr() *[POLYLINE_BUFFER_SIZE]float64 {
	return &polylineBuffer
}

// buildPolylineFromBuffer creates a polyline from the buffer.
// numPoints is the number of vertices (buffer contains numPoints*2 floats).
func buildPolylineFromBuffer(numPoints int) *s2.Polyline {
	points := make([]s2.LatLng, numPoints)
	for i := 0; i < numPoints; i++ {
		lat := polylineBuffer[i*2]
		lng := polylineBuffer[i*2+1]
		points[i] = s2.LatLngFromDegrees(lat, lng)
	}
	polyline := s2.PolylineFromLatLngs(points)
	return polyline
}

//export coverPolylineBuffered
func coverPolylineBuffered(numPoints int, bufferMeters float64, minLevel, maxLevel, levelMod, maxCells, maxLevelDiff int) int {
	if numPoints < 2 {
		return -1 // Need at least 2 points for a polyline
	}
	if numPoints*2 > POLYLINE_BUFFER_SIZE {
		return -1 // Too many points
	}

	polyline := buildPolylineFromBuffer(numPoints)

	// Get initial covering of the polyline
	rc := s2.RegionCoverer{
		MinLevel: minLevel,
		MaxLevel: maxLevel,
		MaxCells: maxCells,
		LevelMod: levelMod,
	}
	covering := rc.CellUnion(polyline)

	// Expand the covering by the buffer radius
	// Convert meters to s1.Angle (radians)
	minRadius := s1.Angle(bufferMeters / EARTH_RADIUS_METERS)
	// ExpandByRadius modifies in place
	covering.ExpandByRadius(minRadius, maxLevelDiff)

	if len(covering) > COVER_RECTANGLE_BUFFER_SIZE {
		return -1
	}
	for i, cellID := range covering {
		coverRectangleBuffer[i] = uint64(cellID)
	}
	return len(covering)
}

//export distanceToPolyline
func distanceToPolyline(numPoints int, pLat, pLng float64) float64 {
	if numPoints < 2 || numPoints*2 > POLYLINE_BUFFER_SIZE {
		return -1 // Invalid polyline
	}

	polyline := buildPolylineFromBuffer(numPoints)

	// Create a ShapeIndex and add the polyline
	index := s2.NewShapeIndex()
	index.Add(polyline)

	// Create closest edge query
	query := s2.NewClosestEdgeQuery(index, s2.NewClosestEdgeQueryOptions())

	// Find the closest edge to the target point
	target := s2.NewMinDistanceToPointTarget(s2.PointFromLatLng(s2.LatLngFromDegrees(pLat, pLng)))
	result := query.FindEdges(target)

	if len(result) == 0 {
		return -1 // No edges found (shouldn't happen with valid polyline)
	}

	// Return the distance as a chord angle
	return float64(result[0].Distance())
}

// main is required for the `wasip1` target, even if it isn't used.
func main() {
}
