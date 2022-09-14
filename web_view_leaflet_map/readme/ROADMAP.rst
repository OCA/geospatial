* For the time being, at the start of the map loading, the call of ``invalidateSize()``
  is required. We should investigate why and try to remove that call.
  see https://github.com/Leaflet/Leaflet/issues/3002#issuecomment-93836022

* For the time being, the map has "Markers" and allow to display odoo items
  if longitude and latitude are available. We could imagine other kind of usages,
  with Polylines, Polygons, etc...
  See all the leaflet options : https://leafletjs.com/reference.html

* The module could not work properly on mobile devices.
