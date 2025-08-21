import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Alert } from 'react-native';
import WebView from 'react-native-webview';
import * as Location from 'expo-location';
import { OSM_PROVIDERS, OSMProviderType } from './MapProviderSelector';

// Types for GPX data
export interface LeafletGPXTrack {
    name: string;
    coordinates: Array<{ latitude: number; longitude: number; elevation?: number }>;
    color?: string;
}

export interface LeafletGPXWaypoint {
    latitude: number;
    longitude: number;
    name: string;
    description?: string;
    symbol?: string;
    type?: string;
}

interface GPXMapLeafletProps {
    style?: any;
    initialRegion?: {
        latitude: number;
        longitude: number;
        latitudeDelta: number;
        longitudeDelta: number;
    };
    tracks?: LeafletGPXTrack[];
    waypoints?: LeafletGPXWaypoint[];
    onMapPress?: (coordinate: { latitude: number; longitude: number }) => void;
    osmProvider?: OSMProviderType;
}

export interface GPXMapLeafletRef {
    requestUserLocation: () => void;
    centerOnLastKnownLocation: () => void;
    centerOnCoordinate: (latitude: number, longitude: number) => void;
    showUserLocationMarker: (latitude: number, longitude: number) => void;
    showElevationMarker: (
        latitude: number,
        longitude: number,
        elevation: number,
        distance: number
    ) => void;
    hideElevationMarker: () => void;
}

const GPXMapLeaflet = forwardRef<GPXMapLeafletRef, GPXMapLeafletProps>(
    (
        { style, initialRegion, tracks = [], waypoints = [], onMapPress, osmProvider = 'standard' },
        ref
    ) => {
        const webViewRef = useRef<WebView>(null);
        const [currentUserLocation, setCurrentUserLocation] = useState<{
            latitude: number;
            longitude: number;
        } | null>(null);

        // Esponi la funzione per richiedere la posizione
        useImperativeHandle(ref, () => ({
            requestUserLocation: async () => {
                console.log('requestUserLocation chiamata da React Native');

                try {
                    // Richiedi i permessi di localizzazione
                    console.log('Richiedendo permessi di localizzazione...');
                    const { status } = await Location.requestForegroundPermissionsAsync();

                    if (status !== 'granted') {
                        console.log('Permessi di localizzazione negati');
                        Alert.alert(
                            'Permessi Richiesti',
                            'Per visualizzare la tua posizione sulla mappa, è necessario concedere i permessi di localizzazione.',
                            [
                                { text: 'Annulla', style: 'cancel' },
                                {
                                    text: 'Impostazioni',
                                    onPress: () => {
                                        // In futuro potremmo aprire le impostazioni
                                        console.log('Aprire le impostazioni...');
                                    },
                                },
                            ]
                        );
                        return;
                    }

                    console.log('Permessi di localizzazione concessi, ottenendo posizione...');

                    // Ottieni la posizione usando expo-location
                    const location = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.High,
                        timeInterval: 5000,
                        distanceInterval: 1,
                    });

                    const { latitude, longitude } = location.coords;
                    const accuracy = location.coords.accuracy || 0;

                    console.log(
                        'Posizione ottenuta tramite expo-location:',
                        latitude,
                        longitude,
                        'Accuratezza:',
                        accuracy + 'm'
                    );

                    // Salva la posizione corrente nello stato
                    setCurrentUserLocation({ latitude, longitude });

                    // Invia la posizione direttamente alla WebView
                    if (webViewRef.current) {
                        console.log('Inviando posizione a WebView (sempre senza auto-centrare)...');
                        webViewRef.current.postMessage(
                            JSON.stringify({
                                type: 'updateLocation',
                                coordinate: { latitude, longitude, accuracy },
                                autoCenter: false, // Non centrare mai automaticamente
                            })
                        );
                    }
                } catch (error) {
                    console.log("Errore nell'ottenere la posizione:", error);
                    Alert.alert(
                        'Errore Localizzazione',
                        "Impossibile ottenere la posizione corrente. Assicurati che il GPS sia attivo e che l'app abbia i permessi necessari.",
                        [{ text: 'OK' }]
                    );
                }
            },
            centerOnLastKnownLocation: () => {
                console.log('centerOnLastKnownLocation chiamato');
                if (currentUserLocation && webViewRef.current) {
                    console.log('Centrando sulla posizione:', currentUserLocation);
                    webViewRef.current.postMessage(
                        JSON.stringify({
                            type: 'centerOnLocation',
                            latitude: currentUserLocation.latitude,
                            longitude: currentUserLocation.longitude,
                        })
                    );
                } else {
                    console.log('Nessuna posizione salvata per il centro');
                    // Se non abbiamo una posizione salvata, prova a richiederne una nuova
                    if (webViewRef.current) {
                        webViewRef.current.postMessage(
                            JSON.stringify({
                                type: 'requestLocation',
                            })
                        );
                    }
                }
            },
            centerOnCoordinate: (latitude: number, longitude: number) => {
                console.log('centerOnCoordinate chiamato per:', latitude, longitude);
                if (webViewRef.current) {
                    webViewRef.current.postMessage(
                        JSON.stringify({
                            type: 'centerOnLocation',
                            latitude,
                            longitude,
                        })
                    );
                }
            },
            showUserLocationMarker: (latitude: number, longitude: number) => {
                console.log('showUserLocationMarker chiamato per:', latitude, longitude);
                // Salva la posizione corrente nello stato
                setCurrentUserLocation({ latitude, longitude });

                if (webViewRef.current) {
                    webViewRef.current.postMessage(
                        JSON.stringify({
                            type: 'updateUserMarkerOnly',
                            latitude,
                            longitude,
                        })
                    );
                }
            },
            showElevationMarker: (
                latitude: number,
                longitude: number,
                elevation: number,
                distance: number
            ) => {
                if (webViewRef.current) {
                    webViewRef.current.postMessage(
                        JSON.stringify({
                            type: 'showElevationMarker',
                            latitude,
                            longitude,
                            elevation,
                            distance,
                        })
                    );
                }
            },
            hideElevationMarker: () => {
                if (webViewRef.current) {
                    webViewRef.current.postMessage(
                        JSON.stringify({
                            type: 'hideElevationMarker',
                        })
                    );
                }
            },
        }));

        // Default region: Rome, Italy
        const defaultRegion = {
            latitude: 41.9028,
            longitude: 12.4964,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
        };

        const region = initialRegion || defaultRegion;

        // Verifica che il provider esista, altrimenti usa standard
        const validProvider = OSM_PROVIDERS[osmProvider] ? osmProvider : 'standard';
        const tileLayer = OSM_PROVIDERS[validProvider];

        // Calcola il zoom iniziale basato sulla delta
        const initialZoom = Math.round(Math.log(360 / region.latitudeDelta) / Math.log(2));

        // Funzione per ottenere lo stile del marker basato sul tipo/simbolo
        const getMarkerStyle = (waypoint: LeafletGPXWaypoint) => {
            const symbol = waypoint.symbol?.toLowerCase();
            const type = waypoint.type?.toLowerCase();
            const name = waypoint.name?.toLowerCase();

            // Determina il tipo di waypoint basato su symbol, type o name
            if (symbol?.includes('flag') || name?.includes('start') || name?.includes('partenza')) {
                return {
                    icon: '🏁',
                    color: '#00FF00',
                    size: 'large',
                };
            }

            if (
                symbol?.includes('finish') ||
                name?.includes('end') ||
                name?.includes('arrivo') ||
                name?.includes('finish')
            ) {
                return {
                    icon: '🏆',
                    color: '#FF0000',
                    size: 'large',
                };
            }

            if (
                symbol?.includes('summit') ||
                symbol?.includes('peak') ||
                name?.includes('summit') ||
                name?.includes('peak') ||
                name?.includes('vetta') ||
                name?.includes('cima')
            ) {
                return {
                    icon: '⛰️',
                    color: '#8B4513',
                    size: 'medium',
                };
            }

            if (
                symbol?.includes('water') ||
                symbol?.includes('spring') ||
                name?.includes('water') ||
                name?.includes('spring') ||
                name?.includes('fonte') ||
                name?.includes('acqua')
            ) {
                return {
                    icon: '💧',
                    color: '#0066FF',
                    size: 'medium',
                };
            }

            if (
                symbol?.includes('camp') ||
                symbol?.includes('shelter') ||
                name?.includes('camp') ||
                name?.includes('shelter') ||
                name?.includes('rifugio') ||
                name?.includes('camping')
            ) {
                return {
                    icon: '🏕️',
                    color: '#8B4513',
                    size: 'medium',
                };
            }

            if (
                symbol?.includes('restaurant') ||
                symbol?.includes('food') ||
                name?.includes('restaurant') ||
                name?.includes('food') ||
                name?.includes('bar') ||
                name?.includes('ristorante')
            ) {
                return {
                    icon: '🍽️',
                    color: '#FF6600',
                    size: 'medium',
                };
            }

            if (
                symbol?.includes('danger') ||
                symbol?.includes('warning') ||
                name?.includes('danger') ||
                name?.includes('warning') ||
                name?.includes('pericolo')
            ) {
                return {
                    icon: '⚠️',
                    color: '#FF0000',
                    size: 'large',
                };
            }

            if (
                symbol?.includes('viewpoint') ||
                symbol?.includes('scenic') ||
                name?.includes('viewpoint') ||
                name?.includes('scenic') ||
                name?.includes('panorama') ||
                name?.includes('vista')
            ) {
                return {
                    icon: '📸',
                    color: '#9900FF',
                    size: 'medium',
                };
            }

            if (symbol?.includes('bridge') || name?.includes('bridge') || name?.includes('ponte')) {
                return {
                    icon: '🌉',
                    color: '#666666',
                    size: 'medium',
                };
            }

            if (
                symbol?.includes('cross') ||
                symbol?.includes('church') ||
                name?.includes('church') ||
                name?.includes('chiesa') ||
                name?.includes('croce')
            ) {
                return {
                    icon: '⛪',
                    color: '#8B4513',
                    size: 'medium',
                };
            }

            // Default waypoint style
            return {
                icon: '📍',
                color: '#007AFF',
                size: 'medium',
            };
        };

        // HTML per la mappa Leaflet
        const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
            body { 
                margin: 0; 
                padding: 0; 
                background: #f0f0f0;
            }
            #map { 
                height: 100vh; 
                width: 100vw; 
            }
            
            .custom-marker {
                background-color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                border: 2px solid;
                cursor: pointer;
                transition: transform 0.2s ease;
            }
            
            .custom-marker:hover {
                transform: scale(1.1);
            }
            
            .marker-small {
                width: 24px;
                height: 24px;
                font-size: 12px;
            }
            
            .marker-medium {
                width: 32px;
                height: 32px;
                font-size: 16px;
            }
            
            .marker-large {
                width: 40px;
                height: 40px;
                font-size: 20px;
            }
            
            /* Stili per la posizione utente */
            .user-location-wrapper {
                background: none !important;
                border: none !important;
            }
            
            .user-location-marker {
                width: 26px;
                height: 26px;
                background: #007AFF;
                border: 4px solid white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                box-shadow: 0 0 0 4px rgba(0,122,255,0.3);
                animation: pulse 2s infinite;
                position: relative;
            }
            
            .user-location-marker::before {
                content: '📍';
                position: absolute;
                font-size: 14px;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
            }
            
            @keyframes pulse {
                0% {
                    box-shadow: 0 0 0 0 rgba(0,122,255,0.7);
                }
                70% {
                    box-shadow: 0 0 0 15px rgba(0,122,255,0);
                }
                100% {
                    box-shadow: 0 0 0 0 rgba(0,122,255,0);
                }
            }
            
            .elevation-marker {
                background-color: rgba(34, 197, 94, 0.95);
                border: 2px solid white;
                border-radius: 50%;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                animation: elevationPulse 1.5s ease-in-out infinite;
            }
            
            .elevation-marker-wrapper {
                position: relative;
            }
            
            @keyframes elevationPulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            console.log('Inizializzando mappa Leaflet...');
            
            // Inizializza la mappa
            var map = L.map('map', {
                center: [${region.latitude}, ${region.longitude}],
                zoom: ${Math.max(10, Math.min(initialZoom, 15))},
                zoomControl: true,
                attributionControl: true
            });
            
            console.log('Mappa creata, aggiungendo tiles...');
            
            // Aggiungi il tile layer
            var tileLayer = L.tileLayer('${tileLayer.urlTemplate}', {
                attribution: '${tileLayer.attribution}',
                maxZoom: 20,
                minZoom: 1
            });
            
            tileLayer.addTo(map);
            
            // Array per tenere traccia di tutti i layer
            var mapLayers = [];
            var trackLayers = []; // Separati per dare precedenza ai tracciati
            
            console.log('Tiles aggiunti, provider: ${osmProvider}');
            
            // Aggiungi i waypoints
            ${waypoints
                .map((waypoint, index) => {
                    const style = getMarkerStyle(waypoint);
                    return `
                console.log('Aggiungendo waypoint: ${waypoint.name}');
                var customIcon_${index} = L.divIcon({
                    html: '<div class="custom-marker marker-${
                        style.size
                    }" style="background-color: white; border-color: ${style.color}; color: ${
                        style.color
                    };">${style.icon}</div>',
                    className: 'custom-marker-wrapper',
                    iconSize: [${style.size === 'small' ? 24 : style.size === 'large' ? 40 : 32}, ${
                        style.size === 'small' ? 24 : style.size === 'large' ? 40 : 32
                    }],
                    iconAnchor: [${
                        style.size === 'small' ? 12 : style.size === 'large' ? 20 : 16
                    }, ${style.size === 'small' ? 12 : style.size === 'large' ? 20 : 16}]
                });
                var marker_${index} = L.marker([${waypoint.latitude}, ${waypoint.longitude}], { 
                    icon: customIcon_${index} 
                }).addTo(map);
                marker_${index}.bindPopup('<b>${waypoint.name}</b><br/>${
                        waypoint.description || 'Nessuna descrizione'
                    }');
                mapLayers.push(marker_${index});
            `;
                })
                .join('')}
            
            // Aggiungi le polyline per i tracks
            ${tracks
                .map(
                    (track, index) => `
                console.log('Aggiungendo track: ${track.name}');
                var trackCoords_${index} = [
                    ${track.coordinates
                        .map((coord) => `[${coord.latitude}, ${coord.longitude}]`)
                        .join(',')}
                ];
                var polyline_${index} = L.polyline(trackCoords_${index}, {
                    color: '${track.color || '#007AFF'}',
                    weight: 3,
                    opacity: 0.8
                }).addTo(map);
                polyline_${index}.bindPopup('<b>${track.name}</b>');
                mapLayers.push(polyline_${index});
                trackLayers.push(polyline_${index}); // Aggiungi anche ai tracciati per precedenza
            `
                )
                .join('')}
            
            // Auto-fit con precedenza ai tracciati GPX
            if (trackLayers.length > 0) {
                // Se ci sono tracciati, usa solo quelli per l'auto-fit
                console.log('Auto-fitting mappa sui tracciati GPX (', trackLayers.length, ' tracciati)...');
                var trackGroup = new L.featureGroup(trackLayers);
                map.fitBounds(trackGroup.getBounds().pad(0.1));
            } else if (mapLayers.length > 0) {
                // Se ci sono solo waypoints, usa tutti gli elementi
                console.log('Auto-fitting mappa sui waypoints (', mapLayers.length, ' elementi)...');
                var group = new L.featureGroup(mapLayers);
                map.fitBounds(group.getBounds().pad(0.1));
            }
            
            // Gestisci i click sulla mappa
            map.on('click', function(e) {
                console.log('Click sulla mappa:', e.latlng);
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'mapPress',
                        coordinate: { 
                            latitude: e.latlng.lat, 
                            longitude: e.latlng.lng 
                        }
                    }));
                }
            });
            
            // Variabile per il marker della posizione utente
            var userLocationMarker = null;
            
            // Variabile per il marker temporaneo del profilo altimetrico
            var elevationProfileMarker = null;
            
            // Funzione per aggiornare la posizione utente
            window.updateUserLocation = function(latitude, longitude) {
                console.log('Aggiornando posizione utente:', latitude, longitude);
                
                // Rimuovi il marker precedente se esiste
                if (userLocationMarker) {
                    map.removeLayer(userLocationMarker);
                }
                
                // Crea un nuovo marker per la posizione utente
                var userIcon = L.divIcon({
                    html: '<div class="user-location-marker">📍</div>',
                    className: 'user-location-wrapper',
                    iconSize: [26, 26],
                    iconAnchor: [13, 13]
                });
                
                userLocationMarker = L.marker([latitude, longitude], { 
                    icon: userIcon,
                    zIndexOffset: 1000 // Metti sopra tutti gli altri marker
                }).addTo(map);
                
                userLocationMarker.bindPopup('<b>🧭 La tua posizione</b><br/>Latitudine: ' + latitude.toFixed(6) + '<br/>Longitudine: ' + longitude.toFixed(6));
                
                // Mostra popup automaticamente SOLO se non ci sono tracciati GPX
                var hasGPXTracks = trackLayers.length > 0;
                if (!hasGPXTracks) {
                    userLocationMarker.openPopup();
                    setTimeout(function() {
                        if (userLocationMarker) {
                            userLocationMarker.closePopup();
                        }
                    }, 3000);
                }
            };
            
            // Funzione per centrare la mappa su una posizione specifica
            window.centerMapOnLocation = function(latitude, longitude) {
                console.log('Centrando mappa su posizione:', latitude, longitude);
                
                // Centra la mappa sulla posizione specificata
                map.setView([latitude, longitude], 16, {
                    animate: true,
                    pan: {
                        duration: 0.8
                    }
                });
                
                // Se esiste già un marker utente, assicurati che sia visibile
                if (userLocationMarker) {
                    // Mostra il popup temporaneamente
                    userLocationMarker.openPopup();
                    setTimeout(function() {
                        if (userLocationMarker) {
                            userLocationMarker.closePopup();
                        }
                    }, 2000);
                }
            };
            
            // Funzione per mostrare marker temporaneo dal profilo altimetrico
            window.showElevationMarker = function(latitude, longitude, elevation, distance) {
                console.log('Mostrando marker elevazione:', latitude, longitude, elevation + 'm');
                
                // Rimuovi il marker precedente se esiste
                if (elevationProfileMarker) {
                    map.removeLayer(elevationProfileMarker);
                }
                
                // Crea un nuovo marker temporaneo
                var elevationIcon = L.divIcon({
                    html: '<div class="elevation-marker">📊</div>',
                    className: 'elevation-marker-wrapper',
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                });
                
                elevationProfileMarker = L.marker([latitude, longitude], { 
                    icon: elevationIcon,
                    zIndexOffset: 2000 // Sopra tutti gli altri marker
                }).addTo(map);
                
                elevationProfileMarker.bindPopup(
                    '<b>📊 Punto Profilo Altimetrico</b><br/>' +
                    'Elevazione: ' + Math.round(elevation) + 'm<br/>' +
                    'Distanza: ' + (distance >= 1000 ? (distance/1000).toFixed(1) + ' km' : Math.round(distance) + ' m') + '<br/>' +
                    'Lat: ' + latitude.toFixed(6) + '<br/>' +
                    'Lon: ' + longitude.toFixed(6)
                ).openPopup();
                
                // Nascondi automaticamente dopo 5 secondi
                setTimeout(function() {
                    if (elevationProfileMarker) {
                        elevationProfileMarker.closePopup();
                    }
                }, 5000);
            };
            
            // Funzione per nascondere il marker del profilo altimetrico
            window.hideElevationMarker = function() {
                if (elevationProfileMarker) {
                    map.removeLayer(elevationProfileMarker);
                    elevationProfileMarker = null;
                }
            };
            
            // Notifica quando la mappa è pronta
            map.whenReady(function() {
                console.log('Mappa Leaflet pronta!');
                
                // Funzione per ottenere la posizione utente
                function getUserLocation() {
                    console.log('getUserLocation chiamata...');
                    
                    if (!navigator.geolocation) {
                        console.log('Geolocalizzazione non supportata');
                        return;
                    }
                    
                    console.log('Richiedendo posizione...');
                    
                    navigator.geolocation.getCurrentPosition(
                        function(position) {
                            var lat = position.coords.latitude;
                            var lng = position.coords.longitude;
                            var accuracy = position.coords.accuracy;
                            console.log('Posizione ottenuta:', lat, lng, 'Accuratezza:', accuracy + 'm');
                            
                            // Aggiorna SOLO il marker della posizione sulla mappa, mai centrare automaticamente
                            updateUserLocation(lat, lng);
                            
                            // Notifica React Native
                            if (window.ReactNativeWebView) {
                                window.ReactNativeWebView.postMessage(JSON.stringify({
                                    type: 'locationFound',
                                    coordinate: { latitude: lat, longitude: lng, accuracy: accuracy }
                                }));
                            }
                        }, 
                        function(error) {
                            console.log('Errore geolocalizzazione:', error.code, error.message);
                            
                            var errorMsg = '';
                            switch(error.code) {
                                case error.PERMISSION_DENIED:
                                    errorMsg = "Permesso negato dall'utente";
                                    break;
                                case error.POSITION_UNAVAILABLE:
                                    errorMsg = "Posizione non disponibile";
                                    break;
                                case error.TIMEOUT:
                                    errorMsg = "Timeout nella richiesta";
                                    break;
                                default:
                                    errorMsg = "Errore sconosciuto: " + error.message;
                                    break;
                            }
                            
                            // Notifica React Native dell'errore
                            if (window.ReactNativeWebView) {
                                window.ReactNativeWebView.postMessage(JSON.stringify({
                                    type: 'locationError',
                                    message: errorMsg
                                }));
                            }
                        }, 
                        {
                            enableHighAccuracy: true,
                            timeout: 15000,
                            maximumAge: 300000 // 5 minuti
                        }
                    );
                }
                
                // Esponi la funzione globalmente
                window.getUserLocation = getUserLocation;
                window.requestUserLocation = getUserLocation;
                
                // Listener per i messaggi da React Native
                window.addEventListener('message', function(event) {
                    console.log('Messaggio ricevuto da React Native:', event.data);
                    try {
                        var data = JSON.parse(event.data);
                        if (data.type === 'requestLocation') {
                            console.log('Richiesta di geolocalizzazione ricevuta via messaggio');
                            getUserLocation();
                        } else if (data.type === 'updateLocation') {
                            console.log('Aggiornamento posizione ricevuto da React Native:', data.coordinate);
                            // Aggiorna SEMPRE solo il marker della posizione utente, mai centrare automaticamente
                            updateUserLocation(data.coordinate.latitude, data.coordinate.longitude);
                            
                            // Notifica che la posizione è stata aggiornata
                            if (window.ReactNativeWebView) {
                                window.ReactNativeWebView.postMessage(JSON.stringify({
                                    type: 'locationUpdated',
                                    coordinate: data.coordinate
                                }));
                            }
                        } else if (data.type === 'changeProvider') {
                            console.log('Cambio provider ricevuto:', data.provider);
                            if (typeof changeProvider !== 'undefined') {
                                changeProvider(data.provider, data.urlTemplate, data.attribution);
                                
                                // Notifica React Native che il provider è stato cambiato
                                if (window.ReactNativeWebView) {
                                    window.ReactNativeWebView.postMessage(JSON.stringify({
                                        type: 'providerChanged',
                                        provider: data.provider
                                    }));
                                }
                            }
                        } else if (data.type === 'centerOnLocation') {
                            console.log('Centro mappa su posizione ricevuto:', data.latitude, data.longitude);
                            if (typeof centerMapOnLocation !== 'undefined') {
                                centerMapOnLocation(data.latitude, data.longitude);
                            }
                        } else if (data.type === 'updateUserMarkerOnly') {
                            console.log('Aggiornamento solo marker utente ricevuto:', data.latitude, data.longitude);
                            if (typeof updateUserLocation !== 'undefined') {
                                // Aggiorna solo il marker, senza centrare la mappa
                                updateUserLocation(data.latitude, data.longitude);
                            }
                        } else if (data.type === 'showElevationMarker') {
                            console.log('Mostra marker elevazione ricevuto:', data);
                            if (typeof showElevationMarker !== 'undefined') {
                                showElevationMarker(data.latitude, data.longitude, data.elevation, data.distance);
                            }
                        } else if (data.type === 'hideElevationMarker') {
                            console.log('Nascondi marker elevazione ricevuto');
                            if (typeof hideElevationMarker !== 'undefined') {
                                hideElevationMarker();
                            }
                        }
                    } catch (e) {
                        console.log('Errore parsing messaggio:', e.message);
                        // Se non è JSON, potrebbe essere codice JavaScript legacy
                        if (typeof event.data === 'string' && event.data.includes('requestUserLocation')) {
                            console.log('Messaggio legacy ricevuto, eseguendo getUserLocation');
                            getUserLocation();
                        }
                    }
                });
                
                // Richiedi automaticamente la posizione utente SOLO se non ci sono tracciati GPX
                var hasGPXTracks = trackLayers.length > 0;
                if (!hasGPXTracks) {
                    console.log('Nessun tracciato GPX caricato, richiedendo posizione automaticamente...');
                    setTimeout(getUserLocation, 1000);
                } else {
                    console.log('Tracciati GPX presenti (', trackLayers.length, '), non richiedendo posizione automaticamente');
                }
                
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'mapReady'
                    }));
                }
            });
            
            // Funzione per cambiare provider
            window.changeProvider = function(newProvider, urlTemplate, attribution) {
                console.log('Cambiando provider a:', newProvider);
                map.removeLayer(tileLayer);
                tileLayer = L.tileLayer(urlTemplate, {
                    attribution: attribution,
                    maxZoom: 20,
                    minZoom: 1
                });
                tileLayer.addTo(map);
            };
            
        </script>
    </body>
    </html>
    `;

        // Gestisce i messaggi dalla WebView
        const handleWebViewMessage = (event: any) => {
            try {
                const data = JSON.parse(event.nativeEvent.data);
                console.log('Messaggio da WebView:', data);

                if (data.type === 'mapPress' && onMapPress) {
                    onMapPress(data.coordinate);
                } else if (data.type === 'locationFound') {
                    console.log('Posizione trovata:', data.coordinate);
                    // Salva anche questa posizione nello stato
                    setCurrentUserLocation({
                        latitude: data.coordinate.latitude,
                        longitude: data.coordinate.longitude,
                    });
                } else if (data.type === 'locationError') {
                    console.log('Errore posizione:', data.message);
                } else if (data.type === 'locationUpdated') {
                    console.log('Posizione aggiornata sulla mappa:', data.coordinate);
                    // Salva la posizione aggiornata
                    setCurrentUserLocation({
                        latitude: data.coordinate.latitude,
                        longitude: data.coordinate.longitude,
                    });
                } else if (data.type === 'userLocationRestored') {
                    console.log('Posizione utente ripristinata dopo cambio provider');
                } else if (data.type === 'providerChanged') {
                    console.log('Provider cambiato con successo:', data.provider);
                    // Dopo il cambio provider, aggiorna solo il marker utente se presente
                    if (currentUserLocation && webViewRef.current) {
                        setTimeout(() => {
                            if (webViewRef.current) {
                                webViewRef.current.postMessage(
                                    JSON.stringify({
                                        type: 'updateUserMarkerOnly',
                                        latitude: currentUserLocation.latitude,
                                        longitude: currentUserLocation.longitude,
                                    })
                                );
                            }
                        }, 1000);
                    }
                }
            } catch (error) {
                console.log('Errore nel parsing del messaggio WebView:', error);
            }
        };

        // Gestisce i messaggi inviati ALLA WebView (per debug)
        const handleWebViewLoad = () => {
            console.log('WebView caricata e pronta');
        };

        // Aggiorna il provider quando cambia
        useEffect(() => {
            if (webViewRef.current) {
                // Verifica che il provider esista, altrimenti usa standard
                const validProvider = OSM_PROVIDERS[osmProvider] ? osmProvider : 'standard';
                const newTileLayer = OSM_PROVIDERS[validProvider];

                // Invia messaggio JSON per cambiare provider
                webViewRef.current.postMessage(
                    JSON.stringify({
                        type: 'changeProvider',
                        provider: validProvider,
                        urlTemplate: newTileLayer.urlTemplate,
                        attribution: newTileLayer.attribution,
                    })
                );

                // Aggiorna solo il marker utente se presente (senza centrare)
                if (currentUserLocation) {
                    setTimeout(() => {
                        if (webViewRef.current) {
                            webViewRef.current.postMessage(
                                JSON.stringify({
                                    type: 'updateUserMarkerOnly',
                                    latitude: currentUserLocation.latitude,
                                    longitude: currentUserLocation.longitude,
                                })
                            );
                        }
                    }, 800);
                }
            }
        }, [osmProvider, currentUserLocation]); // Rimosso tracks.length dalle dipendenze

        return (
            <View style={[styles.container, style]}>
                <WebView
                    ref={webViewRef}
                    source={{ html: mapHtml }}
                    style={styles.webView}
                    onMessage={handleWebViewMessage}
                    onLoad={handleWebViewLoad}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    startInLoadingState={true}
                    mixedContentMode="compatibility"
                    allowsInlineMediaPlayback={true}
                    renderLoading={() => (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#007AFF" />
                            <Text style={styles.loadingText}>Caricamento mappa Leaflet...</Text>
                        </View>
                    )}
                    onError={(error) => {
                        console.log('Errore WebView:', error.nativeEvent);
                    }}
                />
            </View>
        );
    }
);

GPXMapLeaflet.displayName = 'GPXMapLeaflet';

export default GPXMapLeaflet;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    webView: {
        flex: 1,
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
    },
});
