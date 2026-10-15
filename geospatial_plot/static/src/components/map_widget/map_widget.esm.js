import {Component, onMounted} from "@odoo/owl";
import {_t} from "@web/core/l10n/translation";
import {exprToBoolean} from "@web/core/utils/strings";
import {registry} from "@web/core/registry";
import {standardFieldProps} from "@web/views/fields/standard_field_props";

export class MapWidget extends Component {
    static template = "MapWidget";
    static props = {
        ...standardFieldProps,
        polyline_inactive: {type: Boolean, optional: true},
        polygon_inactive: {type: Boolean, optional: true},
        rectangle_inactive: {type: Boolean, optional: true},
        circle_inactive: {type: Boolean, optional: true},
        marker_inactive: {type: Boolean, optional: true},
        area_field: {type: String, optional: true},
    };
    static defaultProps = {
        polyline_inactive: false,
        polygon_inactive: false,
        rectangle_inactive: false,
        circle_inactive: false,
        marker_inactive: false,
    };

    setup() {
        onMounted(async () => {
            await this.loadData();
        });
    }

    async loadData() {
        const updateField = this.updateField;
        var self = this;
        const readonly = self.props.readonly || false;
        const field_map_data = self.props.record.data[self.props.name] || [];
        var fg = new L.featureGroup();
        var map_center_points = [0.0, 0.0];
        var map_zoom = 2;

        if (field_map_data.length === 0) {
            const country_code = self.props.record.data.country_code;
            if (country_code !== undefined) {
                const country_data = self.getCountryGeo(country_code);
                if (country_data.length !== 0) {
                    map_center_points = [
                        country_data[0].geo.latitude,
                        country_data[0].geo.longitude,
                    ];
                    map_zoom = 6;
                }
            }
        } else {
            self.loadLayers(fg, field_map_data);
            const fg_center = fg.getBounds().getCenter();
            map_center_points = [fg_center.lat, fg_center.lng];
            map_zoom = 10;
        }

        var map = L.map(self.props.id).setView(map_center_points, map_zoom);
        var drawnFeatures = new L.FeatureGroup();
        map.addLayer(drawnFeatures);

        var layers = fg.getLayers();
        var layer = {};
        if (layers.length !== 0) {
            for (layer of layers) {
                drawnFeatures.addLayer(layer);
            }
            const fb_zoom = map.getBoundsZoom(fg.getBounds());
            map.setZoom(fb_zoom);
        }

        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
                '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        var drawControl = new L.Control.Draw({
            position: "topright",
            draw: {
                polyline: !(readonly || self.props.polyline_inactive),
                polygon: !(readonly || self.props.polygon_inactive),
                rectangle: !(readonly || self.props.rectangle_inactive),
                circle: !(readonly || self.props.circle_inactive),
                marker: !(readonly || self.props.marker_inactive),
            },
            edit: readonly
                ? false
                : {
                      featureGroup: drawnFeatures,
                      remove: !readonly,
                  },
        });
        map.addControl(drawControl);

        map.on("draw:created", function (e) {
            e.layer.odoo_layer = true;
            drawnFeatures.addLayer(e.layer);
            updateField(drawnFeatures._map, self);
        });
        map.on("draw:edited", function () {
            updateField(drawnFeatures._map, self);
        });
        map.on("draw:deleted", function () {
            updateField(drawnFeatures._map, self);
        });
    }

    loadLayers(fg, field_map_data) {
        var layer = {};
        for (const area_data of field_map_data) {
            if (area_data.type === "polygon") {
                layer = L.polygon(area_data.points);
                layer.odoo_layer = true;
                layer.addTo(fg);
            } else if (area_data.type === "polyline") {
                layer = L.polyline(area_data.points);
                layer.odoo_layer = true;
                layer.addTo(fg);
            } else if (area_data.type === "rectangle") {
                layer = L.rectangle(area_data.points);
                layer.odoo_layer = true;
                layer.addTo(fg);
            } else if (area_data.type === "circle") {
                layer = L.circle(
                    [area_data.points[0], area_data.points[1]],
                    area_data.points[2]
                );
                layer.odoo_layer = true;
                layer.addTo(fg);
            } else if (area_data.type === "marker") {
                layer = L.marker(area_data.points);
                layer.odoo_layer = true;
                layer.addTo(fg);
            }
        }
    }

    updateField(map, owidget) {
        var area_data = [];
        var odoo_layers = [];
        map.eachLayer(function (map_layer) {
            if (map_layer.odoo_layer) {
                odoo_layers.push(map_layer);
                var new_area_points = [];
                if (map_layer instanceof L.Polygon) {
                    for (const area_points of map_layer.editing.latlngs[0][0]) {
                        new_area_points.push([area_points.lat, area_points.lng]);
                    }
                    area_data.push({
                        type: "polygon",
                        points: new_area_points,
                    });
                } else if (map_layer instanceof L.Polyline) {
                    for (const area_points of map_layer.editing.latlngs[0]) {
                        new_area_points.push([area_points.lat, area_points.lng]);
                    }
                    area_data.push({
                        type: "polyline",
                        points: new_area_points,
                    });
                } else if (map_layer instanceof L.Rectangle) {
                    area_data.push({
                        type: "rectangle",
                        points: [
                            [
                                map_layer._bounds._northEast.lat,
                                map_layer._bounds._northEast.lng,
                            ],
                            [
                                map_layer._bounds._southWest.lat,
                                map_layer._bounds._southWest.lng,
                            ],
                        ],
                    });
                } else if (map_layer instanceof L.Circle) {
                    area_data.push({
                        type: "circle",
                        points: [
                            map_layer._latlng.lat,
                            map_layer._latlng.lng,
                            map_layer._mRadius,
                        ],
                    });
                } else if (map_layer instanceof L.Marker) {
                    area_data.push({
                        type: "marker",
                        points: [map_layer._latlng.lat, map_layer._latlng.lng],
                    });
                }
            }
        });

        owidget.props.record.update({[owidget.props.name]: area_data});

        if (
            typeof owidget.props.area_field === "string" ||
            owidget.props.area_field instanceof String
        ) {
            // Area in square meters
            const area_field = owidget.props.area_field;
            var area = 0.0;
            for (const odoo_layer of odoo_layers) {
                area += L.GeometryUtil.geodesicArea(odoo_layer.getLatLngs()[0]);
            }
            owidget.props.record.update({[area_field]: area});
        }
    }

    getCountryGeo(country_code) {
        const countries = [
            {code: "AF", geo: {latitude: 33.93911, longitude: 67.709953}},
            {code: "AL", geo: {latitude: 41.153332, longitude: 20.168331}},
            {code: "DZ", geo: {latitude: 28.033886, longitude: 1.659626}},
            {code: "AS", geo: {latitude: -14.270972, longitude: -170.132217}},
            {code: "AD", geo: {latitude: 42.546245, longitude: 1.601554}},
            {code: "AO", geo: {latitude: -11.202692, longitude: 17.873887}},
            {code: "AI", geo: {latitude: 18.220554, longitude: -63.068615}},
            {code: "AQ", geo: {latitude: -75.250973, longitude: -0.071389}},
            {code: "AG", geo: {latitude: 17.060816, longitude: -61.796428}},
            {
                code: "AR",
                geo: {latitude: -38.416097, longitude: -63.616672},
            },
            {code: "AM", geo: {latitude: 40.069099, longitude: 45.038189}},
            {code: "AW", geo: {latitude: 12.52111, longitude: -69.968338}},
            {
                code: "AU",
                geo: {latitude: -25.274398, longitude: 133.775136},
            },
            {code: "AT", geo: {latitude: 47.516231, longitude: 14.550072}},
            {code: "AZ", geo: {latitude: 40.143105, longitude: 47.576927}},
            {code: "BS", geo: {latitude: 25.03428, longitude: -77.39628}},
            {code: "BH", geo: {latitude: 25.930414, longitude: 50.637772}},
            {code: "BD", geo: {latitude: 23.684994, longitude: 90.356331}},
            {code: "BB", geo: {latitude: 13.193887, longitude: -59.543198}},
            {code: "BY", geo: {latitude: 53.709807, longitude: 27.953389}},
            {code: "BE", geo: {latitude: 50.503887, longitude: 4.469936}},
            {code: "BZ", geo: {latitude: 17.189877, longitude: -88.49765}},
            {code: "BJ", geo: {latitude: 9.30769, longitude: 2.315834}},
            {code: "BM", geo: {latitude: 32.321384, longitude: -64.75737}},
            {code: "BT", geo: {latitude: 27.514162, longitude: 90.433601}},
            {
                code: "BO",
                geo: {latitude: -16.290154, longitude: -63.588653},
            },
            {code: "BA", geo: {latitude: 43.915886, longitude: 17.679076}},
            {code: "BW", geo: {latitude: -22.328474, longitude: 24.684866}},
            {code: "BV", geo: {latitude: -54.423199, longitude: 3.413194}},
            {code: "BR", geo: {latitude: -14.235004, longitude: -51.92528}},
            {code: "IO", geo: {latitude: -6.343194, longitude: 71.876519}},
            {code: "BN", geo: {latitude: 4.535277, longitude: 114.727669}},
            {code: "BG", geo: {latitude: 42.733883, longitude: 25.48583}},
            {code: "BF", geo: {latitude: 12.238333, longitude: -1.561593}},
            {code: "BI", geo: {latitude: -3.373056, longitude: 29.918886}},
            {code: "KH", geo: {latitude: 12.565679, longitude: 104.990963}},
            {code: "CM", geo: {latitude: 7.369722, longitude: 12.354722}},
            {
                code: "CA",
                geo: {latitude: 56.130366, longitude: -106.346771},
            },
            {code: "CV", geo: {latitude: 16.002082, longitude: -24.013197}},
            {code: "KY", geo: {latitude: 19.513469, longitude: -80.566956}},
            {code: "CF", geo: {latitude: 6.611111, longitude: 20.939444}},
            {code: "TD", geo: {latitude: 15.454166, longitude: 18.732207}},
            {
                code: "CL",
                geo: {latitude: -35.675147, longitude: -71.542969},
            },
            {code: "CN", geo: {latitude: 35.86166, longitude: 104.195397}},
            {
                code: "CX",
                geo: {latitude: -10.447525, longitude: 105.690449},
            },
            {code: "CC", geo: {latitude: -12.164165, longitude: 96.870956}},
            {code: "CO", geo: {latitude: 4.570868, longitude: -74.297333}},
            {code: "KM", geo: {latitude: -11.875001, longitude: 43.872219}},
            {code: "CG", geo: {latitude: -0.228021, longitude: 15.827659}},
            {code: "CD", geo: {latitude: -4.038333, longitude: 21.758664}},
            {
                code: "CK",
                geo: {latitude: -21.236736, longitude: -159.777671},
            },
            {code: "CR", geo: {latitude: 9.748917, longitude: -83.753428}},
            {code: "HR", geo: {latitude: 45.1, longitude: 15.2}},
            {code: "CU", geo: {latitude: 21.521757, longitude: -77.781167}},
            {code: "CY", geo: {latitude: 35.126413, longitude: 33.429859}},
            {code: "CZ", geo: {latitude: 49.817492, longitude: 15.472962}},
            {code: "DK", geo: {latitude: 56.26392, longitude: 9.501785}},
            {code: "DJ", geo: {latitude: 11.825138, longitude: 42.590275}},
            {code: "DM", geo: {latitude: 15.414999, longitude: -61.370976}},
            {code: "DO", geo: {latitude: 18.735693, longitude: -70.162651}},
            {code: "EC", geo: {latitude: -1.831239, longitude: -78.183406}},
            {code: "EG", geo: {latitude: 26.820553, longitude: 30.802498}},
            {code: "SV", geo: {latitude: 13.794185, longitude: -88.89653}},
            {code: "GQ", geo: {latitude: 1.650801, longitude: 10.267895}},
            {code: "ER", geo: {latitude: 15.179384, longitude: 39.782334}},
            {code: "EE", geo: {latitude: 58.595272, longitude: 25.013607}},
            {code: "ET", geo: {latitude: 9.145, longitude: 40.489673}},
            {code: "EU.INT", geo: {latitude: 9.0485, longitude: 7.4728}},
            {
                code: "FK",
                geo: {latitude: -51.796253, longitude: -59.523613},
            },
            {code: "FO", geo: {latitude: 61.892635, longitude: -6.911806}},
            {
                code: "FJ",
                geo: {latitude: -16.578193, longitude: 179.414413},
            },
            {code: "FI", geo: {latitude: 61.92411, longitude: 25.748151}},
            {code: "FR", geo: {latitude: 46.227638, longitude: 2.213749}},
            {code: "GF", geo: {latitude: 3.933889, longitude: -53.125782}},
            {code: "TF", geo: {latitude: -49.280366, longitude: 69.348557}},
            {code: "GA", geo: {latitude: -0.803689, longitude: 11.609444}},
            {code: "GM", geo: {latitude: 13.443182, longitude: -15.310139}},
            {code: "GE", geo: {latitude: 42.315407, longitude: 43.356892}},
            {code: "DE", geo: {latitude: 51.165691, longitude: 10.451526}},
            {code: "GH", geo: {latitude: 7.946527, longitude: -1.023194}},
            {code: "GI", geo: {latitude: 36.137741, longitude: -5.345374}},
            {code: "GB", geo: {latitude: 55.378051, longitude: -3.435973}},
            {code: "GR", geo: {latitude: 39.074208, longitude: 21.824312}},
            {code: "GL", geo: {latitude: 71.706936, longitude: -42.604303}},
            {code: "GD", geo: {latitude: 12.262776, longitude: -61.604171}},
            {code: "GP", geo: {latitude: 16.995971, longitude: -62.067641}},
            {code: "GU", geo: {latitude: 13.444304, longitude: 144.793731}},
            {code: "GT", geo: {latitude: 15.783471, longitude: -90.230759}},
            {code: "GG", geo: {latitude: 49.465691, longitude: -2.585278}},
            {code: "GN", geo: {latitude: 9.945587, longitude: -9.696645}},
            {code: "GW", geo: {latitude: 11.803749, longitude: -15.180413}},
            {code: "GY", geo: {latitude: 4.860416, longitude: -58.93018}},
            {code: "HT", geo: {latitude: 18.971187, longitude: -72.285215}},
            {code: "HM", geo: {latitude: -53.08181, longitude: 73.504158}},
            {code: "HN", geo: {latitude: 15.199999, longitude: -86.241905}},
            {code: "HK", geo: {latitude: 22.396428, longitude: 114.109497}},
            {code: "HU", geo: {latitude: 47.162494, longitude: 19.503304}},
            {code: "IS", geo: {latitude: 64.963051, longitude: -19.020835}},
            {code: "IN", geo: {latitude: 20.593684, longitude: 78.96288}},
            {code: "ID", geo: {latitude: -0.789275, longitude: 113.921327}},
            {code: "IR", geo: {latitude: 32.427908, longitude: 53.688046}},
            {code: "IQ", geo: {latitude: 33.223191, longitude: 43.679291}},
            {code: "IE", geo: {latitude: 53.41291, longitude: -8.24389}},
            {code: "IM", geo: {latitude: 54.236107, longitude: -4.548056}},
            {code: "IL", geo: {latitude: 31.046051, longitude: 34.851612}},
            {code: "IT", geo: {latitude: 41.87194, longitude: 12.56738}},
            {code: "CI", geo: {latitude: 7.539989, longitude: -5.54708}},
            {code: "JM", geo: {latitude: 18.109581, longitude: -77.297508}},
            {code: "JP", geo: {latitude: 36.204824, longitude: 138.252924}},
            {code: "JE", geo: {latitude: 49.214439, longitude: -2.13125}},
            {code: "JO", geo: {latitude: 30.585164, longitude: 36.238414}},
            {code: "KZ", geo: {latitude: 48.019573, longitude: 66.923684}},
            {code: "KE", geo: {latitude: -0.023559, longitude: 37.906193}},
            {
                code: "KI",
                geo: {latitude: -3.370417, longitude: -168.734039},
            },
            {code: "KP", geo: {latitude: 40.339852, longitude: 127.510093}},
            {code: "KR", geo: {latitude: 35.907757, longitude: 127.766922}},
            {code: "KW", geo: {latitude: 29.31166, longitude: 47.481766}},
            {code: "KG", geo: {latitude: 41.20438, longitude: 74.766098}},
            {code: "LA", geo: {latitude: 19.85627, longitude: 102.495496}},
            {code: "LV", geo: {latitude: 56.879635, longitude: 24.603189}},
            {code: "LB", geo: {latitude: 33.854721, longitude: 35.862285}},
            {code: "LS", geo: {latitude: -29.609988, longitude: 28.233608}},
            {code: "LR", geo: {latitude: 6.428055, longitude: -9.429499}},
            {code: "LY", geo: {latitude: 26.3351, longitude: 17.228331}},
            {code: "LI", geo: {latitude: 47.166, longitude: 9.555373}},
            {code: "LT", geo: {latitude: 55.169438, longitude: 23.881275}},
            {code: "LU", geo: {latitude: 49.815273, longitude: 6.129583}},
            {code: "MO", geo: {latitude: 22.198745, longitude: 113.543873}},
            {code: "MK", geo: {latitude: 41.608635, longitude: 21.745275}},
            {code: "MG", geo: {latitude: -18.766947, longitude: 46.869107}},
            {code: "MW", geo: {latitude: -13.254308, longitude: 34.301525}},
            {code: "MY", geo: {latitude: 4.210484, longitude: 101.975766}},
            {code: "MV", geo: {latitude: 3.202778, longitude: 73.22068}},
            {code: "ML", geo: {latitude: 17.570692, longitude: -3.996166}},
            {code: "MT", geo: {latitude: 35.937496, longitude: 14.375416}},
            {code: "MH", geo: {latitude: 7.131474, longitude: 171.184478}},
            {code: "MQ", geo: {latitude: 14.641528, longitude: -61.024174}},
            {code: "MR", geo: {latitude: 21.00789, longitude: -10.940835}},
            {code: "MU", geo: {latitude: -20.348404, longitude: 57.552152}},
            {code: "YT", geo: {latitude: -12.8275, longitude: 45.166244}},
            {
                code: "MX",
                geo: {latitude: 23.634501, longitude: -102.552784},
            },
            {code: "FM", geo: {latitude: 7.425554, longitude: 150.550812}},
            {code: "MD", geo: {latitude: 47.411631, longitude: 28.369885}},
            {code: "MC", geo: {latitude: 43.750298, longitude: 7.412841}},
            {code: "MN", geo: {latitude: 46.862496, longitude: 103.846656}},
            {code: "ME", geo: {latitude: 42.708678, longitude: 19.37439}},
            {code: "MS", geo: {latitude: 16.742498, longitude: -62.187366}},
            {code: "MA", geo: {latitude: 31.791702, longitude: -7.09262}},
            {code: "MZ", geo: {latitude: -18.665695, longitude: 35.529562}},
            {code: "MM", geo: {latitude: 21.913965, longitude: 95.956223}},
            {code: "NA", geo: {latitude: -22.95764, longitude: 18.49041}},
            {code: "NR", geo: {latitude: -0.522778, longitude: 166.931503}},
            {code: "NP", geo: {latitude: 28.394857, longitude: 84.124008}},
            {code: "NL", geo: {latitude: 52.132633, longitude: 5.291266}},
            {code: "AN", geo: {latitude: 12.226079, longitude: -69.060087}},
            {
                code: "NC",
                geo: {latitude: -20.904305, longitude: 165.618042},
            },
            {
                code: "NZ",
                geo: {latitude: -40.900557, longitude: 174.885971},
            },
            {code: "NI", geo: {latitude: 12.865416, longitude: -85.207229}},
            {code: "NE", geo: {latitude: 17.607789, longitude: 8.081666}},
            {code: "NG", geo: {latitude: 9.081999, longitude: 8.675277}},
            {
                code: "NU",
                geo: {latitude: -19.054445, longitude: -169.867233},
            },
            {
                code: "NF",
                geo: {latitude: -29.040835, longitude: 167.954712},
            },
            {code: "MP", geo: {latitude: 17.33083, longitude: 145.38469}},
            {code: "NO", geo: {latitude: 60.472024, longitude: 8.468946}},
            {code: "OM", geo: {latitude: 21.512583, longitude: 55.923255}},
            {code: "PK", geo: {latitude: 30.375321, longitude: 69.345116}},
            {code: "PW", geo: {latitude: 7.51498, longitude: 134.58252}},
            {code: "PA", geo: {latitude: 8.537981, longitude: -80.782127}},
            {code: "PG", geo: {latitude: -6.314993, longitude: 143.95555}},
            {
                code: "PY",
                geo: {latitude: -23.442503, longitude: -58.443832},
            },
            {code: "PE", geo: {latitude: -9.189967, longitude: -75.015152}},
            {code: "PH", geo: {latitude: 12.879721, longitude: 121.774017}},
            {
                code: "PN",
                geo: {latitude: -24.703615, longitude: -127.439308},
            },
            {code: "PL", geo: {latitude: 51.919438, longitude: 19.145136}},
            {
                code: "PF",
                geo: {latitude: -17.679742, longitude: -149.406843},
            },
            {code: "PT", geo: {latitude: 39.399872, longitude: -8.224454}},
            {code: "PR", geo: {latitude: 18.220833, longitude: -66.590149}},
            {code: "QA", geo: {latitude: 25.354826, longitude: 51.183884}},
            {code: "RE", geo: {latitude: -21.115141, longitude: 55.536384}},
            {code: "RO", geo: {latitude: 45.943161, longitude: 24.96676}},
            {code: "RU", geo: {latitude: 61.52401, longitude: 105.318756}},
            {code: "RW", geo: {latitude: -1.940278, longitude: 29.873888}},
            {
                code: "SH",
                geo: {latitude: -24.143474, longitude: -10.030696},
            },
            {code: "KN", geo: {latitude: 17.357822, longitude: -62.782998}},
            {code: "LC", geo: {latitude: 13.909444, longitude: -60.978893}},
            {code: "PM", geo: {latitude: 46.941936, longitude: -56.27111}},
            {code: "VC", geo: {latitude: 12.984305, longitude: -61.287228}},
            {
                code: "WS",
                geo: {latitude: -13.759029, longitude: -172.104629},
            },
            {code: "SM", geo: {latitude: 43.94236, longitude: 12.457777}},
            {code: "ST", geo: {latitude: 0.18636, longitude: 6.613081}},
            {code: "SA", geo: {latitude: 23.885942, longitude: 45.079162}},
            {code: "SN", geo: {latitude: 14.497401, longitude: -14.452362}},
            {code: "RS", geo: {latitude: 44.016521, longitude: 21.005859}},
            {code: "SC", geo: {latitude: -4.679574, longitude: 55.491977}},
            {code: "SL", geo: {latitude: 8.460555, longitude: -11.779889}},
            {code: "SG", geo: {latitude: 1.352083, longitude: 103.819836}},
            {code: "SK", geo: {latitude: 48.669026, longitude: 19.699024}},
            {code: "SI", geo: {latitude: 46.151241, longitude: 14.995463}},
            {code: "SB", geo: {latitude: -9.64571, longitude: 160.156194}},
            {code: "SO", geo: {latitude: 5.152149, longitude: 46.199616}},
            {code: "ZA", geo: {latitude: -30.559482, longitude: 22.937506}},
            {
                code: "GS",
                geo: {latitude: -54.429579, longitude: -36.587909},
            },
            {code: "SS", geo: {latitude: 7.9631, longitude: 30.1589}},
            {code: "ES", geo: {latitude: 40.463667, longitude: -3.74922}},
            {code: "LK", geo: {latitude: 7.873054, longitude: 80.771797}},
            {code: "SD", geo: {latitude: 12.862807, longitude: 30.217636}},
            {code: "SR", geo: {latitude: 3.919305, longitude: -56.027783}},
            {code: "SJ", geo: {latitude: 77.553604, longitude: 23.670272}},
            {code: "SZ", geo: {latitude: -26.522503, longitude: 31.465866}},
            {code: "SE", geo: {latitude: 60.128161, longitude: 18.643501}},
            {code: "CH", geo: {latitude: 46.818188, longitude: 8.227512}},
            {code: "SY", geo: {latitude: 34.802075, longitude: 38.996815}},
            {code: "TW", geo: {latitude: 23.69781, longitude: 120.960515}},
            {code: "TJ", geo: {latitude: 38.861034, longitude: 71.276093}},
            {code: "TZ", geo: {latitude: -6.369028, longitude: 34.888822}},
            {code: "TH", geo: {latitude: 15.870032, longitude: 100.992541}},
            {code: "TG", geo: {latitude: 8.619543, longitude: 0.824782}},
            {
                code: "TK",
                geo: {latitude: -8.967363, longitude: -171.855881},
            },
            {
                code: "TO",
                geo: {latitude: -21.178986, longitude: -175.198242},
            },
            {code: "TT", geo: {latitude: 10.691803, longitude: -61.222503}},
            {code: "TN", geo: {latitude: 33.886917, longitude: 9.537499}},
            {code: "TR", geo: {latitude: 38.963745, longitude: 35.243322}},
            {code: "TM", geo: {latitude: 38.969719, longitude: 59.556278}},
            {code: "TC", geo: {latitude: 21.694025, longitude: -71.797928}},
            {code: "TV", geo: {latitude: -7.109535, longitude: 177.64933}},
            {code: "UK", geo: {latitude: 55.3781, longitude: -3.436}},
            {code: "US", geo: {latitude: 37.09024, longitude: -95.712891}},
            {code: "UM", geo: {latitude: -0.37435, longitude: -159.996719}},
            {code: "UG", geo: {latitude: 1.373333, longitude: 32.290275}},
            {code: "UA", geo: {latitude: 48.379433, longitude: 31.16558}},
            {code: "AE", geo: {latitude: 23.424076, longitude: 53.847818}},
            {
                code: "UY",
                geo: {latitude: -32.522779, longitude: -55.765835},
            },
            {code: "UZ", geo: {latitude: 41.377491, longitude: 64.585262}},
            {
                code: "VU",
                geo: {latitude: -15.376706, longitude: 166.959158},
            },
            {code: "VA", geo: {latitude: 41.902916, longitude: 12.453389}},
            {code: "VE", geo: {latitude: 6.42375, longitude: -66.58973}},
            {code: "VN", geo: {latitude: 14.058324, longitude: 108.277199}},
            {code: "VG", geo: {latitude: 18.420695, longitude: -64.639968}},
            {code: "VI", geo: {latitude: 18.335765, longitude: -64.896335}},
            {
                code: "WF",
                geo: {latitude: -13.768752, longitude: -177.156097},
            },
            {code: "EH", geo: {latitude: 24.215527, longitude: -12.885834}},
            {code: "YE", geo: {latitude: 15.552727, longitude: 48.516388}},
            {code: "ZM", geo: {latitude: -13.133897, longitude: 27.849332}},
            {code: "ZW", geo: {latitude: -19.015438, longitude: 29.154857}},
        ];
        const searchText = country_code ? country_code.toUpperCase().trim() : null;
        const results = [];
        if (countries && searchText !== null) {
            countries.forEach((country) => {
                const values = Object.values(country);
                values.forEach((value) => {
                    if (
                        value === searchText ||
                        (typeof value === "object" &&
                            Object.values(value).includes(searchText))
                    ) {
                        results.push(country);
                    }
                });
            });
        }
        return results;
    }
}

export const mapWidget = {
    component: MapWidget,
    displayName: _t("Map"),
    supportedOptions: [
        {
            label: _t("Polyline draw inactive"),
            name: "polyline_inactive",
            type: "boolean",
            help: _t(`Polyline draw inactive`),
        },
        {
            label: _t("Polygone draw inactive"),
            name: "polygon_inactive",
            type: "boolean",
            help: _t(`Polygone draw inactive`),
        },
        {
            label: _t("Rectangle draw inactive"),
            name: "rectangle_inactive",
            type: "boolean",
            help: _t(`Rectangle draw inactive`),
        },
        {
            label: _t("Circle draw inactive"),
            name: "circle_inactive",
            type: "boolean",
            help: _t(`Circle draw inactive`),
        },
        {
            label: _t("Marker draw inactive"),
            name: "marker_inactive",
            type: "boolean",
            help: _t(`Marker draw inactive`),
        },
        {
            label: _t("Area Field"),
            name: "area_field",
            type: "string",
            help: _t(`The field which will have the area calculated`),
        },
    ],
    extractProps: ({options}) => ({
        polyline_inactive: exprToBoolean(options.polyline_inactive),
        polygon_inactive: exprToBoolean(options.polygon_inactive),
        rectangle_inactive: exprToBoolean(options.rectangle_inactive),
        circle_inactive: exprToBoolean(options.circle_inactive),
        marker_inactive: exprToBoolean(options.marker_inactive),
        area_field: options.area_field,
    }),
};

registry.category("fields").add("map", mapWidget);
