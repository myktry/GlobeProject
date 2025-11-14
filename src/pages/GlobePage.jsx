// src/pages/GlobePage.jsx
import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import InteractiveGlobe from "../components/InteractiveGlobe";
import CountryInfo from "../components/CountryInfo";
import Button, { IconButton } from "../components/UIButton";

export default function GlobePage() {
  const [countries, setCountries] = useState({ features: [] });
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [loading, setLoading] = useState(true);
  const countryInfoRef = useRef(null);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const geoJsonResponse = await fetch(
          "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"
        );
        const geoJsonData = await geoJsonResponse.json();

        let countriesData = [];
        try {
          const response = await fetch(
            "https://restcountries.com/v3.1/all?fields=name,population,languages,capital,region,currencies,timezones,area,cca2,cca3"
          );
          if (response.ok) {
            countriesData = await response.json();
          }
        } catch (error) {
          countriesData = [];
        }

        const countryMap = new Map();
        countriesData.forEach((country) => {
          if (country.name?.common) {
            const variations = [
              country.name.common.toLowerCase(),
              country.name.official?.toLowerCase(),
              country.name.common.toLowerCase().replace(/\s+/g, " "),
              country.name.official?.toLowerCase().replace(/\s+/g, " "),
            ].filter(Boolean);

            if (country.name.common.toLowerCase().includes("united states")) {
              variations.push("united states of america", "usa", "us", "america");
            }
            if (country.name.common.toLowerCase().includes("eswatini")) variations.push("swaziland");
            if (country.name.common.toLowerCase().includes("timor-leste")) variations.push("east timor", "timor-leste");
            if (country.name.common.toLowerCase().includes("united kingdom"))
              variations.push("england", "great britain", "britain", "uk");
            if (country.name.common.toLowerCase().includes("russian federation")) variations.push("russia");
            if (country.name.common.toLowerCase().includes("people's republic of china")) variations.push("china");
            if (country.name.common.toLowerCase().includes("republic of korea")) variations.push("south korea", "korea");
            if (country.name.common.toLowerCase().includes("democratic people's republic of korea")) variations.push("north korea");

            variations.forEach((variation) => {
              if (variation && !countryMap.has(variation)) countryMap.set(variation, country);
            });
          }
        });

        const features = geoJsonData.features.map((feature) => {
          const countryName =
            feature.properties?.NAME || feature.properties?.name || feature.properties?.ADMIN || "Unknown Country";
          let countryData = null;

          const searchTerm = countryName.toLowerCase().trim();
          if (countryMap.has(searchTerm)) {
            countryData = countryMap.get(searchTerm);
          } else {
            for (const [key, value] of countryMap.entries()) {
              if (key.includes(searchTerm) || searchTerm.includes(key)) {
                countryData = value;
                break;
              }
            }
          }

          if (!countryData) {
            // Special handling for territories
            if (countryName.toLowerCase().includes("west bank")) {
              countryData = {
                name: { common: "Palestine", official: "State of Palestine" },
                capital: ["Ramallah"],
                population: 5000000,
                area: 6220,
                region: "Asia",
                subregion: "Western Asia",
                currencies: { ILS: { name: "Israeli Shekel", symbol: "₪" } },
                languages: { ara: "Arabic", heb: "Hebrew" },
                timezones: ["UTC+02:00"],
                cca2: "PS",
                cca3: "PSE",
              };
            } else if (countryName.toLowerCase().includes("antarctica")) {
              countryData = {
                name: { common: "Antarctica", official: "Antarctica" },
                capital: ["No permanent capital"],
                population: 0,
                area: 14000000,
                region: "Antarctica",
                subregion: "Antarctica",
                currencies: {},
                languages: {},
                timezones: ["UTC+00:00"],
                cca2: "AQ",
                cca3: "ATA",
              };
            } else if (countryName.toLowerCase().includes("united nations") || countryName.toLowerCase().includes("un country")) {
              countryData = {
                name: { common: "United Nations", official: "United Nations" },
                capital: ["New York (Headquarters)"],
                population: 0,
                area: 0,
                region: "International Organization",
                subregion: "Global",
                currencies: {},
                languages: { eng: "English", fra: "French", spa: "Spanish", rus: "Russian", ara: "Arabic", zho: "Chinese" },
                timezones: ["UTC-05:00"],
                cca2: "UN",
                cca3: "UNO",
              };
            } else {
              countryData = {
                name: { common: countryName, official: countryName },
                capital: ["N/A"],
                population: 0,
                area: 0,
                region: "N/A",
                subregion: "N/A",
                currencies: {},
                languages: {},
                timezones: [],
                cca2: "XX",
                cca3: "XXX",
              };
            }
          }

          return {
            ...feature,
            properties: { ...feature.properties, name: countryName, countryData },
          };
        });

        setCountries({ features });
        setLoading(false);
      } catch (error) {
        console.error("Error processing data:", error);
        setLoading(false);
      }
    };

    fetchCountries();
  }, []);

  const handleCountryClick = (countryData) => {
    setSelectedCountry(countryData);
  };

  const handleCloseCountryInfo = () => {
    setSelectedCountry(null);
  };

  const handleGlobeBackgroundClick = () => {
    if (selectedCountry) setSelectedCountry(null);
  };

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === "Escape" && selectedCountry) setSelectedCountry(null);
    };
    if (selectedCountry) {
      document.addEventListener("keydown", handleKeyPress);
      return () => document.removeEventListener("keydown", handleKeyPress);
    }
  }, [selectedCountry]);

  return (
    <div
      className="relative flex h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800"
      onClick={(e) => e.target === e.currentTarget && selectedCountry && setSelectedCountry(null)}
    >
      {/* Updated Back Button */}
      <div className="absolute z-[9999] top-0 left-0 flex items-center">
  <Link
    to="/"
    aria-label="Back to Home"
    className="inline-flex items-center gap-2"
    style={{ marginLeft: "12px", marginTop: "8px" }}
  >
    <IconButton ariaLabel="Back to home" size={40} style={{ backdropFilter: 'blur(6px)' }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M15 18l-6-6 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </IconButton>
  </Link>
</div>
      {/* Globe Container */}
      <div
        className="flex-1 max-w-[calc(100vw-320px)] globe-container relative z-0"
        onDoubleClick={() => selectedCountry && setSelectedCountry(null)}
      >
        <InteractiveGlobe
          countries={countries}
          onCountryClick={handleCountryClick}
          selectedCountry={selectedCountry}
          loading={loading}
          onBackgroundClick={handleGlobeBackgroundClick}
        />
      </div>

      {/* Country Info Panel */}
      <div
        ref={countryInfoRef}
        className="bg-transparent"
        style={{ paddingTop: "40px", width: "300px", minWidth: "300px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <CountryInfo country={selectedCountry} onClose={handleCloseCountryInfo} />
      </div>
    </div>
  );
}
