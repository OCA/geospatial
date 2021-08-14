[![Runbot Status](https://runbot.odoo-community.org/runbot/badge/flat/115/13.0.svg)](https://runbot.odoo-community.org/runbot/repo/github-com-oca-geospatial-115)
[![Build Status](https://travis-ci.com/OCA/geospatial.svg?branch=13.0)](https://travis-ci.com/OCA/geospatial)
[![codecov](https://codecov.io/gh/OCA/geospatial/branch/13.0/graph/badge.svg)](https://codecov.io/gh/OCA/geospatial)
[![Translation Status](https://translation.odoo-community.org/widgets/geospatial-13-0/-/svg-badge.svg)](https://translation.odoo-community.org/engage/geospatial-13-0/?utm_source=widget)

<!-- /!\ do not modify above this line -->

# Geospatial Addons for Odoo

This project will enable real life GIS support on Odoo.

## Storing your data

All of your spatial data will be stored using robust dataformat provided by PostGIS.
Projections, complex geometry formats (ploygon, lines, dot, donuts, multi-polygon, etc) are supported.
You can import your spatial data with ease using WKT and CSV or by drawing them directly in Web client.

## Map Visualization and administration

Background map and layers can be configured in the administration part.
Various background sources are available:

 - OpenStreetMap,
 - SwissTopo,
 - Any WMS sources.

Data layers can also easily be configured using any geometry columns of your system.
Styling like choropleth, propotional symbols etc are available.

## Querying

You data can be queried using various visual tools from your map view.
Standard Odoo/OpenERP queries are supported and geographical operators in UI will be available.


## Referencing

Customers can be georeferenced using open data services

## Extending

A geospatial API is provided, to add your own functionalites at your convenience


## Requirements

* System:
  *  **PostGIS** http://postgis.refractions.net/

* Python:
  *  **Shapely** http://pypi.python.org/pypi/Shapely

  *  **geojson** http://pypi.python.org/pypi/geojson

<!-- /!\ do not modify below this line -->

<!-- prettier-ignore-start -->

[//]: # (addons)

Available addons
----------------
addon | version | maintainers | summary
--- | --- | --- | ---
[base_geoengine](base_geoengine/) | 13.0.1.0.2 |  | Geospatial support for Odoo
[geoengine_base_geolocalize](geoengine_base_geolocalize/) | 13.0.1.0.0 |  | Geospatial support for base_geolocalize
[geoengine_partner](geoengine_partner/) | 13.0.1.0.0 |  | Geospatial support of partners
[geoengine_swisstopo](geoengine_swisstopo/) | 13.0.1.0.0 |  | GeoEngine - Swisstopo layers
[test_base_geoengine](test_base_geoengine/) | 13.0.1.0.0 |  | test-base-geoengine

[//]: # (end addons)

<!-- prettier-ignore-end -->

## Licenses

This repository is licensed under [AGPL-3.0](LICENSE).

However, each module can have a totally different license, as long as they adhere to OCA
policy. Consult each module's `__manifest__.py` file, which contains a `license` key
that explains its license.

----

OCA, or the [Odoo Community Association](http://odoo-community.org/), is a nonprofit
organization whose mission is to support the collaborative development of Odoo features
and promote its widespread use.
