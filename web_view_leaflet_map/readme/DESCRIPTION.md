This module extends odoo views, to add a new kind of view, named
`leaflet_map` that is using the Leaflet javascript library to use maps.
(<https://leafletjs.com/>) This library is for exemple, used in the
OpenStreetMap project. (<https://www.openstreetmap.org/>)

You can see a simple usage in the module `web_view_leaflet_map_partner`
in the same OCA repository that displays your contact in a map, if
latitude and longitude are defined. (To define latitude and longitude,
refer to the Odoo module `base_geolocalize`)

A marker will be displayed for each item that has a localization.

![](../static/description/view_res_partner_map_precise.png)

If user zooms out, the markers will overlap, which won't be very visible.

In that case, nearby markers are grouped together, thanks to
`Leaflet.markercluster` plugin.

![](../static/description/view_res_partner_map_large.png)



