===================
What is GeoEngine ?
===================

GeoEngine is an OpenERP module that adds spatial/GIS capabilites to OpenERP. It will allow you to :

* Visualize and query your business information on map
* Perform GeoBI and spatial query
* Configure your spatial layers and spatial datasources
* Extend OpenERP models with spatial columns

GeoEngine relies on `OpenLayers <http://openlayers.org>`_ and `PostgGIS <http://postgis.refractions.net/>`_ technologies.

Postgis is used to store spatial information in databases. OpenLayer is used to represent spatial data in other words to show maps. The GeoEngine module acts as a data provider and as an OpenLayers configurator. It also provides a complete extension to OpenERP ORM.

.. image:: _static/_images/core_architecture.jpg
