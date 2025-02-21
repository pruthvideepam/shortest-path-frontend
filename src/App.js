import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import axios from "axios";
import "leaflet/dist/leaflet.css";

const startIcon = new L.Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const endIcon = new L.Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const waypointIcon = new L.Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const App = () => {
  const [startCity, setStartCity] = useState("");
  const [endCity, setEndCity] = useState("");
  const [waypoints, setWaypoints] = useState([]);
  const [route, setRoute] = useState([]);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [distance, setDistance] = useState(null);
  const [travelTime, setTravelTime] = useState(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStartCity(`${position.coords.latitude},${position.coords.longitude}`);
      },
      (error) => console.error("Error getting location: ", error)
    );
  }, []);

  const getCoordinates = async (city) => {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${city}`
      );
      if (response.data.length > 0) {
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
      const waypointCoords = await Promise.all(waypoints.map(getCoordinates));

      if (!startCoords || !endCoords) {
        alert("Invalid city names. Try again!");
        setLoading(false);
        return;
      }

      const waypointParams = waypointCoords
        .filter(Boolean)
        .map((wp) => `&waypoints=${wp.lat},${wp.lon}`)
        .join("");

      const response = await axios.get(
        `https://shortest-path-backend-iyb8.onrender.com/api/route?lat1=${startCoords.lat}&lon1=${startCoords.lon}&lat2=${endCoords.lat}&lon2=${endCoords.lon}${waypointParams}`
      );

      const geoJson = response.data;
      const coordinates = geoJson.features.flatMap((feature) => {
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

      if (coordinates.length === 0) {
        alert("Could not retrieve a valid route. Try again!");
        setLoading(false);
        return;
      }

      setRoute(coordinates);
      setDistance(geoJson.properties?.distance || "Unknown");
      setTravelTime(geoJson.properties?.time || "Unknown");
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
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ position: "absolute", top: "10px", left: "50%", transform: "translateX(-50%)", background: "#fff", padding: "10px", borderRadius: "10px", boxShadow: "0 2px 5px rgba(0,0,0,0.3)", zIndex: 1000, display: "flex", gap: "10px", alignItems: "center" }}>
        <input type="text" placeholder="Start City" value={startCity} onChange={(e) => setStartCity(e.target.value)} />
        <input type="text" placeholder="Destination City" value={endCity} onChange={(e) => setEndCity(e.target.value)} />
        <button onClick={fetchRoute} disabled={loading}>{loading ? "Loading..." : "Get Route"}</button>
        <button onClick={() => setDarkMode(!darkMode)}>{darkMode ? "Light Mode" : "Dark Mode"}</button>
      </div>
      <MapContainer center={[12.9716, 77.5946]} zoom={7} style={{ width: "100%", height: "100%" }}>
        <TileLayer url={darkMode ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"} />
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

export default App
