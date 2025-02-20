import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import axios from "axios";
import "leaflet/dist/leaflet.css";

const App = () => {
  const [startCity, setStartCity] = useState("");
  const [endCity, setEndCity] = useState("");
  const [routes, setRoutes] = useState([]);
  const [bestRouteIndex, setBestRouteIndex] = useState(0);
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
        return cityResult ? { lat: parseFloat(cityResult.lat), lon: parseFloat(cityResult.lon) } : null;
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

      if (!response.data || !response.data.features || response.data.features.length === 0) {
        alert("No valid route found. Try again!");
        setLoading(false);
        return;
      }

      const extractedRoutes = response.data.features
        .map((feature) => {
          if (feature.geometry.type === "LineString") {
            return feature.geometry.coordinates.map(([lon, lat]) => ({ lat, lon }));
          } else if (feature.geometry.type === "MultiLineString") {
            return feature.geometry.coordinates[0].map(([lon, lat]) => ({ lat, lon }));
          }
          return [];
        })
        .filter((route) => route.length > 0);

      setRoutes(extractedRoutes);
      setBestRouteIndex(0);
      setSelectedRouteIndex(0);
    } catch (error) {
      console.error("Error fetching route:", error);
      alert("Failed to fetch route. Try again later!");
    }
    setLoading(false);
  };

  return (
    <div style={{ width: "100vw", height: "100vh", background: darkMode ? "#222" : "#fff", color: darkMode ? "#fff" : "#000" }}>
      <div style={{ padding: "10px", position: "absolute", zIndex: 1000, display: "flex", gap: "10px", alignItems: "center" }}>
        <input type="text" placeholder="Start City" value={startCity} onChange={(e) => setStartCity(e.target.value)} style={{ padding: "5px" }} />
        <input type="text" placeholder="Destination City" value={endCity} onChange={(e) => setEndCity(e.target.value)} style={{ padding: "5px" }} />
        <button onClick={fetchRoute} disabled={loading}>{loading ? "Loading..." : "Get Route"}</button>
        <button onClick={() => setDarkMode(!darkMode)}>{darkMode ? "Light Mode" : "Dark Mode"}</button>
        {routes.length > 1 && (
          <select value={selectedRouteIndex} onChange={(e) => setSelectedRouteIndex(Number(e.target.value))} style={{ padding: "5px" }}>
            {routes.map((_, index) => (
              <option key={index} value={index}>{index === bestRouteIndex ? "Best Route (Blue)" : `Route ${index + 1} (Red)`}</option>
            ))}
          </select>
        )}
      </div>
      <MapContainer center={[12.9716, 77.5946]} zoom={7} style={{ width: "100%", height: "100%" }}>
        <TileLayer url={darkMode ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"} />
        {routes.length > 0 && (
          <Polyline
            positions={routes[selectedRouteIndex].map((point) => [point.lat, point.lon])}
            color={selectedRouteIndex === bestRouteIndex ? "blue" : "red"}
            weight={5}
            opacity={1}
          />
        )}
        {routes.length > 0 && (
          <>
            <Marker position={[routes[selectedRouteIndex][0]?.lat, routes[selectedRouteIndex][0]?.lon]} />
            <Marker position={[routes[selectedRouteIndex][routes[selectedRouteIndex].length - 1]?.lat, routes[selectedRouteIndex][routes[selectedRouteIndex].length - 1]?.lon]} />
          </>
        )}
      </MapContainer>
    </div>
  );
};

export default App;
