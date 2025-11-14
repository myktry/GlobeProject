import React, { useRef, useEffect, useState } from "react";
import Globe from "react-globe.gl";

const InteractiveGlobe = ({
  onCountryClick,
  countries,
  selectedCountry,
  onBackgroundClick,
  disableHover = false,
  hoverHighlightOnly = false,
  isHoveringCountry = false,
  onCountryHover
}) => {
  const globeRef = useRef();
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const [hoverLabel, setHoverLabel] = useState(null);
  const targetSpeed = useRef(0.5); // default rotation speed
  const currentSpeed = useRef(0.5);

  // Match country names
  const isCountryMatch = (polygonName, countryName) => {
    if (!polygonName || !countryName) return false;
    const polyLower = polygonName.toLowerCase().trim();
    const countryLower = countryName.toLowerCase().trim();
    if (polyLower === countryLower) return true;
    if (polyLower.includes(countryLower) || countryLower.includes(polyLower)) return true;

    const specialMatches = [
      ["united states", "usa", "america", "united states of america"],
      ["united kingdom", "uk", "britain", "england", "great britain"],
      ["south korea", "korea", "republic of korea"],
      ["north korea", "democratic people's republic of korea"],
      ["czech republic", "czechia"],
      ["east timor", "timor-leste"],
      ["swaziland", "eswatini"],
      ["macedonia", "north macedonia"],
      ["myanmar", "burma"],
      ["congo", "republic of the congo"],
      ["democratic republic of the congo", "dr congo", "drc"],
      ["ivory coast", "côte d'ivoire"],
      ["cape verde", "cabo verde"]
    ];

    return specialMatches.some(group => group.includes(polyLower) && group.includes(countryLower));
  };

  // Initialize globe
  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = currentSpeed.current;
      globeRef.current.pointOfView({ lat: 0, lng: 0, altitude: 2.5 });
    }
  }, []);

  // Smooth rotation speed adjustment
  useEffect(() => {
    targetSpeed.current = isHoveringCountry ? 0 : 0.5; // slow down to 0 on hover, resume to 0.5 after
    let animationFrame;

    const smoothStep = () => {
      if (globeRef.current && globeRef.current.controls()) {
        const speedDiff = targetSpeed.current - currentSpeed.current;
        currentSpeed.current += speedDiff * 0.1; // 0.1 = smoothing factor
        globeRef.current.controls().autoRotateSpeed = currentSpeed.current;
        if (Math.abs(speedDiff) > 0.001) animationFrame = requestAnimationFrame(smoothStep);
      }
    };
    animationFrame = requestAnimationFrame(smoothStep);

    return () => cancelAnimationFrame(animationFrame);
  }, [isHoveringCountry]);

  // Mouse label tracking
  const handleMouseMove = (event) => {
    if (hoveredCountry) {
      const globeRect = globeRef.current?.parentElement?.getBoundingClientRect();
      setHoverLabel({
        name: hoveredCountry,
        x: event.clientX - (globeRect?.left || 0),
        y: event.clientY - (globeRect?.top || 0)
      });
    }
  };

  useEffect(() => {
    if (hoveredCountry) {
      window.addEventListener("mousemove", handleMouseMove);
    } else {
      setHoverLabel(null);
    }
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [hoveredCountry]);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        polygonsData={countries.features}
        polygonAltitude={(d) => {
          if (selectedCountry && isCountryMatch(d.properties?.name, selectedCountry.name.common)) return 0.2;
          if (!disableHover && hoveredCountry && isCountryMatch(d.properties?.name, hoveredCountry)) return 0.05;
          return 0.01;
        }}
        polygonCapColor={(d) => {
          if (selectedCountry && isCountryMatch(d.properties?.name, selectedCountry.name.common)) return "rgba(255, 215, 0, 1.0)";
          if (!disableHover && hoveredCountry && isCountryMatch(d.properties?.name, hoveredCountry)) return "rgba(255, 165, 0, 0.8)";
          return "rgba(0, 150, 255, 0.3)";
        }}
        polygonSideColor={(d) => {
          if (selectedCountry && isCountryMatch(d.properties?.name, selectedCountry.name.common)) return "rgba(255, 215, 0, 0.7)";
          if (!disableHover && hoveredCountry && isCountryMatch(d.properties?.name, hoveredCountry)) return "rgba(255, 165, 0, 0.5)";
          return "rgba(0, 150, 255, 0.2)";
        }}
        polygonStrokeColor={(d) => {
          if (selectedCountry && isCountryMatch(d.properties?.name, selectedCountry.name.common)) return "rgba(255, 215, 0, 1)";
          if (!disableHover && hoveredCountry && isCountryMatch(d.properties?.name, hoveredCountry)) return "rgba(255, 165, 0, 1)";
          return "rgba(255, 255, 255, 1)";
        }}
        polygonStrokeWidth={(d) => {
          if (selectedCountry && isCountryMatch(d.properties?.name, selectedCountry.name.common)) return 8;
          if (!disableHover && hoveredCountry && isCountryMatch(d.properties?.name, hoveredCountry)) return 5;
          return 2;
        }}
        polygonStrokeAltitude={(d) => {
          if (selectedCountry && isCountryMatch(d.properties?.name, selectedCountry.name.common)) return 0.15;
          if (!disableHover && hoveredCountry && isCountryMatch(d.properties?.name, hoveredCountry)) return 0.08;
          return 0.005;
        }}
        onPolygonClick={(polygon) => {
          setHoveredCountry(null);
          onCountryHover?.(false);
          if (polygon?.properties?.countryData) onCountryClick(polygon.properties.countryData);
        }}
        onPolygonHover={!disableHover
          ? (polygon) => {
              if (polygon) {
                const name = polygon?.properties?.countryData?.name?.common || polygon?.properties?.name || null;
                setHoveredCountry(name);
                onCountryHover?.(true);
              } else {
                setHoveredCountry(null);
                onCountryHover?.(false);
              }
            }
          : undefined
        }
        polygonsTransitionDuration={300}
        width={window.innerWidth}
        height={window.innerHeight}
        backgroundColor="rgba(0,0,0,0)"
        enablePointerInteraction={true}
        showPolygonStroke={true}
        showPolygonCap={true}
      />

      {!disableHover && !hoverHighlightOnly && hoverLabel && (
        <div
          style={{
            position: "absolute",
            left: hoverLabel.x + 12,
            top: hoverLabel.y - 18,
            pointerEvents: "none",
            background: "linear-gradient(90deg, #0033FF 0%, #0600AB 60%, #00003D 100%)",
            color: "#fff",
            padding: "7px 18px",
            borderRadius: 10,
            fontFamily: "'Quicksand', 'Inter', 'Segoe UI', Arial, sans-serif",
            fontWeight: 700,
            fontSize: 17,
            boxShadow: "0 0 16px 2px #0033FF99, 0 2px 16px 0 #00003D88",
            zIndex: 30,
            whiteSpace: "nowrap",
            border: "2px solid #0033FF",
            textShadow: "0 0 8px #0033FFcc, 0 1px 8px #00003Dcc",
            transition: "opacity 0.18s",
            opacity: 1,
            filter: "drop-shadow(0 0 8px #0033FF88)",
          }}
        >
          {hoverLabel.name}
        </div>
      )}
    </div>
  );
};

export default InteractiveGlobe;
