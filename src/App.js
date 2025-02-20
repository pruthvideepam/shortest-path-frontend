import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import axios from "axios";
import "leaflet/dist/leaflet.css";

const App = () => {
  const [startCity, setStartCity] = useState("");
  const [endCity, setEndCity] = useState("");
  const [route, setRoute] = useState([]);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const getCoordinates = async (city) => {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${city}`
      );
      if (response.data.length > 0) {
        const cityResult = response.data.find((item) => item.type === "city") || response.data[0];
        return {
          lat: parseFloat(response.data[0].lat),
          lon: parseFloat(response.data[0].lon),
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
      
      // ✅ Debugging: Log API response to check format
      console.log("API Route Response:", response.data);
      
      const geoJson = response.data;
  
      // ✅ Additional Debugging: Log feature data before processing
      console.log("GeoJSON Features:", geoJson.features);
  
      const coordinates = geoJson.features.flatMap((feature) => {
        // ✅ Check if feature.geometry and coordinates exist before processing
        if (!feature.geometry || !feature.geometry.coordinates) {
          console.error("Invalid feature:", feature);
          return [];
        }
  
        return feature.geometry.coordinates.map((coord) => ({
          lat: coord[1],  // Leaflet requires [lat, lon]
          lon: coord[0],  // GeoJSON format is [lon, lat]
        }));
      });
  
      // ✅ Log final extracted coordinates
      console.log("Extracted Coordinates:", coordinates);
  
      setRoute(coordinates);
    } catch (error) {
      console.error("Error fetching route:", error);
    }
    setLoading(false);
  };  

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      fetchRoute();
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", background: darkMode ? "#222" : "#fff", color: darkMode ? "#fff" : "#000" }}>
      <div style={{ padding: "10px", position: "absolute", zIndex: 1000, display: "flex", gap: "10px" }}>
        <input
          type="text"
          placeholder="Start City"
          value={startCity}
          onChange={(e) => setStartCity(e.target.value)}
          onKeyPress={handleKeyPress}
          style={{ padding: "5px" }}
        />
        <input
          type="text"
          placeholder="Destination City"
          value={endCity}
          onChange={(e) => setEndCity(e.target.value)}
          onKeyPress={handleKeyPress}
          style={{ padding: "5px" }}
        />
        <button onClick={fetchRoute} disabled={loading}>
          {loading ? "Loading..." : "Get Route"}
        </button>
        <button onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? "Light Mode" : "Dark Mode"}
        </button>
      </div>
      <MapContainer center={[12.9716, 77.5946]} zoom={7} style={{ width: "100%", height: "100%" }}>
        <TileLayer url={darkMode ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"} />
        {route.length > 0 && (
          <>
            <Marker position={[route[0].lat, route[0].lon]} />
            <Marker position={[route[route.length - 1].lat, route[route.length - 1].lon]} />
            <Polyline positions={route.map((point) => [point.lat, point.lon])} color="blue" />
          </>
        )}
      </MapContainer>
    </div>
  );
};

export default App;
