/** @odoo-module */

/** example data */
export const shops = {
    type: "FeatureCollection",
    features: [
        {
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [6, 46],
            },
            properties: {
                store_category: "shop",
                name: "first shop",
                address: "Route de la post 1",
                contact: "Alfred",
                opening_hours: "8-16h",
            },
        },
        {
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [5, 46],
            },
            properties: {
                store_category: "shop",
                name: "second shop",
                address: "Route de la post 1",
                contact: "Alfred",
                opening_hours: "8-16h",
            },
        },
    ],
};

