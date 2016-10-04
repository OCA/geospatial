![Licence](https://img.shields.io/badge/licence-AGPL--3-blue.svg)
[![Runbot Status](https://runbot.odoo-community.org/runbot/badge/flat/115/10.0.svg)](https://runbot.odoo-community.org/runbot/repo/github-com-oca-geospatial-115)
[![Build Status](https://travis-ci.org/OCA/geospatial.svg?branch=10.0)](https://travis-ci.org/OCA/geospatial)
[![Coverage Status](https://coveralls.io/repos/OCA/geospatial/badge.svg?branch=10.0)](https://coveralls.io/r/OCA/geospatial?branch=10.0)

Geospatial Addons for Odoo/OpenERP
==================================

This project will enable real life GIS support on Odoo/OpenERP.

Storing your data
-----------------

All of your spatial data will be stored using robust dataformat provided by PostGIS.
Projections, complex geometry formats (ploygon, lines, dot, donuts, multi-polygon, etc) are supported.
You can import your spatial data with ease using WKT and CSV or by drawing them directly in Web client.

Map Visualization and administration
------------------------------------

Background map and layers can be configured in the administration part.
Various background sources are available:

 - OpenStreetMap,
 - SwissTopo,
 - Any WMS sources.

Data layers can also easily be configured using any geometry columns of your system.
Styling like choropleth, propotional symbols etc are available.

Querying
--------

You data can be queried using various visual tools from your map view.
Standard Odoo/OpenERP queries are supported and geographical operators in UI will be available.


Referencing
-----------

Customers can be georeferenced using open data services

Extending
---------

A geospatial API is provided, to add your own functionalites at your convenience


Requirements
------------

* System:
  *  **PostGIS** http://postgis.refractions.net/

* Python:
  *  **Shapely** http://pypi.python.org/pypi/Shapely

  *  **geojson** http://pypi.python.org/pypi/geojson

* Odoo patch

  * In order to be able to create geometries, you will need to apply this patch on official Odoo branch (OCB is already patched): https://github.com/odoo/odoo/pull/10639

[//]: # (addons)
[//]: # (end addons)

Translation Status
------------------
[![Transifex Status](https://www.transifex.com/projects/p/OCA-geospatial-10-0/chart/image_png)](https://www.transifex.com/projects/p/OCA-geospatial-10-0)
