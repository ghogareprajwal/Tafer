import { Component, OnInit } from '@angular/core';
import * as L from 'leaflet';
import { WeatherService } from '../weather.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
})
export class MapComponent implements OnInit {
 
  private markersSet = new Set<string>();
  private map: any;
  errorMessage: string = '';
  private markersLayer = L.layerGroup(); // Layer group to manage markers
  private markers: L.Marker[] = []; // Array to store all markers
  isMetarDataVisible: boolean = false;
  isTafDataVisible: boolean = false;
  tafTableData: any[] = [];

  constructor(private weatherService: WeatherService) { }

  ngOnInit(): void {
    this.initializeMap();
  }

  private initializeMap(): void {
    this.map = L.map('map').setView([20.5937, 78.9629], 5); // Default coordinates for India
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(this.map);

    // Event listener for map view change (pan or zoom)
    this.map.on('moveend', () => {
      if (this.isMetarDataVisible) {
        this.fetchMetarData();
      }
      else if (this.isTafDataVisible) {
        this.fetchTafData();
      }
    });

  }

  // Toggle for Astronomical Data
  toggleMetarData(): void {
    if (this.isMetarDataVisible) {
      this.clearData();
    } else {
      this.fetchMetarData();
    }
    this.isMetarDataVisible = !this.isMetarDataVisible;
  }

  toggleTafData(): void {
    if (this.isTafDataVisible) {
      this.clearData();
    } else {
      this.fetchTafData();
    }
    this.isTafDataVisible = !this.isTafDataVisible;
  }


  // Clear markers from the map
  clearData(): void {
    this.markers.forEach((marker) => this.map.removeLayer(marker));
    this.markers = [];
  }

  // Fetch METAR data based on current map view and generated dates
  fetchMetarData(): void {
    const currentLat = this.map.getCenter().lat;
    const currentLon = this.map.getCenter().lng;
    const radius = 200; // Adjust radius as needed

    this.weatherService.getMetarData(currentLat, currentLon, radius).subscribe({
      next: (data: any) => {
        if (data && data.data) {
          console.log('Fetched METAR data:', data);
          this.displayMetarDataOnMap(data);
        } else {
          console.error('No METAR data received');
        }
      },
      error: (error) => {
        console.error('Error fetching METAR data:', error);
      },
    });
  }

  // Display METAR data markers on the map
  displayMetarDataOnMap(metarData: any): void {
    if (!metarData || !metarData.data || metarData.data.length === 0) {
      console.log('No data to display');
      return;
    }

    metarData.data.forEach((station: any) => {
      const [longitude, latitude] = station.station.geometry.coordinates;

      // Create a unique ID for each marker based on coordinates
      const markerId = `${latitude},${longitude}`;
      if (this.markersSet.has(markerId)) {
        return;
      }

      // Add the marker ID to the set
      this.markersSet.add(markerId);

      // Create a custom marker icon
      const customIcon = L.icon({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
      });

      // Create a marker and add it to the markers layer
      const marker = L.marker([latitude, longitude], { icon: customIcon });
      const popupContent = `
        <strong>Station Name:</strong> ${station.station.name || 'Unknown'}<br>
        <strong>Location:</strong> ${station.station.location}<br>V
        <strong>Temperature:</strong> ${station.temperature?.celsius || 'N/A'} °C<br>
        <strong>Conditions:</strong> ${station.conditions?.[0]?.text || 'No conditions available'
        }
      `;
      marker.bindPopup(popupContent);
      this.markersLayer.addLayer(marker); // Add to layer group
      this.markersLayer.addTo(this.map);
    });
  }
  
  fetchTafData(): void {
    const currentLat = this.map.getCenter().lat;
    const currentLon = this.map.getCenter().lng;
    const radius = 200; // Adjust radius as needed

    this.weatherService.getTafData(currentLat, currentLon, radius).subscribe({
      next: (data: any) => {
        if (data && data.data) {
          console.log('Fetched TAFOR data:', data);
          this.displayTafDataOnMap(data);
          this.processTafData(data.data);
        } else {
          console.error('No TAFOR data received');
        }
      },
      error: (error) => {
        console.error('Error fetching TAFOR data:', error);
      },
    });
  }

  // Display METAR data markers on the map
  displayTafDataOnMap(data: any): void {
    // Clear existing markers before adding new ones
    this.clearData();

    // Check if data contains stations
    if (data && data.data && Array.isArray(data.data)) {
      data.data.forEach((station: any) => {
        const [lon, lat] = station.station.geometry.coordinates;

        const raw_text = station.raw_text;
        const stationName = station.station.name || 'Unknown Station';

        const markerId = `${lat},${lon}`;
        if (this.markersSet.has(markerId)) {
          // Skip if marker already exists
          return;
        }

        // Add the marker ID to the Set
        this.markersSet.add(markerId);

        const customIcon = L.icon({
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png', // Use a valid URL or local icon
          iconSize: [25, 41],  // Marker size
          iconAnchor: [12, 41],  // Anchor point for the icon
          popupAnchor: [1, -34],  // Anchor point for popup
        });

        // Create a new marker and add it to the map
        const marker = L.marker([lat, lon], { icon: customIcon });


        // Create a popup content with METAR details
        const popupContent = `
          <b>Station Name:</b> ${stationName}<br>
          <b>Raw text:</b> ${raw_text} °C<br>
         
        `;

        marker.bindPopup(popupContent).openPopup();
        this.markersLayer.addLayer(marker); // Add to layer group
        this.markersLayer.addTo(this.map);
      });
    } else {
      console.error('No valid data found');
    }
  }

 

  processTafData(rawData: any[]): void {
    this.tafTableData = []; // Clear previous data
    rawData.forEach((station) => {
      const rawText = station.raw_text; // Extract raw_text
      const icaoCode = station.icao; // Extract ICAO code
      const parsedData = this.parseTafData(rawText, icaoCode); // Parse the data
      this.tafTableData.push(...parsedData); // Append parsed data to table
    });
  }
  
  // parseTafData(rawText: string, icao: string): any[] {
  //   const rows: any[] = [];
  //   let serialNo = 1;
  
  //   // Split the raw text based on trend indicators
  //   const lines = rawText.split(/BECMG|TEMPO/);
  //   const generalInfo = lines.shift()?.trim() || ""; // General TAF info
  //   const trendTypes = rawText.match(/BECMG|TEMPO/g) || [];
  
  //   // Match general TAF data
  //   const genMatch = generalInfo.match(
  //     /TAF (\w{4}) (\d{6}Z) (\d{4})\/(\d{4}) ([\w\d]+) (\d{4}) ([\w ]+)?/
  //   );
  //   if (genMatch) {
  //     rows.push({
  //       "Sl no": serialNo++,
  //       Type: "GEN",
  //       "ICAO code": genMatch[1],
  //       "Issue Time": genMatch[2],
  //       "Valid From [TAF]": genMatch[3],
  //       "Valid Until [TAF]": genMatch[4],
  //       "Valid From [Type Specific]": "",
  //       "Valid Until [Type Specific]": "",
  //       "Wind Direction": genMatch[5],
  //       "Wind Speed": genMatch[6],
  //       Visibility: "",
  //       "Weather Information": genMatch[7] || "",
  //       "Cloud Information": "",
  //       Trend: "",
  //     });
  //   }
  
  //   // Process trend data
  //   lines.forEach((line, index) => {
  //     const trendType = trendTypes[index] || "";
  //     const trendMatch = line
  //       .trim()
  //       .match(/(\d{4})\/(\d{4}) ([\w\d]+) (\d{4}) ([\w ]+)?/);
  
  //     if (trendMatch) {
  //       rows.push({
  //         "Sl no": serialNo++,
  //         Type: trendType,
  //         "ICAO code": icao,
  //         "Issue Time": "",
  //         "Valid From [TAF]": "",
  //         "Valid Until [TAF]": "",
  //         "Valid From [Type Specific]": trendMatch[1],
  //         "Valid Until [Type Specific]": trendMatch[2],
  //         "Wind Direction": trendMatch[3],
  //         "Wind Speed": trendMatch[4],
  //         Visibility: trendMatch[5] || "",
  //         "Weather Information": "",
  //         "Cloud Information": "",
  //         Trend: trendType,
  //       });
  //     }
  //   });
  
  //   return rows;
  // }

  parseTafData(rawText: string, icao: string): any[] {
    const rows: any[] = [];
    let serialNo = 1;
  
    // Split the raw text based on trend indicators like BECMG or TEMPO
    const trendTypes = rawText.match(/BECMG|TEMPO/g) || [];
    const lines = rawText.split(/BECMG|TEMPO/);
  
    // Get the general information (first part before any trends)
    const generalInfo = lines.shift()?.trim() || "";
  
    // Match general TAF data
    const genMatch = generalInfo.match(
      /TAF (\w{4}) (\d{6}Z) (\d{4})\/(\d{4}) ([\w\d]+) (\d{4}) ([\w ]+)?/
    );
  
    // Add the general TAF information to rows
    if (genMatch) {
      const wind = genMatch[5]; // Wind data (e.g., "36005KT")
      const windDirection = wind.slice(0, 3);  // Wind direction (e.g., "360")
      const windSpeed = wind.slice(3);  // Wind speed (e.g., "05KT")
  
      // If visibility (like "3000") is found, handle it separately
      let visibility = "";
      let weatherInfo = genMatch[7] || "";
  
      if (genMatch[7] && /^\d{4}$/.test(genMatch[7])) {
        visibility = genMatch[7];  // If it's a numeric value, treat it as visibility
        weatherInfo = "HZ";  // Set weather info to HZ (haze)
      }
  
      rows.push({
        "Sl no": serialNo++,
        Type: "GEN",
        "ICAO code": genMatch[1],
        "Issue Time": genMatch[2],
        "Valid From [TAF]": genMatch[3],
        "Valid Until [TAF]": genMatch[4],
        "Valid From [Type Specific]": "",
        "Valid Until [Type Specific]": "",
        "Wind Direction": windDirection,
        "Wind Speed": windSpeed,
        Visibility: visibility,
        "Weather Information": weatherInfo,
        "Cloud Information": "",
        Trend: "",
      });
    }
  
    // Process trend data like BECMG, TEMPO
    lines.forEach((line, index) => {
      const trendType = trendTypes[index] || "";
      const trendMatch = line.trim().match(/(\d{4})\/(\d{4}) ([\w\d]+) (\d{4}) ([\w ]+)?/);
  
      if (trendMatch) {
        // Parse the wind data (like "36005KT")
        const wind = trendMatch[3];
        const windDirection = wind.slice(0, 3);  // Wind direction (e.g., "360")
        const windSpeed = wind.slice(3);  // Wind speed (e.g., "05KT")
  
        // If visibility (like "3000") is found, handle it
        let visibility = "";
        let weatherInfo = trendMatch[5] || "";
  
        if (trendMatch[5] && /^\d{4}$/.test(trendMatch[5])) {
          visibility = trendMatch[5];  // If it's a numeric value, treat it as visibility
          weatherInfo = "HZ";  // Set weather info to HZ (haze)
        }
  
        rows.push({
          "Sl no": serialNo++,
          Type: trendType,
          "ICAO code": icao,
          "Issue Time": "",
          "Valid From [TAF]": "",
          "Valid Until [TAF]": "",
          "Valid From [Type Specific]": trendMatch[1],
          "Valid Until [Type Specific]": trendMatch[2],
          "Wind Direction": windDirection,
          "Wind Speed": windSpeed,
          Visibility: visibility,
          "Weather Information": weatherInfo,
          "Cloud Information": "",
          Trend: trendType,
        });
      }
    });
  
    return rows;
  }
}