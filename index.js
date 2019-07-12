import 'ol/ol.css';
import {Map, View} from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import Overlay from 'ol/Overlay';
import MousePosition from 'ol/control/MousePosition';
import {createStringXY} from 'ol/coordinate';
import XYZ from 'ol/source/XYZ';
import * as proj from 'ol/proj';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import Text from 'ol/style/Text';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import * as loadingstrategy from 'ol/loadingstrategy.js';
import {toStringHDMS} from 'ol/coordinate';

/************************************************************************************************************ */

var historyMarkerFeatures = [];

var vectorHistoryRotation;

var historyMap;

function initHistory(map) {
    historyMap = map;
}

function reloadHistory() {
    var vectorSource = new VectorSource({
        features: historyMarkerFeatures,
        strategy: loadingstrategy.bbox
    })

    var markerVectorLayer = new VectorLayer({
        source: vectorSource,

    });

    historyMap.addLayer(markerVectorLayer);

    vectorSource.once('change', function () {
        console.log('refresh history layer')
        if (vectorHistoryRotation) {
            historyMap.removeLayer(vectorHistoryRotation);
            delete vectorHistoryRotation.source;
        }
        vectorHistoryRotation = markerVectorLayer;
    });
}

function addMarkerHistory(recordCount, MMSI, longitude, latitude) {
    if (parseFloat(longitude) >= -180.0 && parseFloat(longitude) <= 180.0
        && parseFloat(latitude) >= -90.0 && parseFloat(latitude) <= 90.0) {

        var markerX = new Feature({
            geometry: new Point(proj.fromLonLat([parseFloat(longitude), parseFloat(latitude)]))
        });
        markerX.setStyle(new Style({
            image: new Icon({
                crossOrigin:
                    'anonymous',
                src: 'AISMarkers/AIS_VesselHistory.svg',
                scale: 0.30
            })
        }));
        markerX.setId(MMSI + 1000000000 * (recordCount+1));
        historyMarkerFeatures.push(markerX);
    }

}

function DisplayTrackHistory(MMSI) {

    var today = new Date();
    var one_day_ago = new Date(new Date().setDate(today.getDate() - 5));

    $.ajax({
        url: 'http://localhost/AISDataretriever/AISDataretriever.asmx/TransferShipHistory',
        data: "MMSI=" + MMSI + "&startTime=" + one_day_ago.toISOString() + "&endTime=" + today.toISOString(),
        type: 'POST',
        cache: false,
        dataType: 'json',
        success: function (aisdata) {
            for (const [recordCount, aisship] of aisdata.entries()) {
                var createMarker = addMarkerHistory(recordCount, aisship.MMSI, aisship.Longitude, aisship.Latitude);
            }
            reloadHistory();
        }, error: function () {
            console.log("Connection Failed");
        }
    });
}
/************************************************************************************************************ */


/************************************************************************************************************ */
var baseMapLayer = new TileLayer({
    source: new OSM(),
    opaque: false
});


var container = document.getElementById('popup');
var content = document.getElementById('popup-content');
var closer = document.getElementById('popup-closer');

/**
 * Create an overlay to anchor the popup to the map.
 */
var overlay = new Overlay({
    element: container,
    autoPan: true
});

/**
 * Add a click handler to hide the popup.
 * @return {boolean} Don't follow the href.
 */

closer.onclick = function () {
    overlay.setPosition(undefined);
    closer.blur();
    return false;
};

var mousePositionControl = new MousePosition({
    coordinateFormat: createStringXY(4),
    projection: 'EPSG:4326',
    // comment the following two lines to have the mouse position
    // be placed within the map.
    className: 'custom-mouse-position',
    target: document.getElementById('mouse-position'),
    undefinedHTML: '&nbsp;'
});


var openSeaMapLayer = new TileLayer({
    source: new XYZ({
        url: 'http://t1.openseamap.org/seamark/{z}/{x}/{y}.png'
        //,crossOrigin: 'null'
    })
});


var map = new Map({
    target: 'map',
    layers: [baseMapLayer
        , openSeaMapLayer
    ],
    view: new View({
        center: proj.fromLonLat([-9.294444444, 38.70833333]), // Cordinates of EDISOFT
        zoom: 7 //Initial Zoom Level
    }),

    overlays: [overlay
    ]
    /*    target: 'map',
   view: new View({
        center: [0, 0],
        zoom: 2
    })*/
});

//call to initiate the history layer to the map
initHistory(map);

//var intervalId;
map.on("click", function (event) {
    if (aisDataWindowActive == false) {
//        intervalId = window.setInterval(function () {
            map.forEachFeatureAtPixel(event.pixel, function (feature, layer) {
                //do something
                //based on the featureID get the data of the ship from database and display: position, COG,SPEED, Heading,etc
                if (feature.getId() == "IND") {
                }

                $.ajax({
                    url: 'http://localhost/AISDataretriever/AISDataretriever.asmx/TransferShipVoyageData',
                    data: "MMSI=" + feature.getId(),
                    type: 'POST',
                    cache: false,
                    dataType: 'json',
                    success: function (aisdata) {
                        var longitude = aisdata.Longitude;
                        var latitude = aisdata.Latitude;
                        var MMSI = aisdata.MMSI;
                        var sog = aisdata.SOG;
                        var cog = aisdata.COG;
                        var heading = aisdata.heading == 511 ? '---' : aisdata.heading;
                        var messTime = aisdata.Mess_time;
                        var shipType = aisdata.Type;
                        var IMO_number = aisdata.IMO_number;
                        var callSign = aisdata.Call_sign;
                        var name = aisdata.Name;
                        var shipLength = aisdata.length;
                        var shipWidth = aisdata.width;
                        var shipDraught = aisdata.draught;
                        var ETA = aisdata.ETA;
                        var destination = aisdata.Destination;
                        var coordinate = [Number(longitude), Number(latitude)];
                        var hdms = toStringHDMS(coordinate);


                        content.innerHTML =
                            '<b>Ship name:</b> ' + name + ' <b>MMSI:</b> ' + MMSI + '<br>'
                            + '<b>Ship type:</b> ' + shipType + ' <b>IMO:</b> ' + IMO_number + ' <b>Callsign:</b> ' + callSign + '<br>'
                            + '<b>Position:</b> ' + hdms + ' <b>Update time:</b> ' + messTime + '<br>'
                            + '<b>Speed:</b> ' + sog + ' <b>Course:</b> ' + cog + ' <b>heading:</b> ' + heading + '<br>'
                            + '<b>Length:</b> ' + shipLength + ' <b>Width:</b> ' + shipWidth + ' <b>Draught:</b> ' + shipDraught + '<br>'
                            + '<b>Voyage Destination:</b> ' + destination + ' <b>ETA:<b> ' + ETA
                            ;

                        var projectionCoord = proj.transform(coordinate, 'EPSG:4326', 'EPSG:3857');
                        overlay.setPosition(projectionCoord);
                        aisDataWindowActive = true;
                        //window.open("TrackDetailsWebForm.aspx?MMSI=" + MMSI);
                    }, error: function () {
                        console.log("Connection Failed");
                    }
                });

                DisplayTrackHistory(feature.getId());

                /*
                $.ajax({
                    url: "TrackDetailsWebForm.aspx",
                    data: "MMSI=" + feature.getId(),
                    type: 'POST',
                    cache: false,
                    dataType: 'json',
                    success: function (aisdata) {
                        alert('Ok! It worked.');


                    }, error: function () {
                        console.log("Connection Failed");
                    }
                });
*/


                /*
                        console.log("cliquei na posicao: no navio com MMSI= " + feature.getId());
                
                        var coordinate = event.coordinate;
                        var hdms = toStringHDMS(proj.transform(
                            coordinate, 'EPSG:3857', 'EPSG:4326'));
                
                        content.innerHTML = '<p>You clicked here:</p><code>' + hdms +
                            '</code>';
                        overlay.setPosition(coordinate);
                */
            });
            console.log('refresh AIS data overlay')
 //       }, 1000);
    } else {
        alert('An AIS data Window is open. To see this AIS data, close the other first')
    }
});


var aisDataWindowActive = false;
$('a').click(function (e) {
    e.preventDefault();
    //window.clearInterval(intervalId);
    aisDataWindowActive = false;

    return false;
});


map.addControl(mousePositionControl);

var myMarkerFeatures = [];

var vectorRotation;

function reload() {
    var vectorSource = new VectorSource({
        features: myMarkerFeatures,
        strategy: loadingstrategy.bbox
    })

    var markerVectorLayer = new VectorLayer({
        source: vectorSource,

    });

    map.addLayer(markerVectorLayer);

    vectorSource.once('change', function () {
        console.log('refresh track layer')
        if (vectorRotation) {
            map.removeLayer(vectorRotation);
            delete vectorRotation.source ;
        }
        vectorRotation = markerVectorLayer;
    });
}

function checkHeading(heading) {
    var cleanedheading = 511;

    if (heading != 511) {
        cleanedheading = heading
    }
    while (cleanedheading != 511 && heading > 360) {
        heading -= 360;
    }
    return cleanedheading
}

function getshipIcon(Navstatus, shipType) {
    var shipIcon = 'AISMarkers/AIS_Vessel.svg';

    if (Navstatus == 7) {
        shipIcon = 'AISMarkers/FishingShip.svg';
    } else if (Navstatus == 9 || Navstatus == 10) {
        shipIcon = 'AISMarkers/myDangerousCargo.svg'
    }
    else {
        switch (shipType) {
            case 'WIG-Carrying DG, HS, or MP, IMO hazard or pollutant category A':
            case 'Vessel, Towing and length of the tow exceeds 200 mor breadth exceeds 25 m':
            case 'Carrying DG, HS, or MP, IMO hazard or pollutant category C':
            case 'Vessels with anti-pollution facilities or equipment':
                shipIcon = 'AISMarkers/myDangerousCargo.svg';
                break;
            case 'Fishing':
                shipIcon = 'AISMarkers/FishingShip.svg';
                break;
            case 'Cargo ships':
                shipIcon = 'AISMarkers/CargoShip.svg';
                break;
            case 'Engaged in military operations':
                shipIcon = 'AISMarkers/myDangerousCargo.svg';
                break;
            default:
                shipIcon = 'AISMarkers/AIS_Vessel.svg';
        }
    }

    return shipIcon
}

function addMarker(MMSI, Navstatus, longitude, latitude, cog, heading) {

    if (parseFloat(longitude) >= -180.0 && parseFloat(longitude) <= 180.0
        && parseFloat(latitude) >= -90.0 && parseFloat(latitude) <= 90.0) {
        /*
                            console.log("long: " + longitude);
                            console.log("lat: " + latitude);
                            console.log("MMSI: " + MMSI);
                            console.log("COG: " + cog);
                            console.log("Heading: " + heading);
        */
        var shipOrientation = checkHeading(parseInt(heading));
        if (shipOrientation == 511) {
            shipOrientation = parseFloat(cog);
        }

        var found = false;

        for (var i = 0; i < myMarkerFeatures.length; i++) {
            if (myMarkerFeatures[i].getId() === MMSI) {
                myMarkerFeatures[i].getGeometry().setCoordinates(proj.transform([parseFloat(longitude), parseFloat(latitude)], 'EPSG:4326', 'EPSG:3857'));
                //get shiptype 

                $.ajax({
                    url: 'http://localhost/AISDataretriever/AISDataretriever.asmx/TransferShipVoyageData',
                    data: "MMSI=" + MMSI,
                    type: 'POST',
                    cache: false,
                    dataType: 'json',
                    success: function (ship) {
                        var shipIcon = getshipIcon(Navstatus, ship.Type);
                        myMarkerFeatures[i].setStyle(new Style({
                            image: new Icon(({
                                crossOrigin:
                                    'anonymous',
                                src: shipIcon,
                                rotation: Math.PI * shipOrientation / 180.0,
                                scale: 0.30
                            })),
                            text: new Text({
                                text: MMSI.toString(),
                                fill: new Fill({ color: 'black' }),
                                stroke: new Stroke({ color: 'black', width: 1 }),
                                offsetX: -20,
                                offsetY: 20
                            })
                        }));
                    }, error: function () {
                        console.log("Connection Failed");
                    }
                });

                ////////////////

                found = true;
                break;
            }
        }

        if (found == false) {
            var markerX = new Feature({
                geometry: new Point(
                    proj.fromLonLat([parseFloat(longitude), parseFloat(latitude)])
                ),
            });
            //Get shiptype 
            $.ajax({
                url: 'http://localhost/AISDataretriever/AISDataretriever.asmx/TransferShipVoyageData',
                data: "MMSI=" + MMSI,
                type: 'POST',
                cache: false,
                dataType: 'json',
                success: function (ship) {
                    var shipIcon = getshipIcon(Navstatus, ship.Type);
                    markerX.setStyle(new Style({
                        image: new Icon(({
                            crossOrigin:
                                'anonymous',
                            src: shipIcon,
                            rotation: (Math.PI * shipOrientation) / 180.0,
                            scale: 0.30

                        })),
                        text: new Text({
                            text: MMSI.toString(),
                            overflow: true, //Decluttering is used to avoid overlapping labels
                            fill: new Fill({ color: 'black' }),
                            stroke: new Stroke({ color: 'back', width: 1 }),
                            offsetX: -20,
                            offsetY: 20
                        })

                    }));
                    markerX.setId(MMSI);
                    myMarkerFeatures.push(markerX);
                }, error: function () {
                    console.log("Connection Failed");
                }
            });

            /*
                        if (recordCount == 4) {
                            break;
            
                        }
            */
        }
    };
}
//////////////////////////////////////////////////////////
window.setInterval(function () {

    $.ajax({
        url: 'http://localhost/aisdataretriever/aisdataretriever.asmx/TransferAISPosition',
        type: 'POST',
        cache: false,
        dataType: 'json',
        success: function (aisdata) {
            for (const [recordCount, aisship] of aisdata.entries()) {
                var createMarker = addMarker(aisship.MMSI, aisship.Navstatus, aisship.Longitude, aisship.Latitude, aisship.COG, aisship.heading);
            }
            reload();
        }, error: function () {
            console.log("Connection Failed");
        }
    })
}, 4000);

//////////////////////////////////////////////////////////






