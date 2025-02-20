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

      const coordinates = geoJson.features.flatMap((feature) => {
  if (!feature.geometry || !feature.geometry.coordinates) {
    console.error("Invalid feature:", feature);
    return [];
  }

  if (feature.geometry.type === "MultiLineString") {
    return feature.geometry.coordinates.flatMap((line) =>
      line.map((coord) => {
        const lat = coord[1]; // Ensure correct ordering
        const lon = coord[0];

        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
          console.error("Invalid coordinate:", coord);
          return null; // Skip invalid points
        }

        return { lat, lon };
      }).filter(Boolean) // Remove null values
    );
  } else if (feature.geometry.type === "LineString") {
    return feature.geometry.coordinates.map((coord) => {
      const lat = coord[1];
      const lon = coord[0];

      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        console.error("Invalid coordinate:", coord);
        return null;
      }

      return { lat, lon };
    }).filter(Boolean);
  } else {
    console.error("Unsupported geometry type:", feature.geometry.type);
    return [];
  }
});


      console.log("Extracted Coordinates:", coordinates);

      if (coordinates.length === 0) {
        console.error("No valid coordinates extracted.");
        alert("Could not retrieve a valid route. Try again!");
        setLoading(false);
        return;
      }

      setRoute(coordinates);
    } catch (error) {
      console.error("Error fetching route:", error);
      alert("Failed to fetch route. Try again later!");
    }
    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      fetchRoute();
    }
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
        }}
      >
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
      <MapContainer
        center={[12.9716, 77.5946]}
        zoom={7}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          url={
            darkMode
              ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
        />
        {route.length > 0 && (
          <>
            {route[0] && <Marker position={[route[0].lat, route[0].lon]} />}
            {route[route.length - 1] && (
              <Marker position={[route[route.length - 1].lat, route[route.length - 1].lon]} />
            )}
            <Polyline positions={route.map((point) => [point.lat, point.lon])} color="blue" />
          </>
        )}
      </MapContainer>
    </div>
  );
};

export default App;
