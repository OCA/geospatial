# Copyright 2024 Camptocamp
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl).
{
    "name": "Geospatial Website store locator",
    "version": "16.0.1.0.0",
    "description": "Adds a website widget to display a map with the store locations.",
    "category": "GeoBI",
    "author": "Camptocamp, Odoo Community Association (OCA)",
    "license": "AGPL-3",
    "website": "https://github.com/OCA/geospatial",
    "depends": ["base_geoengine", "website", "partner_store", "website_geoengine"],
    "data": [
        "templates/snippets/s_openlayer_store_locator.xml",
        "views/snippets.xml",
    ],
    "assets": {
        "web.assets_frontend": [
            "website_geoengine_store_locator/static/lib/node_modules/ol/dist/ol.js",
            "website_geoengine_store_locator/static/lib/node_modules/jquery-flexdatalist/jquery.flexdatalist.js",
            "website_geoengine_store_locator/static/src/scss/snippets/s_openlayer_store_locator/frontend.scss",
            "website_geoengine_store_locator/static/src/js/snippets/s_openlayer_store_locator/frontend.js",
            "website_geoengine_store_locator/static/src/js/snippets/s_openlayer_store_locator/popover.js",
            "website_geoengine_store_locator/static/src/js/snippets/s_openlayer_store_locator/search.js",
            "website_geoengine_store_locator/static/src/js/snippets/s_openlayer_store_locator/map.js",
            "/web/static/lib/stacktracejs/stacktrace.js",
        ],
        "website.assets_wysiwyg": [
            "website_geoengine_store_locator/static/src/js/snippets/s_openlayer_store_locator/snippet.options.js",
        ],
    },
    "maintainers": ["Wouitmil"],
    "installable": True,
    "application": True,
}
