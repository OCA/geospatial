
[![Runboat](https://img.shields.io/badge/runboat-Try%20me-875A7B.png)](https://runboat.odoo-community.org/builds?repo=OCA/geospatial&target_branch=14.0)
[![Build Status](https://travis-ci.com/OCA/geospatial.svg?branch=14.0)](https://travis-ci.com/OCA/geospatial)
[![codecov](https://codecov.io/gh/OCA/geospatial/branch/14.0/graph/badge.svg)](https://codecov.io/gh/OCA/geospatial)
[![Translation Status](https://translation.odoo-community.org/widgets/geospatial-14-0/-/svg-badge.svg)](https://translation.odoo-community.org/engage/geospatial-14-0/?utm_source=widget)

<!-- /!\ do not modify above this line -->

# geospatial

This project will enable real life GIS support on Odoo.

## Storing your data

All of your spatial data will be stored using robust dataformat provided by PostGIS.
Projections, complex geometry formats (ploygon, lines, dot, donuts, multi-polygon,
etc) are supported. You can import your spatial data with ease using WKT and CSV or by
drawing them directly in Web client.

## Map Visualization and administration

Background map and layers can be configured in the administration part. Various
background sources are available:

- OpenStreetMap, - SwissTopo, - Any WMS sources.

Data layers can also easily be configured using any geometry columns of your system.
Styling like choropleth, propotional symbols etc are available.

## Querying

You data can be queried using various visual tools from your map view. Standard Odoo
queries are supported and geographical operators in UI will be available.

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
[base_google_map](base_google_map/) | 14.0.1.0.1 | [![gityopie](https://github.com/gityopie.png?size=30px)](https://github.com/gityopie) [![wolfhall](https://github.com/wolfhall.png?size=30px)](https://github.com/wolfhall) | View modes and widgets to integrate Google Maps in your UI

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
