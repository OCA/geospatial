# Copyright 2011-2017 Camptocamp SA
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl)
{
    "name": "Geospatial Website store locator",
    "version": "16.0.1.0.0",
    "description": "Adds a website widget to display a map with the store locations.",
    "category": "GeoBI",
    "author": "Camptocamp, Odoo Community Association (OCA)",
    "license": "AGPL-3",
    "website": "https://github.com/OCA/geospatial",
    "depends": ["base_geoengine", "website", "partner_store"],
    "data": [
        "templates/snippets/s_openstreetmap.xml",
        "views/snippets.xml",
    ],
    "assets": {
        "web.assets_frontend": [
            "/website_geoengine_store_locator/static/lib/node_modules/ol/dist/ol.js",
            "website_geoengine_store_locator/static/src/scss/snippets/s_openstreetmap/frontend.scss",
            "website_geoengine_store_locator/static/src/js/snippets/s_openstreetmap/frontend.js",
            "website_geoengine_store_locator/static/src/js/snippets/s_openstreetmap/popover.js",
            "website_geoengine_store_locator/static/src/js/snippets/s_openstreetmap/search.js",
            "website_geoengine_store_locator/static/src/js/snippets/s_openstreetmap/map.js",
        ],
        "website.assets_wysiwyg": [
            "website_geoengine_store_locator/static/src/js/snippets/s_openstreetmap/snippet.options.js",
        ],
    },
    "maintainers": ["Wouitmil"],
    "installable": True,
    "application": True,
}
