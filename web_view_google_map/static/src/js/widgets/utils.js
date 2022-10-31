/* eslint-disable */
odoo.define("web_view_google_map.Utils", function (require) {
    "use strict";

    const rpc = require("web.rpc");

    const GOOGLE_PLACES_COMPONENT_FORM = {
        street_number: "long_name",
        route: "long_name",
        intersection: "short_name",
        political: "short_name",
        country: "short_name",
        administrative_area_level_1: "short_name",
        administrative_area_level_2: "short_name",
        administrative_area_level_3: "short_name",
        administrative_area_level_4: "short_name",
        administrative_area_level_5: "short_name",
        colloquial_area: "short_name",
        locality: "short_name",
        ward: "short_name",
        sublocality_level_1: "short_name",
        sublocality_level_2: "short_name",
        sublocality_level_3: "short_name",
        sublocality_level_5: "short_name",
        neighborhood: "short_name",
        premise: "short_name",
        postal_code: "short_name",
        natural_feature: "short_name",
        airport: "short_name",
        park: "short_name",
        floor: "short_name",
        establishment: "short_name",
        point_of_interest: "short_name",
        parking: "short_name",
        post_box: "short_name",
        postal_town: "short_name",
        room: "short_name",
        bus_station: "short_name",
        train_station: "short_name",
        transit_station: "short_name",
    };
    /**
     * Mapping field with an alias
     * key: alias
     * value: field
     */
    const ADDRESS_FORM = {
        street: "street",
        street2: "street2",
        city: "city",
        zip: "zip",
        state_id: "state_id",
        country_id: "country_id",
    };

    /**
     *
     * @param {*} model
     * @param {*} field_name
     * @param {*} value
     */
    function fetchValues(model, field_name, value) {
        if (model && value) {
            return new Promise(async (resolve) => {
                const data = await rpc.query({
                    model: model,
                    method: "search_read",
                    args: [
                        ["|", ["name", "=", value], ["code", "=", value]],
                        ["display_name"],
                    ],
                    limit: 1,
                });
                resolve({
                    [field_name]: data.length === 1 ? data[0] : false,
                });
            });
        }
        return new Promise((resolve) => {
            resolve({
                [field_name]: value,
            });
        });
    }

    /**
     *
     * @param {*} model
     * @param {*} country
     * @param {*} state
     */
    function fetchCountryState(model, country, state) {
        if (model && country && state) {
            return new Promise(async (resolve) => {
                const data = await rpc.query({
                    model: model,
                    method: "search_read",
                    args: [
                        [
                            ["country_id", "=", country],
                            "|",
                            ["code", "=", state],
                            ["name", "=", state],
                        ],
                        ["display_name"],
                    ],
                    limit: 1,
                });
                const result = data.length === 1 ? data[0] : {};
                resolve(result);
            });
        }
        return new Promise((resolve) => resolve([]));
    }

    /**
     *
     * @param {*} place
     * @param {*} options
     */
    function gmaps_get_geolocation(place, options) {
        if (!place) return {};

        const vals = {};
        _.each(options, (alias, field) => {
            if (alias === "latitude") {
                vals[field] = place.geometry.location.lat();
            } else if (alias === "longitude") {
                vals[field] = place.geometry.location.lng();
            }
        });
        return vals;
    }

    /**
     *
     * @param {*} place
     * @param {*} place_options
     */
    function gmaps_populate_places(place, place_options) {
        if (!place) return {};

        const values = {};
        let vals = [];
        _.each(place_options, (option, field) => {
            if (option instanceof Array && !_.has(values, field)) {
                vals = _.filter(_.map(option, (opt) => place[opt] || false));
                values[field] = _.first(vals) || "";
            } else {
                values[field] = place[option] || "";
            }
        });
        return values;
    }

    /**
     *
     * @param {*} place
     * @param {*} address_options
     * @param {*} delimiter
     */
    function gmaps_populate_address(place, address_options, delimiter) {
        if (!place) return {};
        address_options = typeof address_options !== "undefined" ? address_options : {};
        const fields_delimiter = delimiter || {
            street: " ",
            street2: ", ",
        };
        const fields_to_fill = {};
        const result = {};
        let dlmter = null;
        let temp = null;

        // Initialize object key and value
        _.each(address_options, (value, key) => {
            fields_to_fill[key] = [];
        });

        _.each(address_options, (options, field) => {
            // Turn all fields options into an Array
            options = _.flatten([options]);
            temp = {};
            _.each(place.address_components, (component) => {
                _.each(_.intersection(options, component.types), (match) => {
                    temp[match] =
                        component[GOOGLE_PLACES_COMPONENT_FORM[match]] || false;
                });
            });
            fields_to_fill[field] = _.map(options, (item) => temp[item]);
        });

        _.each(fields_to_fill, (value, key) => {
            dlmter = fields_delimiter[key] || " ";
            if (key == "city") {
                result[key] = _.first(_.filter(value)) || "";
            } else {
                result[key] = _.filter(value).join(dlmter);
            }
        });

        return result;
    }

    const MAP_THEMES = {
        default: [],
        aubergine: [
            {
                elementType: "geometry",
                stylers: [
                    {
                        color: "#1d2c4d",
                    },
                ],
            },
            {
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#8ec3b9",
                    },
                ],
            },
            {
                elementType: "labels.text.stroke",
                stylers: [
                    {
                        color: "#1a3646",
                    },
                ],
            },
            {
                featureType: "administrative.country",
                elementType: "geometry.stroke",
                stylers: [
                    {
                        color: "#4b6878",
                    },
                ],
            },
            {
                featureType: "administrative.land_parcel",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#64779e",
                    },
                ],
            },
            {
                featureType: "administrative.province",
                elementType: "geometry.stroke",
                stylers: [
                    {
                        color: "#4b6878",
                    },
                ],
            },
            {
                featureType: "landscape.man_made",
                elementType: "geometry.stroke",
                stylers: [
                    {
                        color: "#334e87",
                    },
                ],
            },
            {
                featureType: "landscape.natural",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#023e58",
                    },
                ],
            },
            {
                featureType: "poi",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#283d6a",
                    },
                ],
            },
            {
                featureType: "poi",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#6f9ba5",
                    },
                ],
            },
            {
                featureType: "poi",
                elementType: "labels.text.stroke",
                stylers: [
                    {
                        color: "#1d2c4d",
                    },
                ],
            },
            {
                featureType: "poi.business",
                stylers: [
                    {
                        visibility: "off",
                    },
                ],
            },
            {
                featureType: "poi.park",
                elementType: "geometry.fill",
                stylers: [
                    {
                        color: "#023e58",
                    },
                ],
            },
            {
                featureType: "poi.park",
                elementType: "labels.text",
                stylers: [
                    {
                        visibility: "off",
                    },
                ],
            },
            {
                featureType: "poi.park",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#3C7680",
                    },
                ],
            },
            {
                featureType: "road",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#304a7d",
                    },
                ],
            },
            {
                featureType: "road",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#98a5be",
                    },
                ],
            },
            {
                featureType: "road",
                elementType: "labels.text.stroke",
                stylers: [
                    {
                        color: "#1d2c4d",
                    },
                ],
            },
            {
                featureType: "road.highway",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#2c6675",
                    },
                ],
            },
            {
                featureType: "road.highway",
                elementType: "geometry.stroke",
                stylers: [
                    {
                        color: "#255763",
                    },
                ],
            },
            {
                featureType: "road.highway",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#b0d5ce",
                    },
                ],
            },
            {
                featureType: "road.highway",
                elementType: "labels.text.stroke",
                stylers: [
                    {
                        color: "#023e58",
                    },
                ],
            },
            {
                featureType: "transit",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#98a5be",
                    },
                ],
            },
            {
                featureType: "transit",
                elementType: "labels.text.stroke",
                stylers: [
                    {
                        color: "#1d2c4d",
                    },
                ],
            },
            {
                featureType: "transit.line",
                elementType: "geometry.fill",
                stylers: [
                    {
                        color: "#283d6a",
                    },
                ],
            },
            {
                featureType: "transit.station",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#3a4762",
                    },
                ],
            },
            {
                featureType: "water",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#0e1626",
                    },
                ],
            },
            {
                featureType: "water",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#4e6d70",
                    },
                ],
            },
        ],
        night: [
            {
                elementType: "geometry",
                stylers: [
                    {
                        color: "#242f3e",
                    },
                ],
            },
            {
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#746855",
                    },
                ],
            },
            {
                elementType: "labels.text.stroke",
                stylers: [
                    {
                        color: "#242f3e",
                    },
                ],
            },
            {
                featureType: "administrative.locality",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#d59563",
                    },
                ],
            },
            {
                featureType: "poi",
                elementType: "labels.text",
                stylers: [
                    {
                        visibility: "off",
                    },
                ],
            },
            {
                featureType: "poi",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#d59563",
                    },
                ],
            },
            {
                featureType: "poi.business",
                stylers: [
                    {
                        visibility: "off",
                    },
                ],
            },
            {
                featureType: "poi.park",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#263c3f",
                    },
                ],
            },
            {
                featureType: "poi.park",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#6b9a76",
                    },
                ],
            },
            {
                featureType: "road",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#38414e",
                    },
                ],
            },
            {
                featureType: "road",
                elementType: "geometry.stroke",
                stylers: [
                    {
                        color: "#212a37",
                    },
                ],
            },
            {
                featureType: "road",
                elementType: "labels.icon",
                stylers: [
                    {
                        visibility: "off",
                    },
                ],
            },
            {
                featureType: "road",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#9ca5b3",
                    },
                ],
            },
            {
                featureType: "road.highway",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#746855",
                    },
                ],
            },
            {
                featureType: "road.highway",
                elementType: "geometry.stroke",
                stylers: [
                    {
                        color: "#1f2835",
                    },
                ],
            },
            {
                featureType: "road.highway",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#f3d19c",
                    },
                ],
            },
            {
                featureType: "transit",
                stylers: [
                    {
                        visibility: "off",
                    },
                ],
            },
            {
                featureType: "transit",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#2f3948",
                    },
                ],
            },
            {
                featureType: "transit.station",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#d59563",
                    },
                ],
            },
            {
                featureType: "water",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#17263c",
                    },
                ],
            },
            {
                featureType: "water",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#515c6d",
                    },
                ],
            },
            {
                featureType: "water",
                elementType: "labels.text.stroke",
                stylers: [
                    {
                        color: "#17263c",
                    },
                ],
            },
        ],
        dark: [
            {
                elementType: "geometry",
                stylers: [
                    {
                        color: "#212121",
                    },
                ],
            },
            {
                elementType: "labels.icon",
                stylers: [
                    {
                        visibility: "off",
                    },
                ],
            },
            {
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#757575",
                    },
                ],
            },
            {
                elementType: "labels.text.stroke",
                stylers: [
                    {
                        color: "#212121",
                    },
                ],
            },
            {
                featureType: "administrative",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#757575",
                    },
                ],
            },
            {
                featureType: "administrative.country",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#9e9e9e",
                    },
                ],
            },
            {
                featureType: "administrative.land_parcel",
                stylers: [
                    {
                        visibility: "off",
                    },
                ],
            },
            {
                featureType: "administrative.locality",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#bdbdbd",
                    },
                ],
            },
            {
                featureType: "poi",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#757575",
                    },
                ],
            },
            {
                featureType: "poi.park",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#181818",
                    },
                ],
            },
            {
                featureType: "poi.park",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#616161",
                    },
                ],
            },
            {
                featureType: "poi.park",
                elementType: "labels.text.stroke",
                stylers: [
                    {
                        color: "#1b1b1b",
                    },
                ],
            },
            {
                featureType: "road",
                elementType: "geometry.fill",
                stylers: [
                    {
                        color: "#2c2c2c",
                    },
                ],
            },
            {
                featureType: "road",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#8a8a8a",
                    },
                ],
            },
            {
                featureType: "road.arterial",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#373737",
                    },
                ],
            },
            {
                featureType: "road.highway",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#3c3c3c",
                    },
                ],
            },
            {
                featureType: "road.highway.controlled_access",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#4e4e4e",
                    },
                ],
            },
            {
                featureType: "road.local",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#616161",
                    },
                ],
            },
            {
                featureType: "transit",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#757575",
                    },
                ],
            },
            {
                featureType: "water",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#000000",
                    },
                ],
            },
            {
                featureType: "water",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#3d3d3d",
                    },
                ],
            },
        ],
        retro: [
            {
                elementType: "geometry",
                stylers: [
                    {
                        color: "#ebe3cd",
                    },
                ],
            },
            {
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#523735",
                    },
                ],
            },
            {
                elementType: "labels.text.stroke",
                stylers: [
                    {
                        color: "#f5f1e6",
                    },
                ],
            },
            {
                featureType: "administrative",
                elementType: "geometry.stroke",
                stylers: [
                    {
                        color: "#c9b2a6",
                    },
                ],
            },
            {
                featureType: "administrative.land_parcel",
                elementType: "geometry.stroke",
                stylers: [
                    {
                        color: "#dcd2be",
                    },
                ],
            },
            {
                featureType: "administrative.land_parcel",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#ae9e90",
                    },
                ],
            },
            {
                featureType: "landscape.natural",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#dfd2ae",
                    },
                ],
            },
            {
                featureType: "poi",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#dfd2ae",
                    },
                ],
            },
            {
                featureType: "poi",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#93817c",
                    },
                ],
            },
            {
                featureType: "poi.park",
                elementType: "geometry.fill",
                stylers: [
                    {
                        color: "#a5b076",
                    },
                ],
            },
            {
                featureType: "poi.park",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#447530",
                    },
                ],
            },
            {
                featureType: "road",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#f5f1e6",
                    },
                ],
            },
            {
                featureType: "road.arterial",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#fdfcf8",
                    },
                ],
            },
            {
                featureType: "road.highway",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#f8c967",
                    },
                ],
            },
            {
                featureType: "road.highway",
                elementType: "geometry.stroke",
                stylers: [
                    {
                        color: "#e9bc62",
                    },
                ],
            },
            {
                featureType: "road.highway.controlled_access",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#e98d58",
                    },
                ],
            },
            {
                featureType: "road.highway.controlled_access",
                elementType: "geometry.stroke",
                stylers: [
                    {
                        color: "#db8555",
                    },
                ],
            },
            {
                featureType: "road.local",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#806b63",
                    },
                ],
            },
            {
                featureType: "transit.line",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#dfd2ae",
                    },
                ],
            },
            {
                featureType: "transit.line",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#8f7d77",
                    },
                ],
            },
            {
                featureType: "transit.line",
                elementType: "labels.text.stroke",
                stylers: [
                    {
                        color: "#ebe3cd",
                    },
                ],
            },
            {
                featureType: "transit.station",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#dfd2ae",
                    },
                ],
            },
            {
                featureType: "water",
                elementType: "geometry.fill",
                stylers: [
                    {
                        color: "#b9d3c2",
                    },
                ],
            },
            {
                featureType: "water",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#92998d",
                    },
                ],
            },
        ],
        silver: [
            {
                elementType: "geometry",
                stylers: [
                    {
                        color: "#f5f5f5",
                    },
                ],
            },
            {
                elementType: "labels.icon",
                stylers: [
                    {
                        visibility: "off",
                    },
                ],
            },
            {
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#616161",
                    },
                ],
            },
            {
                elementType: "labels.text.stroke",
                stylers: [
                    {
                        color: "#f5f5f5",
                    },
                ],
            },
            {
                featureType: "administrative.land_parcel",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#bdbdbd",
                    },
                ],
            },
            {
                featureType: "poi",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#eeeeee",
                    },
                ],
            },
            {
                featureType: "poi",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#757575",
                    },
                ],
            },
            {
                featureType: "poi.park",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#e5e5e5",
                    },
                ],
            },
            {
                featureType: "poi.park",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#9e9e9e",
                    },
                ],
            },
            {
                featureType: "road",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#ffffff",
                    },
                ],
            },
            {
                featureType: "road.arterial",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#757575",
                    },
                ],
            },
            {
                featureType: "road.highway",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#dadada",
                    },
                ],
            },
            {
                featureType: "road.highway",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#616161",
                    },
                ],
            },
            {
                featureType: "road.local",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#9e9e9e",
                    },
                ],
            },
            {
                featureType: "transit.line",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#e5e5e5",
                    },
                ],
            },
            {
                featureType: "transit.station",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#eeeeee",
                    },
                ],
            },
            {
                featureType: "water",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#c9c9c9",
                    },
                ],
            },
            {
                featureType: "water",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#9e9e9e",
                    },
                ],
            },
        ],
        atlas: [
            {
                stylers: [
                    {
                        visibility: "on",
                    },
                ],
            },
            {
                featureType: "administrative",
                elementType: "geometry.fill",
                stylers: [
                    {
                        color: "#f5f5f5",
                    },
                ],
            },
            {
                featureType: "administrative",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#003975",
                    },
                ],
            },
            {
                featureType: "administrative.locality",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        weight: 1,
                    },
                ],
            },
            {
                featureType: "administrative.neighborhood",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#90b1d5",
                    },
                ],
            },
            {
                featureType: "landscape.man_made",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#fcfcfc",
                    },
                    {
                        visibility: "on",
                    },
                ],
            },
            {
                featureType: "landscape.natural",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#fcfcfc",
                    },
                ],
            },
            {
                featureType: "landscape.natural.landcover",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#f2f2f2",
                    },
                ],
            },
            {
                featureType: "landscape.natural.terrain",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#bfeecd",
                    },
                ],
            },
            {
                featureType: "poi.attraction",
                elementType: "labels.icon",
                stylers: [
                    {
                        color: "#32b2c3",
                    },
                ],
            },
            {
                featureType: "poi.attraction",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#32b2c3",
                    },
                ],
            },
            {
                featureType: "poi.business",
                elementType: "labels.icon",
                stylers: [
                    {
                        color: "#6c87ea",
                    },
                ],
            },
            {
                featureType: "poi.business",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        weight: 2,
                    },
                ],
            },
            {
                featureType: "poi.government",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#ebf7ff",
                    },
                ],
            },
            {
                featureType: "poi.park",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#dafbe2",
                    },
                ],
            },
            {
                featureType: "poi.park",
                elementType: "labels.icon",
                stylers: [
                    {
                        color: "#44ca66",
                    },
                ],
            },
            {
                featureType: "poi.park",
                elementType: "labels.text.fill",
                stylers: [
                    {
                        color: "#33a34f",
                    },
                ],
            },
            {
                featureType: "poi.school",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#f5e0f3",
                    },
                ],
            },
            {
                featureType: "road.arterial",
                elementType: "geometry.fill",
                stylers: [
                    {
                        color: "#ededed",
                    },
                ],
            },
            {
                featureType: "road.arterial",
                elementType: "geometry.stroke",
                stylers: [
                    {
                        color: "#cfcfcf",
                    },
                ],
            },
            {
                featureType: "road.highway",
                elementType: "geometry.fill",
                stylers: [
                    {
                        color: "#90d59c",
                    },
                ],
            },
            {
                featureType: "road.highway",
                elementType: "geometry.stroke",
                stylers: [
                    {
                        color: "#598860",
                    },
                ],
            },
            {
                featureType: "road.highway.controlled_access",
                elementType: "geometry.fill",
                stylers: [
                    {
                        color: "#8ac0f0",
                    },
                ],
            },
            {
                featureType: "road.highway.controlled_access",
                elementType: "geometry.stroke",
                stylers: [
                    {
                        color: "#2e7dc2",
                    },
                ],
            },
            {
                featureType: "road.local",
                elementType: "geometry.fill",
                stylers: [
                    {
                        color: "#fcfcfc",
                    },
                ],
            },
            {
                featureType: "road.local",
                elementType: "geometry.stroke",
                stylers: [
                    {
                        color: "#93d3fb",
                    },
                ],
            },
            {
                featureType: "transit",
                stylers: [
                    {
                        visibility: "off",
                    },
                ],
            },
            {
                featureType: "water",
                elementType: "geometry",
                stylers: [
                    {
                        color: "#bde6fa",
                    },
                ],
            },
        ],
    };

    return {
        GOOGLE_PLACES_COMPONENT_FORM: GOOGLE_PLACES_COMPONENT_FORM,
        ADDRESS_FORM: ADDRESS_FORM,
        MAP_THEMES: MAP_THEMES,
        gmaps_populate_address: gmaps_populate_address,
        gmaps_populate_places: gmaps_populate_places,
        gmaps_get_geolocation: gmaps_get_geolocation,
        fetchValues: fetchValues,
        fetchCountryState: fetchCountryState,
    };
});
