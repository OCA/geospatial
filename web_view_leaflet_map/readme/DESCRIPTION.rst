This module extends odoo views, to add a new kind of view, named ``leaflet_map``
that is using the Leaflet javascript library to use maps. (https://leafletjs.com/)
This library is for exemple, used in the OpenStreetMap project. (https://www.openstreetmap.org/)

You can see a simple usage in the module ``web_view_leaflet_map_partner`` in the
same OCA repository that displays your contact in a map, if latitude and longitude are
defined. (To define latitude and longitude, refer to the Odoo module ``base_geolocalize``)

.. figure:: ../static/description/res_partner_map_1.png

.. figure:: ../static/description/res_partner_map_2.png


**Important Note**

The javascript library is opensource and distributed under BSD 2 Licence.
See : https://github.com/Leaflet/Leaflet/blob/main/LICENSE
You can so use it freely.

However, display maps requires to display layers provided by tiles servers, that
requires ressources.

**For testing purpose**

you can use the openStreetMap url ``https://tile.openstreetmap.org/{z}/{x}/{y}.png`` or other, listed in that page : https://wiki.openstreetmap.org/wiki/Tile_servers

Apart from very limited testing purposes, you should not use the tiles supplied by OpenStreetMap.org itself. OpenStreetMap is a volunteer-run non-profit body and cannot supply tiles for large-scale commercial use.

**Regular / High Usage**

- you can contact one of the following companies : https://switch2osm.org/providers/

- You can also install yourself your own tiles servers. See documentation : https://switch2osm.org/serving-tiles/
