import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import L from "leaflet";
import axios from "axios";
import "leaflet/dist/leaflet.css";
import "./App.css";

// Custom markers
const startIcon = new L.Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
  iconSize: [40, 40],
});

const endIcon = new L.Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
  iconSize: [40, 40],
});

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
        const cityResult =
          response.data.find((item) => item.type === "city") || response.data[0];
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

      const geoJson = response.data;
      const coordinates = geoJson.features.flatMap((feature) => {
        if (!feature.geometry || !feature.geometry.coordinates) return [];
        switch (feature.geometry.type) {
          case "MultiLineString":
            return feature.geometry.coordinates.flatMap((line) =>
              line.map(([lon, lat]) => ({ lat, lon }))
            );
          case "LineString":
            return feature.geometry.coordinates.map(([lon, lat]) => ({ lat, lon }));
          default:
            return [];
        }
      });

      setRoute(coordinates);
    } catch (error) {
      console.error("Error fetching route:", error);
      alert("Failed to fetch route. Try again later!");
    }
    setLoading(false);
  };

  return (
    <div className={`app-container ${darkMode ? "dark" : "light"}`}>
      <div className="search-box">
        <input
          type="text"
          placeholder="Start Location"
          value={startCity}
          onChange={(e) => setStartCity(e.target.value)}
        />
        <input
          type="text"
          placeholder="Destination"
          value={endCity}
          onChange={(e) => setEndCity(e.target.value)}
        />
        <button onClick={fetchRoute} disabled={loading} className="search-btn">
          {loading ? "Loading..." : "Get Route"}
        </button>
        <button onClick={() => setDarkMode(!darkMode)} className="mode-btn">
          {darkMode ? "🌞 Light" : "🌙 Dark"}
        </button>
      </div>
      <MapContainer center={[12.9716, 77.5946]} zoom={7} className="map-container">
        <TileLayer
          url={
            darkMode
              ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
        />
        {route.length > 0 && (
          <>
            <Marker position={[route[0].lat, route[0].lon]} icon={startIcon} />
            <Marker position={[route[route.length - 1].lat, route[route.length - 1].lon]} icon={endIcon} />
            <Polyline positions={route.map((point) => [point.lat, point.lon])} color="blue" />
          </>
        )}
      </MapContainer>
    </div>
  );
};

export default App;
