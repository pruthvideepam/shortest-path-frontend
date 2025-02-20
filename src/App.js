import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import axios from "axios";
import "leaflet/dist/leaflet.css";

const App = () => {
  const [startCity, setStartCity] = useState("");
  const [endCity, setEndCity] = useState("");
  const [routes, setRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const getCoordinates = async (city) => {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${city}`
      );
      if (response.data.length > 0) {
        const cityResult =
          response.data.find((item) => item.type === "city") || response.data[0];

        if (!cityResult.lat || !cityResult.lon) {
          console.error(`Invalid coordinates for ${city}:`, cityResult);
          return null;
        }

        return {
          lat: parseFloat(cityResult.lat),
          lon: parseFloat(cityResult.lon),
        };
      }
    } catch (error) {
      console.error("Error fetching coordinates:", error);
    }
    return null;
  };

  const fetchRoute = async () => {
    setLoading(true);
    try {
      const startCoords = await getCoordinates(startCity);
      const endCoords = await getCoordinates(endCity);

      if (!startCoords || !endCoords) {
        alert("Invalid city names. Try again!");
        setLoading(false);
        return;
      }

      const response = await axios.get(
        `https://shortest-path-backend-iyb8.onrender.com/api/route?lat1=${startCoords.lat}&lon1=${startCoords.lon}&lat2=${endCoords.lat}&lon2=${endCoords.lon}`
      );

      console.log("API Route Response:", response.data);

      if (!response.data || !response.data.features || response.data.features.length === 0) {
        console.error("Invalid or empty route data:", response.data);
        alert("No valid route found. Try again!");
        setLoading(false);
        return;
      }

      const geoJson = response.data;

      console.log("GeoJSON Features:", geoJson.features);

      const extractedRoutes = geoJson.features.map((feature) => {
        if (!feature.geometry || !feature.geometry.coordinates) {
          console.error("Invalid feature:", feature);
          return [];
        }

        if (feature.geometry.type === "LineString") {
          return feature.geometry.coordinates.map(([lon, lat]) => ({ lat, lon }));
        } else if (feature.geometry.type === "MultiLineString") {
          return feature.geometry.coordinates.flat().map(([lon, lat]) => ({ lat, lon }));
        }

        return [];
      });

      console.log("Extracted Routes:", extractedRoutes);

      if (extractedRoutes.length === 0) {
        alert("Could not retrieve a valid route. Try again!");
        setLoading(false);
        return;
      }

      setRoutes(extractedRoutes);

      // Automatically select the best route (shortest one)
      const bestRouteIndex = extractedRoutes.reduce((bestIndex, route, index, arr) => 
        route.length < arr[bestIndex].length ? index : bestIndex, 0);
      setSelectedRouteIndex(bestRouteIndex);
    } catch (error) {
      console.error("Error fetching route:", error);
      alert("Failed to fetch route. Try again later!");
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: darkMode ? "#222" : "#fff",
        color: darkMode ? "#fff" : "#000",
      }}
    >
      <div
        style={{
          padding: "10px",
          position: "absolute",
          zIndex: 1000,
          display: "flex",
          gap: "10px",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          placeholder="Start City"
          value={startCity}
          onChange={(e) => setStartCity(e.target.value)}
          style={{ padding: "5px" }}
        />
        <input
          type="text"
          placeholder="Destination City"
          value={endCity}
          onChange={(e) => setEndCity(e.target.value)}
          style={{ padding: "5px" }}
        />
        <button onClick={fetchRoute} disabled={loading}>
          {loading ? "Loading..." : "Get Route"}
        </button>
        <button onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? "Light Mode" : "Dark Mode"}
        </button>

        {routes.length > 1 && (
          <select
            value={selectedRouteIndex}
            onChange={(e) => setSelectedRouteIndex(Number(e.target.value))}
            style={{ padding: "5px" }}
          >
            {routes.map((route, index) => (
              <option key={index} value={index}>
                {index === routes.reduce((bestIndex, route, i, arr) => 
                  route.length < arr[bestIndex].length ? i : bestIndex, 0)
                  ? "Best Route" : `Route ${index + 1}`}
              </option>
            ))}
          </select>
        )}
      </div>

      <MapContainer center={[12.9716, 77.5946]} zoom={7} style={{ width: "100%", height: "100%" }}>
        <TileLayer
          url={
            darkMode
              ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
        />

        {routes.map((route, index) => (
          <Polyline
            key={index}
            positions={route.map((point) => [point.lat, point.lon])}
            color={index === selectedRouteIndex ? "blue" : "gray"}
            weight={index === selectedRouteIndex ? 5 : 2}
            opacity={index === selectedRouteIndex ? 1 : 0.5}
          />
        ))}

        {routes.length > 0 && routes[selectedRouteIndex] && routes[selectedRouteIndex].length > 0 && (
  <>
    <Marker position={[routes[selectedRouteIndex][0].lat, routes[selectedRouteIndex][0].lon]} />
    <Marker position={[routes[selectedRouteIndex][routes[selectedRouteIndex].length - 1].lat, routes[selectedRouteIndex][routes[selectedRouteIndex].length - 1].lon]} />
  </>
)}

      </MapContainer>
    </div>
  );
};

export default App;
