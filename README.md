
[![Runboat](https://img.shields.io/badge/runboat-Try%20me-875A7B.png)](https://runboat.odoo-community.org/builds?repo=OCA/geospatial&target_branch=12.0)
[![Pre-commit Status](https://github.com/OCA/geospatial/actions/workflows/pre-commit.yml/badge.svg?branch=12.0)](https://github.com/OCA/geospatial/actions/workflows/pre-commit.yml?query=branch%3A12.0)
[![Build Status](https://github.com/OCA/geospatial/actions/workflows/test.yml/badge.svg?branch=12.0)](https://github.com/OCA/geospatial/actions/workflows/test.yml?query=branch%3A12.0)
[![codecov](https://codecov.io/gh/OCA/geospatial/branch/12.0/graph/badge.svg)](https://codecov.io/gh/OCA/geospatial)
[![Translation Status](https://translation.odoo-community.org/widgets/geospatial-12-0/-/svg-badge.svg)](https://translation.odoo-community.org/engage/geospatial-12-0/?utm_source=widget)

<!-- /!\ do not modify above this line -->

# Geospatial Addons for Odoo

This project will enable real life GIS support on Odoo/OpenERP.
## Storing your data
All of your spatial data will be stored using robust dataformat provided by PostGIS. Projections, complex geometry formats (ploygon, lines, dot, donuts, multi-polygon, etc) are supported. You can import your spatial data with ease using WKT and CSV or by drawing them directly in Web client.
## Map Visualization and administration
Background map and layers can be configured in the administration part. Various background sources are available:
- OpenStreetMap, - SwissTopo, - Any WMS sources.
Data layers can also easily be configured using any geometry columns of your system. Styling like choropleth, propotional symbols etc are available.
## Querying
You data can be queried using various visual tools from your map view. Standard Odoo/OpenERP queries are supported and geographical operators in UI will be available.
## Referencing
Customers can be georeferenced using open data services
## Extending
A geospatial API is provided, to add your own functionalites at your convenience

## Requirements
* System: *  **PostGIS** http://postgis.refractions.net/
* Python: *  **Shapely** http://pypi.python.org/pypi/Shapely
*  **geojson** http://pypi.python.org/pypi/geojson

<!-- /!\ do not modify below this line -->

<!-- prettier-ignore-start -->

[//]: # (addons)

Available addons
----------------
addon | version | maintainers | summary
--- | --- | --- | ---
[base_geoengine](base_geoengine/) | 12.0.1.2.3 |  | Geospatial support for Odoo
[base_geoengine_demo](base_geoengine_demo/) | 12.0.1.0.3 |  | Geo spatial support Demo
[base_geolocalize_company](base_geolocalize_company/) | 12.0.1.0.1 | [![legalsylvain](https://github.com/legalsylvain.png?size=30px)](https://github.com/legalsylvain) | Add latitude and longitude fields on company model
[base_geolocalize_openstreetmap](base_geolocalize_openstreetmap/) | 12.0.1.0.2 |  | Open street map API call to geolocalize an address
[base_google_map](base_google_map/) | 12.0.1.0.0 | [![gityopie](https://github.com/gityopie.png?size=30px)](https://github.com/gityopie) [![wolfhall](https://github.com/wolfhall.png?size=30px)](https://github.com/wolfhall) | View modes and widgets to integrate Google Maps in your UI
[geoengine_base_geolocalize](geoengine_base_geolocalize/) | 12.0.1.0.1 |  | Geospatial support for base_geolocalize
[geoengine_bing](geoengine_bing/) | 12.0.1.0.2 |  | GeoEngine Bing Raster Support
[geoengine_partner](geoengine_partner/) | 12.0.1.0.0 |  | Geospatial support of partners
[geoengine_swisstopo](geoengine_swisstopo/) | 12.0.1.0.2 |  | GeoEngine - Swisstopo layers
[test_base_geoengine](test_base_geoengine/) | 12.0.1.0.0 |  | test-base-geoengine
[web_view_google_map](web_view_google_map/) | 12.0.1.1.2 | [![gityopie](https://github.com/gityopie.png?size=30px)](https://github.com/gityopie) [![wolfhall](https://github.com/wolfhall.png?size=30px)](https://github.com/wolfhall) | Add a Google Map view type to the Odoo web client
[web_view_leaflet_map](web_view_leaflet_map/) | 12.0.1.0.1 | [![legalsylvain](https://github.com/legalsylvain.png?size=30px)](https://github.com/legalsylvain) | Integrate leaflet.js librairy with odoo and add new 'leaflet_map' view, to display markers.
[web_view_leaflet_map_partner](web_view_leaflet_map_partner/) | 12.0.1.0.1 | [![legalsylvain](https://github.com/legalsylvain.png?size=30px)](https://github.com/legalsylvain) | TODO
[web_widget_google_map_drawing](web_widget_google_map_drawing/) | 12.0.1.0.0 | [![gityopie](https://github.com/gityopie.png?size=30px)](https://github.com/gityopie) [![brian10048](https://github.com/brian10048.png?size=30px)](https://github.com/brian10048) | Add drawing tools to Google Map view in Odoo
[web_widget_google_marker_icon_picker](web_widget_google_marker_icon_picker/) | 12.0.1.1.0 | [![gityopie](https://github.com/gityopie.png?size=30px)](https://github.com/gityopie) [![wolfhall](https://github.com/wolfhall.png?size=30px)](https://github.com/wolfhall) | Google map widget allowing to set marker's color

[//]: # (end addons)

<!-- prettier-ignore-end -->

## Licenses

This repository is licensed under [AGPL-3.0](LICENSE).

However, each module can have a totally different license, as long as they adhere to Odoo Community Association (OCA)
policy. Consult each module's `__manifest__.py` file, which contains a `license` key
that explains its license.

----
OCA, or the [Odoo Community Association](http://odoo-community.org/), is a nonprofit
organization whose mission is to support the collaborative development of Odoo features
and promote its widespread use.
